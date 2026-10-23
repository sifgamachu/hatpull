"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { rpc } from "@/lib/db";
import { allG } from "@/lib/store";
import { isXmas, money, daysUntil, AGES, GIFT_CATS, amazonUrl, rid, AMAZON_DISCLOSURE, AFF_REL, normState } from "@/lib/core";
import { toast, burst } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";
import GiftBrowser from "./GiftBrowser";
import { WishCard, WishComposer } from "./WishCards";
import { useGiftProducts, AmazonPriceDetails } from "./GiftProducts";
import { GIFT_IDEAS, MAX_WISHES, MAX_PROFILE_BYTES, productAsin, productUrl, wishMatches } from "@/lib/gifts.mjs";

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
  if (error && error !== "network") return <div className="mid panel stack"><p>{error === "not_found" ? "This celebration no longer exists." : "You don't have access to this wish list on this device."}</p><Link className="btn small ghost" href="/my">My celebrations</Link></div>;
  if (!state) return <div className="mid panel muted"><h1 className="sr-only">Wish list</h1>{error === "network" ? "Can't reach the server. Retrying…" : "Loading wish list…"}</div>;
  const g = state.group, me = state.me, xm = isXmas(g);
  const m = state.members.find(x => x.id === mid);
  if (!m) return <div className="mid panel stack"><p>This person isn't in the celebration anymore.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back</Link></div>;
  const mineList = me && (m.id === me.id || (m.kid && m.parent_id === me.id));
  if (!m.visible) return <div className="mid panel stack"><h3>This wish list is private</h3><p className="muted">The organizer set wish lists so only the person who drew {m.name} can see them.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back to {g.name}</Link></div>;
  const prof = m.profile || {}, items = draft ?? prof.items ?? [];
  const iDrew = me && me.receiver_id === m.id && state.me.drawn;
  const d = daysUntil(g.date);

  return (
    <div className="wishlist-page stack">
      <Festive on={xm} />
      <Link href={`/g/${gid}`} className="link crumb">← {g.name}</Link>
      {xm ? <XBanner>
          <p className="kicker">{mineList ? (m.kid ? `✉️ ${m.name}'s letter to Santa` : "✉️ Dear Santa…") : iDrew ? "🎅 You're their Secret Santa" : "🎁 Wish list"}</p>
          <h1>{mineList ? (m.kid ? `${m.name}'s wish list` : "My wish list") : `${m.name}'s wish list`}</h1><h2 className="sr-only">Gifts and details</h2>
          <div className="meta-x"><span>🎁 <b>{items.length}</b> wish{items.length === 1 ? "" : "es"}</span>{g.budget && <span>💸 <b>{money(g.cur, g.budget)}</b> budget</span>}{d != null && d >= 0 && <span>{d} sleeps to go</span>}</div>
        </XBanner>
        : <div className="row between"><h1 style={{ fontSize: "clamp(28px,5vw,40px)" }}>{mineList ? (m.kid ? `${m.name}'s wish list` : "My wish list") : `Wish list of ${m.name}`}</h1><h2 className="sr-only">Gifts and details</h2><span className="pill">{items.length} gift{items.length === 1 ? "" : "s"}</span></div>}
      {iDrew && <div className="note">{xm ? `🎅 You're ${m.name}'s Secret Santa.` : `You drew ${m.name}.`} Reserve a gift so nobody else buys the same thing. {m.name} won't see it.</div>}
      {mineList ? <Editor gid={gid} g={g} m={m} prof={prof} items={items} setDraft={setDraft} tokens={tokens} reload={reload} xm={xm} questions={viewState.questions.filter(q => q.to === m.id)} />
        : <Viewer gid={gid} g={g} m={m} me={me} prof={prof} items={items} state={viewState} tokens={tokens} reload={reload} xm={xm} />}
      {more && <button className="btn ghost" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Loading…" : "Load older questions"}</button>}
    </div>
  );
}

function Editor({ gid, g, m, prof, items, setDraft, tokens, reload, xm, questions }) {
  const writing = useRef(false), opened = useRef(false);
  const [saving, setSaving] = useState(false), [selection, setSelection] = useState(null), [browse, setBrowse] = useState(false);
  const products = useGiftProducts(items.map(w => w.a));
  function choose(gift) {
    if (items.length >= MAX_WISHES) return toast("Your list has 40 wishes. Remove one before adding another.");
    setSelection(gift.kind === "product" ? { t: "My Amazon pick", a: gift.asin, u: productUrl(gift.asin) } : { t: gift.title, art: gift.art, q: gift.query });
  }
  useEffect(() => {
    if (opened.current) return; opened.current = true;
    const url = new URL(location.href), idea = GIFT_IDEAS.find(i => i.id === url.searchParams.get("idea")), asin = productAsin(url.searchParams.get("asin") || "");
    if (idea) choose(idea); else if (asin) choose({ kind: "product", asin });
    if (url.searchParams.has("idea") || url.searchParams.has("asin")) { url.searchParams.delete("idea"); url.searchParams.delete("asin"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
  }, []);
  const [about, setAbout] = useState({ hobbies: prof.hobbies || "", age: prof.age || "", who: prof.who || "", address: prof.address || "" });
  const [ans, setAns] = useState({});
  async function saveProfile(nextItems, extra = {}) {
    if (writing.current) return false;
    const profile = { ...prof, ...about, ...extra, items: nextItems };
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
    <>
      <div className="wish-toolbar"><div><p className="eyebrow">Picked by you. A surprise from them.</p><h2>Your little wish collection</h2><p className="muted small">Add a few favorites and the details that make them yours.</p></div><div className="row"><button className="btn small ghost" disabled={saving} onClick={() => setBrowse(v => !v)}>{browse ? "Close gift finder" : "Browse gift ideas"}</button><button className="btn small" disabled={saving || items.length >= MAX_WISHES} onClick={() => setSelection({})}>+ Add a gift or link</button></div></div>
      {browse && <div className="wish-discovery"><GiftBrowser budget={g.budget} currency={g.cur} age={about.age} onSelect={choose} savedAsins={items.map(w => w.a)} compact/></div>}
      {items.length ? <div className="product-grid wish-grid">{items.map((w, i) => <WishCard key={w.id} wish={w} group={g} product={products[w.a]}><div className="row"><button className="btn small ghost" disabled={saving} onClick={() => setSelection({ ...w, editing: true })}>Edit wish</button><button className="btn small ghost" aria-label={`Move ${w.t} earlier`} disabled={!i || saving} onClick={() => { const next = [...items]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; saveProfile(next); }}>↑</button><button className="link tiny" disabled={saving} onClick={() => saveProfile(items.filter(item => item.id !== w.id))}>Remove</button></div></WishCard>)}</div> : <div className="wish-empty"><span aria-hidden="true">♡</span><h3>A good surprise starts with a little hint.</h3><p>Add an exact product link, describe something you’d love, or browse for inspiration. Three wishes give your gift-giver a good place to start.</p><button className="btn small" onClick={() => setBrowse(true)}>Find my first wish →</button></div>}
      <p className="tiny muted">{items.length}/{MAX_WISHES} wishes · Reservations stay hidden from you, so the surprise stays intact. {AMAZON_DISCLOSURE}</p>
      {Object.keys(products).length > 0 && <AmazonPriceDetails/>}
      {others.length > 0 && <div className="panel row"><select id="imp" aria-label="Copy wishes from" defaultValue=""><option value="" disabled>Copy wishes from another celebration…</option>{others.map(o => <option key={o.gid} value={o.gid}>{o.name}</option>)}</select><button className="btn small ghost" disabled={saving} onClick={() => { const v = document.getElementById("imp").value; if (v) importFrom(v); }}>Copy</button></div>}
      {selection && <WishComposer key={selection.id || "new"} initial={selection} group={g} saving={saving} onSave={saveWish} onClose={() => setSelection(null)}/>}
      <div className="panel stack"><h3>About {m.kid ? m.name : "you"}</h3>
        <p className="small muted">Helps whoever drew {m.kid ? m.name : "you"} pick a gift.</p>
        <div className="grid2">
          <div><label htmlFor="age">Age</label><select id="age" value={about.age} onChange={e => setAbout({ ...about, age: e.target.value })}><option value="">Prefer not to say</option>{AGES.map(a => <option key={a}>{a}</option>)}</select></div>
          <div><label htmlFor="who">Gift ideas for</label><select id="who" value={about.who} onChange={e => setAbout({ ...about, who: e.target.value })}><option value="">Anyone</option><option value="women">A woman</option><option value="men">A man</option></select></div>
        </div>
        <label htmlFor="hob">Hobbies and interests</label>
        <textarea id="hob" maxLength={500} value={about.hobbies} onChange={e => setAbout({ ...about, hobbies: e.target.value })} placeholder="Running, coffee, sci-fi novels…" />
        {g.settings?.mail?.on && !m.kid && <><label htmlFor="addr">Mailing address</label><textarea id="addr" maxLength={300} value={about.address} onChange={e => setAbout({ ...about, address: e.target.value })} placeholder="Street, city, postal code" /><p className="tiny muted">{g.settings.mail.vis === "all" ? "Everyone in the group can see this." : "Only the person who drew you can see this."}</p></>}
        <div><button className="btn small ghost" disabled={saving} onClick={async () => { if (await saveProfile(items)) toast("Saved"); }}>Save</button></div>
      </div>
      {!m.kid && <div className="panel stack"><h3>Questions for you</h3>
        {questions.length ? questions.map(q => <div className="msg stack" style={{ gap: 6 }} key={q.id}><div className="small"><b>Q:</b> {q.body}</div>
          {q.answer ? <div className="small"><b>A:</b> {q.answer}</div>
            : <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={async e => { e.preventDefault(); const a = (ans[q.id] || "").trim(); if (!a) return; try { await rpc("hp_answer", { p_gid: gid, p_mtok: tokens.mtok, p_qid: q.id, p_answer: a }); toast("Answer sent"); reload(); } catch { toast("Couldn't send your answer."); } }}>
                <input maxLength={300} placeholder="Your answer" aria-label="Your answer" value={ans[q.id] || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} /><button className="btn small" type="submit">Answer</button></form>}</div>)
          : <p className="muted small">No questions yet. People can ask you things anonymously, like your size or favorite color.</p>}
      </div>}
    </>
  );
}

function Viewer({ gid, g, m, me, prof, items, state, tokens, reload, xm }) {
  const [q, setQ] = useState(""), [busy, setBusy] = useState(false), [favorites, setFavorites] = useState(false);
  const products = useGiftProducts(items.map(w => w.a));
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
      {items.length ? <div className="product-grid wish-grid">{(favorites ? [...items].sort((a,b) => Number(b.priority === "1") - Number(a.priority === "1")) : items).map(w => { const r = res[w.id]; return <WishCard key={w.id} wish={w} group={g} product={products[w.a]} reserved={!!r}>
        {me && (r ? (r.mine ? <button className="btn small ghost block" disabled={busy} onClick={() => reserve(w.id, false)}>✓ Reserved by you · undo</button> : <span className="pill">Already reserved</span>) : <button className="btn small block" disabled={busy} onClick={e => reserve(w.id, true, e.currentTarget)}>Reserve this gift privately</button>)}
      </WishCard>; })}</div> : <div className="wish-empty"><h3>No wishes just yet.</h3><p>Ask {m.name} to add a few favorites or share a helpful hint below.</p></div>}
      <p className="tiny muted">Reserving a gift does not buy it. Complete your purchase at the store. {AMAZON_DISCLOSURE}</p>
      {Object.keys(products).length > 0 && <AmazonPriceDetails/>}
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
