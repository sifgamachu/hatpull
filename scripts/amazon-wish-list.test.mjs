import test from 'node:test';
import assert from 'node:assert/strict';
import { amazonWishListUrl, amazonWishListFromInput } from '../lib/amazon-wish-list.mjs';
import { giftFromInput } from '../lib/gift-intake.mjs';
import { testDatabase } from './test-db.mjs';

test('Amazon list links normalize without confusing products, carts or editing invitations', () => {
  const canonical = 'https://www.amazon.com/hz/wishlist/ls/TESTLIST123';
  for (const input of [canonical+'?ref_=wl_share&tag=other-20', 'amazon.com/gp/registry/wishlist/TESTLIST123', 'https://smile.amazon.com/hz/wishlist/ls/TESTLIST123/ref=nav_wishlist_lists_1']) assert.equal(amazonWishListUrl(input), canonical);
  assert.equal(amazonWishListUrl('https://www.amazon.co.uk/hz/wishlist/ls/TESTLIST123'), 'https://www.amazon.co.uk/hz/wishlist/ls/TESTLIST123');
  const wish = amazonWishListFromInput('My gifts: '+canonical+'?ref_=wl_share', 'list1');
  assert.equal(wish.u, canonical); assert.equal(wish.t, 'Amazon wish list'); assert.equal(wish.a, ''); assert.equal(wish.id, 'list1');
  assert.equal(giftFromInput(canonical).t, 'Amazon wish list');
  for (const bad of ['https://amazon.com.evil.example/hz/wishlist/ls/TESTLIST123','https://amazon.evil/hz/wishlist/ls/TESTLIST123','https://user:pass@amazon.com/hz/wishlist/ls/TESTLIST123','javascript:alert(1)','https://amazon.com:8000/hz/wishlist/ls/TESTLIST123','https://amazon.com/hz/wishlist/dl/invite/TESTLIST123','https://amazon.com/hz/wishlist/ls/TESTLIST123/settings','https://amazon.com/dp/B000000001','https://amazon.com/gp/cart/view.html','https://a.co/d/unknown']) {
    assert.equal(amazonWishListUrl(bad),''); assert.throws(()=>amazonWishListFromInput(bad));
  }
  assert.throws(()=>amazonWishListFromInput(canonical+' https://www.amazon.com/hz/wishlist/ls/ANOTHER123'));
});

test('one shared Amazon list persists, deduplicates and respects wish-list visibility', async () => {
  const db=await testDatabase(), q=async(sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
  try {
    await db.exec("insert into auth.users(id,email_confirmed_at) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',now())");
    const g=await q("select hp_create_owned_group($1::jsonb,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') result",[JSON.stringify({name:'Amazon list privacy test',mode:'draw',members:[{id:'m0',name:'Owner'},{id:'m1',name:'Giver'},{id:'m2',name:'Other'}]})]);
    await db.query("update hp_members set token='test-'||id where group_id=$1",[g.id]);
    await db.query("update hp_groups set settings=jsonb_set(settings,'{wishVis}','\"drawn\"'),round=1 where id=$1",[g.id]);
    await db.query("update hp_members set receiver_id='m0',drawn_round=1 where group_id=$1 and id='m1'",[g.id]);
    const wish=amazonWishListFromInput('https://www.amazon.com/hz/wishlist/ls/TESTLIST123?ref_=wl_share','list1');
    const add=()=>q('select hp_add_wish($1,$2,$3,$4::jsonb) result',[g.id,'test-m0','m0',JSON.stringify(wish)]);
    assert.equal((await add()).added,true); assert.equal((await add()).added,false);
    const read=token=>q('select hp_state_delta($1,$2,null,$3,null) result',[g.id,token,'m0']);
    assert.equal((await read('test-m0')).state.members.find(m=>m.id==='m0').profile.items.length,1);
    assert.equal((await read('test-m1')).state.members.find(m=>m.id==='m0').profile.items[0].u,wish.u);
    assert.equal((await read('test-m2')).state.members.find(m=>m.id==='m0').profile,null);
    await assert.rejects(q('select hp_add_wish($1,$2,$3,$4::jsonb) result',[g.id,'test-m2','m0',JSON.stringify(wish)]),/forbidden/);
  } finally { await db.close(); }
});
