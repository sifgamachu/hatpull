"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rpc } from "@/lib/db";
import { allG, setG } from "@/lib/store";
import { fmtDate, money, isXmas } from "@/lib/core";
import { toast } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";
import { Sheet } from "./bits";

export default function Join({ code }) {
  const router = useRouter();
  const [info, setInfo] = useState(null), [err, setErr] = useState(""), [pick, setPick] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    rpc("hp_join_info", { p_code: code }).then(d => {
      if (!d) return setErr("missing");
      const mine = allG().find(x => x.gid === d.id && x.mtok);
      if (mine) return router.replace(`/g/${d.id}`);
      setInfo(d);
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
      toast(/taken/.test(e.message) ? "That name was just taken. Pick your own name." : "Couldn't join. Check your connection and try again.");
      rpc("hp_join_info", { p_code: code }).then(setInfo).catch(() => {});
    }
  }

  if (err) return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>We can't find this invitation</h1><p className="muted">{err === "network" ? "Check your connection and reload the page." : "The organizer may have deleted the celebration, or the link was cut off when it was copied."}</p></div>;
  if (!info) return <div className="narrow panel muted">Opening your invitation…</div>;
  const xm = isXmas(info), ppl = info.members;
  return (
    <div className="narrow stack">
      <Festive on={xm} />
      {xm && <XBanner><p className="kicker">✉️ You're invited</p><h1>{info.name}</h1><div className="meta-x">{info.date && <span>📅 {fmtDate(info.date, { month: "long", day: "numeric" })}</span>}{info.budget && <span>💸 <b>{money(info.cur, info.budget)}</b></span>}<span>👥 {ppl.length} people</span></div></XBanner>}
      <div className="panel stack">
        {!xm && <p className="eyebrow">{info.occasion || "Celebration"}</p>}
        <h2>Who are you joining as?</h2>
        <p className="muted">{info.org_name} invited you to <b>{info.name}</b>{info.date ? ` on ${fmtDate(info.date, { month: "long", day: "numeric" })}` : ""}. Pick your name. Each name can only be picked once.</p>
        <div className="optlist">{ppl.map(m => <button key={m.id} className="opt" disabled={m.claimed} onClick={() => setPick(m)}><span>{m.name}</span><span className={`pill ${m.claimed ? "" : "ok"}`}>{m.claimed ? "Joined" : "Pick"}</span></button>)}</div>
        <p className="muted small">Not on the list? Ask {info.org_name} to add you.</p>
      </div>
      {pick && <Sheet onClose={() => !busy && setPick(null)}>
        <h3>Join as {pick.name}?</h3><p className="muted">You can't switch names later. Only pick your own name.</p>
        <div className="row between"><button className="btn ghost" onClick={() => setPick(null)} disabled={busy}>Cancel</button><button className="btn" onClick={claim} disabled={busy}>{busy ? "Joining…" : `Yes, I'm ${pick.name}`}</button></div>
      </Sheet>}
    </div>
  );
}
