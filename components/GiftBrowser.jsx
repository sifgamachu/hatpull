"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { allG } from "@/lib/store";
import { AGES, AMAZON_DISCLOSURE, AFF_REL, amazonUrl } from "@/lib/core";
import { GIFT_CATEGORIES, GIFT_IDEAS, positiveMoney, wishlistDestination } from "@/lib/gifts.mjs";
import GiftArtwork from "./GiftArtwork";
import { ProductCard, AmazonPriceDetails } from "./GiftProducts";
import { Sheet } from "./Sheet";
export default function GiftBrowser({ budget, currency = "$", age = "", onSelect, savedAsins = [], compact = false }) {
  const id = useId(), cap = positiveMoney(budget), usd = !currency || currency === "$";
  const [filters, setFilters] = useState({ q: "", category: ["Under 5", "5–11"].includes(age) ? "kids" : "all", age, max: String(cap || 50), sort: "recommended" });
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [data, setData] = useState(null), [loading, setLoading] = useState(false), [selection, setSelection] = useState(null), [refresh, setRefresh] = useState(0);
  const upper = cap ? Math.min(cap, positiveMoney(filters.max) || cap) : positiveMoney(filters.max);
  const invalid = filters.max !== "" && positiveMoney(filters.max) == null;
  const category = GIFT_CATEGORIES.find(c => c.id === filters.category) || GIFT_CATEGORIES[0];
  const ageWords = filters.age === "Under 5" ? " for preschool children" : filters.age === "5–11" ? " for kids ages 5 to 11" : filters.age === "12–17" ? " for teens" : "";
  const query = (filters.q || category.query) + ageWords;
  const update = patch => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  useEffect(() => {
    if (invalid || !usd) { setData(null); setLoading(false); return; }
    if (data?.status === "not_configured") { setLoading(false); return; }
    const abort = new AbortController(); let expiry;
    setLoading(true); setData(null);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, sort: filters.sort, page: String(page), ...(upper ? { max: String(upper) } : {}) });
        const response = await fetch(`/api/gifts?${params}`, { signal: abort.signal, cache: "no-store" });
        const result = await response.json();
        if (!abort.signal.aborted) { setData(result); if (result.expiresAt) expiry = setTimeout(() => { setData(null); setRefresh(v => v + 1); }, Math.max(1000, result.expiresAt - Date.now())); }
      } catch { if (!abort.signal.aborted) setData({ status: "unavailable", items: [] }); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); clearTimeout(expiry); abort.abort(); };
  }, [query, upper, filters.sort, page, invalid, usd, refresh]);
  const select = gift => onSelect ? onSelect(gift) : setSelection(gift);
  const ideas = GIFT_IDEAS.filter(gift => (filters.category === "all" ? (!["Under 5", "5–11"].includes(filters.age) || gift.category === "kids") : gift.category === filters.category) && (!filters.q || `${gift.title} ${gift.query} ${gift.description}`.toLowerCase().includes(filters.q.toLowerCase())));
  const ready = data?.status === "ready", products = ready ? data.items : [];
  return <section className={`gift-browser ${compact ? "compact" : ""}`} aria-label="Browse gifts">
    <form className="gift-search" onSubmit={e => { e.preventDefault(); update({ q: search.trim().slice(0, 100) }); }}><span aria-hidden="true">⌕</span><input aria-label="Search gifts" placeholder="What would make their day? Try coffee, books, LEGO…" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /><button className="btn small" type="submit">Search gifts</button></form>
    <div className="gift-categories" aria-label="Gift categories">{GIFT_CATEGORIES.map(c => <button key={c.id} aria-pressed={filters.category === c.id} onClick={() => { setSearch(""); update({ category: c.id, q: "" }); }}>{c.name}</button>)}</div>
    <div className="gift-browse-layout"><aside className="gift-filters"><div><p className="eyebrow">Make it personal</p><h3>A thoughtful fit.</h3></div><div><label htmlFor={`${id}-budget`}>{cap ? `Group limit: ${currency}${cap}` : "Budget per gift (US$)"}</label><div className="gift-money-input"><span>{currency}</span><input id={`${id}-budget`} type="number" min="0.01" max={cap || 10000} step="0.01" placeholder="Any budget" value={filters.max} onChange={e => update({ max: e.target.value })}/></div>
      {invalid && <p className="tiny error-text" role="alert">Enter a budget above zero, up to 10,000.</p>}{cap && +filters.max > cap && <p className="tiny muted">Results stay within the {currency}{cap} group limit.</p>}<div className="budget-chips">{[15,25,50,100].filter(v => !cap || v <= cap).map(v => <button key={v} type="button" aria-pressed={upper === v} onClick={() => update({ max: String(v) })}>Under {currency}{v}</button>)}</div></div>
      <div><label htmlFor={`${id}-age`}>Who’s it for?</label><select id={`${id}-age`} value={filters.age} onChange={e => update({ age: e.target.value })}><option value="">Any age</option>{AGES.map(a => <option key={a}>{a}</option>)}</select></div><div className="gift-how"><b>Make a wish. Keep the surprise.</b><p>Save a few favorites. Add the size and color you love. Your gift-giver can reserve one privately.</p></div><p className="tiny muted">{AMAZON_DISCLOSURE}</p></aside>
      <div className="gift-results"><div className="row between"><div><p className="eyebrow">{ready ? "Amazon finds" : "A little inspiration"}</p><h2>{filters.q || (category.id === "all" ? "Find their next favorite" : category.name)}</h2></div><label className="gift-sort">Sort<select aria-label="Sort gifts" value={filters.sort} onChange={e => update({ sort: e.target.value })} disabled={!ready}><option value="recommended">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>
        {upper && usd && <div className="gift-budget-line"><span className="budget-dot"/>{ready ? `Products priced at $${upper} or less · before shipping and tax` : `Amazon searches will use your $${upper} budget`}</div>}
        {!usd && <p className="note">Your celebration uses {currency}. Amazon.com lists prices in US dollars, so we won’t treat them as {currency} or claim a currency conversion. You can add a gift from any store using its link.</p>}
        {loading && <div className="product-grid" aria-label="Loading gifts" aria-busy="true">{[1,2,3,4].map(i => <div className="product-card gift-skeleton" key={i}><div/><span/><span/></div>)}</div>}
        {!loading && ready && <>{products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p.asin} product={p} onSelect={select} saved={savedAsins.includes(p.asin)}/>)}</div> : <div className="gift-empty"><h3>No matching products at this budget.</h3><p>Try a different search or category. Your budget stays in place.</p></div>}<div className="row between gift-pagination"><button className="btn small ghost" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>← Previous</button><span className="small muted">Page {page}</span><button className="btn small ghost" disabled={!data.hasMore} onClick={() => setPage(v => v + 1)}>Next →</button></div><AmazonPriceDetails/></>}
        {!loading && !ready && !invalid && <><div className="gift-availability"><div><b>Save the idea. Choose the exact gift.</b><p>Live Amazon product photos and prices aren’t available here yet. {usd ? "These illustrated ideas open an Amazon search using your budget." : "These illustrated ideas open Amazon searches in US dollars."} Save an idea now, or add the exact product link to your wish list.</p></div><a className="btn small ghost" href={amazonUrl(query, 0, usd ? upper : 0)} target="_blank" rel={AFF_REL}>Browse Amazon ↗</a></div>{data?.status === "unavailable" && <button className="link" onClick={() => setRefresh(v => v + 1)}>Try loading products again</button>}
          {ideas.length ? <div className="product-grid">{ideas.map(idea => <article className="product-card idea-card" key={idea.id}><div className="product-visual"><span className="idea-label">Gift idea</span><GiftArtwork kind={idea.art}/></div><div className="product-body"><span className="eyebrow">{GIFT_CATEGORIES.find(c => c.id === idea.category)?.name}</span><h3>{idea.title}</h3><p>{idea.description}</p><span className="tiny muted">Illustration · choose a product on Amazon</span><button className="btn small block" onClick={() => select(idea)}>♡ Save this idea</button><a className="product-shop" href={amazonUrl(idea.query + ageWords, 0, usd ? upper : 0)} target="_blank" rel={AFF_REL}>{usd && upper ? `Find options under $${upper}` : "Find options on Amazon"} ↗</a></div></article>)}</div> : <div className="gift-empty"><h3>Something a little more specific?</h3><p>Search Amazon for “{filters.q}”, then paste your favorite product’s link into your wish list.</p><a className="btn small" href={amazonUrl(query, 0, usd ? upper : 0)} target="_blank" rel={AFF_REL}>Search Amazon ↗</a></div>}</>}
      </div>
    </div>{selection && <SaveDestination gift={selection} onClose={() => setSelection(null)}/>}
  </section>;
}
function SaveDestination({ gift, onClose }) {
  const groups = allG().filter(g => g.mtok && g.mid);
  return <Sheet onClose={onClose}><div className="row between"><h2>Which wish list?</h2><button className="btn small ghost" onClick={onClose} aria-label="Close">✕</button></div><p className="muted">Choose a celebration, then add your size, color or a little hint before saving.</p>{groups.length ? <div className="stack">{groups.map(g => <Link className="opt" key={g.gid} href={wishlistDestination(g, gift)}>{g.name || "My celebration"}<span>→</span></Link>)}</div> : <div className="note stack"><p>Join a celebration and claim your name to start your wish list. If you already joined on another device, sign in to find it.</p><Link className="btn small" href="/my">Find my celebrations</Link><Link className="link" href="/new">Start a new celebration →</Link></div>}</Sheet>;
}
