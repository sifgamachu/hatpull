import test from 'node:test';
import assert from 'node:assert/strict';
import { readJsonObject } from '../lib/request-body.mjs';
import { createCelebrationHandler, createRedrawHandler } from '../lib/organizer-handlers.mjs';
import { createGroupLoader } from '../lib/group-sync.mjs';
import { createEbayCatalog } from '../lib/ebay-catalog.mjs';
import { createEbayHandler } from '../lib/ebay-handler.mjs';
import { createSearchCache } from '../lib/ebay-search-cache.mjs';

const valid={name:'Isolated QA',orgName:'Organizer',people:['Organizer','Cedar','Maple','Pine'],mode:'draw',includeMe:true,date:'2026-12-25',budget:'50',cur:'$',exclusions:[{a:'Organizer',b:'Cedar'}]};
const req=(body,headers={})=>new Request('http://localhost/api/test',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body),headers});
const tick=()=>new Promise(r=>setImmediate(r));

test('streamed JSON limits count bytes, reject malformed roots and release stalled readers',async()=>{
  for(const body of ['null','[]','false','1','"text"','{',''])await assert.rejects(readJsonObject(req(body)),e=>e.status===400);
  await assert.rejects(readJsonObject(req('{}',{'content-length':'1500001'})),e=>e.status===413);
  await assert.rejects(readJsonObject(req({name:'🎁'.repeat(20)}),{maxBytes:50}),e=>e.status===413);
  let cancelled=false;
  const slow=new Request('http://localhost',{method:'POST',duplex:'half',body:new ReadableStream({cancel(){cancelled=true;}})});
  await assert.rejects(readJsonObject(slow,{timeoutMs:15}),e=>e.status===408);assert.equal(cancelled,true);
  const chunks=['{"name":"','🎁','"}'].map(s=>new TextEncoder().encode(s));
  const stream=new ReadableStream({start(c){for(const chunk of chunks)for(const byte of chunk)c.enqueue(Uint8Array.of(byte));c.close();}});
  assert.deepEqual(await readJsonObject(new Request('http://localhost',{method:'POST',duplex:'half',body:stream})),{name:'🎁'});
});

test('creation API rejects malformed inputs before writes, including schema and calendar boundaries',async()=>{
  let writes=0;const handler=createCelebrationHandler({verify:async()=> 'owner',rpc:async()=>{writes++;return {ok:true}}});
  const invalid=[null,[],{}, {people:{}},{people:'abc'},{people:[null,'a','b']},{people:Array.from({length:201},(_,i)=>''+i)}, {exclusions:{}},{exclusions:[null]},{exclusions:[{a:[],b:'x'}]}, {name:{}},{orgName:''},{cur:'JPY'},{date:'2026-02-30'},{date:'0000-01-01'}, {budget:'NaN'},{budget:'Infinity'},{budget:'-1'},{budget:'0'},{budget:'10001'},{budget:'1.001'},{budget:{}},{mode:'hack'},{includeMe:'false'},{orgName:'Missing'},{people:['a','A','b']},{people:['x'.repeat(41),'x'.repeat(40)+'y','z']},{people:['a','b']},{people:['a','b','c'],includeMe:false,exclusions:[{a:'a',b:'b'}]}];
  for(const patch of invalid){const body=patch===null||Array.isArray(patch)?patch:{...valid,...patch};if(patch&&Object.keys(patch).length===0)body.name='';const r=await handler(req(body));assert.equal(r.status,400,JSON.stringify(patch));assert.equal(r.headers.get('cache-control'),'no-store');}
  assert.equal(writes,0);
  let seen;const good=createCelebrationHandler({verify:async()=> 'verified-owner',rpc:async(fn,args)=>(seen={fn,args},{id:'fixture'})});
  assert.equal((await good(req({...valid,p_owner:'attacker'}))).status,200);
  assert.equal(seen.args.p_owner,'verified-owner');assert.equal(seen.args.p.members.length,4);assert.equal(seen.args.p.exclusions.length,1);
  assert.equal(seen.args.p.org_mid,seen.args.p.members[0].id);
  assert.equal((await good(req({...valid,date:'2028-02-29',budget:'0.01'}))).status,200);
});

test('creation API auth, bounded per-account allowance and upstream failures fail safely',async()=>{
  let reads=0;const unauth=createCelebrationHandler({verify:async()=>{throw Error('not_signed_in')},rpc:()=>{reads++}});
  assert.equal((await unauth(req(valid))).status,401);assert.equal(reads,0);
  let time=1000,writes=0;const handler=createCelebrationHandler({now:()=>time,verify:async h=>h,rpc:async()=>{writes++;return {id:'fixture'}}});
  const calls=await Promise.all(Array.from({length:30},()=>handler(req(valid,{authorization:'owner-a'}))));
  assert.equal(calls.filter(r=>r.status===200).length,20);assert.equal(calls.filter(r=>r.status===429).length,10);assert.equal(writes,20);
  assert.equal((await handler(req(valid,{authorization:'owner-b'}))).status,200);time+=600000;
  assert.equal((await handler(req(valid,{authorization:'owner-a'}))).status,200);
  for(const [message,status] of [['forbidden',403],['busy',503],['slow_down',429],['no_valid_draw',400],['fixture-private-server-detail',500]]){
    const h=createCelebrationHandler({verify:async()=> 'owner',rpc:async()=>{throw Error(message)}});
    const r=await h(req(valid));assert.equal(r.status,status);assert.ok(!(await r.text()).includes('fixture-private-server-detail'));
  }
});

