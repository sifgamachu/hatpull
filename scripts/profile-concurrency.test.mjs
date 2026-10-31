import test from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './test-db.mjs';
import {normState} from '../lib/core.js';

test('checked editor saves preserve concurrent changes, ownership and limits', async t => {
 const db=await testDatabase();
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
 try {
  const owner='11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[owner]);
  const g=await q('select hp_create_owned_group($1::jsonb,$2) result',[JSON.stringify({name:'Concurrency QA',mode:'wish',members:[{id:'p1',name:'QA One'},{id:'p2',name:'QA Two'}]}),owner]);
  await db.query("update hp_members set token='fixture-'||id where group_id=$1",[g.id]);
  const get=()=>q("select profile result from hp_members where group_id=$1 and id='p1'",[g.id]);
  const save=(profile,expected,token='fixture-p1')=>q("select hp_save_profile_checked($1,$2,'p1',$3::jsonb,$4::jsonb) result",[g.id,token,JSON.stringify(profile),JSON.stringify(expected)]);
  const add=wish=>q("select hp_add_wish($1,'fixture-p1','p1',$2::jsonb) result",[g.id,JSON.stringify(wish)]);
  const first={id:'first',t:'First gift',u:'https://example.com/first'},second={id:'second',t:'Second gift',u:'https://example.com/second'};
  await t.test('reproduce the legacy lost update, then reject the same stale write',async()=>{
   const before=await get(); await add(first);
   await q("select hp_save_profile($1,'fixture-p1','p1',$2::jsonb) result",[g.id,JSON.stringify({...before,hobbies:'Legacy stale edit'})]);
   assert.ok(!(await get()).items?.some(x=>x.id==='first'),'legacy save erases a concurrent gift');
   const baseline=await get(); await add(first);
   await assert.rejects(save({...baseline,hobbies:'Stale editor'},baseline),/profile_conflict/);
   assert.ok((await get()).items.some(x=>x.id==='first'));
  });
  await t.test('fresh save works; exact server snapshot survives display defaults',async()=>{
   const raw=await get(),state=normState({members:[{id:'p1',name:'QA',profile:raw}]});
   assert.deepEqual(state.members[0].profileSnapshot,raw);
   assert.notDeepEqual(state.members[0].profile,raw);
   await save({...state.members[0].profile,hobbies:'Fresh edit'},state.members[0].profileSnapshot);
   assert.equal((await get()).hobbies,'Fresh edit');
  });
  await t.test('two checked writes from one snapshot have one winner',async()=>{
   const base=await get();
   const results=await Promise.allSettled([save({...base,hobbies:'A'},base),save({...base,hobbies:'B'},base)]);
   assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
   assert.match(results.find(x=>x.status==='rejected').reason.message,/profile_conflict/);
  });
  await t.test('atomic addition remains compatible with checked save',async()=>{
   const base=await get();await save({...base,hobbies:'Before atomic add'},base);await add(second);
   assert.equal((await get()).items.length,2); assert.equal((await get()).hobbies,'Before atomic add');
  });
  await t.test('invalid token, other participant and null baseline fail closed',async()=>{
   const base=await get();for(const token of ['bad-token','fixture-p2'])await assert.rejects(save(base,base,token),/forbidden/);
   await assert.rejects(save(base,null),/profile_conflict/);assert.deepEqual(await get(),base);
  });
  await t.test('40-wish and byte limits do not change existing data',async()=>{
   const base=await get();await assert.rejects(save({...base,items:Array.from({length:41},(_,i)=>({...first,id:`n${i}`}))},base),/invalid profile/);
   await assert.rejects(save({...base,hobbies:'x'.repeat(20000)},base),/invalid profile/);
   assert.deepEqual(await get(),base);
  });
  await t.test('only explicit browser roles can call the checked function',async()=>{
   for(const role of ['anon','authenticated'])assert.equal(await q("select has_function_privilege($1,'hp_save_profile_checked(text,text,text,jsonb,jsonb)','EXECUTE') result",[role]),true);
   assert.equal(await q("select has_function_privilege('service_role','hp_save_profile_checked(text,text,text,jsonb,jsonb)','EXECUTE') result"),false);
  });
 }finally{await db.close();}
});
