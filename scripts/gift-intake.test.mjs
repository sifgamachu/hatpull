import test from 'node:test';
import assert from 'node:assert/strict';
import { giftFromInput, chooseGiftContext, readGiftDraft, GIFT_DRAFT_KEY } from '../lib/gift-intake.mjs';
import { testDatabase } from './test-db.mjs';

test('one-link gifts work with Amazon Share text, short links, ASINs and other stores', () => {
  const w = giftFromInput('https://www.amazon.com/Blue-Coffee-Mug/dp/B000000001?tag=other-20', 'w1');
  assert.equal(w.t, 'Blue Coffee Mug'); assert.equal(w.a, 'B000000001'); assert.equal(w.u, 'https://www.amazon.com/dp/B000000001');
  assert.equal(giftFromInput('B000000001').t, 'My Amazon gift');
  assert.equal(giftFromInput('My cozy blanket https://a.co/d/abcdef').t, 'My cozy blanket');
  assert.equal(giftFromInput({ url: 'https://amzn.to/abcdef', title: 'A gift I love' }).t, 'A gift I love');
  assert.equal(giftFromInput('https://a.co/d/abcdef').t, 'My Amazon gift');
  assert.equal(giftFromInput('https://store.example/gift').t, 'Gift from store.example');
  assert.equal(giftFromInput('https://www.amazon.com/gift?tag=old-20&ascsubtag=x').u, 'https://www.amazon.com/gift');
  assert.equal(giftFromInput({ url: 'https://store.example/gift', title: 'x'.repeat(200) }).t.length, 120);
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@amazon.com', 'ftp://example.com', 'hello', 'https://a.co/one https://a.co/two', 'https://store.example/'+'x'.repeat(500), 'x'.repeat(9000)]) assert.throws(() => giftFromInput(value));
});

test('gift context never silently chooses the wrong celebration; pending shared gifts expire', () => {
  const contexts = [{ gid: 'a', mid: 'm1' }, { gid: 'b', mid: 'm2' }];
  assert.equal(chooseGiftContext(contexts, null), '');
  assert.equal(chooseGiftContext(contexts, 'b:m2'), 'b:m2');
  assert.equal(chooseGiftContext(contexts, 'deleted:m1'), '');
  assert.equal(chooseGiftContext(contexts.slice(0,1), null), 'a:m1');
  assert.equal(chooseGiftContext(contexts, 'b:m2', 'unknown:m1'), '');
  const values = new Map(), storage = { getItem: k => values.get(k), removeItem: k => values.delete(k) };
  values.set(GIFT_DRAFT_KEY, JSON.stringify({ at: 10, input: { url: 'https://a.co/d/abc', title: 'Cozy blanket' } }));
  assert.equal(readGiftDraft(storage, 20).t, 'Cozy blanket');
  assert.equal(readGiftDraft(storage, 3600010), null); assert.equal(values.size, 0);
  values.set(GIFT_DRAFT_KEY, '{broken'); assert.equal(readGiftDraft(storage, 20), null);
});

test('quick gift saves append atomically, deduplicate retries and enforce participant/child ownership', async () => {
  const db = await testDatabase();
  const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
  try {
    await db.query("insert into auth.users(id,email_confirmed_at) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now())");
    const g = await q("select hp_create_owned_group($1::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') result", [JSON.stringify({ name: 'Quick wish test', mode: 'draw', budget: '25', members: [{ id: 'm0', name: 'Owner' }, { id: 'm1', name: 'Giver' }, { id: 'm2', name: 'Other' }] })]);
    await db.query("update hp_members set token='test-'||id, profile='{\"hobbies\":\"Coffee\",\"items\":[]}' where group_id=$1", [g.id]);
    const wish = giftFromInput('https://amazon.com/Green-Mug/dp/B000000001', 'w1');
    const add = (token, target, w) => q('select hp_add_wish($1,$2,$3,$4::jsonb) result', [g.id, token, target, JSON.stringify(w)]);
    assert.equal((await add('test-m0','m0',wish)).added, true);
    assert.equal((await add('test-m0','m0',{...wish,id:'retry'})).added, false);
    await Promise.all([add('test-m0','m0',giftFromInput('https://store.example/a','wa')), add('test-m0','m0',giftFromInput('https://store.example/b','wb'))]);
    const p = await q("select profile result from hp_members where group_id=$1 and id='m0'", [g.id]);
    assert.equal(p.hobbies, 'Coffee'); assert.equal(p.items.length, 3);
    assert.equal((await add('test-m0','m0',{...wish,id:'blue',color:'Blue'})).added, true);
    for (const token of [null,'wrong','test-m1']) await assert.rejects(add(token,'m0',wish), /forbidden/);
    await assert.rejects(add('test-m0','missing',wish), /forbidden/);
    await db.query("update hp_members set kid=true,parent_id=null where group_id=$1 and id='m2'",[g.id]);
    await assert.rejects(add('test-m0','m2',wish), /forbidden/);
    await db.query("update hp_members set parent_id='m0' where group_id=$1 and id='m2'",[g.id]);
    assert.equal((await add('test-m0','m2',wish)).added, true);
    await assert.rejects(add('test-m1','m2',wish), /forbidden/);
    await assert.rejects(add('test-m0','m0',{...wish,id:'bad',u:'javascript:alert(1)'}), /invalid_wish/);
    await assert.rejects(add('test-m0','m0',{...wish,id:'bad',image:'remote'}), /invalid_wish/);
    await db.query("update hp_members set profile=jsonb_build_object('items',(select jsonb_agg(jsonb_build_object('id','full'||n,'t','Gift','u','https://store.example/'||n)) from generate_series(1,40)n)) where group_id=$1 and id='m0'",[g.id]);
    await assert.rejects(add('test-m0','m0',wish), /wish_list_full/);
    await db.query('set role anon');
    await assert.rejects(add(null,'m2',wish), /forbidden/);
    assert.equal((await add('test-m0','m2',wish)).added, false);
    await db.query('reset role');
    await db.query("update hp_members set token='rotated' where group_id=$1 and id='m0'", [g.id]);
    await assert.rejects(add('test-m0','m2',wish), /forbidden/);
    const summary = await q('select hp_state_delta($1,$2,null,null,null) result', [g.id,'test-m1']);
    assert.equal(summary.state.group.budget, '25');
    assert.ok(summary.state.members.every(m => m.profile === null));
  } finally { await db.close(); }
});
