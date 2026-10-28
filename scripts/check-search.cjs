const assert = require('node:assert/strict');
const base = process.env.SEARCH_CHECK_BASE || 'http://localhost:3017';
const santa = 'hatpull.com', picker = 'onlinenamepickertool.com';
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
  const guidePath='/random-name-picker-guide';
  const guide=await get(picker,guidePath); assert.equal(guide.status,200);
  const guideHtml=await guide.text();
  assert.ok(guideHtml.includes(`rel="canonical" href="https://${picker}${guidePath}"`));
  assert.ok(guideHtml.includes('Pick multiple winners without repeats'));
  assert.ok(guideHtml.includes('What is saved, and where?'));
  const duplicateGuide=await get(santa,guidePath);
  assert.equal(duplicateGuide.status,308);
  assert.equal(duplicateGuide.headers.get('location'),`https://${picker}${guidePath}`);
  assert.ok((await (await get(picker,'/sitemap.xml')).text()).includes(`<loc>https://${picker}${guidePath}</loc>`));
  assert.ok(!(await (await get(santa,'/sitemap.xml')).text()).includes(guidePath));
  console.log('Picker guide: canonical host, duplicate redirect and sitemap pass');
  const rulesPath='/secret-santa-rules';
  const rules=await get(santa,rulesPath); assert.equal(rules.status,200);
  const rulesHtml=await rules.text();
  assert.ok(rulesHtml.includes(`rel="canonical" href="https://${santa}${rulesPath}"`));
  assert.ok(rulesHtml.includes('Copy organizer message'));
  const rulesGraphs=[...rulesHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']||[]);
  assert.ok(rulesGraphs.some(x=>x['@type']==='Article' && x.url===`https://${santa}${rulesPath}`));
  assert.ok(rulesGraphs.some(x=>x['@type']==='FAQPage' && x.mainEntity.some(q=>q.name==='Can Secret Santa work with an odd number of people?')));
  const rulesAlias=await get(picker,rulesPath); assert.equal(rulesAlias.status,308);
  assert.equal(rulesAlias.headers.get('location'),`https://${santa}${rulesPath}`);
  assert.ok((await (await get(santa,'/sitemap.xml')).text()).includes(`<loc>https://${santa}${rulesPath}</loc>`));
  assert.ok(!(await (await get(picker,'/sitemap.xml')).text()).includes(rulesPath));
  console.log('Secret Santa rules: crawlable guide, schema, canonical host and sitemap pass');
  console.log('Public aliases and crawlable guide pass');
})().catch(e=>{console.error(e);process.exitCode=1});
