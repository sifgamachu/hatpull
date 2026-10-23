import { ASIN_RE, productAsin, productUrl, safeProductImage, withinBudget } from "./gifts.mjs";

const RESOURCES = ["images.primary.large", "itemInfo.title", "itemInfo.byLineInfo", "offersV2.listings.price", "offersV2.listings.availability", "offersV2.listings.isBuyBoxWinner"];
const TTL = 30 * 60 * 1000;
const cache = new Map(), pending = new Map();
let auth, authPending, blockedUntil = 0;
export function catalogConfigured(env = process.env) {
  return !!(env.AMAZON_CREATORS_CLIENT_ID && env.AMAZON_CREATORS_CLIENT_SECRET && env.NEXT_PUBLIC_AMAZON_TAG);
}
export class CatalogError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function catalogQuery(params) {
  const q = (params.get("q") || "gift ideas").trim().slice(0, 100);
  function cents(key) {
    const raw = params.get(key);
    if (!raw) return 0;
    if (!/^\d{1,5}(?:\.\d{1,2})?$/.test(raw) || +raw > 10000) throw new CatalogError("invalid_query");
    return Math.round(Number(raw) * 100);
  }
  const min = cents("min"), max = cents("max");
  if (max && min > max) throw new CatalogError("invalid_query");
  const page = Number(params.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10) throw new CatalogError("invalid_query");
  const sorts = { recommended: "Relevance", low: "Price:LowToHigh", high: "Price:HighToLow" }, sortKey = params.get("sort") || "recommended";
  const sort = Object.hasOwn(sorts, sortKey) ? sorts[sortKey] : null;
  if (!sort || !q) throw new CatalogError("invalid_query");
  return { q, min, max, page, sort };
}
export function normalizeAmazonItem(item, at, tag) {
  if (!ASIN_RE.test(item?.asin || "")) return null;
  const listing = item.offersV2?.listings?.filter(l => !l.violatesMAP && l.price?.money?.currency === "USD" && Number.isFinite(l.price.money.amount) && l.price.money.amount > 0 && (!l.availability?.type || l.availability.type === "IN_STOCK")).sort((a, b) => Number(!!b.isBuyBoxWinner) - Number(!!a.isBuyBoxWinner) || a.price.money.amount - b.price.money.amount)[0];
  const title = item.itemInfo?.title?.displayValue;
  if (typeof title !== "string" || !title) return null;
  let detailUrl = productUrl(item.asin, tag);
  try {
    if (productAsin(item.detailPageURL || "") === item.asin) {
      const url = new URL(item.detailPageURL);
      if (url.protocol === "https:") { url.searchParams.set("tag", tag); detailUrl = url.href; }
    }
  } catch { /* Use the canonical product link when the provider omits a valid URL. */ }
  return { kind: "product", asin: item.asin, title: title.slice(0, 240), image: safeProductImage(item.images?.primary?.large?.url || item.images?.primary?.medium?.url), url: detailUrl, price: listing?.price.money.amount ?? null, currency: "USD", brand: String(item.itemInfo?.byLineInfo?.brand?.displayValue || "").slice(0, 100), checkedAt: at, expiresAt: at + TTL };
}
async function token(fetcher, env) {
  if (auth?.until > Date.now()) return auth.value;
  if (!authPending) authPending = (async () => {
    const response = await fetcher("https://api.amazon.com/auth/o2/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "client_credentials", client_id: env.AMAZON_CREATORS_CLIENT_ID, client_secret: env.AMAZON_CREATORS_CLIENT_SECRET, scope: "creatorsapi::default" }), signal: AbortSignal.timeout(8000), cache: "no-store", redirect: "error" });
    if (!response.ok) { blockedUntil = Date.now() + 60000; throw new CatalogError("unavailable"); }
    const data = await response.json();
    if (typeof data.access_token !== "string" || !data.access_token) throw new CatalogError("unavailable");
    auth = { value: data.access_token, until: Date.now() + Math.max(0, Math.min(Number(data.expires_in) || 3600, 3600) - 60) * 1000 };
    return auth.value;
  })().finally(() => { authPending = null; });
  return authPending;
}
export async function amazonCatalog(operation, input, { fetcher = fetch, env = process.env } = {}) {
  if (!["searchItems", "getItems"].includes(operation)) throw new CatalogError("invalid_query");
  if (!catalogConfigured(env)) return { status: "not_configured", items: [] };
  const key = JSON.stringify([env.NEXT_PUBLIC_AMAZON_TAG, operation, input]);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit;
  if (Date.now() < blockedUntil) throw new CatalogError("unavailable");
  if (pending.has(key)) return pending.get(key);
  if (pending.size >= 3) throw new CatalogError("busy");
  const work = (async () => {
    const accessToken = await token(fetcher, env);
    const payload = { marketplace: "www.amazon.com", partnerTag: env.NEXT_PUBLIC_AMAZON_TAG, resources: RESOURCES, ...input };
    const response = await fetcher(`https://creatorsapi.amazon/catalog/v1/${operation}`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "x-marketplace": "www.amazon.com" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error" });
    if (!response.ok) {
      if ([401, 403, 429].includes(response.status)) blockedUntil = Date.now() + 60000;
      if (response.status === 401) auth = null;
      throw new CatalogError("unavailable");
    }
    const data = await response.json(), at = Date.now();
    const result = operation === "getItems" ? data.itemsResult : data.searchResult;
    if (!result && data.errors?.length) throw new CatalogError("unavailable");
    let items = (result?.items || []).map(item => normalizeAmazonItem(item, at, env.NEXT_PUBLIC_AMAZON_TAG)).filter(Boolean);
    if (operation === "searchItems") items = items.filter(item => withinBudget(item.price, input.maxPrice ? input.maxPrice / 100 : 0, (input.minPrice || 0) / 100));
    const value = { status: "ready", items, expiresAt: at + TTL, checkedAt: at, hasMore: operation === "searchItems" && (input.itemPage || 1) < 10 && (result?.items?.length || 0) === 10 };
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, value);
    return value;
  })().finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}
