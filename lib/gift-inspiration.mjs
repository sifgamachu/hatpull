import { ageBand, exactAge, cleanGiftPreferences } from './gift-preferences.mjs';
import { searchKey } from './ebay-search-cache.mjs';

// Public, reusable product families. Exact ages and private profile text never
// reach retailer requests. Gender is an optional ordering hint, not a restriction.
const families = {
  mug:['Stanley camp mug','coffee'], inflator:['AUXITO tire inflator','outdoors'],
  drone:['DEERC D20 drone','tech'],
  speaker:['JBL bluetooth speaker','tech'], sockets:['SWANLAKE socket set','tools'], bits:['DEWALT screwdriver bit set','tools'],
  fitness:['push up board','fitness'], charger:['Anker power bank','tech'],
  coffee:['coffee sampler','coffee'], games:['board game','games'], camping:['camping lantern','outdoors'],
  journal:['hardcover journal','books'], blanket:['throw blanket','home'],
  art:['watercolor paint set','crafts'], care:['skin care gift set','care'], candle:['scented candle','home'],
  tea:['tea sampler','coffee'], puzzle:['jigsaw puzzle 1000','games'],
  mat:['yoga mat','fitness'], book:['adult coloring book','books'],
  headphones:['wireless headphones','tech'], crafts:['craft kit','crafts'],
  kidsblocks:['building blocks toy','games'], kidspuzzle:['kids jigsaw puzzle','games'],
  kidsart:['kids art set','crafts'], kidsgame:['kids board game','games'],
  kidsoutdoors:['kids binoculars','outdoors'], kidsbooks:['children picture book','books'],
  toddlersort:['toddler shape sorter','games'], toddlerblocks:['toddler building blocks','games'],
  toddlerpuzzle:['toddler wooden puzzle','games'], toddlerbook:['toddler board book','books'],
  toddlerplush:['toddler stuffed animal','home'], toddlerart:['toddler washable crayons','crafts'],
};
const adult = ['mug','inflator','drone','speaker','sockets','bits','fitness','charger','coffee','games','camping','journal'];
const general = ['mug','speaker','blanket','charger','games','art','tea','puzzle','journal','mat','candle','care'];
const women = ['mug','charger','blanket','journal','art','care','speaker','games','tea','mat','candle','book'];
const teens = ['headphones','speaker','games','art','charger','journal','puzzle','crafts','blanket','camping','book','mat'];
const kids = ['kidsblocks','kidspuzzle','kidsart','kidsgame','kidsoutdoors','kidsbooks'];
const toddlers = ['toddlersort','toddlerblocks','toddlerpuzzle','toddlerbook','toddlerplush','toddlerart'];
export function giftInspirationPlan(value, page = 1) {
  const p=cleanGiftPreferences(value), band=ageBand(p.age);
  let pool = band==='preschool'?toddlers:band==='kids'?kids:band==='teens'?teens:p.gender==='men'?adult:p.gender==='women'?women:general;
  if(p.interests.length) {
    const allowed = band==='preschool'?toddlers:band==='kids'?kids:band==='teens'?teens:[...new Set([...general,...adult,...women])];
    const matches=allowed.filter(id=>p.interests.includes(families[id][1]));
    if(matches.length)pool=matches;
  }
  const safePage=Math.max(1,Math.min(6,Number(page)||1)), batches=Math.ceil(pool.length/6), offset=((safePage-1)%batches)*6;
  return pool.slice(offset,offset+6).map(id=>({id,q:families[id][0],page:Math.floor((safePage-1)/batches)+1}));
}
export function isInspirationProduct(family, title, preferences) {
  if(/\b(empty box|box only|replacement|for parts|parts only|manual only)\b/i.test(title))return false;
  if(family==='sockets'&&/\b(holders?|organizers?|racks?|trays?|clips)\b/i.test(title))return false;
  if(['speaker','headphones','charger'].includes(family)&&/\b(cases?|covers?|skins?|straps?|mounts?|cable only)\b/i.test(title))return false;
  if(family==='drone'&&/\b(propeller|propellers|motor|motors|battery only|remote only)\b/i.test(title))return false;
  const age=exactAge(preferences?.age);
  if(age!==''&&+age<18) {
    // Reject explicit incompatible toy age ranges locally; never send exact ages
    // to the retailer. Keep unknown guidance for the shopper to check on the listing.
    const groups=[...title.matchAll(/\bages?\s+((?:\d{1,2}\s*[-–]\s*\d{1,2}|\d{1,2}\s*\+)(?:\s*(?:[,/&]|and)?\s*(?:\d{1,2}\s*[-–]\s*\d{1,2}|\d{1,2}\s*\+))*)/gi)];
    const ranges=groups.flatMap(group=>[...group[1].matchAll(/(\d{1,2})\s*(?:[-–]\s*(\d{1,2})|\+)/g)]);
    if(ranges.length&&!ranges.some(range=>+age>=+range[1]&&(!range[2]||+age<=+range[2])))return false;
  }
  return true;
}
export function mergeInspiration(results, {max=0,sort='recommended',now=Date.now(),perFamily=4}={}) {
  const seenIds=new Set(), seenTitles=new Set(), items=[];
  // Four per family: a popular category cannot fill the entire first page.
  const lists=results.map(data=>(data?.status==='ready'?data.items:[]).filter(p=>
    p.expiresAt>now && p.image && Number.isFinite(p.price) && (!max||p.price<=max) &&
    !/\b(empty box|box only|replacement|for parts|parts only|manual only)\b/i.test(p.title)));
  for(let row=0;row<perFamily;row++)for(const list of lists){
    let product;
    while(list.length){
      const p=list.shift(), title=p.title.toLowerCase().replace(/\b(new|sealed|free shipping)\b/g,'').replace(/[^a-z0-9]/g,'');
      if(seenIds.has(p.itemId)||seenTitles.has(title))continue;
      seenIds.add(p.itemId);seenTitles.add(title);product=p;break;
    }
    if(product)items.push(product);
  }
  if(sort!=='recommended')items.sort((a,b)=>(sort==='low'?1:-1)*((a.price+(a.shipping||0))-(b.price+(b.shipping||0))));
  const ready=results.filter(r=>r?.status==='ready');
  return {status:ready.length?'ready':'unavailable',items,
    checkedAt:Math.min(...ready.map(r=>r.checkedAt)),expiresAt:Math.min(...ready.map(r=>r.expiresAt)),
    partial:results.some(r=>r?.status==='unavailable'),hasMore:ready.some(r=>r.hasMore)};
}
export async function loadGiftInspiration({preferences,page=1,max=0,sort='recommended',load,onUpdate,isCurrent=()=>true,now=Date.now,familyLimit=6,perFamily=4}) {
  const plan=giftInspirationPlan(preferences,page).slice(0,familyLimit), results=Array(plan.length).fill(null);let next=0,completed=0;
  const publish=()=>{
    if(!isCurrent())return;
    const data=mergeInspiration(results,{max,sort,now:now(),perFamily});
    onUpdate({...data,loadingMore:completed<plan.length,hasMore:page<6&&(data.hasMore||plan.length===6)});
  };
  await Promise.all(Array.from({length:Math.min(2,plan.length)},async()=>{
    while(next<plan.length&&isCurrent()){
      const i=next++,family=plan[i];
      try{const data=await load(searchKey({q:family.q,max,sort:'recommended',page:family.page}));results[i]={...data,items:data.items.filter(p=>isInspirationProduct(family.id,p.title,preferences))};}
      catch{results[i]={status:'unavailable',items:[]};}
      completed++;publish();
    }
  }));
}
