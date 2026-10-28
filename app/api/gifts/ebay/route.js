import { ebayCatalog, ebayQuery } from '@/lib/ebay-catalog.mjs';
import { catalogCacheHeaders } from '@/lib/ebay-search-cache.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Per-IP limit per server instance so one visitor can't use up the shared eBay budget.
// Cached (popular) searches never reach eBay, so normal browsing stays well under this.
const hits = new Map();
function limited(request) {
  const ip = request.headers.get('x-real-ip') || 'anon', now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000); recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 60000) hits.delete(k);
  return recent.length > 20;
}
export async function GET(request) {
  try {
    if (limited(request)) return Response.json({ status: 'busy', items: [] }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
    const params = new URL(request.url).searchParams;
    const result = params.has('id') ? await ebayCatalog('item', { id: params.get('id'), country: params.get('country') || 'US' }) : await ebayCatalog('search', ebayQuery(params));
    // All returned fields are public product data, identical for every visitor.
    // Expiry is bounded by the original product timestamp; never serve stale prices.
    return Response.json(result, { headers: catalogCacheHeaders(result) });
  } catch (e) {
    const invalid = e.code === 'invalid_query';
    return Response.json({ status: invalid ? 'invalid_query' : 'unavailable', items: [] }, { status: invalid ? 400 : 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
