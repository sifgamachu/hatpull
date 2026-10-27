import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { testDatabase } from './test-db.mjs';
import { requireOrganizer } from '../lib/organizer-auth.mjs';
import { readWizardDraft } from '../lib/wizard-draft.mjs';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', anonymous='cccccccc-cccc-4ccc-8ccc-cccccccccccc', unverified='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const query=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
const identity=(db,uid) => db.query("select set_config('test.uid',$1,false)",[uid || '']);
const payload={name:'Synthetic organizer test',mode:'draw',org_mid:'a',members:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]};

test('organizer identity is verified by Auth and cannot be anonymous or unconfirmed',async()=>{
  let called=0;
  const verified=async token => {called++;assert.equal(token,'test-token');return {data:{user:{id:owner,email_confirmed_at:'2026-10-23'}}};};
  await assert.rejects(requireOrganizer(null,verified),/not_signed_in/);
  await assert.rejects(requireOrganizer('Basic anything',verified),/invalid_session/);
  await assert.rejects(requireOrganizer('Bearer ',verified),/invalid_session/);
  assert.equal(called,0);
  assert.equal(await requireOrganizer('Bearer test-token',verified),owner);
  for(const result of [{error:{}},{data:{user:{id:owner}}},{data:{user:{id:owner,is_anonymous:true,email_confirmed_at:'yes'}}}]) {
    await assert.rejects(requireOrganizer('Bearer test-token',async()=>result),/invalid_session/);
  }
});

test('draft survives sign-in, expires, and belongs to the requested setup',()=>{
  const st={step:7,mode:'draw',orgName:'Sample',includeMe:true,names:['B','C'],excl:{Sample:['B']},occ:'Christmas',name:'Test',date:'2026-12-25',budget:'25',cur:'$',note:'Hello'};
  const storage=draft=>({getItem:()=>JSON.stringify(draft)});
  assert.deepEqual(readWizardDraft(storage({at:1000,q:'?occ=0',st}),'?occ=0',2000),{...st,step:5});
  assert.equal(readWizardDraft(storage({at:1000,q:'?occ=0',st}),'?mode=wish',2000),null);
  assert.equal(readWizardDraft(storage({at:1000,q:'?occ=0',st}),'?occ=0',1000+6*3600e3),null);
  assert.equal(readWizardDraft(storage({at:1000,q:'?occ=0',st:{...st,names:[42]}}),'?occ=0',2000),null);
  assert.equal(readWizardDraft({getItem:()=>'{broken'},'',2000),null);
});

