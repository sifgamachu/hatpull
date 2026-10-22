"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OCCASIONS, XMAS_OCC, CURRENCIES, BUDGETS, suggestDates, iso, fmtDate, money, xmasYear, canDraw } from "@/lib/core";
import { setG } from "@/lib/store";
import { toast } from "@/lib/ui";
import { syncAccount } from "@/lib/auth";
import Festive from "./Festive";
import XBanner from "./XBanner";

const TOTAL = 8;

export default function Wizard() {
  const router = useRouter(), q = useSearchParams();
  const [st, setSt] = useState(() => {
    const s = { step: 0, mode: "draw", orgName: "", includeMe: true, names: ["", "", ""], excl: {}, wantExcl: false, occ: "", name: "", date: "", budget: "", cur: "$", note: "" };
    try { const saved = JSON.parse(sessionStorage.getItem("hatpull.wizard") || "null"); if (saved && Date.now() - saved.at < 6 * 3600e3 && saved.q === location.search && saved.st) return { ...s, ...saved.st }; } catch {}
    if (q.get("mode") === "wish") { s.mode = "wish"; s.step = 1; }
    const oi = q.get("occ");
    if (oi === "other") { s.occ = "Other"; s.step = 1; }
    else if (oi != null && OCCASIONS[+oi]) { s.occ = OCCASIONS[+oi].k; const d = suggestDates(s.occ); s.name = `${s.occ} ${(d[0] || iso(new Date())).slice(0, 4)}`; s.date = d.find(x => x.endsWith("-12-25")) || d[0] || ""; s.step = 1; }
    return s;
  });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const creating = useRef(false);
  const up = patch => setSt(s => ({ ...s, ...patch }));
  const people = useMemo(() => { const ns = st.names.map(s => s.trim()).filter(Boolean); return (st.includeMe && st.orgName.trim() ? [st.orgName.trim()] : []).concat(ns); }, [st.names, st.includeMe, st.orgName]);
  const allExcl = useMemo(() => Object.entries(st.excl).flatMap(([a, bs]) => bs.map(b => ({ a, b }))).filter(x => people.includes(x.a) && people.includes(x.b)), [st.excl, people]);
  // Exact, fast feasibility check (bipartite matching), recomputed only when people or exclusions change.
  const feasible = useMemo(() => st.mode !== "draw" || people.length < 3 || canDraw(people, allExcl), [st.mode, people, allExcl]);
  // Keep progress through refresh and browser Back/Forward (this tab only).
  useEffect(() => { try { sessionStorage.setItem("hatpull.wizard", JSON.stringify({ at: Date.now(), q: location.search, st })); } catch {} }, [st]);
  const festive = !st.occ || XMAS_OCC.includes(st.occ) || /christmas|xmas|santa/i.test(st.name);
  useEffect(() => { setErr(""); window.scrollTo(0, 0); }, [st.step]);

  const go = n => up({ step: n });
  const next = () => {
    let n = st.step + 1;
    if (n === 3 && !st.wantExcl) n = 4;
    if (st.mode === "wish" && (n === 2 || n === 3)) n = 4;
    go(n);
  };
  const back = () => { let n = st.step - 1; if (n === 3 && !st.wantExcl) n = 2; if (st.mode === "wish" && (n === 2 || n === 3)) n = 1; go(Math.max(0, n)); };

  function validateNames() {
    const low = people.map(p => p.toLowerCase());
    if (!st.orgName.trim()) return "Enter your name.";
    if (new Set(low).size !== low.length) return "Two people have the same name. Add a last initial so everyone can tell them apart.";
    if (people.length > 200) return `A group can have up to 200 people. You have ${people.length}.`;
    if (st.mode === "draw" && people.length < 3) return `A draw needs at least 3 people. You have ${people.length}.`;
    if (st.mode === "wish" && people.length < 2) return "Add at least one more person.";
    return "";
  }

  async function create() {
    if (creating.current) return;
    if (st.date && st.date < iso(new Date())) return setErr("That date has already passed. Go back and pick a date in the future.");
    creating.current = true; setBusy(true); setErr("");
    try {
      const note = st.note || (st.mode === "draw" ? `✨ You've been invited to make a wish list and draw a name for ${st.name}!` : `✨ You've been invited to share your wish list for ${st.name}!`);
      const res = await fetch("/api/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        name: st.name, occasion: st.occ, date: st.date, budget: st.budget, cur: st.cur, note, mode: st.mode,
        orgName: st.orgName.trim(), includeMe: st.includeMe, people, exclusions: st.mode === "draw" ? allExcl : [] }) });
      let out; try { out = await res.json(); } catch { throw new Error("The server had a problem. Please try again in a moment."); }
      if (!res.ok) throw new Error(out.error || "Couldn't create the celebration.");
      try { sessionStorage.removeItem("hatpull.wizard"); } catch {}
      setG(out.id, { atok: out.admin_token, code: out.join_code, mtok: out.org_token || null, mid: out.org_mid || null, name: st.name, date: st.date, role: "organizer" });
      await syncAccount();
      toast(`${st.name} created`);
      router.push(`/invite/${out.id}`);
    } catch (e) { setErr(e instanceof TypeError ? "Can't reach the server. Check your connection and try again." : e.message); setBusy(false); creating.current = false; }
  }

  const ctx = { st, err, busy, back, next, festive };
  let body;
  if (st.step === 0) body = (
    <div className="narrow stack">
      <XBanner strip><p className="kicker">🎄 Let's get the gifting started</p></XBanner>
      <div className="panel stack">
        <h1 style={{ fontSize: 26 }}>Create a new celebration</h1>
        <p className="muted">Draw names and make wish lists, or just create a group to share wish lists.</p>
        <div className="optlist">
          <button className="opt" onClick={() => up({ mode: "draw", step: 1 })}><span>Start drawing names</span><span aria-hidden="true">›</span></button>
          <button className="opt" onClick={() => up({ mode: "wish", step: 1 })}><span>Start sharing wish lists</span><span aria-hidden="true">›</span></button>
        </div>
      </div>
    </div>);
  else if (st.step === 1) body = (
    <Shell ctx={ctx} title={st.mode === "draw" ? "Who's in the hat?" : "Who's sharing wish lists?"} onNext={() => { const e = validateNames(); if (e) return setErr(e); next(); }}>
      <div><label htmlFor="org">Your name</label><input id="org" maxLength={40} value={st.orgName} onChange={e => up({ orgName: e.target.value })} placeholder="Your first name" autoFocus={!st.orgName} /></div>
      <label className="check"><input type="checkbox" checked={st.includeMe} onChange={e => up({ includeMe: e.target.checked })} /> Include me (the organizer){st.mode === "draw" ? " in the draw" : ""}</label>
      <div>
        <label>Other people</label>
        <div className="stack" style={{ gap: 8 }}>
          {st.names.map((n, i) => (
            <div className="row" style={{ flexWrap: "nowrap" }} key={i}>
              <input value={n} maxLength={40} placeholder={`Name ${i + 2}`} aria-label={`Name ${i + 2}`}
                onChange={e => { const a = st.names.slice(); a[i] = e.target.value; up({ names: a }); }}
                onPaste={e => { const t = e.clipboardData.getData("text"); if (/[\n,;]/.test(t)) { e.preventDefault(); const a = st.names.filter(Boolean).concat(t.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)); up({ names: [...a, ""] }); } }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (i === st.names.length - 1) up({ names: [...st.names, ""] }); setTimeout(() => document.querySelectorAll("[aria-label^='Name ']")[i + 1]?.focus(), 0); } }} />
              <button className="btn small ghost" type="button" aria-label="Remove" onClick={() => { const a = st.names.slice(); a.splice(i, 1); up({ names: a.length ? a : [""] }); }}>×</button>
            </div>))}
        </div>
        <button className="link" type="button" style={{ marginTop: 10 }} onClick={() => up({ names: [...st.names, ""] })}>+ Add another name</button>
      </div>
      <p className="muted small">Tip: paste a whole list separated by commas or new lines into any box.</p>
    </Shell>);
  else if (st.step === 2) body = (
    <Shell ctx={ctx} title="Want to exclude certain draws?">
      <p className="muted">Use exclusions to stop certain people from drawing specific names, like couples or housemates.</p>
      <div className="optlist">
        <button className="opt" aria-pressed={!st.wantExcl} onClick={() => up({ wantExcl: false })}>Don't set exclusions</button>
        <button className="opt" aria-pressed={st.wantExcl} onClick={() => up({ wantExcl: true })}>Set exclusions</button>
      </div>
    </Shell>);
  else if (st.step === 3) body = (
    <Shell ctx={ctx} title="Set exclusions" nextDisabled={!feasible}>
      <p className="muted">An exclusion says who may <b>not</b> draw whom. Tap names under each person.</p>
      <ExclusionGrid people={people} excl={st.excl} onChange={excl => up({ excl })} />
      {!feasible && <div className="note err">These exclusions leave no valid draw. Remove one or add more people.</div>}
    </Shell>);
  else if (st.step === 4) body = (
    <Shell ctx={ctx} title={st.mode === "draw" ? "What are you drawing names for?" : "What's the occasion?"} onNext={() => { if (!st.name.trim()) return setErr("Give the celebration a name."); next(); }}>
      <div className="choices">
        {OCCASIONS.map(o => <button key={o.k} type="button" className="choice" aria-pressed={st.occ === o.k} onClick={() => { const d = suggestDates(o.k); up({ occ: o.k, name: `${o.k} ${(d[0] || iso(new Date())).slice(0, 4)}`, date: d.find(x => x.endsWith("-12-25")) || d[0] || st.date }); }}>{o.k}</button>)}
        <button type="button" className="choice" aria-pressed={st.occ === "Other"} onClick={() => up({ occ: "Other" })}>Other</button>
      </div>
      <div><label htmlFor="gname">Name of celebration</label><input id="gname" maxLength={60} value={st.name} onChange={e => up({ name: e.target.value })} placeholder="Family Christmas 2026" /></div>
    </Shell>);
  else if (st.step === 5) { const sugg = suggestDates(st.occ); body = (
    <Shell ctx={ctx} title={`When are you celebrating ${st.name}?`}>
      {sugg.length > 0 && <div className="optlist">{sugg.map(d => <button key={d} type="button" className="opt" aria-pressed={st.date === d} onClick={() => up({ date: d })}>{fmtDate(d)}</button>)}</div>}
      <div><label htmlFor="dOther">{sugg.length ? "Other date" : "Date"}</label><input id="dOther" type="date" min={iso(new Date())} value={sugg.includes(st.date) ? "" : st.date} onChange={e => up({ date: e.target.value })} />{st.date && st.date < iso(new Date()) && <p className="small" role="alert" style={{ color: "var(--ribbon)", marginTop: 6 }}>That date has already passed. Pick a date in the future.</p>}</div>
    </Shell>); }
  else if (st.step === 6) body = (
    <Shell ctx={ctx} title="How much should people spend?">
      <div className="row" style={{ flexWrap: "nowrap" }}><label htmlFor="cur" style={{ margin: 0 }}>Currency</label><select id="cur" style={{ width: 100 }} value={st.cur} onChange={e => up({ cur: e.target.value })}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="choices">{BUDGETS.map(b => <button key={b} type="button" className="choice" aria-pressed={String(st.budget) === String(b)} onClick={() => up({ budget: String(b) })}>{st.cur}{b}</button>)}</div>
      <div><label htmlFor="bOther">Other amount</label><input id="bOther" inputMode="decimal" value={BUDGETS.map(String).includes(String(st.budget)) ? "" : st.budget} onChange={e => up({ budget: e.target.value.replace(/[^\d.]/g, "").slice(0, 8) })} placeholder="e.g. 40" /></div>
      <button className="link" type="button" style={{ alignSelf: "flex-start" }} onClick={() => up({ budget: "" })}>No budget</button>
    </Shell>);
  else body = (
    <Shell ctx={ctx} title="What's your message for the group?" nextLabel="Create celebration" onNext={create}>
      <textarea maxLength={400} value={st.note || (st.mode === "draw" ? `✨ You've been invited to make a wish list and draw a name for ${st.name}!` : `✨ You've been invited to share your wish list for ${st.name}!`)} onChange={e => up({ note: e.target.value })} />
      <div className="note small">Ready to create <b>{st.name}</b> with {people.length} people{st.date ? ` on ${fmtDate(st.date, { month: "long", day: "numeric" })}` : ""}{st.budget ? `, ${money(st.cur, st.budget)} each` : ""}.</div>
    </Shell>);

  return <><Festive on={festive} />{body}</>;
}

