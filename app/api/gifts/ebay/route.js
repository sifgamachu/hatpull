import { ebayCatalog, ebayQuery } from '@/lib/ebay-catalog.mjs';
import { catalogCacheHeaders } from '@/lib/ebay-search-cache.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const result = params.has('id') ? await ebayCatalog('item', { id: params.get('id') }) : await ebayCatalog('search', ebayQuery(params));
    // All returned fields are public product data, identical for every visitor.
    // Expiry is bounded by the original product timestamp; never serve stale prices.
    return Response.json(result, { headers: catalogCacheHeaders(result) });
  } catch (e) {
    const invalid = e.code === 'invalid_query';
    return Response.json({ status: invalid ? 'invalid_query' : 'unavailable', items: [] }, { status: invalid ? 400 : 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
