"use client";
import { useState } from "react";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { rpc } from "@/lib/db";
import { allG } from "@/lib/store";
import { isXmas, money, safeUrl, daysUntil, AGES, GIFT_CATS, amazonUrl, rid, AMAZON_DISCLOSURE, AFF_REL, cleanUserLink, normState } from "@/lib/core";
import { toast, burst } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";
import { Bow } from "./bits";

export default function WishList({ gid, mid }) {
  const { state, error, tokens, reload } = useGroup(gid);
  const [draft, setDraft] = useState(null); // optimistic items
  if (error) return <div className="mid panel stack"><p>You don't have access to this wish list on this device.</p><Link className="btn small ghost" href="/my">My celebrations</Link></div>;
  if (!state) return <div className="mid panel muted">Loading wish list…</div>;
  const g = state.group, me = state.me, xm = isXmas(g);
  const m = state.members.find(x => x.id === mid);
  if (!m) return <div className="mid panel stack"><p>This person isn't in the celebration anymore.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back</Link></div>;
  const mineList = me && (m.id === me.id || (m.kid && m.parent_id === me.id));
  if (!m.visible) return <div className="mid panel stack"><h3>This wish list is private</h3><p className="muted">The organizer set wish lists so only the person who drew {m.name} can see them.</p><Link className="btn small ghost" href={`/g/${gid}`}>Back to {g.name}</Link></div>;
  const prof = m.profile || {}, items = draft ?? prof.items ?? [];
  const iDrew = me && me.receiver_id === m.id && state.me.drawn;
  const d = daysUntil(g.date);

  return (
    <div className="mid stack">
      <Festive on={xm} />
      <Link href={`/g/${gid}`} className="link crumb">← {g.name}</Link>
      {xm ? <XBanner>
          <p className="kicker">{mineList ? (m.kid ? `✉️ ${m.name}'s letter to Santa` : "✉️ Dear Santa…") : iDrew ? "🎅 You're their Secret Santa" : "🎁 Wish list"}</p>
          <h1>{mineList ? (m.kid ? `${m.name}'s wish list` : "My wish list") : `${m.name}'s wish list`}</h1>
          <div className="meta-x"><span>🎁 <b>{items.length}</b> wish{items.length === 1 ? "" : "es"}</span>{g.budget && <span>💸 <b>{money(g.cur, g.budget)}</b> budget</span>}{d != null && d >= 0 && <span>{d} sleeps to go</span>}</div>
        </XBanner>
        : <div className="row between"><h1 style={{ fontSize: "clamp(28px,5vw,40px)" }}>{mineList ? (m.kid ? `${m.name}'s wish list` : "My wish list") : `Wish list of ${m.name}`}</h1><span className="pill">{items.length} gifts</span></div>}
      {iDrew && <div className="note">{xm ? `🎅 You're ${m.name}'s Secret Santa.` : `You drew ${m.name}.`} Reserve a gift so nobody else buys the same thing. {m.name} won't see it.</div>}
      {mineList ? <Editor gid={gid} g={g} m={m} prof={prof} items={items} setDraft={setDraft} tokens={tokens} reload={reload} xm={xm} questions={state.questions.filter(q => q.to === m.id)} />
        : <Viewer gid={gid} g={g} m={m} me={me} prof={prof} items={items} state={state} tokens={tokens} reload={reload} xm={xm} />}
    </div>
  );
}

function ItemRow({ w, g, xm, children, reserved }) {
  const u = w.u && cleanUserLink(safeUrl(w.u));
  return (
    <div className={`wish ${reserved ? "reserved" : ""}`}>
      <span className="tag" style={{ "--h": "28px", paddingLeft: 24, fontSize: 13 }}>{w.p ? money(g.cur, w.p) : xm ? "🎁" : "★"}</span>
      <div className="grow"><div className="wt">{w.t}</div>{u && <a href={u} target="_blank" rel="noopener noreferrer nofollow">{w.u.replace(/^https?:\/\//, "").slice(0, 60)}</a>}{w.n && <div className="tiny muted">{w.n}</div>}</div>
      {children}
    </div>
  );
}

function Editor({ gid, g, m, prof, items, setDraft, tokens, reload, xm, questions }) {
  const [f, setF] = useState({ t: "", p: "", u: "", n: "" });
  const [about, setAbout] = useState({ hobbies: prof.hobbies || "", age: prof.age || "", who: prof.who || "", address: prof.address || "" });
  const [ans, setAns] = useState({});
  async function saveProfile(nextItems, extra = {}) {
    setDraft(nextItems);
    try { await rpc("hp_save_profile", { p_gid: gid, p_mtok: tokens.mtok, p_target: m.id, p_profile: { ...prof, ...about, ...extra, items: nextItems } }); await reload(); setDraft(null); return true; }
    catch { toast("Couldn't save. Try again."); setDraft(null); return false; }
  }
  const others = allG().filter(x => x.gid !== gid && x.mtok);
  async function importFrom(otherGid) {
    const o = others.find(x => x.gid === otherGid); if (!o) return;
    try {
      const s = normState(await rpc("hp_state", { p_gid: o.gid, p_mtok: o.mtok, p_atok: null }));
      const src = s.members.find(x => x.id === s.me?.id)?.profile?.items || [];
      const have = new Set(items.map(i => i.t.toLowerCase()));
      const add = src.filter(i => !have.has(i.t.toLowerCase())).map(i => ({ ...i, id: rid(6) }));
      if (!add.length) return toast("No new wishes to copy");
      if (await saveProfile(items.concat(add).slice(0, 40))) toast(`Copied ${add.length} wish${add.length > 1 ? "es" : ""}`);
    } catch { toast("Couldn't copy from that celebration."); }
  }
  return (
    <>
      <div className={`panel stack ${xm ? "card-x" : ""}`}>{xm && <Bow />}
        {items.length ? items.map((w, i) => <ItemRow key={w.id} w={w} g={g} xm={xm}>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn small ghost" aria-label="Move up" disabled={!i} onClick={() => { const l = items.slice(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; saveProfile(l); }}>↑</button>
            <button className="btn small ghost" onClick={() => saveProfile(items.filter((_, j) => j !== i))}>Remove</button>
          </div></ItemRow>)
          : <p className="muted">{xm ? "Dear Santa, I'd love… Add at least 3 wishes so your Secret Santa has choices." : "Nothing yet. Add at least 3 gifts so whoever drew you has choices."}</p>}
        <form className="stack" style={{ gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }} onSubmit={async e => {
          e.preventDefault(); if (!f.t.trim()) return;
          const ok = await saveProfile(items.concat([{ id: rid(6), t: f.t.trim().slice(0, 120), p: f.p.trim().slice(0, 10), u: f.u.trim().slice(0, 400), n: f.n.trim().slice(0, 140) }]).slice(0, 40));
          if (ok) { setF({ t: "", p: "", u: "", n: "" }); toast("Added to your wish list"); }
        }}>
          <div className="grid2"><div><label htmlFor="wT">Gift</label><input id="wT" maxLength={120} value={f.t} onChange={e => setF({ ...f, t: e.target.value })} placeholder="Wool socks, size 9" /></div>
            <div><label htmlFor="wP">Price <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="wP" maxLength={10} inputMode="decimal" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} placeholder={g.budget || "25"} /></div></div>
          <div><label htmlFor="wU">Link <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="wU" maxLength={400} value={f.u} onChange={e => setF({ ...f, u: e.target.value })} placeholder="https://" /></div>
          <div><label htmlFor="wN">Note <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input id="wN" maxLength={140} value={f.n} onChange={e => setF({ ...f, n: e.target.value })} placeholder="Any color except yellow" /></div>
          <div><button className="btn small" type="submit">{xm ? "Add to my letter 🎁" : "Add to wish list"}</button></div>
        </form>
        <p className="tiny muted">People can secretly reserve gifts on your list. You won't see which ones, so the surprise stays intact.</p>
        {others.length > 0 && <div className="row" style={{ flexWrap: "nowrap", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <select id="imp" aria-label="Copy wishes from" defaultValue="">{[<option key="" value="" disabled>Copy wishes from another celebration…</option>, ...others.map(o => <option key={o.gid} value={o.gid}>{o.name}</option>)]}</select>
          <button className="btn small ghost" onClick={() => { const v = document.getElementById("imp").value; if (v) importFrom(v); }}>Copy</button></div>}
      </div>
      <div className="panel stack"><h3>About {m.kid ? m.name : "you"}</h3>
        <p className="small muted">Helps whoever drew {m.kid ? m.name : "you"} pick a gift.</p>
        <div className="grid2">
          <div><label htmlFor="age">Age</label><select id="age" value={about.age} onChange={e => setAbout({ ...about, age: e.target.value })}><option value="">Prefer not to say</option>{AGES.map(a => <option key={a}>{a}</option>)}</select></div>
          <div><label htmlFor="who">Gift ideas for</label><select id="who" value={about.who} onChange={e => setAbout({ ...about, who: e.target.value })}><option value="">Anyone</option><option value="women">A woman</option><option value="men">A man</option></select></div>
        </div>
        <label htmlFor="hob">Hobbies and interests</label>
        <textarea id="hob" maxLength={500} value={about.hobbies} onChange={e => setAbout({ ...about, hobbies: e.target.value })} placeholder="Running, coffee, sci-fi novels…" />
        {g.settings?.mail?.on && !m.kid && <><label htmlFor="addr">Mailing address</label><textarea id="addr" maxLength={300} value={about.address} onChange={e => setAbout({ ...about, address: e.target.value })} placeholder="Street, city, postal code" /><p className="tiny muted">{g.settings.mail.vis === "all" ? "Everyone in the group can see this." : "Only the person who drew you can see this."}</p></>}
        <div><button className="btn small ghost" onClick={async () => { if (await saveProfile(items)) toast("Saved"); }}>Save</button></div>
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
  const [q, setQ] = useState("");
  const res = Object.fromEntries(state.reservations.filter(r => r.owner === m.id).map(r => [r.item, r]));
  const qs = state.questions.filter(x => x.to === m.id);
  async function reserve(item, on, el) {
    try { await rpc("hp_reserve", { p_gid: gid, p_mtok: tokens.mtok, p_owner: m.id, p_item: item, p_on: on }); if (on && xm) burst(el); toast(on ? (xm ? "Reserved. It's your secret 🤫🎁" : "Reserved. Only other gift-givers can see this.") : "Reservation removed"); reload(); }
    catch { toast("Couldn't update. Try again."); }
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
      <div className={`panel stack ${xm ? "card-x" : ""}`}>{xm && <Bow />}
        {items.length ? items.map(w => { const r = res[w.id]; return <ItemRow key={w.id} w={w} g={g} xm={xm} reserved={!!r}>
          {me && (r ? (r.mine ? <button className="btn small ghost" onClick={() => reserve(w.id, false)}>Reserved by you · undo</button> : <span className="pill">Reserved</span>)
            : <button className="btn small ghost" onClick={e => reserve(w.id, true, e.currentTarget)}>Reserve</button>)}</ItemRow>; })
          : <p className="muted">{xm ? `${m.name} hasn't written to Santa yet. Ask them below!` : "No gifts requested yet."}</p>}
      </div>
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
        <p className="small muted">{AMAZON_DISCLOSURE} {hob.length ? `Based on ${m.name}'s interests and the group budget.` : "Popular picks within the group budget."} Each opens an Amazon search in a new tab.</p>
        <div className="ideas">{terms.map(t => <a key={t} href={amazonUrl(t, lo, usd ? hi : 0)} target="_blank" rel={AFF_REL}>{t[0].toUpperCase() + t.slice(1)}</a>)}</div>
      </div>
    </>
  );
}
