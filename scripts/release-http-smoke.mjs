import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3022'], { stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', () => {}); server.stderr.on('data', () => {});
const base = 'http://127.0.0.1:3022';
// Use the real HTTP Host header; Node fetch may replace it with the URL host.
const get = (path, host) => new Promise((resolve, reject) => {
  const request = http.get(base + path, { headers: { Host: host } }, response => {
    let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
  });
  request.setTimeout(10000, () => request.destroy(Error('HTTP smoke timeout')));
  request.on('error', reject);
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base, { signal: AbortSignal.timeout(1000) }); ready = true; break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  assert.ok(ready, 'Next server started');
  for (const host of ['hatpull.com', 'www.hatpull.com']) {
    const r = await get('/.well-known/apple-app-site-association', host);
    assert.equal(r.status, 200); assert.match(r.headers['content-type'], /application\/json/);
    assert.equal(JSON.parse(r.body).applinks.details[0].appIDs[0], 'B6PA9QSBVA.com.hatpull.ios');
  }
  const redirect = await get('/g/example/w/test?x=1', 'secretsantageneratorapp.com');
  assert.equal(redirect.status, 308); assert.match(redirect.headers.location, /^https:\/\/hatpull.com\/g\/example\/w\/test\?x=1/);
  const privacy = await fetch(base + '/privacy', { headers: { host: 'hatpull.com' } });
  assert.equal(privacy.status, 200); assert.match(await privacy.text(), /The Hatpull mobile app/);
  const deletion = await fetch(base + '/api/account/delete', { method: 'POST' });
  assert.equal(deletion.status, 401); assert.equal(deletion.headers.get('cache-control'), 'no-store');
  console.log('PASS: apex/www association, legacy deep-link redirect, mobile privacy, unauthenticated deletion');
} finally { server.kill('SIGTERM'); }
