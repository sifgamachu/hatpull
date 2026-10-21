// Shared, framework-free helpers used on both server and client.

export const SITE = {
  santa: "https://secretsantageneratorapp.com",
  picker: "https://onlinenamepickertool.com",
  brand: "Hatpull",
  email: "hello@secretsantageneratorapp.com",
  company: "Teregna",
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

export function suggestDates(occ) {
  const o = OCCASIONS.find(x => x.k === occ); const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = today.getFullYear(); const out = [];
  if (o?.fn) { let d = o.fn(y); if (d < today) d = o.fn(y + 1); out.push(d); }
  else if (o?.m) { let ds = o.d.map(dd => new Date(y, o.m - 1, dd)); if (ds[ds.length - 1] < today) ds = o.d.map(dd => new Date(y + 1, o.m - 1, dd)); out.push(...ds.filter(d => d >= today)); }
  return out.map(iso);
}
export function upcomingOccasions() {
  return OCCASIONS.map((o, i) => ({ ...o, i, date: suggestDates(o.k)[0] })).filter(o => o.date).sort((a, b) => a.date.localeCompare(b.date));
}
export function fmtDate(d, opts) { if (!d) return ""; const dt = new Date(String(d).slice(0, 10) + "T12:00:00"); return isNaN(dt) ? String(d) : dt.toLocaleDateString("en-US", opts || { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
export const daysUntil = d => d ? Math.ceil((new Date(String(d).slice(0, 10) + "T12:00:00") - new Date()) / 864e5) : null;
export const money = (cur, v) => v ? `${cur || "$"}${v}` : "";
export const xmasYear = () => { const n = new Date(); return (n.getMonth() === 11 && n.getDate() > 26) ? n.getFullYear() + 1 : n.getFullYear(); };
export function safeUrl(u) { try { const x = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } }

function rand32() { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0]; }
export const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand32() % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rid = (n = 6) => { const a = new Uint8Array(n); globalThis.crypto.getRandomValues(a); return Array.from(a, b => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join(""); };

// Random assignment where nobody draws themselves and every exclusion {a,b} ("a must not draw b") is honored.
export function drawNames(ids, exclusions = []) {
  if (ids.length < 3) return null;
  const banned = new Set(exclusions.map(e => e.a + ">" + e.b));
  const options = Object.fromEntries(ids.map(g => [g, ids.filter(r => r !== g && !banned.has(g + ">" + r))]));
  const order = shuffle(ids).sort((x, y) => options[x].length - options[y].length);
  const used = new Set(), out = {}; let steps = 0;
  (function bt(i) {
    if (i === order.length) return true;
    if (++steps > 200000) return false;
    const g = order[i];
    for (const r of shuffle(options[g])) {
      if (used.has(r)) continue;
      used.add(r); out[g] = r;
      if (bt(i + 1)) return true;
      used.delete(r); delete out[g];
    }
    return false;
  })(0);
  return Object.keys(out).length === ids.length ? out : null;
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
export function amazonUrl(q, lo, hi) {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  return `https://www.amazon.com/s?k=${encodeURIComponent(q)}${hi ? `&rh=p_36%3A${Math.round(lo * 100)}-${Math.round(hi * 100)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
}

export function inviteText(group, link, names) {
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names.at(-1) : names[0] || "";
  return `${group.note || `✨ You've been invited to ${group.name}!`}\n\n👥 ${list}${group.date ? `\n📅 ${fmtDate(group.date)}` : ""}${group.budget ? `\n💸 ${money(group.cur, group.budget)}` : ""}\n\n👇 Join now ${link}`;
}
