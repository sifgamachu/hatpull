"use client";
import { useEffect, useState } from "react";
import AccountCard, { AccountGifts } from "./AccountCard";
import { updateProfileIcon, updateAccountEmail } from "@/lib/account-profile.mjs";
import { rpc, sb } from "@/lib/db";
import { useUser, signOut, syncAccount, CONSENT_TEXT } from "@/lib/auth";
import { toast } from "@/lib/ui";
import Festive from "./Festive";
import SignIn from "./SignIn";

export default function Account() {
  const user = useUser(); const [p, setP] = useState(null), [armed, setArmed] = useState(false), [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => { if (user) { rpc("hp_account", {}).then(setP).catch(() => {}); syncAccount(); } }, [user]);
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
  async function exportData() {
    const d = await rpc("hp_export_me", {});
    const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "hatpull-my-data.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!user) return <div className="account-profile-page"><Festive on={false}/><AccountGifts/><section className="account-profile-card account-profile-guest stack"><h1>My account</h1>{user === undefined ? <p role="status">Loading your account…</p> : <><p>Sign in to manage your profile, celebrations and wish lists.</p><button className="btn" onClick={() => setOpen(true)}>Sign in</button></>}{open && <SignIn close={() => setOpen(false)} next="/account"/>}</section></div>;
  return <><Festive on={false}/><AccountCard user={user} preferences={p} consent={CONSENT_TEXT.replace(/ \(v\d+\)$/, "")} onPreferences={save} onIcon={icon => updateProfileIcon(sb(), icon)} onEmail={email => updateAccountEmail(sb(), email, user.email, `${location.origin}/auth/callback?next=%2Faccount`)} onExport={exportData} onDelete={del} busy={busy} armed={armed} onSignOut={async () => { await signOut(); toast("Signed out"); }}/></>;
}
