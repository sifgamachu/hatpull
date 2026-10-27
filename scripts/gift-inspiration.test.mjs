import test from 'node:test';
import assert from 'node:assert/strict';
import {giftInspirationPlan,mergeInspiration,loadGiftInspiration,isInspirationProduct} from '../lib/gift-inspiration.mjs';
import {cleanWishDemographics,giftPreferenceChips,giftPreferencesFromProfile} from '../lib/gift-preferences.mjs';
const now=1000000;
const item=(id,extra={})=>({itemId:id,title:`Product ${id}`,image:'https://i.ebayimg.com/images/g/test/s-l300.jpg',price:25,shipping:0,checkedAt:now,expiresAt:now+600000,...extra});
const result=items=>({status:'ready',items,checkedAt:now,expiresAt:now+600000,hasMore:true});
test('exact ages remain optional, preserve legacy values, and map to appropriate product families',()=>{
  for(const age of ['0','1','11','12','17','18','40','120'])assert.equal(cleanWishDemographics({age}).age,age);
  for(const age of ['-1','121','1.5','01',40])assert.equal(cleanWishDemographics({age}).age,'');
  assert.equal(giftPreferencesFromProfile({age:'40',who:'men'}).age,'40');
  assert.equal(giftPreferenceChips({age:'40'})[0].label,'40 years old');
  assert.equal(cleanWishDemographics({age:'30–44'}).age,'30–44');
  assert.ok(giftInspirationPlan({age:'0'}).every(f=>f.id.startsWith('toddler')));
  assert.ok(giftInspirationPlan({age:'8',gender:'men'}).every(f=>f.id.startsWith('kids')));
  assert.ok(!giftInspirationPlan({age:'15',gender:'men'}).some(f=>['sockets','inflator'].includes(f.id)));
  assert.deepEqual(giftInspirationPlan({age:'40',gender:'men'}).map(f=>f.id),['mug','inflator','drone','speaker','sockets','bits']);
  assert.ok(giftInspirationPlan({age:'40',gender:'women'}).some(f=>f.id==='charger'));
  assert.ok(giftInspirationPlan({age:'40',interests:['games']}).every(f=>/game|puzzle/.test(f.q)));
  assert.notDeepEqual(giftInspirationPlan({age:'40',gender:'men'},1),giftInspirationPlan({age:'40',gender:'men'},2));
});
test('inspiration interleaves families, deduplicates, respects budget and never extends expiry',()=>{
  const a=result([item('a'),item('b'),item('exp',{expiresAt:now-1}),item('high',{price:51}),item('box',{title:'Empty box'})]);
  const b=result([item('a'),item('dup',{title:'NEW Product b sealed'}),item('c',{price:20}),item('d',{expiresAt:now+1000})]);
  const merged=mergeInspiration([a,b],{max:50,now});
  assert.deepEqual(merged.items.map(i=>i.itemId),['a','dup','c','d']);
  assert.equal(merged.items.find(i=>i.itemId==='d').expiresAt,now+1000);
  assert.equal(mergeInspiration([a,b],{max:50,sort:'low',now}).items[0].itemId,'c');
  assert.equal(a.items.length,5);
});
test('two parallel requests show partial products early and retain successful families after a failure',async()=>{
  let active=0,peak=0;const releases=[],updates=[],keys=[];
  const work=loadGiftInspiration({preferences:{age:'40',gender:'men'},max:50,now:()=>now,onUpdate:x=>updates.push(x),load:key=>{keys.push(key);active++;peak=Math.max(active,peak);return new Promise((resolve,reject)=>releases.push((fail=false)=>{active--;fail?reject(Error('unavailable')):resolve(result([item(key)]));}));}});
  assert.equal(releases.length,2);releases.shift()();await new Promise(r=>setImmediate(r));
  assert.equal(updates[0].items.length,1);assert.equal(updates[0].loadingMore,true);
  releases.shift()(true);await new Promise(r=>setImmediate(r));
  while(releases.length){releases.shift()();await new Promise(r=>setImmediate(r));}
  await work;assert.equal(peak,2);assert.equal(keys.length,6);assert.equal(updates.at(-1).partial,true);assert.equal(updates.at(-1).loadingMore,false);assert.ok(updates.at(-1).items.length>0);
  assert.ok(keys.every(k=>new URLSearchParams(k).get('max')==='50'&&!k.includes('40')));
});
test('changing preferences stops queued work and ignores obsolete results',async()=>{
  let live=true,calls=0,updates=0;const releases=[];
  const work=loadGiftInspiration({preferences:{},now:()=>now,isCurrent:()=>live,onUpdate:()=>updates++,load:()=>{calls++;return new Promise(resolve=>releases.push(()=>resolve(result([item('x')]))));}});
  live=false;releases.forEach(r=>r());await work;assert.equal(calls,2);assert.equal(updates,0);
});

test('accessory-only listings are removed without hiding sets supplied in a case',()=>{
 assert.equal(isInspirationProduct('sockets','SWANLAKE Socket Holder Organizer Set'),false);
 assert.equal(isInspirationProduct('sockets','Swanlake Red Magnetic Socket Organizers'),false);
 assert.equal(isInspirationProduct('speaker','JBL Clip 5 Portable Bluetooth Speaker Case'),false);
 assert.equal(isInspirationProduct('drone','DEERC D20 Propeller Set'),false);
 assert.equal(isInspirationProduct('bits','DEWALT Screwdriver Bit Set with Tough Case'),true);
 assert.equal(isInspirationProduct('mug','Stanley Stay-Hot Camp Mug'),true);
});
