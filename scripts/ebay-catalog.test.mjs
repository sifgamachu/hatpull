import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEbayCatalog, ebayQuery, normalizeEbayItem } from '../lib/ebay-catalog.mjs';
import { ebayItemId, ebayProductUrl, ebayWish, safeEbayImage } from '../lib/ebay-products.mjs';
import { ebayChallenge, EBAY_NOTIFICATION_URL } from '../lib/ebay-notifications.mjs';

const id = 'v1|123456789012|0', env = { EBAY_CLIENT_ID: 'test-app', EBAY_CLIENT_SECRET: 'test-secret', EBAY_CAMPAIGN_ID: '1234567890' };
const item = (patch = {}) => ({ itemId: id, title: 'Sample gift', price: { value: '19.99', currency: 'USD' }, buyingOptions: ['FIXED_PRICE'], condition: 'New', image: { imageUrl: 'https://i.ebayimg.com/images/g/sample/s-l500.jpg' }, itemWebUrl: 'https://www.ebay.com/itm/123456789012', seller: { username: 'do-not-retain' }, ...patch });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('eBay references keep variations, reject unsafe origins and persist no catalog content', () => {
  assert.equal(ebayItemId('https://www.ebay.com/itm/sample/123456789012?var=987654321012'), 'v1|123456789012|987654321012');
  assert.equal(ebayProductUrl(id), 'https://www.ebay.com/itm/123456789012');
  for (const url of ['https://www.ebay.com.evil.test/itm/123456789012', 'https://user:pass@www.ebay.com/itm/123456789012', 'https://www.ebay.com:8000/itm/123456789012', 'http://www.ebay.com/itm/123456789012', 'https://www.ebay.com/itm/123456789012?var=bad']) assert.equal(ebayItemId(url), '');
  assert.equal(safeEbayImage('https://i.ebayimg.com.evil.test/images/a.jpg'), '');
  const wish = ebayWish({ itemId: id, title: 'Not persisted', image: 'not persisted', price: 20, seller: 'not persisted' }, 'wish1');
  assert.equal(wish.t, 'eBay gift'); assert.equal(wish.u, ebayProductUrl(id)); assert.equal(wish.p, ''); assert.ok(!JSON.stringify(wish).includes('Not persisted'));
});

test('eBay normalization removes seller data and refuses invalid or expired offers', () => {
  const p = normalizeEbayItem(item({ itemAffiliateWebUrl: 'https://www.ebay.com/itm/123456789012?campid=1234567890' }), 1000000);
  assert.equal(p.price, 19.99); assert.ok(p.url.includes('campid=')); assert.equal(p.seller, undefined);
  assert.equal(normalizeEbayItem(item({ itemAffiliateWebUrl: 'https://evil.test/itm/123456789012' })).url, ebayProductUrl(id));
  for (const patch of [{ price: { value: '9', currency: 'EUR' } }, { price: { value: 'NaN', currency: 'USD' } }, { buyingOptions: ['AUCTION'] }, { itemEndDate: '2000-01-01' }, { itemId: 'bad' }]) assert.equal(normalizeEbayItem(item(patch)), null);
});

test('eBay query validation bounds budgets, pagination and search size', () => {
  assert.deepEqual(ebayQuery(new URLSearchParams('q=coffee&max=25&sort=low')), { q: 'coffee', max: 25, sort: 'low', page: 1, country: 'US' });
  for (const q of ['max=-1', 'max=10001', 'max=NaN', 'max=1e2', 'page=0', 'page=11', 'sort=__proto__', 'q=' + 'x'.repeat(101)]) assert.throws(() => ebayQuery(new URLSearchParams(q)));
});

test('preview details allow only retailer images and a bounded subset of public attributes', () => {
  const p=normalizeEbayItem(item({additionalImages:[{imageUrl:'https://evil.test/image.jpg'},...Array.from({length:9},(_,i)=>({imageUrl:`https://i.ebayimg.com/images/g/photo${i}/s-l500.jpg`}))],localizedAspects:[{name:'Color',value:'Blue'},{name:'Size',value:'Medium'},{name:'Seller email',value:'private@example.test'}],shortDescription:'x'.repeat(1000)}));
  assert.equal(p.images.length,6);assert.equal(p.images[0],p.image);assert.ok(p.images.every(url=>url.startsWith('https://i.ebayimg.com/images/')));
  assert.deepEqual(p.aspects,[{name:'Color',value:'Blue'},{name:'Size',value:'Medium'}]);assert.equal(p.summary.length,800);
  assert.ok(!JSON.stringify(p).includes('private@example'));assert.ok(!JSON.stringify(p).includes('do-not-retain'));
});

