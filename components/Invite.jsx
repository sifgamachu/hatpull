"use client";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { inviteText, isXmas } from "@/lib/core";
import { copy } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";

export default function Invite({ gid }) {
  const { state, error } = useGroup(gid);
  if (error) return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>Only the organizer can see this page</h1><p className="muted">Open the celebration from the browser you created it in.</p><Link className="btn small ghost" href={`/g/${gid}`}>Go to the celebration</Link></div>;
  if (!state) return <div className="narrow panel muted">Loading…</div>;
  if (!state.is_admin) return <div className="narrow panel stack"><p>Only the organizer can send invitations.</p><Link className="btn small ghost" href={`/g/${gid}`}>Go to the celebration</Link></div>;
  const g = state.group, xm = isXmas(g);
  const link = `${location.origin}/join/${g.join_code}`;
  const text = inviteText(g, link, state.members.filter(m => !m.kid).map(m => m.name));
  return (
    <div className="narrow stack">
      <Festive on={xm} />
      {xm ? <XBanner><p className="kicker">🎁 {g.name} is ready</p><h1>Time to invite the family.</h1></XBanner> : <div className="progress"><span style={{ width: "100%" }} /></div>}
      <div className="panel stack">
        <h2>How do you want to send the invitations?</h2>
        <p className="muted">It's one link for the whole group. Each person opens it, picks their own name{g.mode === "draw" ? " and draws someone" : ""}.</p>
        <div className="code">{text}</div>
        <div className="row">
          <button className="btn" onClick={() => copy(text)}>Copy invitation</button>
          <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="btn ghost" href={`sms:?&body=${encodeURIComponent(text)}`}>Text message</a>
          <a className="btn ghost" href={`mailto:?subject=${encodeURIComponent(g.name)}&body=${encodeURIComponent(text)}`}>Email</a>
          <button className="btn ghost" onClick={() => copy(link)}>Copy link only</button>
        </div>
      </div>
      <OrganizerKey gid={gid} />
      <Link className="btn ghost" href={`/g/${gid}`}>Go to your celebration</Link>
    </div>
  );
}

export function OrganizerKey({ gid }) {
  if (typeof window === "undefined") return null;
  const g = JSON.parse(localStorage.getItem("hatpull.v1") || "{}").groups?.[gid];
  if (!g?.atok) return null;
  const url = `${location.origin}/g/${gid}?a=${g.atok}${g.mtok ? `&t=${g.mtok}` : ""}`;
  return (
    <div className="panel stack">
      <h3>🔑 Save your organizer link</h3>
      <p className="small muted">This private link lets you manage the celebration from another phone or computer. Keep it to yourself. Anyone with it can manage the group.</p>
      <div className="row" style={{ flexWrap: "nowrap" }}><input readOnly value={url} onFocus={e => e.target.select()} aria-label="Organizer link" /><button className="btn small" onClick={() => copy(url)}>Copy</button></div>
    </div>
  );
}
