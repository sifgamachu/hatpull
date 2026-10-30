import test from 'node:test';
import assert from 'node:assert/strict';
import { createEbayCatalog } from '../lib/ebay-catalog.mjs';
import { createEbayHandler } from '../lib/ebay-handler.mjs';
import { createCatalogQueue, createColdSearchLimiter } from '../lib/catalog-pressure.mjs';
import { createSearchCache } from '../lib/ebay-search-cache.mjs';

const env={EBAY_CLIENT_ID:'fixture',EBAY_CLIENT_SECRET:'fixture'};
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
const listing={itemId:'v1|123456789012|0',title:'Fixture gift',price:{value:'20',currency:'USD'},condition:'New',buyingOptions:['FIXED_PRICE']};
const delay=ms=>new Promise(r=>setTimeout(r,ms));

test('50 different searches queue behind three provider calls and all complete',async()=>{
  let active=0,peak=0,browse=0,oauth=0;
  const catalog=createEbayCatalog({env,fetcher:async url=>{
    if(url.includes('oauth2')){oauth++;return reply({access_token:'fixture'});}
    browse++;active++;peak=Math.max(peak,active);await delay(15);active--;
    return reply({itemSummaries:[listing]});
  }});
  const results=await Promise.all(Array.from({length:50},(_,i)=>catalog('search',{q:'gift '+i})));
  assert.equal(results.filter(r=>r.status==='ready').length,50);
  assert.equal(peak,3);assert.equal(browse,50);assert.equal(oauth,1);
});

test('one shared office can reuse a cached or in-flight search without spending cold-search allowance',async()=>{
  let calls=0;
  const catalog=createEbayCatalog({env,fetcher:async url=>{
    calls++;await delay(5);
    return reply(url.includes('oauth2')?{access_token:'fixture'}:{itemSummaries:[listing]});
  }});
  const handler=createEbayHandler({catalog,admit:createColdSearchLimiter({limit:1})});
  const request=q=>new Request('https://hatpull.test/api/gifts/ebay?q='+q,{headers:{'x-real-ip':'192.0.2.1'}});
  const responses=await Promise.all(Array.from({length:200},()=>handler(request('mug'))));
  assert.ok(responses.every(r=>r.status===200));assert.equal(calls,2);
  assert.equal((await handler(request('different'))).status,429);
  assert.equal((await handler(request('mug'))).status,200);
});

test('blocked retries do not extend quota windows and Retry-After matches the remaining wait',()=>{
  let time=1000;const admit=createColdSearchLimiter({limit:2,now:()=>time});
  admit('office');admit('office');time+=10000;
  assert.throws(()=>admit('office'),e=>e.retryAfter===50);
  time+=45000;assert.throws(()=>admit('office'),e=>e.retryAfter===5);
  time+=5000;assert.doesNotThrow(()=>admit('office'));
});

test('queue size and waiting time stay bounded; rejected jobs never call the provider',async()=>{
  const queue=createCatalogQueue({concurrency:1,maxQueued:1,timeoutMs:20});
  let release,calls=0;
  const first=queue.run(()=>new Promise(r=>{release=r;}));
  const second=queue.run(()=>{calls++;});
  const timeout=assert.rejects(second,e=>e.code==='busy');
  await assert.rejects(queue.run(()=>{calls++;}),e=>e.code==='busy');
  await timeout;assert.equal(calls,0);release();await first;
  await queue.run(()=>{calls++;});assert.equal(calls,1);
});

test('client retries a short queue overflow once, without retrying long provider limits',async()=>{
  let calls=0;const sleeps=[];
  const cache=createSearchCache({sleep:async ms=>sleeps.push(ms),random:()=>0,fetcher:async()=>{
    calls++;
    return calls===1?reply({status:'busy'},503,{'retry-after':'2'}):reply({status:'ready',items:[],checkedAt:Date.now(),expiresAt:Date.now()+60000});
  }});
  assert.equal((await cache.load('q=mug')).status,'ready');assert.equal(calls,2);assert.deepEqual(sleeps,[2000]);
  let blockedCalls=0;
  const blocked=createSearchCache({fetcher:async()=>{blockedCalls++;return reply({status:'busy'},429,{'retry-after':'60'});}});
  await assert.rejects(blocked.load('q=mug'));assert.equal(blockedCalls,1);
});
