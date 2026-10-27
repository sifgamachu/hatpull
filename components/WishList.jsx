"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { rpc } from "@/lib/db";
import { allG } from "@/lib/store";
import { isXmas, money, GIFT_CATS, amazonUrl, rid, AMAZON_DISCLOSURE, AFF_REL, normState } from "@/lib/core";
import { toast, burst } from "@/lib/ui";
import Festive from "./Festive";
import EbayGiftCatalog from "./EbayGiftCatalog";
import WishProfileChoices from "./WishProfileChoices";
import { cleanWishDemographics } from "@/lib/gift-preferences.mjs";
import { GiftListCartProvider, GiftListButton } from "./GiftListCart";
import { ebayItemId } from "@/lib/ebay-products.mjs";
import QuickWish from "./QuickWish";
import AmazonListSetup from "./AmazonListSetup";
import { amazonWishListUrl } from "@/lib/amazon-wish-list.mjs";
import { GIFT_CONTEXT_KEY, giftContextId } from "@/lib/gift-intake.mjs";
import OrganizerAccess, { isOrganizerError } from "./OrganizerAccess";
import { WishCard, WishComposer } from "./WishCards";
import { useGiftProducts, AmazonPriceDetails } from "./GiftProducts";
import { GIFT_IDEAS, MAX_WISHES, MAX_PROFILE_BYTES, productAsin, productUrl, wishMatches } from "@/lib/gifts.mjs";

import {CelebrationNav,JourneyHeading} from './JourneyUI';

