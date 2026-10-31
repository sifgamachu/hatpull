// Shared, framework-free helpers used on both server and client.
import { normalizeWish } from "./gifts.mjs";

export const SITE = {
  santa: "https://hatpull.com",
  picker: "https://onlinenamepickertool.com",
  brand: "Hatpull",
  email: "hello@secretsantageneratorapp.com",
  company: "Teregna",
  // Legal identity shown in the privacy policy, terms and every email. Fill in before sending marketing email.
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Teregna LLC",
  address: process.env.NEXT_PUBLIC_MAILING_ADDRESS || "",
};

export const CURRENCIES = ["$", "€", "£", "Br", "KSh", "₦", "R", "₹", "C$", "A$"];
export const BUDGETS = [100, 75, 50, 30, 25];
export const AGES = ["Under 5", "5–11", "12–17", "18–29", "30–44", "45–64", "65+"];

export function nthWeekday(y, month0, weekday, n) { const d = new Date(y, month0, 1); let c = 0; for (;;) { if (d.getDay() === weekday && ++c === n) return d; d.setDate(d.getDate() + 1); } }
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const OCCASIONS = [
  { k: "Secret Santa", m: 12, d: [24, 25, 26] }, { k: "Christmas", m: 12, d: [24, 25, 26] }, { k: "Halloween", m: 10, d: [30, 31] },
  { k: "Thanksgiving", fn: y => nthWeekday(y, 10, 4, 4) }, { k: "Hanukkah" }, { k: "New Year's Eve", m: 12, d: [31] },
  { k: "Eid" }, { k: "Valentine's Day", m: 2, d: [13, 14] }, { k: "Diwali" }, { k: "Kwanzaa", m: 12, d: [26] },
  { k: "Christmas in July", m: 7, d: [24, 25] }, { k: "Easter" }, { k: "Mother's Day", fn: y => nthWeekday(y, 4, 0, 2) },
  { k: "Father's Day", fn: y => nthWeekday(y, 5, 0, 3) }, { k: "Birthday" }, { k: "Office party" },
];
export const XMAS_OCC = ["Secret Santa", "Christmas", "Christmas in July"];
export const isXmas = g => !!g && (XMAS_OCC.includes(g.occasion) || /christmas|xmas|santa|noel/i.test(g.name || ""));

