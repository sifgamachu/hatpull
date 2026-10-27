"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { rpc } from "@/lib/db";
import { allG, setG } from "@/lib/store";
import { fmtDate, money, isXmas } from "@/lib/core";
import { toast } from "@/lib/ui";
import Festive from "./Festive";
import { Sheet } from "./bits";
import SignIn from "./SignIn";

import {JourneyHeading} from './JourneyUI';

export default function Join({ code }) {
  const router = useRouter();
  const [info, setInfo] = useState(null), [err, setErr] = useState(""), [pick, setPick] = useState(null), [busy, setBusy] = useState(false), [signIn, setSignIn] = useState(null);
  useEffect(() => {
    rpc("hp_join_info", { p_code: code }).then(d => {
      if (!d) return setErr("missing");
      const mine = allG().find(x => x.gid === d.id && x.mtok);
      if (!mine) return setInfo(d);
      // Only skip ahead if this device's saved link still works (it stops working after a reset or removal).
      rpc("hp_state", { p_gid: d.id, p_mtok: mine.mtok, p_atok: null })
        .then(() => router.replace(`/g/${d.id}`))
        .catch(e => { if (/forbidden/.test(e.message)) setG(d.id, { mtok: null, mid: null }); setInfo(d); });
    }).catch(() => setErr("network"));
  }, [code, router]);

  async function claim() {
    setBusy(true);
    try {
      const r = await rpc("hp_claim", { p_code: code, p_mid: pick.id });
      setG(r.id, { mtok: r.token, mid: r.mid, myName: pick.name, name: info.name, date: info.date, role: "member" });
      toast(`Welcome, ${pick.name}`); router.push(`/g/${r.id}?welcome=1`);
    } catch (e) {
      setBusy(false); setPick(null);
      if (/protected/.test(e.message)) { setSignIn(pick); return; }
      toast(/taken/.test(e.message) ? "That name was just taken. Pick your own name." : "Couldn't join. Check your connection and try again.");
      rpc("hp_join_info", { p_code: code }).then(setInfo).catch(() => {});
    }
  }

  if (err) return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>{err === "network" ? "Can't reach the server" : "We can't find this invitation"}</h1><p className="muted">{err === "network" ? "Check your connection and reload the page." : "The organizer may have deleted the celebration, or the link was cut off when it was copied."}</p>{err === "network" && <Link href="/network-access">Help with work or school networks</Link>}</div>;
  if (!info) return <div className="narrow panel muted">Opening your invitation…</div>;
  const xm = isXmas(info), ppl = info.members;
  return (
    <div className="journey-surface join-page narrow stack">
      <Festive on={false}/>
      <JourneyHeading eyebrow="You’re invited" title={info.name}><p>{[info.date&&fmtDate(info.date),info.budget&&money(info.cur,info.budget)+' per gift'].filter(Boolean).join(' · ')}</p></JourneyHeading>
      <ol className="join-steps" aria-label="Joining your celebration"><li aria-current="step"><span>1</span>Choose your name</li><li><span>2</span>Make your wish list</li><li><span>3</span>{info.mode==='draw'?'Reveal your match':'Explore wishes'}</li></ol>
      <div className="panel stack">
        {!xm && <p className="eyebrow">{info.occasion || "Celebration"}</p>}
        <h2>Which one is you?</h2>
        <p className="muted">{info.org_name} invited you to <b>{info.name}</b>{info.date ? ` on ${fmtDate(info.date, { month: "long", day: "numeric" })}` : ""}. Pick your name. Each name can only be picked once.</p>
        <div className="optlist">{ppl.map(m => <button key={m.id} className="opt" disabled={m.claimed && !m.protected} onClick={() => m.protected && !m.mine ? setSignIn(m) : setPick(m)}><span>{m.name}</span><span className={`pill ${m.claimed && !m.protected ? "" : "ok"}`}>{m.mine ? "You" : m.protected ? "🔒 Sign in" : m.claimed ? "Joined" : "Pick"}</span></button>)}</div>
        <p className="muted small">Not on the list? Ask {info.org_name} to add you.</p>
      </div>
      {signIn && <SignIn close={() => setSignIn(null)} next={`/join/${code}`} why={`${signIn.name} is protected by a sign-in, so only ${signIn.name} can open it. If that's you, sign in with the same Google account or email you used before.`} />}
      {pick && <Sheet onClose={() => !busy && setPick(null)}>
        <h3>Join as {pick.name}?</h3><p className="muted">You can't switch names later. Only pick your own name.</p>
        <div className="row between"><button className="btn ghost" onClick={() => setPick(null)} disabled={busy}>Cancel</button><button className="btn" onClick={claim} disabled={busy}>{busy ? "Joining…" : `Yes, I'm ${pick.name}`}</button></div>
      </Sheet>}
    </div>
  );
}
