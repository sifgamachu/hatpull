"use client";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { inviteText, isXmas } from "@/lib/core";
import { copy } from "@/lib/ui";
import Festive from "./Festive";
import XBanner from "./XBanner";
import OrganizerAccess from "./OrganizerAccess";

export default function Invite({ gid }) {
  const { state, error, reload } = useGroup(gid);
  if (error === "network") return <div className="narrow panel stack"><p>Can't reach the server. Retrying…</p></div>;
  if (error) return <OrganizerAccess gid={gid} error={error} reload={reload} />;
  if (!state) return <div className="narrow panel muted">Loading…</div>;
  if (!state.is_admin) return <OrganizerAccess gid={gid} />;
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
  const url = `${location.origin}/g/${gid}`;
  return (
    <div className="panel stack">
      <h3>🔒 Your celebration is saved to your account</h3>
      <p className="small muted">Sign in with the same Google or email account on another device, then open My celebrations or this link. Only your organizer account can manage the group. Use the invitation link above for participants.</p>
      <div className="row" style={{ flexWrap: "nowrap" }}><input readOnly value={url} onFocus={e => e.target.select()} aria-label="Organizer link" /><button className="btn small" onClick={() => copy(url)}>Copy</button></div>
    </div>
  );
}
