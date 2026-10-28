import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchCache, searchKey, catalogCacheHeaders, catalogLifetime } from '../lib/ebay-search-cache.mjs';
const data = (now, patch={}) => ({status:'ready',checkedAt:now,expiresAt:now+600000,items:[{itemId:'v1|123456789012|0',expiresAt:now+600000}],...patch});
const reply = (value,status=200) => new Response(JSON.stringify(value),{status});

test('repeated and concurrent searches reuse fresh data without another network request',async()=>{
  let calls=0,time=1000000,release;
  const gate=new Promise(r=>{release=r;});
  const cache=createSearchCache({now:()=>time,fetcher:async(url,options)=>{calls++;assert.equal(options.credentials,'omit');assert.equal(options.cache,undefined);await gate;return reply(data(time));}});
  const key=searchKey({q:' Coffee   Gifts ',max:25});
  assert.equal(key,searchKey({q:'coffee gifts',max:25}));
  const first=cache.load(key),second=cache.load(key);assert.equal(first,second);release();
  const value=await first;assert.equal(cache.peek(key),value);await cache.load(key);assert.equal(calls,1);
  time+=600001;assert.equal(cache.peek(key),null);await cache.load(key);assert.equal(calls,2);
});

test('budget and sort changes have separate results and the memory cache stays bounded',async()=>{
  const cache=createSearchCache({limit:2,now:()=>1000000,fetcher:async()=>reply(data(1000000))});
  const keys=[searchKey({q:'coffee',max:15}),searchKey({q:'coffee',max:25}),searchKey({q:'coffee',max:25,sort:'low'})];
  for(const key of keys)await cache.load(key);
  assert.equal(cache.peek(keys[0]),null);assert.ok(cache.peek(keys[1]));assert.ok(cache.peek(keys[2]));
});

test('edge TTL never extends original product expiry and never caches errors',()=>{
  const now=1000000;
  assert.equal(catalogCacheHeaders(data(now),now)['Vercel-CDN-Cache-Control'],'public, s-maxage=300, must-revalidate');
  assert.equal(catalogCacheHeaders(data(now),now+550000)['Vercel-CDN-Cache-Control'],'public, s-maxage=48, must-revalidate');
  for(const d of [data(now,{status:'unavailable'}),data(now,{status:'not_configured'}),data(now,{expiresAt:now-1}),data(now,{items:[{expiresAt:now}]})])assert.deepEqual(catalogCacheHeaders(d,now),{'Cache-Control':'no-store'});
  assert.equal(catalogLifetime(data(now,{expiresAt:now+9999999}),now),600000);
});

test('expired edge data is revalidated, while failed responses never poison later searches',async()=>{
  let calls=0;
  const cache=createSearchCache({now:()=>1000000,fetcher:async(url,options)=>{calls++;if(calls===1)return reply(data(1));assert.equal(options.cache,'reload');return reply(data(1000000));}});
  assert.equal((await cache.load('q=coffee')).checkedAt,1000000);assert.equal(calls,2);
  let fail=true;
  const recovering=createSearchCache({now:()=>1000000,fetcher:async()=>fail?reply({status:'unavailable'},503):reply(data(1000000))});
  await assert.rejects(recovering.load('q=coffee'),/catalog_unavailable/);assert.equal(recovering.peek('q=coffee'),null);
  fail=false;assert.equal((await recovering.load('q=coffee')).status,'ready');
});

test('a saved gift reuses its search photo without extending product expiry',async()=>{
  let time=1000,calls=0;
  const cache=createSearchCache({now:()=>time,fetcher:async()=>{calls++;return {ok:true,json:async()=>({status:'ready',checkedAt:1000,expiresAt:5000,items:[{itemId:'v1|123456789012|0',expiresAt:4000,image:'https://i.ebayimg.com/images/example.jpg'}]})};}});
  await cache.load('q=coffee');
  assert.equal(cache.peekProduct('v1|123456789012|0').image,'https://i.ebayimg.com/images/example.jpg');
  assert.equal(calls,1);
  time=4000;
  assert.equal(cache.peekProduct('v1|123456789012|0'),null);
});

test('public cache keys isolate shipping destinations and normalize invalid client preferences',()=>{
 const us=searchKey({q:'mug',max:25}),ca=searchKey({q:'mug',max:25,country:'CA'});
 assert.notEqual(us,ca);assert.equal(new URLSearchParams(ca).get('country'),'CA');
 assert.equal(us,searchKey({q:'mug',max:25,country:'PRIVATE ADDRESS'}));
});
