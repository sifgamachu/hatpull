import test from 'node:test';
import assert from 'node:assert/strict';
import {giftInspirationPlan,mergeInspiration,loadGiftInspiration,isInspirationProduct} from '../lib/gift-inspiration.mjs';
import {cleanWishDemographics,giftPreferenceChips,giftPreferencesFromProfile} from '../lib/gift-preferences.mjs';
import {storePreviewIdeas} from '../lib/store-preview-ideas.mjs';
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

test('store preview loads three matching families, keeps one product per family and enforces the budget',async()=>{
  const keys=[],updates=[];
  await loadGiftInspiration({preferences:{age:'8',gender:'men'},max:20,familyLimit:3,perFamily:1,now:()=>now,onUpdate:data=>updates.push(data),load:async key=>{
    keys.push(key);return result([item(key+'-expensive',{price:30}),item(key+'-valid',{price:15}),item(key+'-extra',{price:10})]);
  }});
  assert.equal(keys.length,3);
  assert.ok(keys.every(key=>new URLSearchParams(key).get('max')==='20'));
  assert.ok(keys.every(key=>/kids|toy/.test(new URLSearchParams(key).get('q'))));
  assert.equal(updates.at(-1).items.length,3);
  assert.ok(updates.at(-1).items.every(p=>p.price===15));
  assert.equal(updates.at(-1).loadingMore,false);
});

test('store ideas change with the saved profile, use complete mappings and contain no retailer price or stock claims',()=>{
  const male=storePreviewIdeas({age:'35',who:'men',name:'PRIVATE NAME',address:'PRIVATE ADDRESS'});
  const female=storePreviewIdeas({age:'35',who:'women'}), child=storePreviewIdeas({age:'8',who:'men'});
  assert.notDeepEqual(male.map(x=>x.id),female.map(x=>x.id));
  assert.ok(child.every(x=>x.id.startsWith('kids')));
  assert.ok(storePreviewIdeas({age:'2'}).every(x=>x.id.startsWith('toddler')));
  assert.doesNotMatch(JSON.stringify(male),/PRIVATE|35/);
  for(const age of ['','0','8','15','25','35','70','120','5–11'])for(const who of ['','women','men']) {
    const ideas=storePreviewIdeas({age,who},6);
    assert.equal(ideas.length,6);
    assert.ok(ideas.every(x=>x.title&&x.art&&x.query&&!('price' in x)&&!('inStock' in x)));
  }
});

test('child suggestions reject explicitly incompatible age ranges without guessing missing age guidance',()=>{
  assert.equal(isInspirationProduct('kidspuzzle','Puzzles for Kids Ages 3-5 4-6 Toddler 24 Pieces',{age:'8'}),false);
  assert.equal(isInspirationProduct('kidspuzzle','Puzzle for ages 3-5, 8-12',{age:'8'}),true);
  assert.equal(isInspirationProduct('kidsblocks','Building Blocks Ages 8-14',{age:'8'}),true);
  assert.equal(isInspirationProduct('kidsblocks','Building Blocks Ages 8-14',{age:'6'}),false);
  assert.equal(isInspirationProduct('kidsgame','Board Game Ages 10+',{age:'8'}),false);
  assert.equal(isInspirationProduct('kidsgame','Board Game Ages 10+',{age:'12'}),true);
  assert.equal(isInspirationProduct('kidspuzzle','Jigsaw Puzzle 1000 Pieces',{age:'8'}),true);
  assert.equal(isInspirationProduct('kidspuzzle','Puzzles for Ages 3-5',{age:'kids'}),true);
});

test('explicit interests override adult gender order and share the three preview positions',()=>{
  const preferences={age:'40',gender:'men',interests:['coffee','tech','outdoors']};
  const male=giftInspirationPlan(preferences),female=giftInspirationPlan({...preferences,gender:'women'});
  assert.deepEqual(male,female);
  assert.deepEqual(male.slice(0,3).map(x=>x.id),['mug','speaker','inflator']);
  assert.deepEqual(storePreviewIdeas({age:'40',who:'men',interests:preferences.interests}).map(x=>x.id),male.slice(0,3).map(x=>x.id));
  assert.ok(giftInspirationPlan({age:'3',interests:['tech','outdoors']}).every(f=>f.id.startsWith('toddler')));
});

test('country reaches preview searches without exact ages or private profile details',async()=>{
  const keys=[];
  await loadGiftInspiration({preferences:giftPreferencesFromProfile({age:'43',who:'women',interests:['tech'],country:'CA',address:'PRIVATE ADDRESS',name:'PRIVATE NAME'}),max:25,familyLimit:3,perFamily:1,now:()=>now,onUpdate:()=>{},load:async key=>{keys.push(key);return result([item(key)]);}});
  assert.ok(keys.length>0);
  assert.ok(keys.every(key=>new URLSearchParams(key).get('country')==='CA'&&new URLSearchParams(key).get('max')==='25'));
  assert.ok(keys.every(key=>!/PRIVATE|43/.test(key)));
});
