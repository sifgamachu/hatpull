import { ebayCatalog, ebayQuery } from './ebay-catalog.mjs';
import { catalogCacheHeaders } from './ebay-search-cache.mjs';
import { createColdSearchLimiter } from './catalog-pressure.mjs';

export function createEbayHandler({ catalog = ebayCatalog, admit = createColdSearchLimiter() } = {}) {
  return async function GET(request) {
    try {
      const params = new URL(request.url).searchParams;
      const beforeMiss = () => {
        try { admit(request.headers.get('x-real-ip') || 'unknown'); }
        catch (error) { error.httpStatus = 429; throw error; }
      };
      const result = params.has('id')
        ? await catalog('item', { id: params.get('id'), country: params.get('country') || 'US' }, { beforeMiss })
        : await catalog('search', ebayQuery(params), { beforeMiss });
      return Response.json(result, { headers: catalogCacheHeaders(result) });
    } catch (error) {
      const invalid = error.code === 'invalid_query';
      return Response.json({ status: invalid ? 'invalid_query' : error.code === 'busy' ? 'busy' : 'unavailable', items: [] }, {
        status: invalid ? 400 : error.httpStatus || 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': String(error.retryAfter || 60) },
      });
    }
  };
}
