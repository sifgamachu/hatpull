// Product identities and user-authored wishes can be saved indefinitely. Amazon
// images, descriptions and prices are fetched afresh, never saved in profiles.
export const ASIN_RE = /^[A-Z0-9]{10}$/;
export const MAX_WISHES = 40;
export const MAX_PROFILE_BYTES = 19000;
export const GIFT_CATEGORIES = [
  { id: "all", name: "For everyone", query: "gift ideas", art: "gift" },
  { id: "cozy", name: "Home & cozy", query: "cozy home gifts", art: "cozy" },
  { id: "coffee", name: "Coffee & food", query: "coffee food gift set", art: "coffee" },
  { id: "tech", name: "Tech", query: "tech gifts accessories", art: "tech" },
  { id: "games", name: "Games & fun", query: "board games gifts", art: "games" },
  { id: "wellness", name: "Self-care", query: "self care gifts", art: "wellness" },
  { id: "books", name: "Books & creativity", query: "books creative gifts", art: "books" },
  { id: "outdoors", name: "Outdoors", query: "outdoor adventure gifts", art: "outdoors" },
  { id: "kids", name: "Kids", query: "gifts for kids", art: "kids" },
];
export const GIFT_IDEAS = [
  ["cozy", "A soft throw blanket", "cozy throw blanket", "For their favorite reading corner."],
  ["coffee", "A coffee discovery set", "coffee sampler gift set", "A new favorite for the morning ritual."],
  ["tech", "A portable speaker", "portable bluetooth speaker", "A little soundtrack, wherever they go."],
  ["games", "A game-night favorite", "party board game", "Something everyone can enjoy together."],
  ["books", "A fresh-page journal", "hardcover journal", "Room for plans, sketches and big ideas."],
  ["wellness", "A little self-care", "unscented self care gift set", "A thoughtful invitation to slow down."],
  ["outdoors", "An everyday water bottle", "reusable water bottle", "For the commute, a trail or the gym."],
  ["cozy", "A warm reading light", "rechargeable reading light", "For the one who always reads one more chapter."],
  ["coffee", "A tea tasting collection", "tea sampler gift set", "An invitation to find a new favorite blend."],
  ["tech", "A tidy charging station", "desk charging station", "A useful upgrade for a busy desk."],
  ["books", "A creative starter kit", "watercolor beginner set", "Give their next hobby a place to start."],
  ["games", "A satisfying puzzle", "jigsaw puzzle adults", "For cozy evenings and quiet weekends."],
  ["kids", "A building adventure", "building blocks kids", "Choose an age-appropriate set together."],
  ["kids", "A hands-on science kit", "science kit kids", "A little discovery for curious minds."],
  ["kids", "A new bedtime story", "illustrated storybook kids", "A story to come back to again and again."],
  ["outdoors", "A compact picnic blanket", "compact picnic blanket", "A reason to spend the afternoon outside."],
].map(([category, title, query, description], i) => ({ id: `idea-${i}`, category, title, query, description, art: category, kind: "idea" }));

export function positiveMoney(value) {
  if (value == null || value === "") return null;
  if (!/^(?:\d{1,5})(?:\.\d{1,2})?$/.test(String(value).trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 10000 ? Math.round(number * 100) / 100 : null;
}
export function productAsin(value) {
  if (typeof value !== "string") return "";
  if (ASIN_RE.test(value.toUpperCase())) return value.toUpperCase();
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["amazon.com", "www.amazon.com", "smile.amazon.com"].includes(url.hostname) || url.username || url.password) return "";
    return url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase() || "";
  } catch { return ""; }
}
export function productUrl(asin, tag = "") {
  return ASIN_RE.test(asin) ? `https://www.amazon.com/dp/${asin}${tag ? `?tag=${encodeURIComponent(tag)}` : ""}` : "";
}
export function safeGiftUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  value = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
export function safeProductImage(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && ["m.media-amazon.com", "images-na.ssl-images-amazon.com"].includes(url.hostname) && url.pathname.startsWith("/images/") ? url.href : "";
  } catch { return ""; }
}
export function normalizeWish(w) {
  const string = (v, length) => typeof v === "string" ? v.slice(0, length) : typeof v === "number" ? String(v).slice(0, length) : "";
  return { id: string(w.id, 20), t: string(w.t, 120), u: string(w.u, 400), n: string(w.n, 140), q: string(w.q, 100), p: string(w.p, 10), a: productAsin(string(w.a, 10)) || productAsin(string(w.u, 400)), priority: w.priority === "1" ? "1" : "", size: string(w.size, 40), color: string(w.color, 40), art: GIFT_CATEGORIES.some(c => c.art === w.art) ? w.art : "gift" };
}
export function wishMatches(a, b) {
  const aa = productAsin(a.a || a.u), ba = productAsin(b.a || b.u);
  if (aa && ba) return aa === ba && (a.size || "") === (b.size || "") && (a.color || "") === (b.color || "");
  return a.t.trim().toLowerCase() === b.t.trim().toLowerCase() && (a.u || "") === (b.u || "");
}
export function withinBudget(amount, maximum, minimum = 0) {
  return Number.isFinite(amount) && amount > 0 && amount >= minimum && (!maximum || amount <= maximum);
}
export function wishlistDestination(group, gift) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(group.gid || "") || !/^[A-Za-z0-9_-]{1,12}$/.test(group.mid || "")) return "/my";
  const query = new URLSearchParams(gift.kind === "idea" ? { idea: gift.id } : { asin: gift.asin });
  return `/g/${group.gid}/w/${group.mid}?${query}`;
}