function Shell({ ctx, title, children, nextLabel = "Continue", onNext, nextDisabled }) {
  const { st, err, busy, back, next, festive } = ctx;
  return (
    <div className="narrow stack">
      {festive && <XBanner strip><p className="kicker">🎄 {st.name || (st.mode === "wish" ? "Christmas wish lists" : `Secret Santa ${xmasYear()}`)}</p></XBanner>}
      <div className="progress"><span style={{ width: `${Math.round(st.step / TOTAL * 100)}%` }} /></div>
      <div className="panel stack">
        <h1 style={{ fontSize: 26 }}>{title}</h1>
        {children}
        {err && <div className="note err">{err}</div>}
        <div className="row between" style={{ marginTop: 4 }}>
          {st.step > 0 ? <button className="btn ghost" onClick={back} type="button">Back</button> : <Link className="btn ghost" href="/secret-santa-generator">Cancel</Link>}
          <button className="btn" type="button" onClick={onNext || next} disabled={nextDisabled || busy}>{busy ? "Creating…" : nextLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function ExclusionGrid({ people, excl, onChange, idName }) {
  // people: array of keys; idName maps key->label (for id-based use)
  const [both, setBoth] = useState(true);
  const label = k => (idName ? idName(k) : k);
  const toggle = (a, b) => {
    const on = !(excl[a] || []).includes(b); const nx = { ...excl };
    const set = (x, y, v) => { nx[x] = (nx[x] || []).filter(n => n !== y); if (v) nx[x].push(y); };
    set(a, b, on); if (both) set(b, a, on); onChange(nx);
  };
  return (
    <div className="stack">
      <label className="check"><input type="checkbox" checked={both} onChange={e => setBoth(e.target.checked)} /> Apply both ways</label>
      {people.map(a => (
        <div key={a}><label>{label(a)} shouldn't draw</label>
          <div className="choices">{people.filter(b => b !== a).map(b => <button key={b} type="button" className="choice" aria-pressed={(excl[a] || []).includes(b)} onClick={() => toggle(a, b)}>{label(b)}</button>)}</div>
        </div>))}
    </div>
  );
}
