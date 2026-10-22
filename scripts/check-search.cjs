const assert = require('node:assert/strict');
const base = process.env.SEARCH_CHECK_BASE || 'http://localhost:3017';
const santa = 'secretsantageneratorapp.com', picker = 'onlinenamepickertool.com';
async function get(host, path) {
  const url = base === 'live' ? `https://${host}${path}` : `${base}${path}`;
  return new Promise((resolve,reject)=>{
    const transport=require(url.startsWith('https:')?'node:https':'node:http');
    transport.get(url,{headers:{host}},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>res.headers[key]},text:async()=>body}));}).on('error',reject);
  });
}
(async () => {
  for (const [host, path, target] of [[santa,'/secret-santa-generator','https://'+santa+'/'],[santa,'/name-picker','https://'+picker+'/'],[picker,'/name-picker','https://'+picker+'/']]) {
    const r=await get(host,path); assert.equal(r.status,308); assert.equal(new URL(r.headers.get('location'),`https://${host}`).href,target);
  }
  for (const host of [santa,picker]) {
    const r=await get(host,'/'); assert.equal(r.status,200);
    const html=await r.text(); assert.ok(html.includes(`rel="canonical" href="https://${host}"`) || html.includes(`rel="canonical" href="https://${host}/"`));
    const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']||[]);
    assert.ok(graphs.some(x=>x['@type']==='WebSite' && x.name.includes('Hatpull')));
    assert.ok(graphs.some(x=>x['@type']==='Organization' && x.name==='Hatpull'));
    const robots=await (await get(host,'/robots.txt')).text();
    for(const s of ['OAI-SearchBot','Claude-SearchBot','Disallow: /g/','Disallow: /account']) assert.ok(robots.includes(s),s);
    const sitemap=await (await get(host,'/sitemap.xml')).text(); assert.ok(!sitemap.includes('<lastmod>'));
    assert.ok(sitemap.includes(`<loc>https://${host}</loc>`));
    console.log(host+': canonical, schema, robots and sitemap pass');
  }
  assert.ok((await (await get(santa,'/how-it-works')).text()).includes('Too many exclusions'));
  console.log('Public aliases and crawlable guide pass');
})().catch(e=>{console.error(e);process.exitCode=1});
