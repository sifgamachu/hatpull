import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
const ref=process.env.CAPACITY_PROJECT_REF,key=process.env.CAPACITY_PUBLISHABLE_KEY;
if(ref!=='lrhpltxqixslrizawtkk'||!key)throw Error('Only the disposable test branch is allowed');
const results=[];
for(const users of [200,1000]){
 const times=[],statuses={};let failed=false;
 await Promise.all(Array.from({length:users},async(_,i)=>{
  await new Promise(r=>setTimeout(r,i/users*1000));
  if(failed)return;
  const args={p_gid:`load-${Math.floor(i/200)+1}`,p_mtok:`synthetic-member-${Math.floor(i/200)+1}-${i%200+1}`};
  const start=performance.now();
  try{
   for(const [fn,body] of [['hp_mark_drawn',args],['hp_state_delta',{...args,p_atok:null,p_version:null,p_profile:null}]]){
    const r=await fetch(`https://${ref}.supabase.co/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    await r.text();statuses[r.status]=(statuses[r.status]||0)+1;if(!r.ok){failed=true;break;}
   }
   times.push(performance.now()-start);
  }catch{failed=true;statuses.network=(statuses.network||0)+1;}
 }));
 times.sort((a,b)=>a-b);const percentile=p=>Math.round(times[Math.min(times.length-1,Math.floor(times.length*p))]||0);
 const result={users,scenario:'Each participant marks draw revealed then refreshes state; starts spread across one second',statuses,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),failed};results.push(result);console.log(JSON.stringify(result));
 if(failed)break;
}
await writeFile(new URL('../capacity-reveal-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),results},null,2)+'\n');
