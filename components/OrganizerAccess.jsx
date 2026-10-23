"use client";
import { useState } from "react";
import Link from "next/link";
import { rpc } from "@/lib/db";
import { getG, setG } from "@/lib/store";
import { useUser, signOut, syncAccount } from "@/lib/auth";
import SignIn from "./SignIn";

export const isOrganizerError = error => ["organizer_sign_in_required", "organizer_claim_required", "not_group_owner", "organizer_unavailable"].includes(error);

export default function OrganizerAccess({ gid, error = "no_access", reload }) {
  const user = useUser();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const claimable = error === "organizer_claim_required";
  const unavailable = error === "organizer_unavailable";
  async function claim() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await rpc("hp_claim_organizer", { p_gid: gid, p_atok: getG(gid)?.atok || null });
      setG(gid, { atok: result.admin_token, role: "organizer" });
      await syncAccount(); await reload?.();
    } catch (e) {
      setMessage(/not_group_owner|forbidden/.test(e.message) ? "This group belongs to another account, or the organizer link is no longer valid." : "Couldn't connect this group. Sign in again and retry.");
    } finally { setBusy(false); }
  }
  return <div className="narrow panel stack">
    <h1 style={{ fontSize: 24 }}>{claimable ? "Connect your existing celebration" : unavailable ? "Organizer account unavailable" : "Sign in to manage your celebration"}</h1>
    <p className="muted">{claimable
      ? "This celebration was created before organizer sign-in was required. Your private organizer link lets you connect it to your account once."
      : unavailable ? "The organizer account was removed. This group cannot be claimed by another account. Participants can continue using their personal links."
      : error === "not_group_owner" ? "This celebration belongs to a different organizer account. Sign in with the account that created or claimed it."
      : "Organizers manage their celebrations with the Google or email account they used to create them. For an older group, open your original private organizer link and sign in to connect it."}</p>
    {user && <p className="small muted">Signed in as {user.email || "your account"}.</p>}
    {claimable && <button className="btn" onClick={claim} disabled={busy}>{busy ? "Connecting…" : "Connect this group to my account"}</button>}
    {!unavailable && <div className="row">
      {!user ? <button className="btn" onClick={() => setOpen(true)}>Sign in as organizer</button>
        : <button className="btn ghost" onClick={async () => { await signOut(); setOpen(true); }}>Use a different account</button>}
      <Link className="btn ghost" href="/my">My celebrations</Link>
    </div>}
    {error === "no_access" && <p className="small muted">Joining as a participant? Open the invitation link from your organizer, or your saved personal link.</p>}
    {message && <p className="note err" role="alert">{message}</p>}
    {open && <SignIn required close={() => setOpen(false)} next={typeof location !== "undefined" ? location.pathname + location.search : `/g/${gid}`} />}
  </div>;
}
