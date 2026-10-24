import { amazonCatalog } from "@/lib/amazon-catalog.mjs";
import { ASIN_RE } from "@/lib/gifts.mjs";
export const runtime = "nodejs";
// Light per-IP limit per server instance (a page load needs one or two calls).
const hits = new Map();
function limited(request) {
  const ip = request.headers.get("x-real-ip") || "anon", now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000); recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 60000) hits.delete(k);
  return recent.length > 30;
}
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    // Only exact ASIN lookups for saved wishes. Open keyword search was removed so outsiders
    // can't spend the Amazon API quota (and get previews throttled for real users).
    if (!params.has("ids")) return Response.json({ status: "invalid_query", items: [] }, { status: 400 });
    const ids = [...new Set(params.get("ids").split(","))];
    if (!ids.length || ids.length > 10 || ids.some(id => !ASIN_RE.test(id))) return Response.json({ status: "invalid_query", items: [] }, { status: 400 });
    if (limited(request)) return Response.json({ status: "busy", items: [] }, { status: 429, headers: { "Retry-After": "60" } });
    const result = await amazonCatalog("getItems", { itemIds: ids, itemIdType: "ASIN" });
    // Do not persist responses in the browser or CDN. The provider cache is
    // bounded, server-only, and expires after 30 minutes.
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const invalid = e.code === "invalid_query";
    return Response.json({ status: invalid ? "invalid_query" : "unavailable", items: [] }, { status: invalid ? 400 : 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