export default function WishList({ gid, mid }) {
  const { state, error, tokens, reload } = useGroup(gid, mid);
  const [older, setOlder] = useState([]), [more, setMore] = useState(false), [loadingOlder, setLoadingOlder] = useState(false);
  useEffect(() => { setOlder([]); setMore(!!state?.questions_more); }, [state]);
  async function loadOlder() {
    if (loadingOlder) return;
    const rows = [...(state?.questions || []), ...older], last = rows.at(-1);
    if (!last) return;
    setLoadingOlder(true);
    try {
      const page = await rpc("hp_questions_page", { p_gid: gid, p_mtok: tokens.mtok, p_atok: tokens.atok, p_target: mid, p_before: last.at, p_before_id: last.id });
      setOlder(previous => [...previous, ...page.questions]); setMore(page.more);
    } catch { toast("Couldn't load older questions. Try again."); }
    finally { setLoadingOlder(false); }
  }
  const viewState = state ? { ...state, questions: [...state.questions, ...older] } : null;
  const [draft, setDraft] = useState(null); // optimistic items
  if (isOrganizerError(error)) return <OrganizerAccess gid={gid} error={error} reload={reload} />;
  if (error && error !== "network") return <div className="mid panel stack"><p>{error === "not_found" ? "This celebration no longer exists." : "You don't have access to this wish list on this device."}</p><Link className="btn small ghost" href="/my">My celebrations</Link></div>;
  if (!state) return <div className="mid panel muted"><h1 className="sr-only">Wish list</h1>{error === "network" ? "Can't reach the server. Retrying…" : "Loading wish list…"}</div>;
  const g = state.group, me = state.me, xm = isXmas(g);
  const m = state.members.find(x => x.id === mid);
  if (!m) return <div className="mid panel stack"><p>This person isn't in the celebration anymore.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back</Link></div>;
  const mineList = me && (m.id === me.id || (m.kid && m.parent_id === me.id));
  if (!m.visible) return <div className="mid panel stack"><h3>This wish list is private</h3><p className="muted">The organizer set wish lists so only the person who drew {m.name} can see them.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back to {g.name}</Link></div>;
  const prof = m.profile || {}, items = draft ?? prof.items ?? [];
  const iDrew = me && me.receiver_id === m.id && state.me.drawn;
  const listCount = items.filter(w => amazonWishListUrl(w.u)).length, giftCount = items.length - listCount;
  const collectionCount = [listCount && `${listCount} Amazon list${listCount === 1 ? "" : "s"}`, (giftCount || !listCount) && `${giftCount} gift${giftCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ");

  return (
    <div className="journey-surface wishlist-page stack">
      <Festive on={false} />
      <Link href={`/g/${gid}`} className="link crumb">← {g.name}</Link>
      <JourneyHeading eyebrow={mineList?'A few hints for a lovely surprise':iDrew?'Your drawn name':'Shared with your celebration'} title={mineList?(m.kid?`${m.name}’s wish list`:'My wish list'):`${m.name}’s wish list`}><p>{collectionCount}{g.budget?` · ${money(g.cur,g.budget)} celebration budget`:''}</p></JourneyHeading>
      <CelebrationNav gid={gid} mid={me?.id} active={mineList?'wishes':'recipient'} admin={state.is_admin}/>
      {iDrew && <div className="note">{xm ? `🎅 You're ${m.name}'s Secret Santa.` : `You drew ${m.name}.`} {listCount > 0 ? (giftCount > 0 ? "Open their Amazon wish list or reserve an individual gift below." : "Open their Amazon wish list to choose a gift.") : `Reserve a gift so nobody else buys the same thing. ${m.name} won't see it.`}</div>}
      {mineList ? <Editor key={m.id} gid={gid} g={g} m={m} prof={prof} items={items} setDraft={setDraft} tokens={tokens} reload={reload} xm={xm} questions={viewState.questions.filter(q => q.to === m.id)} />
        : <Viewer gid={gid} g={g} m={m} me={me} prof={prof} items={items} state={viewState} tokens={tokens} reload={reload} xm={xm} />}
      {more && <button className="btn ghost" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Loading…" : "Load older questions"}</button>}
    </div>
  );
}

function Editor({ gid, g, m, prof, items, setDraft, tokens, reload, xm, questions }) {
  const writing = useRef(false), opened = useRef(false);
  const [saving, setSaving] = useState(false), [selection, setSelection] = useState(null);
  const products = useGiftProducts(items.map(w => w.a || ebayItemId(w.u)));
  function choose(gift) {
    if (items.length >= MAX_WISHES) return toast("Your list has 40 wishes. Remove one before adding another.");
    setSelection(gift.kind === "product" ? { t: "Amazon pick", a: gift.asin, u: productUrl(gift.asin) } : { t: gift.title, art: gift.art, q: gift.query });
  }
  useEffect(() => {
    if (opened.current) return; opened.current = true;
    const url = new URL(location.href), idea = GIFT_IDEAS.find(i => i.id === url.searchParams.get("idea")), asin = productAsin(url.searchParams.get("asin") || "");
    const edit = items.find(w => w.id === url.searchParams.get("edit"));
    if (edit) setSelection({ ...edit, editing: true }); else if (idea) choose(idea); else if (asin) choose({ kind: "product", asin });
    if (['idea','asin','edit'].some(k => url.searchParams.has(k))) { ['idea','asin','edit'].forEach(k => url.searchParams.delete(k)); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  }, []);
  useEffect(() => { try { localStorage.setItem(GIFT_CONTEXT_KEY, giftContextId({ gid, mid: m.id })); } catch {} }, [gid, m.id]);
  const [quickSaving, setQuickSaving] = useState(false), [listSaving, setListSaving] = useState(false), [catalogSaving,setCatalogSaving]=useState(false),[cartSaving,setCartSaving]=useState(false);
  const [about, setAbout] = useState({ hobbies: prof.hobbies || "", address: prof.address || "" });
  const [demographicDraft,setDemographicDraft] = useState(null), [profileSaving,setProfileSaving] = useState(false);
  const demographics = demographicDraft || cleanWishDemographics(prof);
  const target = {gid,mid:m.id,person:m.name,name:g.name,budget:g.budget,cur:g.cur};
  const showIdeas = () => document.getElementById("wishlist-gift-ideas")?.scrollIntoView({behavior:"smooth",block:"start"});
  const [ans, setAns] = useState({});
  async function saveProfile(nextItems, extra = {}) {
    if (writing.current || quickSaving || listSaving || catalogSaving || cartSaving || profileSaving) return false;
    const profile = { ...prof, ...about, ...demographics, ...extra, items: nextItems };
    if (nextItems.length > MAX_WISHES || new TextEncoder().encode(JSON.stringify(profile)).length > MAX_PROFILE_BYTES) { toast("Your wish list is full. Shorten a few notes or remove an item first."); return false; }
    writing.current = true; setSaving(true); setDraft(nextItems);
    try { await rpc("hp_save_profile", { p_gid: gid, p_mtok: tokens.mtok, p_target: m.id, p_profile: profile }); await reload(); setDraft(null); return true; }
    catch { toast("Couldn't save. Try again."); setDraft(null); return false; }
    finally { writing.current = false; setSaving(false); }
  }
  async function saveWish(wish) {
    if (items.some(w => w.id !== wish.id && wishMatches(w, wish))) return "This gift and these options are already on your list.";
    const next = selection?.editing ? items.map(w => w.id === wish.id ? wish : w) : [...items, wish];
    if (await saveProfile(next)) { setSelection(null); toast(selection?.editing ? "Wish updated" : "Added to your wish list"); }
  }
  const others = allG().filter(x => x.gid !== gid && x.mtok);
  async function importFrom(otherGid) {
    const o = others.find(x => x.gid === otherGid); if (!o) return;
    try {
      const s = normState(await rpc("hp_state", { p_gid: o.gid, p_mtok: o.mtok, p_atok: null }));
      const src = s.members.find(x => x.id === s.me?.id)?.profile?.items || [];
      const add = [];
      for (const wish of src) if (![...items, ...add].some(w => wishMatches(w, wish)) && items.length + add.length < MAX_WISHES) add.push({ ...wish, id: rid(6) });
      if (!add.length) return toast("No new wishes to copy");
      if (await saveProfile(items.concat(add))) toast(`Copied ${add.length} wish${add.length > 1 ? "es" : ""}`);
    } catch { toast("Couldn't copy from that celebration."); }
  }
  return (
    <GiftListCartProvider key={m.id} target={target} initialItems={items} initialProfile={demographics} disabled={saving||quickSaving||listSaving||catalogSaving||profileSaving} onBusy={setCartSaving} onChanged={async()=>{await reload();setDraft(null);}}>
    <>
      <div className="wish-toolbar"><div><p className="eyebrow">Picked by you. A surprise from them.</p><h2>Your little wish collection</h2><p className="muted small">Add a few favorites and the details that make them yours.</p></div><div className="row"><button className="btn small ghost" disabled={saving||catalogSaving||cartSaving||profileSaving} onClick={showIdeas}>Browse gift ideas</button><button className="btn small" disabled={saving || catalogSaving || profileSaving || items.length >= MAX_WISHES} onClick={() => setSelection({})}>+ Add a gift or link</button></div></div>
      <WishProfileChoices gid={gid} mid={m.id} token={tokens.mtok} person={m.kid?m.name:null} value={demographics} onChange={setDemographicDraft} onBusy={setProfileSaving} onSaved={reload} disabled={saving||quickSaving||listSaving||catalogSaving||cartSaving}/>
      <div className="wish-discovery shop-theme-ebay" id="wishlist-gift-ideas">
        <div className="wish-discovery-heading"><div><p className="eyebrow">Pick a favorite. We’ll save it here.</p><p>Real eBay products, matched to your choices{g.budget?` · ${money(g.cur,g.budget)} celebration budget`:''}.</p></div><GiftListButton/></div>
        <EbayGiftCatalog target={target} budget={g.budget} currency={g.cur} profile={demographics} showPreferences={false} disabled={saving||quickSaving||listSaving||cartSaving||profileSaving} onBusy={setCatalogSaving} onSaved={async()=>{await reload();setDraft(null);}}/>
      </div>
      <AmazonListSetup onListPage target={{ gid, mid: m.id, person: m.name, name: g.name, budget: g.budget, cur: g.cur }} items={items} disabled={saving || quickSaving || catalogSaving || profileSaving} onBusy={setListSaving} onSaved={async () => { await reload(); setDraft(null); }}/>
      <details className="individual-gifts" open={!items.some(w => amazonWishListUrl(w.u))}><summary>Paste a gift link from any store</summary><QuickWish target={{ gid, mid: m.id, person: m.name, name: g.name }} disabled={saving || listSaving || catalogSaving || profileSaving} onBusy={setQuickSaving} onSaved={async () => { await reload(); setDraft(null); }}/></details>
      {items.length ? <div className="product-grid wish-grid">{items.map((w, i) => <WishCard key={w.id} wish={w} group={g} product={products[w.a || ebayItemId(w.u)]}><div className="row"><button className="btn small ghost" disabled={saving||catalogSaving||cartSaving||profileSaving} onClick={() => setSelection({ ...w, editing: true })}>Edit wish</button><button className="btn small ghost" aria-label={`Move ${w.t} earlier`} disabled={!i || saving || catalogSaving || profileSaving} onClick={() => { const next = [...items]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; saveProfile(next); }}>↑</button><button className="link tiny" disabled={saving||catalogSaving||cartSaving||profileSaving} onClick={() => saveProfile(items.filter(item => item.id !== w.id))}>Remove</button></div></WishCard>)}</div> : <div className="wish-empty"><span aria-hidden="true">♡</span><h3>A good surprise starts with a little hint.</h3><p>Choose a gift from the ideas above, or add a link from any store.</p><button className="btn small" onClick={showIdeas}>Find my first wish →</button></div>}
      <p className="tiny muted">{items.length}/{MAX_WISHES} wishes · Reservations for individual gifts stay hidden from you, so the surprise stays intact. {AMAZON_DISCLOSURE} Hatpull may also earn a commission from eBay purchases.</p>
      {Object.values(products).some(p=>p.provider!=="ebay") && <AmazonPriceDetails/>}
      {others.length > 0 && <div className="panel row"><select id="imp" aria-label="Copy wishes from" defaultValue=""><option value="" disabled>Copy wishes from another celebration…</option>{others.map(o => <option key={o.gid} value={o.gid}>{o.name}</option>)}</select><button className="btn small ghost" disabled={saving||catalogSaving||cartSaving||profileSaving} onClick={() => { const v = document.getElementById("imp").value; if (v) importFrom(v); }}>Copy</button></div>}
      {selection && <WishComposer key={selection.id || "new"} initial={selection} group={g} saving={saving || listSaving || quickSaving || catalogSaving || profileSaving} onSave={saveWish} onClose={() => setSelection(null)}/>}
      <div className="panel stack"><h3>About {m.kid ? m.name : "you"}</h3>
        <p className="small muted">Helps whoever drew {m.kid ? m.name : "you"} pick a gift.</p>
        <label htmlFor="hob">Hobbies and interests</label>
        <textarea id="hob" maxLength={500} value={about.hobbies} onChange={e => setAbout({ ...about, hobbies: e.target.value })} placeholder="Running, coffee, sci-fi novels…" />
        {g.settings?.mail?.on && !m.kid && <><label htmlFor="addr">Mailing address</label><textarea id="addr" maxLength={300} value={about.address} onChange={e => setAbout({ ...about, address: e.target.value })} placeholder="Street, city, postal code" /><p className="tiny muted">{g.settings.mail.vis === "all" ? "Everyone in the group can see this." : "Only the person who drew you can see this."}</p></>}
        <div><button className="btn small ghost" disabled={saving||catalogSaving||cartSaving||profileSaving} onClick={async () => { if (await saveProfile(items)) toast("Saved"); }}>Save</button></div>
      </div>
      {!m.kid && <div className="panel stack"><h3>Questions for you</h3>
        {questions.length ? questions.map(q => <div className="msg stack" style={{ gap: 6 }} key={q.id}><div className="small"><b>Q:</b> {q.body}</div>
          {q.answer ? <div className="small"><b>A:</b> {q.answer}</div>
            : <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={async e => { e.preventDefault(); const a = (ans[q.id] || "").trim(); if (!a) return; try { await rpc("hp_answer", { p_gid: gid, p_mtok: tokens.mtok, p_qid: q.id, p_answer: a }); toast("Answer sent"); reload(); } catch { toast("Couldn't send your answer."); } }}>
                <input maxLength={300} placeholder="Your answer" aria-label="Your answer" value={ans[q.id] || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} /><button className="btn small" type="submit">Answer</button></form>}</div>)
          : <p className="muted small">No questions yet. People can ask you things anonymously, like your size or favorite color.</p>}
      </div>}
    </></GiftListCartProvider>
  );
}

function Viewer({ gid, g, m, me, prof, items, state, tokens, reload, xm }) {
  const [q, setQ] = useState(""), [busy, setBusy] = useState(false), [favorites, setFavorites] = useState(false);
  const products = useGiftProducts(items.map(w => w.a || ebayItemId(w.u)));
  const reserving = useRef(false);
  const res = Object.fromEntries(state.reservations.filter(r => r.owner === m.id).map(r => [r.item, r]));
  const qs = state.questions.filter(x => x.to === m.id);
  async function reserve(item, on, el) {
    if (reserving.current) return; reserving.current = true; setBusy(true);
    try { await rpc("hp_reserve", { p_gid: gid, p_mtok: tokens.mtok, p_owner: m.id, p_item: item, p_on: on }); if (on && xm) burst(el); toast(on ? (xm ? "Reserved. It's your secret 🤫🎁" : "Reserved. Only other gift-givers can see this.") : "Reservation removed"); await reload(); }
    catch { toast("Couldn't update. Try again."); }
    finally { reserving.current = false; setBusy(false); }
  }
  const b = parseFloat(g.budget) || 0, lo = b ? Math.round(b * 0.7) : 0, hi = b ? Math.round(b) : 0;
  const hob = (prof.hobbies || "").split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  const kid = ["Under 5", "5–11"].includes(prof.age), teen = prof.age === "12–17";
  const pool = kid ? GIFT_CATS.Kids : xm ? GIFT_CATS["Stocking stuffers"].slice(0, 2).concat(["cozy blanket", "coffee gift set", "board game", "bluetooth speaker", "scented candle set", "cookbook"]) : ["cozy blanket", "coffee gift set", "board game", "bluetooth speaker", "scented candle set", "cookbook", "skincare set", "desk plant"];
  const suffix = kid ? "" : teen ? " for teens" : prof.who ? ` for ${prof.who}` : "";
  const terms = hob.map(h => `${h} gift`).concat(pool.map(t => t + suffix)).slice(0, 10);
  const usd = !g.cur || g.cur === "$";
  return (
    <>
      <div className="wish-toolbar"><div><p className="eyebrow">Chosen by {m.name}</p><h2>A gift they’ll love</h2>{g.budget && <p className="small muted">Group budget: {money(g.cur, g.budget)} per gift</p>}</div>{items.some(w => w.priority === "1") && <button className="btn small ghost" aria-pressed={favorites} onClick={() => setFavorites(v => !v)}>{favorites ? "Show all wishes" : "♥ Most wanted first"}</button>}</div>
      {items.some(w => w.a || ebayItemId(w.u) || (!w.u && w.q)) && <p className="tiny muted">{AMAZON_DISCLOSURE} Hatpull may also earn a commission from eBay purchases.</p>}
      {items.length ? <div className="product-grid wish-grid">{(favorites ? [...items].sort((a,b) => Number(b.priority === "1") - Number(a.priority === "1")) : items).map(w => { const r = res[w.id]; return <WishCard key={w.id} wish={w} group={g} product={products[w.a || ebayItemId(w.u)]} reserved={!!r}>
        {me && !amazonWishListUrl(w.u) && (r ? (r.mine ? <button className="btn small ghost block" disabled={busy} onClick={() => reserve(w.id, false)}>✓ Reserved by you · undo</button> : <span className="pill">Already reserved</span>) : <button className="btn small block" disabled={busy} onClick={e => reserve(w.id, true, e.currentTarget)}>Reserve this gift privately</button>)}
      </WishCard>; })}</div> : <div className="wish-empty"><h3>No wishes just yet.</h3><p>Ask {m.name} to add a few favorites or share a helpful hint below.</p></div>}
      <p className="tiny muted">{items.some(w => !amazonWishListUrl(w.u)) ? "Reserving a gift does not buy it. Complete your purchase at the store." : "Choose and purchase gifts on Amazon."} {AMAZON_DISCLOSURE} Hatpull may also earn a commission from eBay purchases.</p>
      {Object.values(products).some(p=>p.provider!=="ebay") && <AmazonPriceDetails/>}
      <div className="panel stack"><h3>{xm ? "🎄 " : ""}Hobbies and interests</h3><p className={prof.hobbies ? "" : "muted"} style={{ whiteSpace: "pre-wrap" }}>{prof.hobbies || `${m.name} hasn't added any hobbies or interests.`}</p></div>
      {prof.address && <div className="panel stack"><h3>Mailing address</h3><p style={{ whiteSpace: "pre-wrap" }}>{prof.address}</p></div>}
      {!m.kid && me && <div className="panel stack">
        <h3>{xm ? "🤫 " : ""}Ask {m.name} a question anonymously</h3>
        {m.claimed ? <><form className="row" style={{ flexWrap: "nowrap" }} onSubmit={async e => { e.preventDefault(); const t = q.trim(); if (!t) return; try { await rpc("hp_ask", { p_gid: gid, p_mtok: tokens.mtok, p_to: m.id, p_body: t }); setQ(""); toast("Question sent anonymously"); reload(); } catch { toast("Couldn't send your question."); } }}>
          <input maxLength={300} value={q} onChange={e => setQ(e.target.value)} placeholder={items.length ? "What size do you wear?" : "Could you add a few wishes to your list?"} aria-label="Your question" /><button className="btn small" type="submit">Ask</button></form>
          <p className="tiny muted">{m.name} won't see who asked.</p></> : <p className="muted small">You can ask a question once {m.name} has joined.</p>}
        {qs.length > 0 && <div className="stack" style={{ gap: 8 }}>{qs.map(x => <div className="msg" key={x.id}><div className="small"><b>Q:</b> {x.body}</div><div className={`small ${x.answer ? "" : "muted"}`}><b>A:</b> {x.answer || "Not answered yet"}</div></div>)}</div>}
      </div>}
      <div className="panel stack">
        <div className="row between"><h3>Gift ideas for {m.name}</h3>{b > 0 && <span className="pill">{money(g.cur, `${lo}–${hi}`)}</span>}</div>
        <p className="small muted">{AMAZON_DISCLOSURE} {hob.length ? `Based on ${m.name}'s interests and the group budget.` : "Ideas to explore with the group budget."} Each opens an Amazon search in a new tab.</p>
        <div className="ideas">{terms.map(t => <a key={t} href={amazonUrl(t, usd ? lo : 0, usd ? hi : 0)} target="_blank" rel={AFF_REL}>{t[0].toUpperCase() + t.slice(1)}</a>)}</div>
      </div>
    </>
  );
}