export function suggestDates(occ, now = new Date()) {
  const o = OCCASIONS.find(x => x.k === occ); const today = new Date(now); today.setHours(0, 0, 0, 0);
  const y = today.getFullYear(); const out = [];
  if (['Secret Santa','Christmas'].includes(occ)) {
    const dates = year => { const eve = new Date(year,11,24), saturday = new Date(eve); saturday.setDate(24 - ((eve.getDay()+1)%7 || 7)); return [saturday,eve,new Date(year,11,25)]; };
    const ds = dates(new Date(y,11,25)<today ? y+1 : y); out.push(...ds.filter(d=>d>=today));
  }
  else if (o?.fn) { let d = o.fn(y); if (d < today) d = o.fn(y + 1); out.push(d); }
  else if (o?.m) { let ds = o.d.map(dd => new Date(y, o.m - 1, dd)); if (ds[ds.length - 1] < today) ds = o.d.map(dd => new Date(y + 1, o.m - 1, dd)); out.push(...ds.filter(d => d >= today)); }
  return out.map(iso);
}
export function upcomingOccasions() {
  return OCCASIONS.map((o, i) => ({ ...o, i, date: suggestDates(o.k)[0] })).filter(o => o.date).sort((a, b) => a.date.localeCompare(b.date));
}
export function fmtDate(d, opts) { if (!d) return ""; const dt = new Date(String(d).slice(0, 10) + "T12:00:00"); return isNaN(dt) ? String(d) : dt.toLocaleDateString("en-US", opts || { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
// Whole calendar days from today to the date (0 = today, -1 = yesterday), in the viewer's own time zone.
export const daysUntil = d => {
  if (!d) return null;
  const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); const now = new Date();
  return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
};
export const daysLeftText = n => n === 0 ? "It's today." : n === 1 ? "1 day to go." : `${n} days to go.`;
export const money = (cur, v) => v ? `${cur || "$"}${v}` : "";
export const xmasYear = () => { const n = new Date(); return (n.getMonth() === 11 && n.getDate() > 26) ? n.getFullYear() + 1 : n.getFullYear(); };
// Defensive cleanup of celebration state from the server: wish-list fields are always strings and items
// always an array, so a malformed profile can never crash a page.
const str = v => (typeof v === "string" ? v : v == null ? "" : typeof v === "number" ? String(v) : "");
export function normState(s) {
  if (!s || !Array.isArray(s.members)) return s;
  for (const m of s.members) {
    if (!m.profile || typeof m.profile !== "object" || Array.isArray(m.profile)) { if (m.profile) m.profile = {}; continue; }
    const p = m.profile, out = {};
    // Preserve the exact server value for optimistic concurrency checks. Display
    // normalization fills defaults and must not be used as the database baseline.
    m.profileSnapshot = p;
    for (const [k, v] of Object.entries(p)) if (k !== "items") out[k] = str(v);
    out.items = Array.isArray(p.items) ? p.items.filter(it => it && typeof it === "object" && !Array.isArray(it)).map(normalizeWish) : [];
    m.profile = out;
    m.name = str(m.name);
  }
  return s;
}
export function safeUrl(u) { try { const x = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } }

function rand32() { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0]; }
export const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand32() % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rid = (n = 6) => { const a = new Uint8Array(n); globalThis.crypto.getRandomValues(a); return Array.from(a, b => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join(""); };

// Random assignment where nobody draws themselves and every exclusion {a,b} ("a must not draw b") is honored.
// A valid draw = everyone gives exactly once and receives exactly once, nobody draws themselves, no excluded pair.
// 1) Rejection sampling: shuffle receivers until valid. Every valid draw is equally likely; fast for real groups.
// 2) Fallback for tightly constrained groups: random-order bipartite matching (Kuhn), which always finds a
//    valid draw if one exists, in milliseconds even for 200 people.
function drawSetup(ids, exclusions) {
  const n = ids.length, idx = new Map(ids.map((id, i) => [id, i]));
  const banned = new Set(exclusions.map(e => idx.get(e.a) * 1000 + idx.get(e.b)));
  const ok = (g, r) => g !== r && !banned.has(g * 1000 + r);
  return { n, ok };
}
function matchDraw(n, ok, randomize) {
  const order = [...Array(n).keys()], recv = [...Array(n).keys()];
  const adj = order.map(g => (randomize ? shuffle(recv) : recv).filter(r => ok(g, r)));
  const owner = new Array(n).fill(-1);
  function augment(g, seen) {
    for (const r of adj[g]) {
      if (seen[r]) continue; seen[r] = 1;
      if (owner[r] === -1 || augment(owner[r], seen)) { owner[r] = g; return true; }
    }
    return false;
  }
  for (const g of randomize ? shuffle(order) : order) if (!augment(g, new Uint8Array(n))) return null;
  const out = new Array(n); owner.forEach((g, r) => { out[g] = r; }); return out;
}
export function canDraw(ids, exclusions = []) {
  if (ids.length < 3 || new Set(ids).size !== ids.length) return false;
  const { n, ok } = drawSetup(ids, exclusions);
  return !!matchDraw(n, ok, false);
}
export function drawNames(ids, exclusions = []) {
  if (ids.length < 3 || new Set(ids).size !== ids.length) return null;
  const { n, ok } = drawSetup(ids, exclusions);
  const pos = [...Array(n).keys()];
  for (let t = 0; t < 400; t++) {
    const p = shuffle(pos);
    if (p.every((r, g) => ok(g, r))) return Object.fromEntries(p.map((r, g) => [ids[g], ids[r]]));
  }
  const m = matchDraw(n, ok, true);
  return m ? Object.fromEntries(m.map((r, g) => [ids[g], ids[r]])) : null;
}

export const GIFT_CATS = {
  "Stocking stuffers": ["christmas socks", "hot cocoa gift set", "mini lip balm set", "christmas ornament", "pocket puzzle"],
  "Home & cozy": ["weighted blanket", "scented candle set", "electric kettle", "indoor plant pot set", "throw pillow"],
  "Food & drink": ["coffee sampler", "tea gift set", "hot sauce gift set", "gourmet chocolate box", "spice gift set"],
  "Tech": ["wireless earbuds", "phone stand", "portable charger", "bluetooth speaker", "smart plug"],
  "Games & fun": ["board game", "party card game", "1000 piece puzzle", "LEGO set", "retro handheld game"],
  "Wellness": ["skincare gift set", "massage gun", "bath bomb set", "yoga mat", "aromatherapy diffuser"],
  "Books & paper": ["bestselling novel", "cookbook", "leather journal", "fountain pen", "photo album"],
  "Outdoors": ["insulated water bottle", "camping hammock", "picnic blanket", "headlamp", "travel backpack"],
  "Kids": ["building blocks", "art supplies kit", "plush toy", "science kit for kids", "kids board game"],
};
// Amazon Associates: exact disclosure wording required by the Operating Agreement, and link attributes
// (no "noreferrer", so Amazon can identify the referring site).
export const AMAZON_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";
export const AFF_REL = "noopener sponsored";
export const CAT_TIPS = {
  "Stocking stuffers": "Small, cheerful and easy to wrap. Great for tight budgets or to add a little extra to a bigger gift.",
  "Home & cozy": "A safe bet when you don't know someone well: everyone likes a warmer, nicer-smelling home in winter.",
  "Food & drink": "Consumable gifts never gather dust. Check their wish list for allergies or dislikes first.",
  "Tech": "Useful gadgets that work with any phone. Stick to accessories rather than devices unless the budget is big.",
  "Games & fun": "Gifts the whole household can share, which makes them a hit with families and roommates.",
  "Wellness": "Thoughtful self-care picks. Choose unscented options if you're not sure of their taste.",
  "Books & paper": "Personal without being risky. A cookbook or journal suits almost anyone.",
  "Outdoors": "For walkers, campers and commuters. Practical gear they'll use all year.",
  "Kids": "Pick by age: blocks and plush toys for little ones, kits and games for school-age kids.",
};
// Strip someone else's affiliate tag from Amazon links that users paste into wish lists.
export function cleanUserLink(u) {
  try { const x = new URL(u); if (/(^|\.)amazon\./i.test(x.hostname) || /(^|\.)amzn\./i.test(x.hostname)) { x.searchParams.delete("tag"); x.searchParams.delete("ascsubtag"); } return x.href; } catch { return u; }
}
export function amazonUrl(q, lo, hi) {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  const l = Math.max(0, +lo || 0), h = Math.max(0, +hi || 0);
  return `https://www.amazon.com/s?k=${encodeURIComponent(q)}${h > l || (l && !h) ? `&rh=p_36%3A${Math.round(l * 100)}-${h > l ? Math.round(h * 100) : ""}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
}

export function inviteText(group, link, names) {
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0] || "";
  return `${group.note || `✨ You've been invited to ${group.name}!`}\n\n👥 ${list}${group.date ? `\n📅 ${fmtDate(group.date)}` : ""}${group.budget ? `\n💸 ${money(group.cur, group.budget)}` : ""}\n\n👇 Join now ${link}`;
}