test('account ownership, legacy claims, guest participation and every organizer entry point',async t=>{
  const db=await testDatabase({enforceOrganizer:false});
  try {
    await db.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[owner,other]);
    await db.query('insert into auth.users(id,is_anonymous) values($1,true),($2,false)',[anonymous,unverified]);
    const legacy=await query(db,'select hp_create_group($1::jsonb) result',[JSON.stringify(payload)]);
    const oldOwned=await query(db,'select hp_create_group($1::jsonb) result',[JSON.stringify(payload)]);
    await db.query('update hp_groups set owner_id=$1 where id=$2',[owner,oldOwned.id]);
    const directory=new URL('../supabase/migrations/',import.meta.url);
    const migration=(await readdir(directory)).find(f=>f.includes('enforce_organizer_accounts'));
    await db.exec(await readFile(new URL(migration,directory),'utf8'));
    const g=await query(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify({...payload,owner_id:other}),owner]);
    await t.test('creation saves verified owner and organizer participant atomically',async()=>{
      assert.equal(await query(db,'select owner_id result from hp_groups where id=$1',[g.id]),owner);
      assert.equal(await query(db,"select user_id result from hp_members where group_id=$1 and id='a'",[g.id]),owner);
      for(const uid of [null,anonymous,unverified]) await assert.rejects(query(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify(payload),uid]),/not_signed_in/);
      const before=await query(db,'select count(*)::int result from hp_groups');
      await assert.rejects(query(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify({...payload,members:[]}),owner]));
      assert.equal(await query(db,'select count(*)::int result from hp_groups'),before);
    });
    await t.test('only owner can read organizer data; stolen keys and cached versions do not bypass sign-in',async()=>{
      await identity(db,owner);
      const state=await query(db,'select hp_state_delta($1,null,null,null,null) result',[g.id]);
      assert.equal(state.state.is_admin,true);
      assert.ok(state.state.group.join_code);
      for(const [uid,error] of [[null,/organizer_sign_in_required/],[other,/not_group_owner/],[anonymous,/organizer_sign_in_required/]]) {
        await identity(db,uid);
        await assert.rejects(query(db,'select hp_state($1,null,$2) result',[g.id,g.admin_token]),error);
        await assert.rejects(query(db,'select hp_state_delta($1,null,$2,null,$3) result',[g.id,g.admin_token,state.version]),error);
        await assert.rejects(query(db,"select hp_questions_page($1,null,$2,'a') result",[g.id,g.admin_token]),error);
      }
      await identity(db,null);
      const member=await query(db,'select hp_claim($1,$2) result',[g.join_code,'b']);
      const guest=await query(db,'select hp_state($1,$2,null) result',[g.id,member.token]);
      assert.equal(guest.is_admin,false); assert.equal(guest.group.join_code,null); assert.equal(guest.me.id,'b');
    });
    await t.test('management, results, roster and redraw reject another account',async()=>{
      await identity(db,other);
      const calls=[
        ['select hp_admin_update($1,$2,$3::jsonb) result',[g.id,g.admin_token,'{"name":"Stolen"}']],
        ['select hp_admin_live($1,$2) result',[g.id,g.admin_token]],
        ['select hp_admin_delete($1,$2) result',[g.id,g.admin_token]],
        ["select hp_admin_reset_member($1,$2,'b') result",[g.id,g.admin_token]],
        ['select hp_admin_roster($1,$2) result',[g.id,g.admin_token]],
        ['select hp_results($1,$2) result',[g.id,g.admin_token]],
        ['select hp_owned_roster($1,$2) result',[g.id,other]],
        ['select hp_redraw_owned_group($1,$2,$3::jsonb,$4::jsonb) result',[g.id,other,JSON.stringify(payload.members),'[]']],
      ];
      for(const [sql,args] of calls) await assert.rejects(query(db,sql,args),/forbidden/);
      await identity(db,owner);
      await query(db,'select hp_admin_update($1,null,$2::jsonb) result',[g.id,'{"budget":"35"}']);
      assert.equal(await query(db,'select budget result from hp_groups where id=$1',[g.id]),'35');
      assert.equal((await query(db,'select hp_owned_roster($1,$2) result',[g.id,owner])).members.length,3);
      await query(db,'select hp_redraw_owned_group($1,$2,$3::jsonb,$4::jsonb) result',[g.id,owner,JSON.stringify(payload.members),'[]']);
      assert.equal(await query(db,'select round result from hp_groups where id=$1',[g.id]),2);
    });
    await t.test('legacy ownership requires explicit claim, rotates key, and cannot be claimed twice',async()=>{
      await identity(db,null);
      await assert.rejects(query(db,'select hp_claim_organizer($1,$2) result',[legacy.id,legacy.admin_token]),/not_signed_in/);
      await identity(db,owner);
      await query(db,'select hp_link($1,null,$2) result',[legacy.id,legacy.admin_token]);
      assert.equal(await query(db,'select owner_id result from hp_groups where id=$1',[legacy.id]),null);
      await assert.rejects(query(db,'select hp_state($1,null,$2) result',[legacy.id,legacy.admin_token]),/organizer_claim_required/);
      await assert.rejects(query(db,'select hp_claim_organizer($1,$2) result',[legacy.id,'wrong']),/forbidden/);
      const claimed=await query(db,'select hp_claim_organizer($1,$2) result',[legacy.id,legacy.admin_token]);
      assert.notEqual(claimed.admin_token,legacy.admin_token);
      assert.equal((await query(db,'select hp_state($1,null,null) result',[legacy.id])).is_admin,true);
      await identity(db,other);
      await assert.rejects(query(db,'select hp_claim_organizer($1,$2) result',[legacy.id,claimed.admin_token]),/not_group_owner/);
      await assert.rejects(query(db,'select hp_claim_organizer($1,$2) result',[oldOwned.id,oldOwned.admin_token]),/not_group_owner/);
    });
    await t.test('browser roles cannot invoke server creation or redraw, or bypass the gate with old endpoints',async()=>{
      const signatures=['hp_create_owned_group(jsonb,uuid)','hp_owned_roster(text,uuid)','hp_redraw_owned_group(text,uuid,jsonb,jsonb)'];
      for(const role of ['anon','authenticated']) for(const fn of signatures) assert.equal(await query(db,"select has_function_privilege($1,$2,'execute') result",[role,'public.'+fn]),false);
      for(const role of ['anon','authenticated','service_role']) for(const fn of ['hp_create_group(jsonb)','hp_admin_redraw(text,text,jsonb,jsonb,jsonb)','hp_is_admin(text,text)','hp_organizer_access(text,text)']) assert.equal(await query(db,"select has_function_privilege($1,$2,'execute') result",[role,'public.'+fn]),false);
      await db.exec('set role anon');
      await assert.rejects(query(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify(payload),owner]),/permission denied/);
      await assert.rejects(query(db,'select hp_admin_delete($1,$2) result',[g.id,g.admin_token]),/permission denied/);
      await db.exec('reset role');
    });
    await t.test('deleted owner cannot be replaced by someone holding an old organizer link',async()=>{
      await identity(db,owner);
      await query(db,'select hp_forget_me() result');
      await identity(db,other);
      await assert.rejects(query(db,'select hp_claim_organizer($1,$2) result',[g.id,g.admin_token]),/organizer_unavailable/);
      assert.equal(await query(db,'select owner_claimed_at is not null result from hp_groups where id=$1',[g.id]),true);
      const fresh=await query(db,'select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify(payload),other]);
      await db.query('delete from auth.users where id=$1',[other]);
      await assert.rejects(query(db,'select hp_admin_update($1,null,$2::jsonb) result',[fresh.id,'{"name":"Deleted owner"}']),/forbidden/);
    });
  } finally { await db.close(); }
});
