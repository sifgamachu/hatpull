// Public catalog results only: no account, participant or wishlist data.
export function catalogLifetime(data, now = Date.now()) {
  if (data?.status !== 'ready' || !Array.isArray(data.items)) return 0;
  const end = Math.min(data.expiresAt || 0, (data.checkedAt || 0) + 600000, ...data.items.map(p => p.expiresAt || 0));
  return Math.max(0, end - now);
}

export function catalogCacheHeaders(data, now = Date.now()) {
  const seconds = Math.min(300, Math.floor(catalogLifetime(data, now) / 1000) - 2);
  if (seconds < 1) return { 'Cache-Control': 'no-store' };
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': `public, s-maxage=${seconds}, must-revalidate`,
  };
}

export function searchKey({ q, max, sort = 'recommended', page = 1 }) {
  return new URLSearchParams({ q: (q.trim().replace(/\s+/g, ' ') || 'gift set').toLowerCase(), max: String(max), sort, page: String(page) }).toString();
}

export function createSearchCache({ fetcher = (...args) => fetch(...args), now = Date.now, limit = 40 } = {}) {
  const entries = new Map(), pending = new Map();
  function peek(key) {
    const value = entries.get(key);
    if (!value || !catalogLifetime(value, now())) { entries.delete(key); return null; }
    return value;
  }
  function load(key) {
    const cached = peek(key);
    if (cached) return Promise.resolve(cached);
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
      try {
        // No cookies or private authorization are sent to this public-only endpoint.
        const options = { credentials: 'omit', signal: controller.signal };
        let response = await fetcher(`/api/gifts/ebay?${key}`, options), data = await response.json();
        if (response.ok && data.status === 'ready' && !catalogLifetime(data, now())) {
          response = await fetcher(`/api/gifts/ebay?${key}`, { ...options, cache: 'reload' });
          data = await response.json();
        }
        if (!response.ok || !catalogLifetime(data, now())) throw new Error('catalog_unavailable');
        for (const savedKey of entries.keys()) peek(savedKey);
        if (entries.size >= limit) entries.delete(entries.keys().next().value);
        entries.set(key, data);
        return data;
      } finally { clearTimeout(timer); }
    })().finally(() => pending.delete(key));
    pending.set(key, work);
    return work;
  }
  function peekProduct(id) {
    for (const key of entries.keys()) {
      const product = peek(key)?.items.find(p => p.itemId === id);
      if (product && product.expiresAt > now()) return product;
    }
    return null;
  }
  return { peek, load, peekProduct };
}

// Memory only. Revisiting a search avoids another round trip, within provider expiry.
export const ebaySearchCache = createSearchCache();
