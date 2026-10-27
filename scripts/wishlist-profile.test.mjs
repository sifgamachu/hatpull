import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './test-db.mjs';
import { cleanWishDemographics, giftPreferencesFromProfile, giftSearchQuery } from '../lib/gift-preferences.mjs';
import { ownedGiftDemographics } from '../lib/gift-list.mjs';
import { createProfileSaveQueue } from '../lib/profile-save-queue.mjs';

const tick = () => new Promise(resolve=>setImmediate(resolve));
test('saved age/gender seed catalog queries without sending private profile fields',()=>{
  const privateProfile={who:'women',age:'12–17',name:'Private Name',address:'Private address',hobbies:'Private text',items:[{id:'private'}]};
  assert.deepEqual(giftPreferencesFromProfile(privateProfile),{gender:'women',age:'teens',interests:[]});
  assert.equal(giftSearchQuery('gift set',giftPreferencesFromProfile(privateProfile)),'gift set teen women');
  assert.equal(giftSearchQuery('gift set',giftPreferencesFromProfile({who:'men',age:'5–11'})),'gift set boys');
  assert.equal(giftSearchQuery('gift set',giftPreferencesFromProfile({age:'Under 5'})),'gift set toddler');
  assert.equal(giftPreferencesFromProfile({age:'65+'}).age,'seniors');
  assert.deepEqual(cleanWishDemographics(null),{age:'',who:''});
  assert.deepEqual(cleanWishDemographics({age:'birthday',who:'name',address:'private'}),{age:'',who:''});
  const state={me:{id:'owner'},members:[{id:'owner',profile:privateProfile},{id:'other',profile:privateProfile}]};
  assert.deepEqual(ownedGiftDemographics(state,{mid:'owner'}),{age:'12–17',who:'women'});
  assert.throws(()=>ownedGiftDemographics(state,{mid:'other'}),/forbidden/);
});

test('rapid choices serialize, combine pending fields, and cannot finish in reverse order',async()=>{
  const calls=[],states=[],releases=[];let completed=0;
  const queue=createProfileSaveQueue({save:patch=>{calls.push(patch);return new Promise(resolve=>releases.push(resolve));},onStatus:s=>states.push(s),onSaved:()=>completed++});
  queue.change({who:'women'});queue.change({age:'12–17'});queue.change({who:'men'});
  assert.deepEqual(calls,[{who:'women'}]);releases.shift()();await tick();
  assert.deepEqual(calls,[{who:'women'},{age:'12–17',who:'men'}]);releases.shift()();await tick();
  assert.equal(states.at(-1),'saved');assert.equal(completed,1);
});

test('failed saves retain the latest choices for an explicit retry',async()=>{
  const calls=[],states=[];let fail=true;
  const queue=createProfileSaveQueue({save:async patch=>{calls.push(patch);if(fail)throw Error('offline');},onStatus:s=>states.push(s)});
  queue.change({who:'women'});queue.change({age:'65+'});await tick();
  assert.equal(states.at(-1),'error');fail=false;queue.retry();await tick();
  assert.deepEqual(calls.at(-1),{who:'women',age:'65+'});assert.equal(states.at(-1),'saved');
});

test('unmount suppresses callbacks while finishing edits already submitted by the user',async()=>{
  const calls=[],states=[];let release;
  const queue=createProfileSaveQueue({save:patch=>{calls.push(patch);return calls.length===1?new Promise(resolve=>{release=resolve;}):Promise.resolve();},onStatus:s=>states.push(s)});
  queue.change({who:'women'});queue.change({age:'18–29'});queue.dispose();const count=states.length;release();await tick();
  assert.equal(calls.length,2);assert.equal(states.length,count);
});

test('demographic updates preserve wishes, notes and addresses and enforce owner/child permissions',async()=>{
  const db=await testDatabase(),q=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.result;
  try {
    await db.exec("insert into auth.users(id,email_confirmed_at) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',now())");
    const g=await q("select hp_create_owned_group($1::jsonb,'cccccccc-cccc-4ccc-8ccc-cccccccccccc') result",[JSON.stringify({name:'Profile isolated test',mode:'draw',members:[{id:'m0',name:'Owner'},{id:'m1',name:'Giver'},{id:'m2',name:'Other'}]})]);
    await db.query("update hp_members set token='profile-'||id where group_id=$1",[g.id]);
    const wish={id:'one',t:'Gift',u:'https://example.com/gift'};
    await q('select hp_save_profile($1,$2,$3,$4::jsonb) result',[g.id,'profile-m0','m0',JSON.stringify({age:'18–29',who:'',hobbies:'Keep hobbies',address:'Keep address',items:[wish]})]);
    await db.exec('set role anon');
    const save=(patch,token='profile-m0',target='m0')=>q('select hp_set_wish_demographics($1,$2,$3,$4::jsonb) result',[g.id,token,target,JSON.stringify(patch)]);
    for(const token of [null,'wrong','profile-m1'])await assert.rejects(save({who:'women'},token),/forbidden/);
    for(const bad of [null,[],{who:null},{who:'other'},{age:27},{age:'not an age'},{items:[]},{address:'No'},{hobbies:'No'}])await assert.rejects(save(bad),/invalid_preferences/);
    assert.deepEqual(await save({who:'women'}),{age:'18–29',who:'women'});
    await q('select hp_add_wish($1,$2,$3,$4::jsonb) result',[g.id,'profile-m0','m0',JSON.stringify({...wish,id:'two',u:'https://example.com/second'})]);
    assert.deepEqual(await save({age:'65+'}),{age:'65+',who:'women'});
    const s=await q('select hp_state_delta($1,$2,null,$3,null) result',[g.id,'profile-m0','m0']);
    const profile=s.state.members.find(m=>m.id==='m0').profile;
    assert.equal(profile.items.length,2);assert.equal(profile.hobbies,'Keep hobbies');assert.equal(profile.address,'Keep address');
    assert.deepEqual(await save({who:'',age:''}),{who:'',age:''});
    const kid=await q('select hp_add_kid($1,$2,$3) result',[g.id,'profile-m0','Child']);const kidId=typeof kid==='string'?kid:kid.id;
    assert.equal((await save({age:'Under 5'},'profile-m0',kidId)).age,'Under 5');
    await assert.rejects(save({age:'5–11'},'profile-m1',kidId),/forbidden/);
    await db.exec('reset role');
    const permission=(await db.query("select has_function_privilege('anon','public.hp_set_wish_demographics(text,text,text,jsonb)','execute') allowed, has_table_privilege('anon','public.hp_members','update') direct_write")).rows[0];
    assert.equal(permission.allowed,true);assert.equal(permission.direct_write,false);
  }finally{await db.close();}
});
