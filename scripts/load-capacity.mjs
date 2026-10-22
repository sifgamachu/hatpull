// Only targets the disposable capacity-test branch. Never point this at production.
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { pollCeiling, pollDelay } from '../lib/group-sync.mjs';
const ref=process.env.CAPACITY_PROJECT_REF;
if(ref !== 'lrhpltxqixslrizawtkk') throw new Error('Refusing to load-test an unapproved project');
const key=process.env.CAPACITY_PUBLISHABLE_KEY;
if(!key) throw new Error('Missing test publishable key');
const duration=Number(process.env.CAPACITY_SECONDS || 45),results=[];
const waiting=process.env.CAPACITY_WAITING==='1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let abort=false;
for(const users of waiting ? [1000] : [100,200,500,1000]) {
  const began=performance.now(),times=[],statuses={},bytes=[];let full=0,unchanged=0;
  await Promise.all(Array.from({length:users},async(_,i)=>{
    let version=null,delay=10000,ceiling=60000;
    await sleep((i/users)*10000);
    while(performance.now()-began<duration*1000&&!abort){
      const start=performance.now();
      try {
        const res=await fetch(`https://${ref}.supabase.co/rest/v1/rpc/hp_state_delta`,{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({p_gid:`load-${Math.floor(i/200)+1}`,p_mtok:`synthetic-member-${Math.floor(i/200)+1}-${i%200+1}`,p_atok:null,p_version:version,p_profile:null}),signal:AbortSignal.timeout(15000)});
        const raw=await res.text();times.push(performance.now()-start);statuses[res.status]=(statuses[res.status]||0)+1;bytes.push(Buffer.byteLength(raw));
        if(res.ok){const data=JSON.parse(raw);version=data.version;if(data.state){full++;delay=10000;ceiling=pollCeiling(data.state);}else{unchanged++;delay=Math.min(ceiling,delay*1.6);}}
        else if(res.status===429||res.status>=500)abort=true;
      }catch{statuses.network=(statuses.network||0)+1;abort=true;}
      const remaining=duration*1000-(performance.now()-began);
      if(remaining<=0)break;
      await sleep(Math.min(remaining,pollDelay(delay)));
    }
  }));
  times.sort((a,b)=>a-b);
  const percentile=p=>Math.round(times[Math.min(times.length-1,Math.floor(times.length*p))]||0);
  const result={users,seconds:duration,requests:times.length,statuses,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),full,unchanged,totalBytes:bytes.reduce((a,b)=>a+b,0),aborted:abort};
  results.push(result);console.log(JSON.stringify(result));
  await writeFile(new URL(waiting?'../capacity-waiting-results.json':'../capacity-load-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),project:'disposable Micro staging branch',scenario:`200-person groups with large wishlists; staggered initial loads and ${waiting?'10–15s waiting-for-draw':'10–60s idle'} polling; no production traffic or emails`,results},null,2)+'\n');
  if(abort)break;
}