test('catalog uses read-only scope, affiliate context, exact budget filter and shared cache', async () => {
  const calls = []; let time = 1000000;
  const catalog = createEbayCatalog({ env, now: () => time, fetcher: async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/oauth2/token')) return response({ access_token: 'fixture-token', expires_in: 7200 });
    return response({ total: 48, itemSummaries: [item(), item({ itemId: 'v1|123456789013|0', price: { value: '25.01', currency: 'USD' } }), item({ condition: 'Used' })] });
  } });
  const [a,b] = await Promise.all([catalog('search',{ q:'coffee', max:25, page:1, sort:'low' }),catalog('search',{ q:'coffee', max:25, page:1, sort:'low' })]);
  assert.deepEqual(a,b); assert.equal(a.items.length,1); assert.equal(a.hasMore,true); assert.equal(calls.length,2);
  assert.equal(new URLSearchParams(calls[0].options.body).get('scope'),'https://api.ebay.com/oauth/api_scope');
  assert.equal(calls[1].options.headers['X-EBAY-C-ENDUSERCTX'],'affiliateCampaignId=1234567890');
  assert.match(new URL(calls[1].url).searchParams.get('filter'),/price:\[0.01\.\.25\]/);
  assert.equal(calls[1].options.cache,'no-store'); assert.equal(calls[1].options.redirect,'error');
  await catalog('search',{q:'coffee',max:25,page:1,sort:'low'}); assert.equal(calls.length,2);
  time += 600001; await catalog('search',{q:'coffee',max:25,page:1,sort:'low'}); assert.equal(calls.length,3);
  assert.ok(!JSON.stringify(a).includes('fixture-token')); assert.ok(!JSON.stringify(a).includes('do-not-retain'));
});

test('missing credentials and provider rate limits fail closed without leaking errors', async () => {
  const off = createEbayCatalog({env:{},fetcher:()=>{throw Error('must not fetch');}});
  assert.equal((await off('search',{q:'gift'})).status,'not_configured');
  let calls=0;
  const limited=createEbayCatalog({env,fetcher:async url=>{calls++;return url.includes('/oauth2/token')?response({access_token:'fixture'}):response({secret:'never expose'},429);}});
  await assert.rejects(limited('search',{q:'gift'}), e=>e.code==='unavailable' && !e.message.includes('secret'));
  await assert.rejects(limited('search',{q:'different'})); assert.equal(calls,2);
});

test('single-item detail avoids the restricted plural getItems endpoint', async()=>{
  const urls=[]; const catalog=createEbayCatalog({env,fetcher:async url=>{urls.push(url);return url.includes('/oauth2/token')?response({access_token:'fixture'}):response(item());}});
  assert.equal((await catalog('item',{id})).items[0].itemId,id);
  assert.equal(urls[1],`https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(id)}`);
});

test('notification challenge binds the code, secret token and fixed production endpoint',()=>{
  const token='x'.repeat(64), code='test-challenge';
  assert.equal(ebayChallenge(code,token),createHash('sha256').update(code+token+EBAY_NOTIFICATION_URL).digest('hex'));
  assert.equal(ebayChallenge('',token),''); assert.equal(ebayChallenge(code,'short'),'');
});

test('delivery countries validate, separate caches and never reuse US postage internationally',async()=>{
  const calls=[];
  const catalog=createEbayCatalog({env,now:()=>1000000,fetcher:async(url,options)=>{
    calls.push(url);
    if(url.includes('/oauth2/token'))return response({access_token:'fixture'});
    const listing=item({shippingOptions:[{shippingCost:{value:'0',currency:'USD'}}]});
    return response(url.includes('item_summary')?{itemSummaries:[listing]}:listing);
  }});
  const us=await catalog('search',{q:'mug',country:'US'});
  const ca=await catalog('search',{q:'mug',country:'CA'});
  assert.equal(us.items[0].shipping,0);assert.equal(us.items[0].country,'US');
  assert.equal(ca.items[0].shipping,null);assert.equal(ca.items[0].country,'CA');
  assert.match(new URL(calls[2]).searchParams.get('filter'),/deliveryCountry:CA/);
  assert.equal(calls.length,3);
  await catalog('search',{q:'mug',country:'CA'});assert.equal(calls.length,3);
  const detail=await catalog('item',{id,country:'CA'});assert.equal(detail.items[0].shipping,null);
  for(const country of ['ZZ','us','US,price:[0..100]']){
    await assert.rejects(catalog('search',{q:'mug',country}),e=>e.code==='invalid_query');
    await assert.rejects(catalog('item',{id,country}),e=>e.code==='invalid_query');
  }
});
