import { amazonCatalog, catalogQuery } from "@/lib/amazon-catalog.mjs";
import { ASIN_RE } from "@/lib/gifts.mjs";
export const runtime = "nodejs";
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    let result;
    if (params.has("ids")) {
      const ids = [...new Set(params.get("ids").split(","))];
      if (!ids.length || ids.length > 10 || ids.some(id => !ASIN_RE.test(id))) return Response.json({ status: "invalid_query", items: [] }, { status: 400 });
      result = await amazonCatalog("getItems", { itemIds: ids, itemIdType: "ASIN" });
    } else {
      const { q, min, max, page, sort } = catalogQuery(params);
      result = await amazonCatalog("searchItems", { keywords: q, itemCount: 10, itemPage: page, sortBy: sort, condition: "New", availability: "Available", ...(max ? { maxPrice: max } : {}), ...(min ? { minPrice: min } : {}) });
    }
    // Do not persist responses in the browser or CDN. The provider cache is
    // bounded, server-only, and expires after 30 minutes.
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const invalid = e.code === "invalid_query";
    return Response.json({ status: invalid ? "invalid_query" : "unavailable", items: [] }, { status: invalid ? 400 : 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
