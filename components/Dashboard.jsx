"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { rpc } from "@/lib/db";
import { getG, delG } from "@/lib/store";
import { isXmas, fmtDate, daysUntil, daysLeftText, money, CURRENCIES, inviteText } from "@/lib/core";
import { toast, copy, burst } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";
import { Ornament, WishBar, Sheet } from "./bits";
import { ExclusionGrid } from "./Wizard";

export default function Dashboard({ gid }) {
  const { state, error, tokens, reload, setFast } = useGroup(gid);
  const [sheet, setSheet] = useState(null);
  const [anim, setAnim] = useState(null); // name shown while spinning
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState(null);
  const firedLive = useRef(false);
  const [now, setNow] = useState(Date.now());
  const liveSoon = !!state?.group?.live_at && Math.abs(new Date(state.group.live_at).getTime() - Date.now()) < 180000;
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), liveSoon ? 250 : 30000); return () => clearInterval(t); }, [liveSoon]);

  const g = state?.group, me = state?.me, adm = state?.is_admin, xm = isXmas(g);
  const ppl = state?.members.filter(m => !m.kid) || [], kids = state?.members.filter(m => m.kid) || [];
  const liveMs = g?.live_at ? new Date(g.live_at).getTime() - now : null;
  const liveOn = g?.mode === "draw" && liveMs != null && liveMs > -120000;
  useEffect(() => { setFast(!!(liveOn && liveMs > -5000)); }, [liveOn, liveMs, setFast]);
  useEffect(() => {
    if (adm && g?.date && daysUntil(g.date) < 0 && g.mode === "draw") rpc("hp_results", { p_gid: gid, p_atok: tokens.atok }).then(setResults).catch(() => {});
  }, [adm, g?.date, g?.mode, gid, tokens]);

  async function reveal() {
    if (anim || !me?.receiver_id) return;
    const names = ppl.map(m => m.name), rec = state.members.find(m => m.id === me.receiver_id);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) for (let i = 0; i < 22; i++) { setAnim(names[(Math.random() * names.length) | 0]); await new Promise(r => setTimeout(r, 60 + i * i * 0.9)); }
    try { await rpc("hp_mark_drawn", { p_gid: gid, p_mtok: tokens.mtok }); } catch {}
    setAnim(null); await reload();
    setTimeout(() => { if (xm) burst(document.querySelector(".slot.done")); }, 50);
    toast(xm ? `You're ${rec?.name}'s Secret Santa 🎅` : `You drew ${rec?.name}`);
  }
  useEffect(() => {
    if (liveOn && liveMs <= 0 && me && !me.drawn && me.receiver_id && !firedLive.current) { firedLive.current = true; reveal(); }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (error === "no_access") return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>You haven't joined this celebration on this device</h1><p className="muted">Open the invitation link from the organizer to pick your name, or open your personal link if you joined on another device.</p><p className="muted">If the organizer reset your name, open the invitation link and pick it again: your match is the same. If your name isn't on the list anymore, the organizer removed you from this celebration.</p></div>;
  if (error === "not_found") return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>We can't find this celebration</h1><p className="muted">It may have been deleted.</p><Link className="btn small ghost" href="/my">My celebrations</Link></div>;
  if (!state) return <div className="panel muted"><h1 className="sr-only">Your celebration</h1>{error === "network" ? "Can't reach the server. Retrying…" : "Loading celebration…"}</div>;
  if (me === null && !adm) return <div className="narrow panel">You're no longer in this celebration.</div>;

  const isDraw = g.mode === "draw";
  const joined = ppl.filter(m => m.claimed).length, drawnN = ppl.filter(m => m.drawn).length, wishN = state.members.filter(m => m.wishes > 0).length;
  const mine = me && state.members.find(m => m.id === me.id);
  const rec = me && state.members.find(m => m.id === me.receiver_id);
  const myQs = me ? state.questions.filter(q => q.to === me.id && !q.answer).length : 0;
  const dleft = daysUntil(g.date);
  const step = (cls, title, body) => <div className={`stepv ${cls}`}><span className="dot">{cls === "done" ? "✓" : ""}</span><div><b>{title}</b>{body && <div className="small muted" style={{ marginTop: 4 }}>{body}</div>}</div></div>;
  const welcome = typeof window !== "undefined" && new URLSearchParams(location.search).get("welcome");

  async function postMsg(e) {
    e.preventDefault(); const t = msg.trim(); if (!t) return; setMsg("");
    try { await rpc("hp_message", { p_gid: gid, p_mtok: tokens.mtok, p_body: t }); reload(); } catch { toast("Couldn't send your message."); setMsg(t); }
  }
  async function startLive() {
    try { await rpc("hp_admin_live", { p_gid: gid, p_atok: tokens.atok }); firedLive.current = false; toast("Live draw in 30 seconds"); reload(); } catch { toast("Couldn't start the live draw."); }
  }

  return (
    <>
      <Festive on={xm} />
      {xm && <div style={{ marginBottom: 16 }}><XBanner>
        <p className="kicker">{me ? `🎄 Merry Christmas, ${me.name}` : "🎄 You're the organizer"}</p>
        <h1>{g.name}</h1>
        <div className="meta-x">
          {g.date && <span>📅 {fmtDate(g.date, { weekday: "short", month: "long", day: "numeric" })}</span>}
          {dleft != null && dleft >= 0 && <span><b>{dleft === 0 ? "Today!" : dleft === 1 ? "Tomorrow" : `${dleft} sleeps`}</b>{dleft > 1 ? " to go" : ""}</span>}
          {g.budget && <span>💸 <b>{money(g.cur, g.budget)}</b></span>}
          <span>👥 {ppl.length} people</span>
        </div>
      </XBanner></div>}
      {welcome && me && <PersonalLink gid={gid} first />}
      <div className="dash">
        {xm && <h2 className="sr-only">Celebration details</h2>}
        <div>
          <div className="panel stack">
            {xm ? <h3>Celebration details</h3> : <><h1 style={{ fontSize: 28 }}>{g.name}</h1><h2 className="sr-only">Details</h2></>}
            {me ? <p>Hi {me.name}! {dleft != null && dleft >= 0 && <span className="muted">{daysLeftText(dleft)}</span>}</p> : <p className="muted">You're organizing but not in the draw.</p>}
            <div className="meta">
              {g.date && <div>📅 {fmtDate(g.date)}</div>}
              {g.budget && <div>💸 {money(g.cur, g.budget)}</div>}
              {g.settings?.venue?.type && <div>📍 {g.settings.venue.type === "online" ? "Online" : g.settings.venue.address || "At a venue"}</div>}
            </div>
            {adm && <button className="btn small ghost" onClick={() => setSheet("settings")}>Manage settings</button>}
          </div>
          {me && <div className="panel stack">
            <div className="row between"><h3>My wish list</h3><span className="pill">{mine?.wishes || 0} gift{mine?.wishes === 1 ? "" : "s"}</span></div>
            {(mine?.wishes || 0) < 3 && <><p className="small muted">Add at least 3 gifts. Tell people what you'd really like.</p><div className="progress"><span style={{ width: `${((mine?.wishes || 0) / 3) * 100}%` }} /></div></>}
            <Link className="btn small" href={`/g/${gid}/w/${me.id}`}>{mine?.wishes ? "Edit my wish list" : "Add gifts to wish list"}</Link>
            {myQs > 0 && <Link className="note small" href={`/g/${gid}/w/${me.id}`} style={{ textDecoration: "none" }}>You have {myQs} anonymous question{myQs > 1 ? "s" : ""} to answer.</Link>}
          </div>}
          {me && isDraw && <div className="panel stack gift">
            <h3>{xm ? "Your Secret Santa pick" : "My drawn name"}</h3>
            {!me.receiver_id ? <p className="muted small">Names are being drawn. Check back in a moment.</p>
              : me.drawn && !anim ? <><div className="slot done"><span>{rec?.name}</span></div><Link className="btn small ghost" href={`/g/${gid}/w/${rec?.id}`}>See {rec?.name}'s wish list</Link></>
              : liveOn && !anim ? <><p className="live">● Live draw</p><div className="slot"><span>{liveMs > 0 ? Math.ceil(liveMs / 1000) : "…"}</span></div><p className="small muted">Everyone sees their name at the same moment. Stay on this page.</p></>
              : <><div className={`slot ${anim ? "spin" : ""}`}><span>{anim || "?"}</span></div><button className="btn small" onClick={reveal} disabled={!!anim}>{xm ? "Unwrap your name 🎁" : "Draw a name"}</button><p className="tiny muted">Make sure nobody's looking at your screen.</p></>}
          </div>}
          {results && <div className="panel stack"><h3>Who drew whom</h3><p className="small muted">Shown to you as organizer now that the celebration is over.</p><div className="list small">{results.map(r => <div className="item" key={r.giver} style={{ padding: "6px 0" }}><span><b>{r.giver}</b> drew {r.receiver}</span></div>)}</div><Link className="btn small" href="/new?occ=0">Draw names again</Link></div>}
        </div>

        <div>
          <div className="panel stack">
            <h3>Progress</h3>
            <div className="steps-v">
              {step(joined >= 1 ? "done" : "now", "Send your invitations", adm ? <><Link className="link" href={`/invite/${gid}`}>Share invitation</Link> · <button className="link" onClick={() => setSheet("remind")}>Send reminder</button></> : null)}
              {step(joined === ppl.length ? "done" : joined ? "now" : "", "Join", `${joined} of ${ppl.length} joined`)}
              {isDraw && step(drawnN === ppl.length ? "done" : drawnN ? "now" : "", "Draw names", `${drawnN} of ${ppl.length} drew a name`)}
              {step(wishN === state.members.length ? "done" : wishN ? "now" : "", "Make wish lists", `${wishN} of ${state.members.length} have a wish list`)}
            </div>
            {adm && isDraw && drawnN < ppl.length && (liveOn && liveMs > 0
              ? <div className="note small">Live draw starts in {Math.ceil(liveMs / 1000)} seconds for everyone on this page.</div>
              : <div className="stack" style={{ gap: 6, borderTop: "1px solid var(--line)", paddingTop: 12 }}><button className="btn small" onClick={startLive}>Start a live draw</button><p className="tiny muted">Get everyone on this page (on a call or in the same room), then start. Each person sees only their own name, all at once.</p></div>)}
          </div>
          <div className="panel stack">
            <h3>Wish lists</h3>
            <p className="eyebrow">{isDraw ? "Members drawing names" : "Members"}</p>
            <div className="list">{ppl.map(m => <PersonRow key={m.id} gid={gid} g={g} m={m} me={me} xm={xm} />)}</div>
            {kids.length > 0 && <><p className="eyebrow" style={{ marginTop: 6 }}>Children's wish lists</p><div className="list">{kids.map(m => <PersonRow key={m.id} gid={gid} g={g} m={m} me={me} xm={xm} parent={state.members.find(x => x.id === m.parent_id)?.name} />)}</div></>}
            {me && <button className="btn small ghost" onClick={() => setSheet("kid")}>+ Add a children's wish list</button>}
          </div>
        </div>

        <div className="col3">
          {isDraw && <div className="panel stack">
            <div className="row between"><h3>Exclusions</h3>{adm && <button className="link" onClick={() => setSheet("excl")}>Manage</button>}</div>
            <div className="row">{g.exclusions?.length ? <ExclusionChips g={g} members={state.members} /> : <span className="muted small">No exclusions are set.</span>}</div>
          </div>}
          <div className="panel stack">
            <h3>Group messages</h3>
            <p className="small muted">Send a message to everyone. Your name is shown with it.</p>
            {me && <form onSubmit={postMsg} className="row" style={{ flexWrap: "nowrap" }}><input value={msg} onChange={e => setMsg(e.target.value)} maxLength={500} placeholder="Write a message" aria-label="Message" /><button className="btn small" type="submit">Send</button></form>}
            <div className="stack" style={{ gap: 8 }}>
              {state.messages.map((m, i) => <div className="msg" key={i}><div className="row between"><b>{m.name}</b><span className="tiny muted">{new Date(m.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div><div className="small" style={{ whiteSpace: "pre-wrap" }}>{m.body}</div></div>)}
              {g.note && <div className="msg"><div className="row between"><b>{g.org_name}</b><span className="tiny muted">{new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div><div className="small">{g.note}</div></div>}
            </div>
          </div>
          {me?.reset_count > 0 && <p className="tiny muted panel" role="note">ℹ️ Your name was reset by the organizer {me.reset_count === 1 ? "once" : `${me.reset_count} times`}. A reset lets whoever picks the name next see its match, so if you didn't ask for this, tell the organizer and ask them to redraw names.</p>}
          {me && !welcome && <PersonalLink gid={gid} />}
        </div>
      </div>
      {sheet === "settings" && <Settings gid={gid} state={state} tokens={tokens} close={() => setSheet(null)} reload={reload} />}
      {sheet === "excl" && <Exclusions gid={gid} state={state} tokens={tokens} close={() => setSheet(null)} reload={reload} />}
      {sheet === "remind" && <Reminder state={state} close={() => setSheet(null)} />}
      {sheet === "kid" && <AddKid gid={gid} tokens={tokens} close={() => setSheet(null)} />}
    </>
  );
}

function PersonRow({ gid, g, m, me, xm, parent }) {
  return (
    <div className="item">
      {xm && <Ornament name={m.name} sm />}
      <div className="grow"><b>{m.name}</b>{me?.id === m.id && <> <span className="pill">You</span></>}{m.is_org && <span className="tiny muted"> Organizer</span>}
        <div className="tiny muted">{m.kid ? `Added by ${parent || "a parent"}` : m.claimed ? "Joined" : "Not joined yet"}</div></div>
      <WishBar n={m.wishes} />
      {m.visible ? <Link className="btn small ghost" href={`/g/${gid}/w/${m.id}`} aria-label={`Open ${m.name}'s wish list`}>›</Link>
        : <span className="btn small ghost" style={{ opacity: 0.35 }} title={`Only the person who drew ${m.name} can see this list`}>🔒</span>}
    </div>
  );
}
function ExclusionChips({ g, members }) {
  const nameOf = id => members.find(m => m.id === id)?.name || "?"; const seen = new Set(), out = [];
  g.exclusions.forEach(x => {
    const both = g.exclusions.some(y => y.a === x.b && y.b === x.a), k = [x.a, x.b].sort().join("|");
    if (both) { if (seen.has(k)) return; seen.add(k); out.push(`${nameOf(x.a)} ⇄ ${nameOf(x.b)}`); } else out.push(`${nameOf(x.a)} → ${nameOf(x.b)}`);
  });
  return out.map(t => <span className="chip" key={t}>{t}</span>);
}
function PersonalLink({ gid, first }) {
  const g = getG(gid); if (!g?.mtok) return null;
  const url = `${location.origin}/g/${gid}?t=${g.mtok}`;
  return (
    <div className="panel stack" style={first ? { marginBottom: 16 } : undefined}>
      <h3>{first ? "🎉 You're in! Save your personal link" : "Your personal link"}</h3>
      <p className="small muted">Open it on any phone or computer to get back to your name and wish list. Don't share it: it's yours alone.</p>
      <div className="row" style={{ flexWrap: "nowrap" }}><input readOnly value={url} onFocus={e => e.target.select()} aria-label="Personal link" /><button className="btn small" onClick={() => copy(url)}>Copy</button></div>
    </div>
  );
}

async function redraw(body) {
  const r = await fetch("/api/redraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const out = await r.json(); if (!r.ok) throw new Error(out.error || "Couldn't save."); return out;
}

function Settings({ gid, state, tokens, close, reload }) {
  const g = state.group;
  const [f, setF] = useState({ name: g.name, date: g.date || "", budget: g.budget || "", cur: g.cur || "$", note: g.note || "", venue: g.settings?.venue || { type: "", address: "" }, mail: g.settings?.mail || { on: false, vis: "drawn" }, wishVis: g.settings?.wishVis || "all" });
  const [add, setAdd] = useState(""), [busy, setBusy] = useState(false), [armed, setArmed] = useState(null);
  const up = p => setF(x => ({ ...x, ...p }));
  async function save() {
    setBusy(true);
    try { await rpc("hp_admin_update", { p_gid: gid, p_atok: tokens.atok, p: { name: f.name, date: f.date, budget: f.budget, cur: f.cur, note: f.note, settings: { ...g.settings, venue: f.venue, mail: f.mail, wishVis: f.wishVis } } }); toast("Settings saved"); await reload(); close(); }
    catch { toast("Couldn't save. Try again."); setBusy(false); }
  }
  async function change(body, msg) {
    setBusy(true);
    try { await redraw({ gid, atok: tokens.atok, ...body }); toast(msg + (g.mode === "draw" ? ". Names redrawn." : "")); await reload(); close(); }
    catch (e) { toast(e.message); setBusy(false); }
  }
  async function reset(m) {
    if (armed !== "r" + m.id) return setArmed("r" + m.id);
    setBusy(true);
    try { await rpc("hp_admin_reset_member", { p_gid: gid, p_atok: tokens.atok, p_mid: m.id }); toast(`${m.name} can pick their name again from the invitation link`); setArmed(null); await reload(); }
    catch (e) { toast(/not_joined/.test(e.message) ? `${m.name} hasn't joined yet` : "Couldn't reset. Try again."); }
    setBusy(false);
  }
  async function sendLink(m) {
    const link = `${location.origin}/join/${g.join_code}`;
    const text = `Hi ${m.name}! Here's the link for ${g.name}. Open it, tap your name and ${g.mode === "draw" ? "draw" : "add your wish list"}: ${link}`;
    try { if (navigator.share) { await navigator.share({ title: g.name, text }); return; } } catch (e) { if (e?.name === "AbortError") return; }
    copy(text);
  }
  async function del() {
    if (armed !== "del") return setArmed("del");
    setBusy(true);
    try { await rpc("hp_admin_delete", { p_gid: gid, p_atok: tokens.atok }); delG(gid); toast(`${g.name} deleted`); location.href = "/my"; }
    catch { toast("Couldn't delete. Try again."); setBusy(false); }
  }
  return (
    <Sheet onClose={close}>
      <div className="row between"><h3>Manage settings</h3><button className="link" onClick={close}>Close</button></div>
      <p className="eyebrow">Celebration details</p>
      <div><label htmlFor="sName">Name</label><input id="sName" maxLength={80} value={f.name} onChange={e => up({ name: e.target.value })} /></div>
      <div className="grid2">
        <div><label htmlFor="sDate">Date</label><input id="sDate" type="date" value={f.date} onChange={e => up({ date: e.target.value })} /></div>
        <div><label htmlFor="sBudget">Gift amount</label><div className="row" style={{ flexWrap: "nowrap" }}><select aria-label="Currency" style={{ width: 80 }} value={f.cur} onChange={e => up({ cur: e.target.value })}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select><input id="sBudget" value={f.budget} onChange={e => up({ budget: e.target.value.slice(0, 12) })} /></div></div>
      </div>
      <div><label>Venue</label><div className="choices">{[["", "Not set"], ["venue", "At a venue"], ["online", "Online"]].map(([v, l]) => <button key={v} type="button" className="choice" aria-pressed={f.venue.type === v} onClick={() => up({ venue: { ...f.venue, type: v } })}>{l}</button>)}</div>
        {f.venue.type === "venue" && <input style={{ marginTop: 8 }} maxLength={160} placeholder="Address" value={f.venue.address} onChange={e => up({ venue: { ...f.venue, address: e.target.value } })} />}</div>
      <div><label htmlFor="sNote">Message</label><textarea id="sNote" maxLength={500} value={f.note} onChange={e => up({ note: e.target.value })} /></div>
      <p className="eyebrow">Preferences</p>
      <label className="check"><input type="checkbox" checked={f.mail.on} onChange={e => up({ mail: { ...f.mail, on: e.target.checked } })} /> Send each other gifts by mail (members add a mailing address)</label>
      {f.mail.on && <div className="optlist">
        <label className="check"><input type="radio" name="mv" checked={f.mail.vis !== "all"} onChange={() => up({ mail: { ...f.mail, vis: "drawn" } })} /> People only see the address of the person they drew</label>
        <label className="check"><input type="radio" name="mv" checked={f.mail.vis === "all"} onChange={() => up({ mail: { ...f.mail, vis: "all" } })} /> People see all addresses</label></div>}
      {g.mode === "draw" && <div className="optlist"><b className="small">Visibility of wish lists</b>
        <label className="check"><input type="radio" name="wv" checked={f.wishVis !== "drawn"} onChange={() => up({ wishVis: "all" })} /> Members can see all wish lists</label>
        <label className="check"><input type="radio" name="wv" checked={f.wishVis === "drawn"} onChange={() => up({ wishVis: "drawn" })} /> Members only see the wish list of the name they drew</label></div>}
      <button className="btn" onClick={save} disabled={busy}>Save settings</button>
      <p className="eyebrow">Members</p>
      <div className="list">{state.members.filter(m => !m.kid).map(m => <div className="item" key={m.id}><span className="grow">{m.name} <span className="tiny muted">{m.claimed ? "joined" : "not joined"}</span></span>
        {m.is_org ? null : m.claimed
          ? <button className="btn small ghost" disabled={busy} title="Free this name so its owner can pick it again" onClick={() => reset(m)}>{armed === "r" + m.id ? "Tap again to reset" : "Reset"}</button>
          : <button className="btn small ghost" onClick={() => sendLink(m)}>Send link</button>}
        {!m.is_org && <button className="btn small ghost" disabled={busy} onClick={() => armed === m.id ? change({ remove: [m.id] }, `${m.name} removed`) : setArmed(m.id)}>{armed === m.id ? "Tap again to remove" : "Remove"}</button>}</div>)}</div>
      <p className="tiny muted">Someone lost access or tapped the wrong name? <b>Reset</b> frees their name so they can pick it again from the invitation link. Their match stays the same, and they'll see that their name was reset. If someone else may have opened it, use Redraw all names instead.</p>
      <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={e => { e.preventDefault(); if (add.trim()) change({ add: [add.trim()] }, `${add.trim()} added`); }}><input maxLength={40} placeholder="Add a member" value={add} onChange={e => setAdd(e.target.value)} aria-label="New member name" /><button className="btn small ghost" type="submit" disabled={busy}>Add</button></form>
      {g.mode === "draw" && <><p className="tiny muted">Adding or removing someone redraws all names. Everyone keeps their link and sees their new name next time they open the celebration.</p>
        <button className="btn ghost" disabled={busy} onClick={() => armed === "redraw" ? change({}, "Done") : setArmed("redraw")}>{armed === "redraw" ? "Tap again: everyone gets a new name" : "Redraw all names"}</button></>}
      <p className="eyebrow" style={{ marginTop: 8 }}>Danger zone</p>
      <button className="btn ghost" style={{ color: "var(--ribbon)" }} disabled={busy} onClick={del}>{armed === "del" ? "Tap again to delete for everyone. This can't be undone." : "Delete this celebration"}</button>
    </Sheet>
  );
}
function Exclusions({ gid, state, tokens, close, reload }) {
  const ppl = state.members.filter(m => !m.kid), nameOf = id => ppl.find(m => m.id === id)?.name;
  const [excl, setExcl] = useState(() => { const o = {}; (state.group.exclusions || []).forEach(x => { (o[x.a] ||= []).push(x.b); }); return o; });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await redraw({ gid, atok: tokens.atok, exclusions: Object.entries(excl).flatMap(([a, bs]) => bs.map(b => ({ a, b }))) }); toast("Exclusions saved. Names redrawn."); await reload(); close(); }
    catch (e) { toast(e.message); setBusy(false); }
  }
  return (
    <Sheet onClose={close}>
      <div className="row between"><h3>Set exclusions</h3><button className="link" onClick={close}>Close</button></div>
      <p className="muted small">An exclusion says who may <b>not</b> draw whom. Saving redraws all names.</p>
      <ExclusionGrid people={ppl.map(m => m.id)} idName={nameOf} excl={excl} onChange={setExcl} />
      <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save & redraw"}</button>
    </Sheet>
  );
}
function Reminder({ state, close }) {
  const g = state.group, ppl = state.members.filter(m => !m.kid);
  const link = `${location.origin}/join/${g.join_code}`;
  const notJoined = ppl.filter(m => !m.claimed).map(m => m.name), notDrawn = g.mode === "draw" ? ppl.filter(m => m.claimed && !m.drawn).map(m => m.name) : [], noWish = ppl.filter(m => m.claimed && !m.wishes).map(m => m.name);
  const d = daysUntil(g.date);
  const lines = [`⏰ Reminder for ${g.name}${d != null && d >= 0 ? ` (${d === 0 ? "today!" : d === 1 ? "1 day to go" : `${d} days to go`})` : ""}`];
  if (notJoined.length) lines.push(`\n👋 Still need to join: ${notJoined.join(", ")}`);
  if (notDrawn.length) lines.push(`🎩 Still need to draw a name: ${notDrawn.join(", ")}`);
  if (noWish.length) lines.push(`🎁 No wish list yet: ${noWish.join(", ")}`);
  if (!notJoined.length && !notDrawn.length && !noWish.length) lines.push("\nEveryone's in and ready. See you there!");
  lines.push(`\n👇 ${link}`);
  const text = lines.join("\n");
  return (
    <Sheet onClose={close}>
      <div className="row between"><h3>Send a reminder</h3><button className="link" onClick={close}>Close</button></div>
      <p className="muted small">Written from where everyone is right now. Paste it into your group chat.</p>
      <div className="code">{text}</div>
      <div className="row"><button className="btn" onClick={() => copy(text)}>Copy reminder</button><a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></div>
    </Sheet>
  );
}
function AddKid({ gid, tokens, close }) {
  const [n, setN] = useState(""), [busy, setBusy] = useState(false);
  async function add() {
    if (!n.trim()) return; setBusy(true);
    try { const id = await rpc("hp_add_kid", { p_gid: gid, p_mtok: tokens.mtok, p_name: n.trim() }); location.href = `/g/${gid}/w/${id}`; }
    catch { toast("Couldn't add the wish list."); setBusy(false); }
  }
  return (
    <Sheet onClose={close}>
      <h3>Add a children's wish list</h3>
      <p className="muted small">For a child who isn't drawing names. Only you can change this list. Only add one if you're the child's parent or guardian.</p>
      <div><label htmlFor="kName">Wish list of</label><input id="kName" maxLength={40} placeholder="Child's first name" value={n} onChange={e => setN(e.target.value)} autoFocus /></div>
      <div className="row between"><button className="btn ghost" onClick={close}>Cancel</button><button className="btn" onClick={add} disabled={busy}>Add</button></div>
    </Sheet>
  );
}
