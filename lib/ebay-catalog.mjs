import { EBAY_ITEM_ID, ebayItemId, ebayProductUrl, safeEbayImage } from './ebay-products.mjs';

const TTL = 10 * 60 * 1000, LIMIT = 24;
export class EbayCatalogError extends Error { constructor(code) { super(code); this.code = code; } }
export const ebayConfigured = (env = process.env) => !!(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET);
export function ebayQuery(params) {
  const q = (params.get('q') || 'gift set').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!q || q.length > 100 || /[\x00-\x1f]/.test(q)) throw new EbayCatalogError('invalid_query');
  const raw = params.get('max') || '0';
  if (!/^\d{1,5}(?:\.\d{1,2})?$/.test(raw) || +raw > 10000) throw new EbayCatalogError('invalid_query');
  const page = Number(params.get('page') || 1), sort = params.get('sort') || 'recommended';
  if (!Number.isInteger(page) || page < 1 || page > 10 || !['recommended', 'low', 'high'].includes(sort)) throw new EbayCatalogError('invalid_query');
  return { q, max: Math.round(+raw * 100) / 100, page, sort };
}
export function normalizeEbayItem(item, at = Date.now()) {
  if (!EBAY_ITEM_ID.test(item?.itemId || '') || typeof item.title !== 'string' || !item.title.trim()) return null;
  const price = Number(item.price?.value);
  if (item.price?.currency !== 'USD' || !Number.isFinite(price) || price <= 0 || item.itemEndDate && Date.parse(item.itemEndDate) <= at) return null;
  if (!item.buyingOptions?.includes('FIXED_PRICE')) return null;
  const canonical = ebayProductUrl(item.itemId);
  let url = canonical;
  // Preserve only official, matching product links. Never accept another origin.
  for (const candidate of [item.itemAffiliateWebUrl, item.itemWebUrl]) {
    if (ebayItemId(candidate) === item.itemId) { url = candidate; break; }
  }
  const shipping = item.shippingOptions?.find(s => s.shippingCost?.currency === 'USD');
  const cost = shipping ? Number(shipping.shippingCost.value) : null;
  return { provider: 'ebay', kind: 'product', itemId: item.itemId, title: item.title.slice(0, 240), image: safeEbayImage(item.image?.imageUrl), url, price, currency: 'USD', shipping: Number.isFinite(cost) && cost >= 0 ? cost : null, condition: String(item.condition || '').slice(0, 50), checkedAt: at, expiresAt: at + TTL };
}

// Per-instance bounds prevent fan-out. No buyer/seller identities are retained.
export function createEbayCatalog({ fetcher = fetch, env = process.env, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  let auth, authPending, blockedUntil = 0, windowStart = 0, requests = 0;
  async function token() {
    if (auth?.until > now()) return auth.value;
    if (!authPending) authPending = (async () => {
      const response = await fetcher('https://api.ebay.com/identity/v1/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }).toString(), signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
      if (!response.ok) { blockedUntil = now() + 60000; throw new EbayCatalogError('unavailable'); }
      const data = await response.json();
      if (!data.access_token || typeof data.access_token !== 'string') throw new EbayCatalogError('unavailable');
      auth = { value: data.access_token, until: now() + Math.max(0, Math.min(Number(data.expires_in) || 7200, 7200) - 60) * 1000 };
      return auth.value;
    })().finally(() => { authPending = null; });
    return authPending;
  }
  return async function catalog(operation, input) {
    if (operation === 'item' ? !EBAY_ITEM_ID.test(input?.id || '') : operation !== 'search') throw new EbayCatalogError('invalid_query');
    if (operation === 'search') input = ebayQuery(new URLSearchParams(input));
    if (!ebayConfigured(env)) return { status: 'not_configured', items: [] };
    const key = JSON.stringify([operation, input]), hit = cache.get(key);
    if (hit?.expiresAt > now()) return hit;
    if (now() < blockedUntil) throw new EbayCatalogError('unavailable');
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 3) throw new EbayCatalogError('busy');
    if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
    if (requests >= 60) throw new EbayCatalogError('busy');
    requests++;
    const work = (async () => {
      const access = await token();
      const url = new URL(operation === 'search' ? 'https://api.ebay.com/buy/browse/v1/item_summary/search' : `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(input.id)}`);
      if (operation === 'search') {
        url.searchParams.set('q', input.q);
        url.searchParams.set('limit', String(LIMIT));
        url.searchParams.set('offset', String((input.page - 1) * LIMIT));
        url.searchParams.set('filter', `buyingOptions:{FIXED_PRICE},conditions:{NEW},deliveryCountry:US,priceCurrency:USD${input.max ? `,price:[0.01..${input.max}]` : ''}`);
        if (input.sort !== 'recommended') url.searchParams.set('sort', input.sort === 'low' ? 'price' : '-price');
      }
      const headers = { Authorization: `Bearer ${access}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' };
      if (/^\d{10}$/.test(env.EBAY_CAMPAIGN_ID || '')) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${env.EBAY_CAMPAIGN_ID}`;
      const response = await fetcher(url.href, { headers, signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error' });
      if (operation === 'item' && [400, 404].includes(response.status)) return { status: 'ready', items: [], checkedAt: now(), expiresAt: now() + TTL };
      if (!response.ok) {
        if ([401,403,429].includes(response.status)) blockedUntil = now() + 60000;
        if (response.status === 401) auth = null;
        throw new EbayCatalogError('unavailable');
      }
      const data = await response.json(), at = now();
      if (data.errors?.length) throw new EbayCatalogError('unavailable');
      const source = operation === 'search' ? data.itemSummaries || [] : [data];
      let items = source.map(item => normalizeEbayItem(item, at)).filter(Boolean);
      if (operation === 'search') items = items.filter(item => (!input.max || item.price <= input.max) && /^(new|brand new|new with)/i.test(item.condition));
      const result = { status: 'ready', items, checkedAt: at, expiresAt: at + TTL, hasMore: operation === 'search' && input.page < 10 && Number(data.total) > input.page * LIMIT };
      if (cache.size >= 200) cache.delete(cache.keys().next().value);
      cache.set(key, result);
      return result;
    })().finally(() => pending.delete(key));
    pending.set(key, work); return work;
  };
}
export const ebayCatalog = createEbayCatalog();
