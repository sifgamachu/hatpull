// Bounded per-instance admission. This is not a global retailer quota manager.
export class CatalogBusy extends Error {
  constructor(retryAfter = 2) { super('busy'); this.code = 'busy'; this.retryAfter = retryAfter; }
}

export function createCatalogQueue({ concurrency = 3, maxQueued = 48, timeoutMs = 8000 } = {}) {
  let active = 0;
  const waiting = [];
  function start() {
    while (active < concurrency && waiting.length) {
      const job = waiting.shift();
      clearTimeout(job.timer); active++;
      Promise.resolve().then(job.work).then(job.resolve, job.reject).finally(() => { active--; start(); });
    }
  }
  function run(work) {
    if (active >= concurrency && waiting.length >= maxQueued) return Promise.reject(new CatalogBusy());
    return new Promise((resolve, reject) => {
      const job = { work, resolve, reject };
      job.timer = setTimeout(() => {
        const index = waiting.indexOf(job);
        if (index >= 0) { waiting.splice(index, 1); reject(new CatalogBusy()); }
      }, timeoutMs);
      waiting.push(job); start();
    });
  }
  return { run, stats: () => ({ active, queued: waiting.length }) };
}

// Count only admitted cold searches. Cache hits and shared in-flight searches
// have no upstream cost; rejected retries must not extend the waiting window.
export function createColdSearchLimiter({ limit = 60, windowMs = 60000, maxKeys = 5000, now = Date.now } = {}) {
  const clients = new Map();
  return function admit(key) {
    const time = now();
    let bucket = clients.get(key);
    if (!bucket || bucket.resetAt <= time) bucket = { count: 0, resetAt: time + windowMs };
    if (bucket.count >= limit) throw new CatalogBusy(Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)));
    if (!clients.has(key) && clients.size >= maxKeys) clients.delete(clients.keys().next().value);
    bucket.count++; clients.set(key, bucket);
  };
}
