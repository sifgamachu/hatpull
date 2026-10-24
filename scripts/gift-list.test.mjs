import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedGiftItems, mergeSavedWish } from '../lib/gift-list.mjs';
import { testDatabase } from './test-db.mjs';

test('cart refuses other participants and counts idempotent additions once',()=>{
  const state={me:{id:'me'},members:[{id:'me',profile:{items:[{id:'a'}]}},{id:'kid',kid:true,parent_id:'me',profile:{items:[]}},{id:'other',profile:{items:[{id:'private'}]}}]};
  assert.deepEqual(ownedGiftItems(state,{mid:'me'}),[{id:'a'}]);
  assert.deepEqual(ownedGiftItems(state,{mid:'kid'}),[]);
  assert.throws(()=>ownedGiftItems(state,{mid:'other'}),/forbidden/);
  assert.throws(()=>ownedGiftItems({...state,me:null},{mid:'me'}),/forbidden/);
  assert.deepEqual(mergeSavedWish([{id:'a'}],{id:'a',size:'M'}),[{id:'a',size:'M'}]);
  assert.equal(mergeSavedWish(null,{id:'a'}),null);
});
test('cart edits, remove and undo preserve unrelated gifts/profile and reject unauthorized access',async()=>{
  const db=await testDatabase(),q=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.result;
  try {
    await db.exec("insert into auth.users(id,email_confirmed_at) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',now())");
    const g=await q("select hp_create_owned_group($1::jsonb,'dddddddd-dddd-4ddd-8ddd-dddddddddddd') result",[JSON.stringify({name:'Cart isolated test',mode:'draw',members:[{id:'m0',name:'Owner'},{id:'m1',name:'Giver'},{id:'m2',name:'Other'}]})]);
    await db.query("update hp_members set token='cart-'||id where group_id=$1",[g.id]);
    const one={id:'one',t:'First gift',u:'https://www.ebay.com/itm/123456789012',n:'Original'},two={id:'two',t:'Another gift',u:'https://example.com/gift'};
    await q('select hp_save_profile($1,$2,$3,$4::jsonb) result',[g.id,'cart-m0','m0',JSON.stringify({hobbies:'Keep this',address:'Private address',items:[one]})]);
    await db.query('set role anon');
    const change=(action,wish,token='cart-m0',target='m0')=>q('select hp_change_wish($1,$2,$3,$4,$5::jsonb) result',[g.id,token,target,action,JSON.stringify(wish)]);
    for(const token of [null,'wrong','cart-m1'])for(const action of ['edit','remove','restore'])await assert.rejects(change(action,{...one,size:'M'},token),/forbidden/);
    await q('select hp_add_wish($1,$2,$3,$4::jsonb) result',[g.id,'cart-m0','m0',JSON.stringify(two)]);
    const edited=await change('edit',{id:'one',size:'M',color:'Blue',n:'Gift note'});
    assert.equal(edited.items.length,2); assert.equal(edited.wish.t,one.t); assert.equal(edited.wish.color,'Blue');
    await assert.rejects(change('edit',{id:'one',address:'No'}),/invalid_wish/);
    await assert.rejects(change('edit',{id:'missing',n:'No'}),/wish_not_found/);
    await assert.rejects(change('edit',{id:'one',size:'x'.repeat(41)}),/invalid_wish/);
    const removed=await change('remove',{id:'one'});assert.deepEqual(removed.items,[two]);
    assert.equal((await change('remove',{id:'one'})).items.length,1);
    assert.equal((await change('restore',removed.wish)).items.length,2);
    assert.equal((await change('restore',removed.wish)).items.length,2);
    await change('edit',{id:'one',size:'L'});
    assert.equal((await change('restore',removed.wish)).wish.size,'L');
    await assert.rejects(change('restore',{id:'bad',t:'Bad',admin:true}),/invalid_wish/);
    const state=await q('select hp_state_delta($1,$2,null,$3,null) result',[g.id,'cart-m0','m0']);
    const profile=state.state.members.find(m=>m.id==='m0').profile;
    assert.equal(profile.hobbies,'Keep this');assert.equal(profile.address,'Private address');assert.equal(profile.items.length,2);
    assert.deepEqual(state.state.reservations,[]);
    const kid=await q('select hp_add_kid($1,$2,$3) result',[g.id,'cart-m0','Child']);
    const kidId=typeof kid==='string'?kid:kid.id;
    assert.ok(kidId);
    assert.equal((await change('restore',one,'cart-m0',kidId)).items.length,1);
    await assert.rejects(change('remove',{id:'one'},'cart-m1',kidId),/forbidden/);
    await db.query('reset role');
    const permissions=await db.query("select has_function_privilege('anon','public.hp_change_wish(text,text,text,text,jsonb)','execute') allowed,has_table_privilege('anon','public.hp_members','select') direct_read");
    assert.equal(permissions.rows[0].allowed,true);assert.equal(permissions.rows[0].direct_read,false);
  } finally {await db.close();}
});
