import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { fetchWithTimeout } from "../lib/network.mjs";

afterEach(() => mock.restoreAll());

test("forwards credentials and a write exactly once, including a server rejection", async () => {
  const response = new Response("not permitted", { status: 403 });
  const f = mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.body, '{"test":true}');
    assert.equal(init.headers.authorization, "Bearer test-only");
    return response;
  });
  assert.equal(await fetchWithTimeout("https://example.test", { method: "POST", body: '{"test":true}', headers: { authorization: "Bearer test-only" } }), response);
  assert.equal(f.mock.callCount(), 1);
});

test("a silent connection is aborted and rejects instead of waiting indefinitely", async () => {
  mock.method(globalThis, "fetch", (_url, { signal }) => new Promise((_ok, fail) => signal.addEventListener("abort", () => fail(signal.reason), { once: true })));
  await assert.rejects(fetchWithTimeout("https://example.test", {}, 10), { name: "TimeoutError" });
});

test("preserves caller cancellation, including an already cancelled Request", async () => {
  mock.method(globalThis, "fetch", (_url, { signal }) => new Promise((_ok, fail) => {
    if (signal.aborted) fail(signal.reason);
    else signal.addEventListener("abort", () => fail(signal.reason), { once: true });
  }));
  const controller = new AbortController();
  const pending = fetchWithTimeout("https://example.test", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(fetchWithTimeout(new Request("https://example.test", { signal: controller.signal })), { name: "AbortError" });
});

test("a failed connection does not poison the next request", async () => {
  let calls = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++calls === 1) throw new TypeError("Failed to fetch");
    return new Response("connected");
  });
  await assert.rejects(fetchWithTimeout("https://example.test"), TypeError);
  assert.equal(await (await fetchWithTimeout("https://example.test")).text(), "connected");
});
