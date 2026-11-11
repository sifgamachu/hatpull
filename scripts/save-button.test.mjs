import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { saveButtonCode, noteStoreTrip, readStoreTrip, clearStoreTrip, storeFromHref } from '../lib/save-button.mjs';
import { giftFromInput } from '../lib/gift-intake.mjs';

function runOnPage({ href, canonical, title, h1, docTitle, popup = true }) {
  const opened = [];
  const doc = {
    title: docTitle || '',
    querySelector: sel => sel.startsWith('link') ? (canonical ? { href: canonical } : null) : (h1 ? { innerText: h1 } : null),
    getElementById: id => id === 'productTitle' && title ? { innerText: title } : null,
  };
  const location = { href };
  const window = { open: (url, name, features) => { opened.push({ url, name, features }); return popup ? {} : null; } };
  const code = saveButtonCode('https://hatpull.com');
  assert.ok(code.startsWith('javascript:'));
  vm.runInNewContext(decodeURIComponent(code.slice('javascript:'.length)), { document: doc, location, window, encodeURIComponent, alert: () => { throw new Error('alerted'); } });
  return { opened, location };
}

test('save button sends the Amazon product link and name to /share-gift', () => {
  const { opened } = runOnPage({ href: 'https://www.amazon.com/Stanley-Quencher/dp/B0CJZMP7L1/ref=sr_1_1?tag=other-20', canonical: 'https://www.amazon.com/Stanley-Quencher/dp/B0CJZMP7L1', title: '  Stanley Quencher   H2.0 Tumbler 40 oz ' });
  assert.equal(opened.length, 1);
  const url = new URL(opened[0].url);
  assert.equal(url.origin + url.pathname, 'https://hatpull.com/share-gift');
  assert.equal(url.searchParams.get('via'), 'button');
  assert.equal(url.searchParams.get('title'), 'Stanley Quencher H2.0 Tumbler 40 oz');
  const wish = giftFromInput({ url: url.searchParams.get('url'), title: url.searchParams.get('title') });
  assert.equal(wish.a, 'B0CJZMP7L1');
  assert.equal(wish.t, 'Stanley Quencher H2.0 Tumbler 40 oz');
  assert.ok(!wish.u.includes('other-20'));
});

test('save button falls back to same-tab navigation when popups are blocked', () => {
  const { location } = runOnPage({ href: 'https://www.target.com/p/mug/-/A-123', h1: 'Mug', popup: false });
  assert.match(location.href, /^https:\/\/hatpull\.com\/share-gift\?via=button&url=https%3A%2F%2Fwww\.target\.com/);
});

test('store trips expire and recognise stores', () => {
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  noteStoreTrip(storage, 'amazon', 1000);
  assert.deepEqual(readStoreTrip(storage, 2000), { store: 'amazon', at: 1000 });
  assert.equal(readStoreTrip(storage, 1000 + 4 * 3600000), null);
  clearStoreTrip(storage); assert.equal(readStoreTrip(storage, 2000), null);
  assert.equal(storeFromHref('https://www.amazon.com/s?k=mug&tag=hatpull-20'), 'amazon');
  assert.equal(storeFromHref('https://amzn.to/abc'), 'amazon');
  assert.equal(storeFromHref('https://www.ebay.com/itm/123'), 'ebay');
  assert.equal(storeFromHref('https://evil-amazon.com.example.net/'), '');
});

test('saved gifts are logged anonymously with their source, once, and are not readable by visitors', async () => {
  const { testDatabase } = await import('./test-db.mjs');
  const db = await testDatabase(), q = async (sql, args = []) => (await db.query(sql, args)).rows;
  try {
    await db.exec("insert into auth.users(id,email_confirmed_at) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',now())");
    const [{ result: g }] = await q("select hp_create_owned_group($1::jsonb,'cccccccc-cccc-4ccc-8ccc-cccccccccccc') result", [JSON.stringify({ name: 'Insights test', mode: 'draw', budget: '$40', members: [{ id: 'm0', name: 'Alice Private' }, { id: 'm1', name: 'Bob' }, { id: 'm2', name: 'Cy' }] })]);
    await db.query("update hp_members set token='test-'||id where group_id=$1", [g.id]);
    const before = (await q('select count(*)::int n from hp_gift_saves'))[0].n;
    const wish = giftFromInput({ url: 'https://www.amazon.com/dp/B0CJZMP7L1', title: 'Stanley Tumbler' }, 'w1');
    const add = (src) => q('select hp_add_wish($1,$2,$3,$4::jsonb,$5) result', [g.id, 'test-m0', 'm0', JSON.stringify(wish), src]);
    assert.equal((await add('button'))[0].result.added, true);
    assert.equal((await add('button'))[0].result.added, false);
    // Four-argument calls from older pages still work.
    await q('select hp_add_wish($1,$2,$3,$4::jsonb) result', [g.id, 'test-m0', 'm0', JSON.stringify(giftFromInput('https://www.target.com/p/mug/-/A-1?x=1', 'w2'))]);
    const rows = await q('select * from hp_gift_saves order by id desc limit 2');
    assert.equal((await q('select count(*)::int n from hp_gift_saves'))[0].n, before + 2);
    const amazon = rows.find(r => r.store === 'amazon');
    assert.deepEqual([amazon.asin, amazon.product_key, amazon.source, amazon.budget_band, amazon.title], ['B0CJZMP7L1', 'B0CJZMP7L1', 'button', '26-50', 'Stanley Tumbler']);
    const target = rows.find(r => r.store === 'target.com');
    assert.equal(target.product_key, 'target.com/p/mug/-/A-1'); assert.equal(target.source, 'unknown');
    assert.ok(!JSON.stringify(rows).includes(g.id) && !JSON.stringify(rows).includes('Alice'));
    await assert.rejects(db.exec('set role anon; select * from hp_gift_saves'), /permission denied/); await db.exec('reset role');
  } finally { await db.close(); }
});
