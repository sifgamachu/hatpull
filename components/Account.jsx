"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc, sb } from "@/lib/db";
import { useUser, signOut, syncAccount, CONSENT_TEXT } from "@/lib/auth";
import { toast } from "@/lib/ui";
import Festive from "./Festive";
import SignIn from "./SignIn";

export default function Account() {
  const user = useUser(); const [p, setP] = useState(null), [n, setN] = useState(null), [armed, setArmed] = useState(false), [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => { if (user) { rpc("hp_account", {}).then(setP).catch(() => {}); syncAccount().then(m => setN(m.length)); } }, [user]);
  async function save(patch) {
    try { await rpc("hp_set_prefs", { p_reminders: patch.reminders ?? null, p_marketing: patch.marketing ?? null, p_consent_text: CONSENT_TEXT, p_source: "account settings toggle" }); setP(x => ({ ...x, ...patch })); toast("Saved"); }
    catch { toast("Couldn't save. Try again."); }
  }
  async function del() {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      await rpc("hp_forget_me", {});
      const { data } = await sb().auth.getSession();
      const r = await fetch("/api/account/delete", { method: "POST", headers: { authorization: `Bearer ${data.session?.access_token || ""}` } }).catch(() => null);
      if (!r || !r.ok) {
        const msg = r ? (await r.json().catch(() => ({}))).error : "";
        toast(`Your celebrations were unlinked and your email settings removed, but the sign-in record couldn't be deleted. ${msg || "Try again, or email hello@secretsantageneratorapp.com."}`);
        setBusy(false); return;
      }
      await signOut(); toast("Your account has been deleted"); location.href = "/";
    } catch { toast("Couldn't delete. Try again or email us."); setBusy(false); }
  }
  if (user === undefined) return <div className="narrow panel muted"><h1 className="sr-only">Your account</h1>Loading…</div>;
  if (!user) return (
    <div className="narrow panel stack"><Festive on={false} /><h1 style={{ fontSize: 26 }}>Your account</h1>
      <p className="muted">Sign in to create and manage celebrations and restore them on every device. Participants can choose to sign in for account access and reminders.</p>
      <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>Sign in</button>{open && <SignIn close={() => setOpen(false)} next="/account" />}</div>
  );
  return (
    <div className="narrow stack">
      <Festive on={false} />
      <div className="panel stack">
        <h1 style={{ fontSize: 26 }}>Your account</h1>
        <p className="muted">Signed in as <b>{user.email}</b>{n != null && <> · linked to {n} celebration{n === 1 ? "" : "s"}</>}.</p>
        <div className="row"><Link className="btn small ghost" href="/my">My celebrations</Link><button className="btn small ghost" onClick={async () => { await signOut(); toast("Signed out"); }}>Sign out</button></div>
      </div>
      <div className="panel stack">
        <h2 style={{ fontSize: 20 }}>Emails</h2>
        {!p ? <p className="muted small">Loading…</p> : <>
          <label className="check"><input type="checkbox" checked={!!p.reminders} onChange={e => save({ reminders: e.target.checked })} /> Reminders about celebrations I'm in (a week before and the day before)</label>
          <label className="check"><input type="checkbox" checked={!!p.marketing} onChange={e => save({ marketing: e.target.checked })} /> {CONSENT_TEXT.replace(/ \(v\d+\)$/, "")}</label>
          <p className="tiny muted">Every email has a one-click unsubscribe link.</p>
        </>}
      </div>
      <div className="panel stack">
        <h2 style={{ fontSize: 20 }}>Your data</h2>
        <p className="small muted">Download everything we hold about your account as a file.</p>
        <button className="btn small ghost" style={{ alignSelf: "flex-start" }} onClick={async () => {
          try { const d = await rpc("hp_export_me", {}); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); a.download = "hatpull-my-data.json"; a.click(); }
          catch { toast("Couldn't prepare your data. Try again."); }
        }}>Download my data</button>
      </div>
      <div className="panel stack">
        <h2 style={{ fontSize: 20 }}>Delete my account</h2>
        <p className="small muted">This removes your sign-in, email preferences and email history. Your names stay in their celebrations (so the draw still works) but are no longer linked to you. You will lose organizer access to your groups, and their organizer links cannot be used to claim them again. Delete any groups you no longer want before deleting your account.</p>
        <button className="btn ghost" style={{ color: "var(--ribbon)", alignSelf: "flex-start" }} disabled={busy} onClick={del}>{armed ? "Tap again to delete my account" : "Delete my account"}</button>
      </div>
    </div>
  );
}
