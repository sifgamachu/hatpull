import test from 'node:test';
import assert from 'node:assert/strict';
import { ebayWish, ebayItemId } from '../lib/ebay-products.mjs';
import { testDatabase } from './test-db.mjs';

test('eBay one-tap wishes persist and deduplicate while gift-giver visibility and reservations stay private',async()=>{
  const db=await testDatabase(),q=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.result;
  try {
    await db.exec("insert into auth.users(id,email_confirmed_at) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',now())");
    const g=await q("select hp_create_owned_group($1::jsonb,'cccccccc-cccc-4ccc-8ccc-cccccccccccc') result",[JSON.stringify({name:'Isolated eBay wish test',mode:'draw',budget:'25',members:[{id:'m0',name:'Owner'},{id:'m1',name:'Giver'},{id:'m2',name:'Other'}]})]);
    await db.query("update hp_members set token='test-'||id where group_id=$1",[g.id]);
    await db.query("update hp_groups set settings=jsonb_set(settings,'{wishVis}','\"drawn\"'),round=1 where id=$1",[g.id]);
    await db.query("update hp_members set receiver_id='m0',drawn_round=1 where group_id=$1 and id='m1'",[g.id]);
    const wish=ebayWish({itemId:'v1|123456789012|987654321012',title:'Not persisted',price:20,image:'not persisted'},'ebay1');
    const add=(token,w=wish)=>q('select hp_add_wish($1,$2,$3,$4::jsonb) result',[g.id,token,'m0',JSON.stringify(w)]);
    await db.query('set role anon');
    assert.equal((await add('test-m0')).added,true);
    assert.equal((await add('test-m0',{...wish,id:'retry'})).added,false);
    for(const token of [null,'wrong','test-m1'])await assert.rejects(add(token),/forbidden/);
    const read=token=>q('select hp_state_delta($1,$2,null,$3,null) result',[g.id,token,'m0']);
    const giver=await read('test-m1'),saved=giver.state.members.find(m=>m.id==='m0').profile.items[0];
    assert.equal(ebayItemId(saved.u),'v1|123456789012|987654321012'); assert.equal(saved.t,'eBay gift'); assert.equal(saved.p,'');
    assert.equal((await read('test-m2')).state.members.find(m=>m.id==='m0').profile,null);
    await q('select hp_reserve($1,$2,$3,$4,true) result',[g.id,'test-m1','m0','ebay1']);
    assert.deepEqual((await read('test-m0')).state.reservations,[]);
    assert.equal((await read('test-m1')).state.reservations[0].mine,true);
    await db.query('reset role');
  } finally {await db.close();}
});
