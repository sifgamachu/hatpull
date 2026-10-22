const assert = require('node:assert/strict');
const base = process.env.NETWORK_CHECK_BASE || 'http://localhost:3017';
const hosts = ['secretsantageneratorapp.com', 'onlinenamepickertool.com'];
function get(host, path) {
  const url = base === 'live' ? `https://${host}${path}` : `${base}${path}`;
  return new Promise((resolve, reject) => {
    const transport = require(url.startsWith('https:') ? 'node:https' : 'node:http');
    const req = transport.get(url, { headers: { host }, timeout: 30000 }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out: ${host}${path}`)));
    req.on('error', reject);
  });
}
(async () => {
  for (const host of hosts) {
    const home = await get(host, '/');
    assert.equal(home.status, 200);
    assert.equal(home.headers['x-content-type-options'], 'nosniff');
    assert.equal(home.headers['x-frame-options'], 'DENY');
    assert.match(home.headers['strict-transport-security'], /max-age=31536000/);
    assert.match(home.headers['content-security-policy'], /font-src 'self' data:/);
    const html = home.body.toString();
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
    assert.match(html, /href="\/network-access"/);
    const styles = [...new Set([...html.matchAll(/href="([^"\s]+\.css(?:\?[^"\s]*)?)"/g)].map(m => m[1]))];
    assert.ok(styles.length > 0, 'Stylesheets are present');
    let css = '';
    for (const path of styles) {
      assert.ok(path.startsWith('/_next/'), 'Stylesheets are same-origin');
      const r = await get(host, path); assert.equal(r.status, 200); css += r.body.toString();
    }
    for (const font of ['Outfit Variable', 'Young Serif', 'JetBrains Mono']) assert.ok(css.includes(font), font);
    assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com/);
    const font = css.match(/url\(["']?([^)'"\s]+\.woff2)["']?\)/);
    assert.ok(font, 'Self-hosted font asset exists');
    const fontPath = new URL(font[1], `https://${host}${styles[0]}`).pathname;
    const fontResponse = await get(host, fontPath);
    assert.equal(fontResponse.status, 200);
    assert.equal(fontResponse.body.subarray(0, 4).toString(), 'wOF2');
    const guide = await get(host, '/network-access'); assert.equal(guide.status, 200);
    assert.ok(guide.body.toString().includes(`rel="canonical" href="https://${host}/network-access"`));
    assert.match(guide.body.toString(), /Using Hatpull at work or school/);
    const download = await get(host, '/network-allowlist.txt'); assert.equal(download.status, 200);
    assert.match(download.body.toString(), /rkpglmwjpwbrxbluvsqm\.supabase\.co/);
    const licenses = await get(host, '/font-licenses.txt'); assert.equal(licenses.status, 200);
    assert.match(licenses.body.toString(), /SIL OPEN FONT LICENSE/);
    assert.ok((await get(host, '/sitemap.xml')).body.toString().includes(`https://${host}/network-access`));
    console.log(`${host}: security headers, local fonts, network guide, download and licenses pass`);
  }
  for (const path of ['/join/network-check-invalid', '/g/network-check-invalid', '/g/network-check-invalid/w/network-check-invalid', '/invite/network-check-invalid']) {
    const r = await get(hosts[0], path); assert.equal(r.status, 200, path);
    assert.doesNotMatch(r.body.toString(), /Internal Server Error/);
  }
  for (const path of ['/name-picker/opengraph-image', '/secret-santa-generator-no-email/opengraph-image']) {
    const r = await get(hosts[0], path); assert.equal(r.status, 200, path);
    assert.match(r.headers['content-type'], /^image\//);
  }
  console.log('Dynamic route rendering and social images pass');
})().catch(error => { console.error(error); process.exitCode = 1; });
