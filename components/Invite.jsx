"use client";
import Link from "next/link";
import { useGroup } from "@/lib/useGroup";
import { inviteText } from "@/lib/core";
import { copy } from "@/lib/ui";
import Festive from "./Festive";
import OrganizerAccess from "./OrganizerAccess";

import {JourneyHeading,CelebrationNav} from './JourneyUI';

export default function Invite({ gid }) {
  const { state, error, reload } = useGroup(gid);
  if (error === "network") return <div className="narrow panel stack"><p>Can't reach the server. Retrying…</p></div>;
  if (error) return <OrganizerAccess gid={gid} error={error} reload={reload} />;
  if (!state) return <div className="narrow panel muted">Loading…</div>;
  if (!state.is_admin) return <OrganizerAccess gid={gid} />;
  const g = state.group;
  const link = `${location.origin}/join/${g.join_code}`;
  const text = inviteText(g, link, state.members.filter(m => !m.kid).map(m => m.name));
  return (
    <div className="journey-surface invite-page stack">
      <Festive on={false} />
      <JourneyHeading eyebrow="Your celebration is ready" title="Bring everyone together."><p>{g.name} is saved. Share one invitation, then start your own wish list.</p></JourneyHeading>
      <CelebrationNav gid={gid} mid={state.me?.id} active="invite" admin/>
      <div className="invite-layout"><section className="panel stack invite-share">
        <p className="eyebrow">1 · Invite your group</p>
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
      </section><aside className="stack"><section className="panel stack"><p className="eyebrow">2 · Make a little wish</p><h2>Give your gift-giver a head start.</h2><p>Choose your preferences and save gifts in your celebration’s budget.</p>{state.me&&<Link className="btn" href={`/g/${gid}/w/${state.me.id}`}>Start my wish list →</Link>}<Link className="btn ghost" href={`/g/${gid}`}>Open celebration</Link></section><OrganizerKey gid={gid}/></aside></div>
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