test('redraw API rejects malformed bodies and over-capacity rosters without any redraw',async()=>{
  let writes=0,reads=0;
  const roster={mode:'draw',members:Array.from({length:200},(_,i)=>({id:'p'+i,name:'Person '+i})),exclusions:[]};
  const h=createRedrawHandler({verify:async()=> 'owner',rpc:async fn=>{if(fn==='hp_owned_roster'){reads++;return roster;}writes++;return true;}});
  for(const b of [null,[],{gid:[]},{gid:'g',add:{}},{gid:'g',add:[null]},{gid:'g',remove:'p1'},{gid:'g',remove:[null]},{gid:'g',exclusions:[{}]}])assert.equal((await h(req(b))).status,400);
  assert.equal(reads,0);
  assert.equal((await h(req({gid:'g',add:['New person']}))).status,400);assert.equal(writes,0);
  assert.equal((await h(req({gid:'g',add:['New person'],remove:['p199']}))).status,200);assert.equal(writes,1);
  const forbidden=createRedrawHandler({verify:async()=> 'other',rpc:async()=>{throw Error('forbidden')}});
  assert.equal((await forbidden(req({gid:'g'}))).status,403);
});

test('simultaneous refreshes coalesce but a write during the follow-up still gets a newer read',async()=>{
  const releases=[],updates=[];let calls=0;
  const loader=createGroupLoader(()=>{calls++;return new Promise(resolve=>releases.push(resolve))},s=>updates.push(s));
  const first=loader.load();const batch=Array.from({length:100},()=>loader.load(true));
  releases.shift()({version:'1',state:{revision:1}});await first;await tick();assert.equal(calls,2);
  const newer=loader.load(true);releases.shift()({version:'2',state:{revision:2}});await Promise.all(batch);await tick();assert.equal(calls,3);
  releases.shift()({version:'3',state:{revision:3}});await newer;assert.deepEqual(updates.map(s=>s.revision),[1,2,3]);
  loader.dispose();await loader.load(true);assert.equal(calls,3);
});

test('refresh storms recover from a rejected stale request and disposal suppresses updates',async()=>{
  let calls=0;const updates=[];
  const loader=createGroupLoader(async()=>{if(++calls===1)throw Error('network');return {version:'2',state:{ok:true}}},x=>updates.push(x));
  const first=loader.load();const next=loader.load(true);await assert.rejects(first);await next;assert.equal(calls,2);assert.equal(updates.length,1);
  let release;const disposed=createGroupLoader(()=>new Promise(r=>release=r),()=>assert.fail('disposed callback'));
  const pending=disposed.load(),forced=disposed.load(true);disposed.dispose();release({version:'1',state:{}});await Promise.all([pending,forced]);
});

test('retailer faults do not leak provider bodies or poison recovery; malformed/expired listings are filtered',async()=>{
  const env={EBAY_CLIENT_ID:'fixture',EBAY_CLIENT_SECRET:'fixture'};let clock=1000000,mode='failure';
  const listing={itemId:'v1|123456789012|0',title:'Fixture mug',price:{currency:'USD',value:'12'},buyingOptions:['FIXED_PRICE'],condition:'New'};
  const catalog=createEbayCatalog({env,now:()=>clock,fetcher:async url=>{
    if(url.includes('oauth2'))return Response.json({access_token:'fixture',expires_in:7200});
    if(mode==='failure')return Response.json({secret:'private-fixture'},{status:429});
    if(mode==='malformed')return new Response('{');
    return Response.json({itemSummaries:[listing,{...listing,itemId:'bad'},{...listing,itemId:'v1|123456789013|0',itemEndDate:new Date(clock-1).toISOString()}]});
  }}),handler=createEbayHandler({catalog});
  const search=()=>handler(new Request('http://localhost/api/gifts/ebay?q=mug'));
  let r=await search();assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private-fixture'));assert.equal(r.headers.get('cache-control'),'no-store');
  mode='good';r=await search();assert.equal(r.status,503);clock+=60001;r=await search();assert.equal(r.status,200);assert.equal((await r.json()).items.length,1);
  mode='malformed';clock+=600001;assert.equal((await search()).status,503);mode='good';assert.equal((await search()).status,200);
});

test('1000 same-query clients share network work, recover after rejection, and never cache errors',async()=>{
  let calls=0,fail=true;
  const cache=createSearchCache({fetcher:async()=>{calls++;await tick();if(fail)return Response.json({status:'busy'},{status:503,headers:{'retry-after':'60'}});return Response.json({status:'ready',items:[],checkedAt:Date.now(),expiresAt:Date.now()+60000});}});
  const rejected=await Promise.allSettled(Array.from({length:1000},()=>cache.load('q=mug')));
  assert.ok(rejected.every(x=>x.status==='rejected'));assert.equal(calls,1);fail=false;
  const recovered=await Promise.all(Array.from({length:1000},()=>cache.load('q=mug')));assert.equal(calls,2);assert.ok(recovered.every(x=>x.status==='ready'));
});
