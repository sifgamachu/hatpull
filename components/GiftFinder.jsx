"use client";
import { useState } from "react";
import { AGES, GIFT_CATS, CAT_TIPS, amazonUrl, AMAZON_DISCLOSURE, AFF_REL } from "@/lib/core";
import Festive from "./Festive";
import XBanner from "./XBanner";

export default function GiftFinder() {
  const [f, setF] = useState({ who: "", age: "", min: "", max: "", cat: "", q: "" });
  const up = p => setF(x => ({ ...x, ...p }));
  const isKid = f.age === "Under 5" || f.age === "5–11";
  const cats = f.cat ? [f.cat] : Object.keys(GIFT_CATS).filter(c => isKid ? c === "Kids" || c === "Stocking stuffers" : c !== "Kids");
  const suffix = isKid ? "" : f.age === "12–17" ? " for teens" : f.who ? ` for ${f.who}` : "";
  const lo = parseFloat(f.min) || 0, hi = parseFloat(f.max) || 0;
  return (
    <div className="mid stack">
      <Festive on />
      <XBanner><p className="kicker">🎁 Christmas gift ideas</p><h1>Gift Finder</h1><p className="lede">Pick who it's for and your budget. Each idea opens an Amazon search in a new tab, filtered to your price range.</p></XBanner>
      <div className="panel stack">
        <div className="row" style={{ flexWrap: "nowrap" }}><input value={f.q} onChange={e => up({ q: e.target.value })} placeholder="Search any gift idea, e.g. coffee lover" aria-label="Search gift ideas" /><a className="btn small" href={amazonUrl(f.q.trim() || "christmas gift ideas", lo, hi)} target="_blank" rel={AFF_REL}>Search</a></div>
        <div className="grid2">
          <div><label htmlFor="gfWho">For</label><select id="gfWho" value={f.who} onChange={e => up({ who: e.target.value })}><option value="">Anyone</option><option value="women">A woman</option><option value="men">A man</option></select></div>
          <div><label htmlFor="gfAge">Age</label><select id="gfAge" value={f.age} onChange={e => up({ age: e.target.value })}><option value="">Any age</option>{AGES.map(a => <option key={a}>{a}</option>)}</select></div>
          <div><label>Price (US$)</label><div className="row" style={{ flexWrap: "nowrap" }}><input inputMode="decimal" placeholder="Min" aria-label="Minimum price" value={f.min} onChange={e => up({ min: e.target.value })} /><input inputMode="decimal" placeholder="Max" aria-label="Maximum price" value={f.max} onChange={e => up({ max: e.target.value })} /></div></div>
          <div><label htmlFor="gfCat">Category</label><select id="gfCat" value={f.cat} onChange={e => up({ cat: e.target.value })}><option value="">All categories</option>{Object.keys(GIFT_CATS).map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="choices">{[[0, 25], [25, 50], [50, 100], [100, 200]].map(([a, b]) => <button key={a} type="button" className="choice" aria-pressed={f.min === String(a) && f.max === String(b)} onClick={() => up({ min: String(a), max: String(b) })}>${a}–{b}</button>)}</div>
      </div>
      <p className="small muted">{AMAZON_DISCLOSURE} Ideas change with your filters: choosing a child's age shows toys and stocking stuffers, a teen age adds "for teens" to each search, and your price range is applied to every link.</p>
      <div className="stack" style={{ gap: 20 }}>{cats.map(c => <div key={c} className="stack" style={{ gap: 8 }}><h3>{c}</h3>{CAT_TIPS[c] && <p className="small muted">{CAT_TIPS[c]}</p>}<div className="ideas">{GIFT_CATS[c].map(t => <a key={t} href={amazonUrl(t + suffix, lo, hi)} target="_blank" rel={AFF_REL}>{t[0].toUpperCase() + t.slice(1)}{suffix && <span className="tiny muted">{suffix}</span>}</a>)}</div></div>)}</div>
      <p className="tiny muted">{AMAZON_DISCLOSURE} Buying through these links costs you nothing extra.</p>
    </div>
  );
}
