import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './test-db.mjs';
import { createGroupLoader, pollDelay, pollCeiling } from '../lib/group-sync.mjs';
import { runReminders } from '../lib/reminder-worker.mjs';
import { sendResend } from '../lib/resend-transport.mjs';
import { authFailure } from '../lib/auth-errors.mjs';

const query = async (db, sql, args=[]) => (await db.query(sql,args)).rows[0]?.result;
const group = async (db,n=5) => query(db, 'select hp_create_group($1::jsonb) result', [JSON.stringify({name:'Synthetic capacity test',mode:'draw',members:Array.from({length:n},(_,i)=>({id:`m${i}`,name:`Test ${i}`}))})]);
const delta = (db,g,token=null,profile=null,version=null,admin=g.admin_token) => query(db,'select hp_state_delta($1,$2,$3,$4,$5) result',[g.id,token,admin,profile,version]);

test('database revisions, privacy, pagination and reminder recovery', async t => {
  const db=await testDatabase();
  try {
    const g=await group(db,200);
    await db.query(`update hp_members set token='token-'||id,profile=jsonb_build_object('hobbies',repeat('x',500),'address','Private street','items',(select jsonb_agg(jsonb_build_object('id','w'||n,'t',repeat('g',100),'n',repeat('n',100))) from generate_series(1,40)n)) where group_id=$1`,[g.id]);
    await t.test('dashboard omits wishlist payloads and unchanged polls omit state', async()=>{
      const old=await query(db,'select hp_state($1,null,$2) result',[g.id,g.admin_token]);
      const fresh=await delta(db,g);
      assert.equal(fresh.state.members.length,200);
      assert.ok(fresh.state.members.every(m=>m.profile===null));
      assert.deepEqual(await delta(db,g,null,null,fresh.version),{version:fresh.version});
      assert.ok(JSON.stringify(fresh).length < JSON.stringify(old).length/10);
      console.log(JSON.stringify({participants:200,legacyBytes:JSON.stringify(old).length,summaryBytes:JSON.stringify(fresh).length,unchangedBytes:JSON.stringify({version:fresh.version}).length}));
    });
    await t.test('selected profile preserves private wishlist and address rules',async()=>{
      await db.query(`update hp_groups set settings='{"wishVis":"drawn","mail":{"on":true,"vis":"drawn"}}' where id=$1`,[g.id]);
      const member=await delta(db,g,'token-m0','m1',null,null);
      assert.equal(member.state.members.find(m=>m.id==='m1').profile,null);
      const own=await delta(db,g,'token-m0','m0',null,null);
      assert.equal(own.state.members.find(m=>m.id==='m0').profile.address,'Private street');
      const receiver=own.state.me.receiver_id;
      await query(db,'select hp_mark_drawn($1,$2) result',[g.id,'token-m0']);
      const drawn=await delta(db,g,'token-m0',receiver,null,null);
      assert.equal(drawn.state.members.find(m=>m.id===receiver).profile.address,'Private street');
      assert.ok(drawn.state.members.filter(m=>m.id!==receiver).every(m=>m.profile===null));
      await assert.rejects(delta(db,g,'wrong',null,drawn.version,null),/forbidden/);
      await db.query("insert into hp_reservations(group_id,owner_id,item_id,by_member) values($1,'m0','w1','m1')",[g.id]);
      assert.deepEqual((await delta(db,g,'token-m0','m0',null,null)).state.reservations,[]);
      assert.deepEqual((await delta(db,g,'token-m0','m0')).state.reservations,[]);
      assert.equal((await delta(db,g,'token-m1','m0',null,null)).state.reservations[0].mine,true);
      await db.query("delete from hp_reservations where group_id=$1",[g.id]);
    });
    await t.test('all child changes invalidate revisions, including token revocation',async()=>{
      let version=(await delta(db,g)).version;
      const changes=[
        ["update hp_members set name='Updated' where group_id=$1 and id='m1'",[g.id]],
        ["insert into hp_questions(group_id,to_member,body) values($1,'m0','Question')",[g.id]],
        ["insert into hp_messages(group_id,name,body) values($1,'Synthetic','Hello')",[g.id]],
        ["insert into hp_reservations(group_id,owner_id,item_id,by_member) values($1,'m1','w1','m0')",[g.id]],
        ["delete from hp_reservations where group_id=$1",[g.id]],
        ["update hp_groups set note='Changed' where id=$1",[g.id]],
      ];
      for(const [sql,args] of changes){ await db.query(sql,args);const next=await delta(db,g,null,null,version);assert.ok(next.state);assert.notEqual(next.version,version);version=next.version; }
      const before=await delta(db,g,'token-m0',null,null,null);
      await db.query("update hp_members set token=null where group_id=$1 and id='m0'",[g.id]);
      await assert.rejects(delta(db,g,'token-m0',null,before.version,null),/forbidden/);
    });
    await t.test('questions have stable pages, including equal timestamps',async()=>{
      await db.query("insert into hp_questions(group_id,to_member,body,created_at) select $1,'m1','Q'||i,now() from generate_series(1,105)i",[g.id]);
      const first=await delta(db,g,null,'m1');assert.equal(first.state.questions.length,50);assert.equal(first.state.questions_more,true);
      let all=[...first.state.questions],more=true;
      while(more){const last=all.at(-1);const page=await query(db,'select hp_questions_page($1,null,$2,$3,$4,$5) result',[g.id,g.admin_token,'m1',last.at,last.id]);all.push(...page.questions);more=page.more;}
      assert.equal(all.length,105);assert.equal(new Set(all.map(q=>q.id)).size,105);
      assert.equal((await delta(db,g)).state.unanswered_count,0);
    });
    await t.test('private server functions and tables stay inaccessible to browsers',async()=>{
      for(const role of ['anon','authenticated']) {
        assert.equal(await query(db,"select has_function_privilege($1,'public.hp_reminder_claim(uuid)','EXECUTE') result",[role]),false);
        assert.equal(await query(db,"select has_table_privilege($1,'public.hp_reminder_jobs','SELECT') result",[role]),false);
        assert.equal(await query(db,"select has_function_privilege($1,'public.hp_create_group(jsonb)','EXECUTE') result",[role]),false);
      }
    });
    await t.test('queue locks, frozen payload, retry, deduplication and consent',async()=>{
      const uid='11111111-1111-4111-8111-111111111111',run='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
      await db.query("insert into hp_profiles(user_id,email,unsub_token) values($1,'test@example.invalid','test-unsub')",[uid]);
      await db.query("update hp_members set user_id=$1 where group_id=$2 and id='m0'",[uid,g.id]);
      await db.query("update hp_groups set event_date=current_date+7 where id=$1",[g.id]);
      const enqueue=await query(db,'select hp_reminder_enqueue() result');
      if(new Date().getUTCHours()>=15){assert.equal(enqueue,1);assert.equal(await query(db,'select hp_reminder_enqueue() result'),0);}
      // Queue fixture is valid at any test time, including before the daily sending window.
      await db.query("insert into hp_reminder_jobs(user_id,group_id,kind,event_date,due_date,expires_at) values($1,$2,'week',current_date+7,current_date,now()+interval '1 hour') on conflict do nothing",[uid,g.id]);
      assert.equal(await query(db,'select hp_reminder_start($1) result',[run]),true);
      assert.equal(await query(db,'select hp_reminder_start($1) result',[other]),false);
      const job=await query(db,'select hp_reminder_claim($1) result',[run]); assert.ok(job.job_id);
      assert.equal(await query(db,'select hp_reminder_claim($1) result',[other]),null);
      const payload={to:['test@example.invalid'],subject:'Synthetic',text:'No real email'};
      assert.deepEqual(await query(db,'select hp_reminder_prepare($1,$2,$3) result',[job.job_id,run,JSON.stringify(payload)]),payload);
      assert.deepEqual(await query(db,'select hp_reminder_prepare($1,$2,$3) result',[job.job_id,run,JSON.stringify({...payload,text:'changed'})]),payload);
      await query(db,"select hp_reminder_finish($1,$2,'pending','provider_429',60) result",[job.job_id,run]);
      assert.equal(await query(db,'select hp_reminder_claim($1) result',[run]),null);
      await db.query("update hp_reminder_jobs set next_attempt_at=now()-interval '1 second' where id=$1",[job.job_id]);
      const retried=await query(db,'select hp_reminder_claim($1) result',[run]);assert.equal(retried.job_id,job.job_id);assert.equal(retried.attempts,2);assert.deepEqual(retried.payload,payload);
      assert.equal(await query(db,"select hp_reminder_finish($1,$2,'sent') result",[job.job_id,run]),true);
      assert.equal(await query(db,"select hp_reminder_finish($1,$2,'sent') result",[job.job_id,run]),false);
      assert.equal(await query(db,'select count(*)::int result from hp_email_log where group_id=$1',[g.id]),1);
      assert.equal(await query(db,'select payload is null result from hp_reminder_jobs where id=$1',[job.job_id]),true);
      await db.query("insert into hp_reminder_jobs(user_id,group_id,kind,event_date,due_date,expires_at) values($1,$2,'tomorrow',current_date+7,current_date,now()+interval '1 hour')",[uid,g.id]);
      await db.query("update hp_profiles set reminders=false where user_id=$1",[uid]);
      assert.equal(await query(db,'select hp_reminder_claim($1) result',[run]),null);
      assert.equal(await query(db,"select count(*)::int result from hp_reminder_jobs where status='cancelled'"),1);
      await db.query('delete from hp_profiles where user_id=$1',[uid]);
      assert.equal(await query(db,'select count(*)::int result from hp_reminder_jobs'),0);
    });
  } finally {await db.close();}
});

