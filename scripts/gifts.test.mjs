import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWish, productAsin, safeGiftUrl, safeProductImage, wishMatches, wishlistDestination } from '../lib/gifts.mjs';
import { catalogQuery, normalizeAmazonItem } from '../lib/amazon-catalog.mjs';
import { testDatabase } from './test-db.mjs';

const amazonItem = (asin, amount, extra = {}) => ({ asin, itemInfo: { title: { displayValue: 'Synthetic product for testing' } }, images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/test.jpg' } } }, detailPageURL: `https://www.amazon.com/dp/${asin}?linkCode=ogi`, offersV2: { listings: [{ price: { money: { amount, currency: 'USD' } }, availability: { type: 'IN_STOCK' }, ...extra }] } });

test('wishes preserve variants and priorities without accepting unsafe links or remote image hosts', () => {
  const wish = normalizeWish({ id: 'w1', t: 'Green mug', u: 'https://www.amazon.com/name/dp/B000000001?tag=someone-20', priority: '1', size: '12 oz', color: 'Green', image: 'not saved', price: 25 });
  assert.equal(wish.a, 'B000000001'); assert.equal(wish.priority, '1'); assert.equal(wish.size, '12 oz'); assert.equal(wish.color, 'Green'); assert.equal(wish.image, undefined); assert.equal(wish.price, undefined);
  assert.equal(wishMatches(wish, { ...wish, t: 'Another name' }), true);
  assert.equal(wishMatches(wish, { ...wish, color: 'Blue' }), false);
  assert.equal(normalizeWish({ id: 'old', t: 'Legacy wish', p: '12' }).p, '12');
  for (const bad of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@amazon.com', 'ftp://example.com']) assert.equal(safeGiftUrl(bad), '');
  assert.equal(safeGiftUrl('example.com/gift'), 'https://example.com/gift');
  assert.equal(productAsin('https://amazon.com.evil.example/dp/B000000001'), '');
  assert.equal(safeProductImage('https://example.com/image.jpg'), '');
  assert.equal(safeProductImage('https://user:pass@m.media-amazon.com/images/I/test.jpg'), '');
  assert.equal(wishlistDestination({ gid: 'group-id', mid: 'm1' }, { kind: 'product', asin: 'B000000001' }), '/g/group-id/w/m1?asin=B000000001');
  assert.equal(wishlistDestination({ gid: '../other', mid: 'm1' }, {}), '/my');
});

test('prices respect currency, availability and price-display restrictions', () => {
  const p = normalizeAmazonItem(amazonItem('B000000001', 24.99), 100, 'hatpull-20');
  assert.equal(p.price, 24.99); assert.equal(p.checkedAt, 100); assert.equal(p.expiresAt, 1800100);
  assert.ok(p.url.includes('tag=hatpull-20')); assert.ok(p.url.includes('linkCode=ogi'));
  assert.equal(normalizeAmazonItem(amazonItem('B000000001', 24.99, { violatesMAP: true }), 100, 'tag').price, null);
  assert.equal(normalizeAmazonItem(amazonItem('B000000001', 24.99, { availability: { type: 'OUT_OF_STOCK' } }), 100, 'tag').price, null);
  assert.equal(normalizeAmazonItem(amazonItem('B000000001', 24.99, { price: { money: { amount: 24.99, currency: 'GBP' } } }), 100, 'tag').price, null);
  for (const query of ['max=-1', 'max=10001', 'max=abc', 'page=11', 'page=1.5', 'min=30&max=20', 'sort=unknown', 'sort=__proto__']) assert.throws(() => catalogQuery(new URLSearchParams(query)), /invalid_query/);
  assert.deepEqual(catalogQuery(new URLSearchParams('q=coffee&max=25.50&sort=low')), { q: 'coffee', min: 0, max: 2550, page: 1, sort: 'Price:LowToHigh' });
});

test('catalog deduplicates requests, caches within TTL, filters actual displayed prices, and backs off', async () => {
  const { amazonCatalog } = await import(`../lib/amazon-catalog.mjs?test=${Date.now()}`);
  let calls = [], limited = false;
  const env = { AMAZON_CREATORS_CLIENT_ID: 'synthetic-id', AMAZON_CREATORS_CLIENT_SECRET: 'synthetic-secret', NEXT_PUBLIC_AMAZON_TAG: 'test-20' };
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/auth/')) return Response.json({ access_token: 'synthetic-token', expires_in: 3600 });
    if (limited) return new Response('', { status: 429 });
    return Response.json({ searchResult: { items: [amazonItem('B000000001', 24.99), amazonItem('B000000002', 25.01), amazonItem('B000000003', 0)] } });
  };
  const query = { keywords: 'coffee', maxPrice: 2500, itemPage: 1 };
  const results = await Promise.all(Array.from({ length: 8 }, () => amazonCatalog('searchItems', query, { fetcher, env })));
  assert.equal(calls.length, 2); assert.equal(results[0].items.length, 1); assert.equal(results[0].items[0].price, 24.99);
  assert.deepEqual(await amazonCatalog('searchItems', query, { fetcher, env }), results[0]); assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.amazon.com/auth/o2/token');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer synthetic-token');
  assert.equal(JSON.parse(calls[1].init.body).partnerTag, 'test-20');
  assert.ok(!JSON.stringify(results).includes('synthetic-secret'));
  const realNow = Date.now;
  try {
    const future = realNow() + 31 * 60000; Date.now = () => future;
    await amazonCatalog('searchItems', query, { fetcher, env }); assert.equal(calls.length, 3);
  } finally { Date.now = realNow; }
  limited = true;
  await assert.rejects(amazonCatalog('searchItems', { keywords: 'new' }, { fetcher, env }), /unavailable/);
  await assert.rejects(amazonCatalog('searchItems', { keywords: 'again' }, { fetcher, env }), /unavailable/);
  assert.equal(calls.length, 4);
  assert.deepEqual(await amazonCatalog('searchItems', query, { env: {} }), { status: 'not_configured', items: [] });
});

test('wishlist fields round-trip through real SQL while ownership and secret reservations remain enforced', async () => {
  const db = await testDatabase();
  const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
  try {
    await db.query("insert into auth.users(id,email_confirmed_at) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now())");
    const g = await q("select hp_create_owned_group($1::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') result", [JSON.stringify({ name: 'Isolated wishlist test', mode: 'draw', members: [{ id: 'm0', name: 'Owner' }, { id: 'm1', name: 'Giver' }, { id: 'm2', name: 'Other' }] })]);
    await db.query("update hp_members set token='test-'||id where group_id=$1", [g.id]);
    const wish = normalizeWish({ id: 'w1', t: 'My blue coffee mug', a: 'B000000001', u: 'https://www.amazon.com/dp/B000000001', size: '12 oz', color: 'Blue', priority: '1', n: 'Please choose the lid version', p: '25' });
    const profile = { hobbies: 'Coffee', items: [wish] };
    await q('select hp_save_profile($1,$2,$3,$4::jsonb) result', [g.id, 'test-m0', 'm0', JSON.stringify(profile)]);
    assert.deepEqual(await q("select profile result from hp_members where group_id=$1 and id='m0'", [g.id]), profile);
    await assert.rejects(q('select hp_save_profile($1,$2,$3,$4::jsonb) result', [g.id, 'test-m1', 'm0', JSON.stringify(profile)]), /forbidden/);
    await q('select hp_reserve($1,$2,$3,$4,true) result', [g.id, 'test-m1', 'm0', 'w1']);
    const owner = await q('select hp_state_delta($1,$2,null,$3,null) result', [g.id, 'test-m0', 'm0']);
    assert.deepEqual(owner.state.reservations, []);
    const giver = await q('select hp_state_delta($1,$2,null,$3,null) result', [g.id, 'test-m1', 'm0']);
    assert.equal(giver.state.reservations[0].mine, true);
    await assert.rejects(q('select hp_reserve($1,$2,$3,$4,true) result', [g.id, 'test-m0', 'm0', 'w1']), /own|forbidden/);
    await q('select hp_save_profile($1,$2,$3,$4::jsonb) result', [g.id, 'test-m0', 'm0', JSON.stringify({ ...profile, items: [{ ...wish, color: 'Forest green' }] })]);
    assert.equal((await q("select profile result from hp_members where group_id=$1 and id='m0'", [g.id])).items[0].color, 'Forest green');
  } finally { await db.close(); }
});
