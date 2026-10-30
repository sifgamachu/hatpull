// Synthetic participants only; this tool refuses production and arbitrary hosts.
// These are HTTP virtual users, not browser engines or an authentication test.
import { readFile, writeFile } from 'node:fs/promises';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
const { project, key } = JSON.parse(await readFile('/private/tmp/hatpull-capacity-connection.json', 'utf8'));
if (project !== 'xsawkjdsxvoppmcqphos') throw Error('Refusing an unapproved test target');
const mode = process.argv[2] || 'reveal';
if (!['reveal','journey'].includes(mode)) throw Error('Choose reveal or journey');
const url = `https://${project}.supabase.co/rest/v1/rpc/`;
const results = [], startedAt = new Date().toISOString();
const delay = ms => new Promise(r => setTimeout(r, ms));
const pct = (values,p) => { const a=[...values].sort((a,b)=>a-b); return Math.round(a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]||0); };
const stages = mode === 'reveal' ? [{n:1000,old:true}, ...[100,500,1000,2000,5000].map(n=>({n}))] : [100,500,1000,2000,5000].map(n=>({n}));
let offset = mode === 'journey' ? 10000 : 0;
for (const stage of stages) {
  const metrics={},journeys=[],lag=monitorEventLoopDelay({resolution:20});lag.enable();
  let active=0,peak=0,errors=0,completed=0,requests=0,stop=false;
  const begin=performance.now(),base=offset;offset+=stage.n;
  async function rpc(fn,body){
    if(stop)return null;
    const m=metrics[fn] ||= {durations:[],statuses:{},codes:{},bytes:0};
    const start=performance.now();active++;peak=Math.max(peak,active);requests++;
    try {
      const r=await fetch(url+fn,{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      const raw=await r.text();m.statuses[r.status]=(m.statuses[r.status]||0)+1;m.bytes+=Buffer.byteLength(raw);
      const data=raw ? JSON.parse(raw) : true;
      if(!r.ok){errors++;m.codes[data?.code||r.status]=(m.codes[data?.code||r.status]||0)+1;return null;}
      return data;
    }catch(e){errors++;m.codes[e.name]=(m.codes[e.name]||0)+1;return null;}
    finally{m.durations.push(performance.now()-start);active--;if(errors>=5)stop=true;}
  }
  await Promise.all(Array.from({length:stage.n},async(_,i)=>{
    await delay(i/stage.n*(mode==='journey'?10000:1000));if(stop)return;
    const idx=base+i,g=Math.floor(idx/200)+1,id='p'+(idx%200+1);
    const c={p_gid:'capacity-'+g,p_mtok:`fixture-member-${g}-${idx%200+1}`};
    const delta=p_profile=>({...c,p_atok:null,p_version:null,p_profile});
    const start=performance.now();let ok=true;
    if(mode==='journey'){
      ok=!!await rpc('hp_state_delta',delta(id));if(!ok)return;
      ok=!!await rpc('hp_set_wish_demographics',{...c,p_target:id,p_patch:{age:'35',who:'men'}});
      await delay(250+Math.random()*250);
      await rpc('hp_add_wish',{...c,p_target:id,p_wish:{id:'capacity-new',t:'Fictional stress-test gift',u:'https://example.invalid/test'}});
      if(stop)return;
    }
    const response=await rpc(stage.old?'hp_mark_drawn':'hp_reveal',{...c,...(stage.old?{}:{p_round:1})});
    if(stage.old){await rpc('hp_state_delta',delta(null));ok=!stop;}
    else ok=response?.drawn===true&&response.member_id===id;
    if(mode==='journey'&&ok)await rpc('hp_state_delta',delta(response.receiver.id));
    if(ok&&!stop){completed++;journeys.push(performance.now()-start);}
  }));
  lag.disable();
  const result={scenario:mode,legacy:!!stage.old,virtualUsers:stage.n,completed,requests,errors,peakHttpInFlight:peak,seconds:+((performance.now()-begin)/1000).toFixed(2),journeyP50Ms:pct(journeys,.5),journeyP95Ms:pct(journeys,.95),journeyP99Ms:pct(journeys,.99),generatorEventLoopP99Ms:Math.round(lag.percentile(99)/1e6),rssMB:Math.round(process.memoryUsage().rss/1048576),endpoints:Object.fromEntries(Object.entries(metrics).map(([fn,m])=>[fn,{requests:m.durations.length,statuses:m.statuses,codes:m.codes,bytes:m.bytes,p95Ms:pct(m.durations,.95)}]))};
  result.passed=errors===0&&completed===stage.n&&result.journeyP95Ms<=(mode==='journey'?10000:3000);
  results.push(result);console.log(JSON.stringify(result));
  await writeFile(new URL(`../docs/capacity-20261030/hosted-${mode}.json`,import.meta.url),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),target:'isolated Micro database; 100 groups of 200 fictional members',exclusions:['Browser rendering','Vercel CDN and functions','new organizer authentication','email delivery','live retailer API','external checkout'],results},null,2)+'\n');
  // Compare legacy once, then stop the ramp at the first failing new stage.
  if(!stage.old&&!result.passed)break;
  await delay(3000);
}