test('poll requests deduplicate, post-write refresh waits, disposed responses do not update UI',async()=>{
  const requests=[],updates=[];let complete;
  const loader=createGroupLoader(version=>{requests.push(version);return new Promise(r=>{complete=r;});},s=>updates.push(s));
  const first=loader.load();assert.equal(loader.load(),first);
  const forced=loader.load(true);complete({version:'1',state:{old:true}});await first;
  await new Promise(r=>setImmediate(r));assert.equal(requests.length,2);assert.equal(requests[1],null);
  complete({version:'2',state:{new:true}});await forced;assert.deepEqual(updates,[{old:true},{new:true}]);
  const last=loader.load();assert.equal(requests.at(-1),'2');loader.dispose();complete({version:'3',state:{stale:true}});await last;assert.equal(updates.length,2);
  assert.equal(pollDelay(10000,()=>0),8500);assert.equal(pollDelay(10000,()=>1),11500);
  assert.ok(pollDelay(pollCeiling({group:{mode:'draw'},me:{drawn:false}}),()=>1)<30000);
  assert.equal(pollCeiling({group:{mode:'draw'},me:{drawn:true}}),60000);
});

test('reminder worker honors provider backoff and always releases lease',async()=>{
  const calls=[];let claims=0;
  const rpc=async(fn,args)=>{calls.push([fn,args]);if(fn==='hp_reminder_start')return true;if(fn==='hp_reminder_enqueue')return 1;if(fn==='hp_reminder_claim')return ++claims===1?{job_id:'job',attempts:1}:null;if(fn==='hp_reminder_prepare')return args.p_payload;return true;};
  const result=await runReminders({rpc,prepare:()=>({to:['test@example.invalid']}),send:async()=>{throw Object.assign(new Error('limited'),{status:429,retryAfter:900});},runId:'run',sleep:async()=>{}});
  assert.equal(result.retried,1);assert.equal(claims,1);
  assert.equal(calls.find(c=>c[0]==='hp_reminder_finish')[1].p_retry_seconds,900);
  assert.equal(calls.at(-1)[0],'hp_reminder_stop');
});

test('sending uses a stable idempotency key, timeout and structured rate-limit errors',async()=>{
  let seen;
  await assert.rejects(sendResend({text:'test'},'job-key',{key:'synthetic',fetcher:async(_url,init)=>{seen=init;return new Response('',{status:429,headers:{'retry-after':'30'}});}}),e=>e.status===429&&e.retryAfter===30);
  assert.equal(seen.headers['idempotency-key'],'job-key');assert.ok(seen.signal);
  assert.equal(authFailure({status:429},'verify').seconds,60);assert.equal(authFailure({status:400},'verify').seconds,0);
});
