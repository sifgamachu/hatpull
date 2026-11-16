import test from 'node:test';
import assert from 'node:assert/strict';
import { accountDeletionHandler } from '../lib/account-deletion.mjs';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const config = { url: 'https://fixture.test', publishableKey: 'test-public', secret: 'test-secret' };
const request = authorization => new Request('https://fixture.test/delete', { method: 'POST', headers: authorization ? { authorization } : {} });
test('deletion verifies identity, uses only the verified ID, and never caches the response', async () => {
  const calls = [];
  const handle = accountDeletionHandler({ ...config, fetcher: async (url, init) => { calls.push([url, init.method]); return Response.json(calls.length === 1 ? { id } : { ok: true }); } });
  assert.equal((await handle(request())).status, 401);
  assert.equal((await handle(request('Basic invalid'))).status, 401);
  assert.equal(calls.length, 0);
  const result = await handle(request('Bearer test-token'));
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls, [['https://fixture.test/auth/v1/user', undefined], [`https://fixture.test/auth/v1/admin/users/${id}`, 'DELETE']]);
});
test('provider failure and malformed identity never trigger account deletion or expose provider details', async () => {
  for (const response of [Response.json({}, { status: 500 }), Response.json({ id: '../someone-else' })]) {
    let calls = 0;
    const result = await accountDeletionHandler({ ...config, fetcher: async () => { calls++; return response; } })(request('Bearer test-token'));
    assert.ok(result.status >= 400); assert.equal(calls, 1);
  }
  const result = await accountDeletionHandler({ ...config, fetcher: async () => { throw Error('private-provider-secret'); } })(request('Bearer test-token'));
  assert.equal(result.status, 503); assert.doesNotMatch(await result.text(), /private-provider-secret/);
});
test('deletion request timeout aborts once and does not retry', async () => {
  let calls = 0;
  const result = await accountDeletionHandler({ ...config, timeoutMs: 15, fetcher: async (_url, init) => {
    calls++; return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('abort')), { once: true }));
  } })(request('Bearer test-token'));
  assert.equal(result.status, 503); assert.equal(calls, 1);
});
