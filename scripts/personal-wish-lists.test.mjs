import test from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './test-db.mjs';
import {createCelebrationHandler} from '../lib/organizer-handlers.mjs';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const input={name:'My wishes',orgName:'Sam',people:['Sam'],mode:'wish',personal:true,includeMe:true,date:'',budget:'',cur:'$',exclusions:[]};
const request=body=>new Request('https://hatpull.com/api/create',{method:'POST',body:JSON.stringify(body)});
test('personal-list creation cannot bypass draw, group or organizer participation requirements',async()=>{
 let payload,calls=0;
 const handler=createCelebrationHandler({verify:async()=>owner,rpc:async(fn,args)=>{calls++;payload=args.p;return {id:'fixture'};}});
 for(const patch of [{personal:'true'},{mode:'draw'},{includeMe:false},{people:['Someone else']},{people:['Sam','Another person']},{personal:false}]){
  assert.equal((await handler(request({...input,...patch}))).status,400);
 }
 assert.equal(calls,0);
 assert.equal((await handler(request(input))).status,200);
 assert.equal(payload.settings.personal,true);
 assert.equal(payload.members.length,1);
 assert.equal(payload.org_mid,payload.members[0].id);
});
test('one-person wish lists retain ownership, gift saving, and the existing private access boundary',async()=>{
 const db=await testDatabase();
 const query=async(sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
 try{
 await db.query("insert into auth.users(id,email_confirmed_at) values ($1,now())",[owner]);
 const personal={name:'Synthetic personal list',mode:'wish',org_name:'Sam',org_mid:'sam',members:[{id:'sam',name:'Sam'}],settings:{personal:true,wishVis:'all'}};
 for(const bad of [{...personal,settings:{}},{...personal,org_mid:null},{...personal,mode:'draw'}]) await assert.rejects(query('select hp_create_owned_group($1::jsonb,$2::uuid) result',[JSON.stringify(bad),owner]),/too few/);
 const created=await query('select hp_create_owned_group($1::jsonb,$2::uuid) result',[JSON.stringify(personal),owner]);
 await db.query("select set_config('test.uid',$1,false)",[owner]);
 const state=await query('select hp_state($1,$2,$3) result',[created.id,created.org_token,created.admin_token]);
 assert.equal(state.group.settings.personal,true);assert.equal(state.members.length,1);assert.equal(state.is_admin,true);
 await query('select hp_add_wish($1,$2,$3,$4::jsonb,$5) result',[created.id,created.org_token,'sam',JSON.stringify({id:'fixture-wish',t:'A book',u:'https://example.com/book'}),'paste']);
 const saved=await query('select hp_state($1,$2,$3) result',[created.id,created.org_token,created.admin_token]);
 assert.equal(saved.members[0].wishes,1);
 await db.query("select set_config('test.uid','',false)");
 await assert.rejects(query('select hp_state($1,null,null) result',[created.id]),/forbidden/);
 await assert.rejects(query('select hp_state($1,null,$2) result',[created.id,created.admin_token]),/organizer_sign_in_required/);
 }finally{await db.close();}
});
