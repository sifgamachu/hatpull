"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { allG, delG } from "@/lib/store";
import { rpc } from "@/lib/db";
import { useUser } from "@/lib/auth";
import SignIn from "./SignIn";
import { fmtDate, daysUntil, isXmas, normState } from "@/lib/core";
import Festive from "./Festive";
import XBanner from "./XBanner";
import { Bow, Ornament, WishBar } from "./bits";

export default function My() {
  const user = useUser();
  const [rows, setRows] = useState(null), [locked, setLocked] = useState([]), [offline, setOffline] = useState(false), [signIn, setSignIn] = useState(false);
  useEffect(() => {
    if (user === undefined) return;
    let active = true, sequence = 0, timer;
    setRows(null); setLocked([]); setOffline(false);
    const refresh = () => {
    const request = ++sequence;
    const gs = allG();
    Promise.all(gs.map(async x => { try { return { x, s: normState(await rpc("hp_state", { p_gid: x.gid, p_mtok: x.mtok || null, p_atok: x.atok || null })) }; } catch (e) { return { x, s: null, gone: /not_found/.test(e.message), locked: /organizer_|not_group_owner|forbidden/.test(e.message) }; } }))
      .then(r => {
        if (!active || request !== sequence) return;
        r.filter(y => y.gone).forEach(y => delG(y.x.gid)); // deleted celebrations: forget them on this device
        setOffline(r.some(y => !y.s && !y.gone && !y.locked) && !r.some(y => y.s));
        setLocked(r.filter(y => y.locked && y.x.atok));
        setRows(r.filter(y => y.s).sort((a, b) => { const da = daysUntil(a.s.group.date), db = daysUntil(b.s.group.date); return (da < 0) - (db < 0) || String(a.s.group.date || "").localeCompare(String(b.s.group.date || "")); }));
      });
    };
    const changed = () => { clearTimeout(timer); timer = setTimeout(refresh, 100); };
    refresh(); window.addEventListener("hatpull:groups", changed); window.addEventListener("storage", changed);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("hatpull:groups", changed); window.removeEventListener("storage", changed); };
  }, [user?.id, user === undefined]);
  return (
    <div className="mid stack">
      <Festive on />
      <XBanner><p className="kicker">🎄 Your gift exchanges</p><h1>My celebrations</h1><p className="lede">Everything you're organizing or joined on this device, with your wish lists and the people on your list.</p></XBanner>
      <h2 className="sr-only">Your celebrations</h2>
      {!user && user !== undefined && <div className="panel stack"><h3>Organizing a celebration?</h3><p className="muted">Sign in to manage your groups and restore them on this device.</p><button className="btn small" onClick={() => setSignIn(true)}>Sign in as organizer</button></div>}
      {locked.map(({ x }) => <div className="panel stack" key={x.gid}><h3>{x.name || "Your saved celebration"}</h3><p className="small muted">Open this group to sign in as its organizer or connect an older celebration to your account.</p><Link className="btn small" href={`/g/${x.gid}`}>Open organizer access</Link></div>)}
      {rows === null ? <div className="panel muted">Checking the list twice…</div>
        : offline ? <div className="panel stack"><h3>Can't reach the server</h3><p className="muted">Your celebrations are safe. Check your connection and reload this page.</p><button className="btn small ghost" onClick={() => location.reload()} style={{ alignSelf: "flex-start" }}>Try again</button></div>
        : !rows.length && !locked.length ? <div className="panel stack card-x"><Bow /><h3>Nothing under the tree yet</h3><p className="muted">Start a Secret Santa, or open an invitation link someone sent you. Organizers can sign in with the account they used before. Participants can open their saved personal link.</p><div className="row"><Link className="btn small" href="/new?occ=0">Start a Secret Santa</Link><Link className="btn small ghost" href="/new?mode=wish">Start a wish list group</Link></div></div>
        : <>
          <div className="cards">{rows.map(({ x, s }) => { const g = s.group, d = daysUntil(g.date), xm = isXmas(g), past = d != null && d < 0;
            const meM = s.me && s.members.find(m => m.id === s.me.id), rec = s.me?.drawn && s.members.find(m => m.id === s.me.receiver_id);
            return <div key={x.gid} className={`panel stack ${xm ? "card-x" : ""}`} style={{ gap: 10 }}>{xm && <Bow />}
              <div className="row between"><h3>{g.name}</h3>{s.is_admin && <span className="pill">Organizer</span>}</div>
              {g.date && <p className="muted small">{fmtDate(g.date)}{past ? " · done" : d <= 60 ? ` · ${d} sleeps` : ""}</p>}
              <p className="small muted">{s.members.filter(m => !m.kid).length} people · {s.members.filter(m => m.claimed && !m.kid).length} joined</p>
              {rec && <p className="small">🎅 You're <b>{rec.name}</b>'s Secret Santa</p>}
              {meM && <div className="row between"><span className="small muted">My wish list: {meM.wishes} wish{meM.wishes === 1 ? "" : "es"}</span><WishBar n={meM.wishes} /></div>}
              <div className="row"><Link className="btn small" href={`/g/${x.gid}`}>Open</Link>{meM && <Link className="btn small ghost" href={`/g/${x.gid}/w/${meM.id}`}>My wish list</Link>}</div>
            </div>; })}</div>
          <section className="section">
            <h2>My friends</h2>
            <div className="stack">{rows.map(({ x, s }) => { const people = s.members.filter(m => m.id !== s.me?.id && m.claimed); if (!people.length) return null; const xm = isXmas(s.group);
              return <div key={x.gid} className="panel stack"><h3>{xm ? "🎄 " : ""}{s.group.name}</h3><div className="list">{people.map(m => <div className="item" key={m.id} style={{ alignItems: "flex-start" }}><Ornament name={m.name} />
                <div className="grow"><b>{m.name}</b>{s.me?.drawn && s.me.receiver_id === m.id && <> <span className="pill red">🎅 Your pick</span></>}<div className="tiny muted">{m.wishes} wish{m.wishes === 1 ? "" : "es"}{m.profile?.hobbies ? ` · ${m.profile.hobbies.slice(0, 50)}` : ""}</div></div>
                {m.visible ? <Link className="btn small ghost" href={`/g/${x.gid}/w/${m.id}`}>{xm ? "🎁 " : ""}Wish list</Link> : <span className="pill">🔒 Private</span>}</div>)}</div></div>; })}</div>
          </section>
        </>}
      {signIn && <SignIn required close={() => setSignIn(false)} next="/my" />}
    </div>
  );
}
