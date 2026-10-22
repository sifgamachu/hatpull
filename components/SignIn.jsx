"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signInWithEmail, verifyEmailCode, renderGoogleButton, GOOGLE_CLIENT_ID, EMAIL_SIGNIN, CONSENT_TEXT, syncAccount } from "@/lib/auth";
import { toast } from "@/lib/ui";
import { Sheet } from "./bits";

// Optional sign-in. Shown as a sheet; nothing on the site requires it.
export default function SignIn({ close, next, why }) {
  const [email, setEmail] = useState(""), [sent, setSent] = useState(false), [code, setCode] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [mkt, setMkt] = useState(false);
  const gBox = useRef(null), mktRef = useRef(false); mktRef.current = mkt;
  const done = () => { toast("You're signed in"); close?.(); if (next && next !== location.pathname + location.search) location.href = next; else location.reload(); };
  useEffect(() => { renderGoogleButton(gBox.current, { marketing: () => mktRef.current, onSignedIn: done, onError: () => setErr("Google sign-in didn't work. You can try email sign-in instead.") }).catch(() => setErr("Google sign-in is unavailable on this connection. You can try email sign-in instead.")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function mail(e) {
    e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email address.");
    setBusy(true); setErr("");
    try { await signInWithEmail(email, { next, marketing: mkt }); setSent(true); } catch { setErr("Couldn't send the email. Try again in a minute."); }
    setBusy(false);
  }
  async function verify(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await verifyEmailCode(email, code); await syncAccount(); done(); } catch { setErr("That code didn't work. Check it, or request a new email."); setBusy(false); }
  }
  const none = !GOOGLE_CLIENT_ID && !EMAIL_SIGNIN;
  return (
    <Sheet onClose={close}>
      <div className="row between"><h2 style={{ fontSize: 22 }}>Keep your spot on any device</h2><button className="link" onClick={close}>Close</button></div>
      <p className="muted small">{why || "Sign in to get your celebrations back on any phone or computer, protect your name so nobody else can pick it, and get reminders before the exchange."} Signing in is optional.</p>
      {none ? <p className="small">Sign-in is coming soon. Until then, save your personal link to get back to your name.</p> : <>
        {!sent && <label className="check small"><input type="checkbox" checked={mkt} onChange={e => setMkt(e.target.checked)} /> {CONSENT_TEXT.replace(/ \(v\d+\)$/, "")}</label>}
        {GOOGLE_CLIENT_ID && !sent && <div ref={gBox} className="gbtn" />}
        {EMAIL_SIGNIN && (sent ? <form className="stack" style={{ gap: 8 }} onSubmit={verify}>
            <div role="status"><b>Check your email.</b> <span className="small muted">We sent a link and a one-time code to {email.trim()}. Tap the link, or enter the code here.</span></div>
            <label htmlFor="siCode">Sign-in code</label>
            <input id="siCode" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
            <button className="btn block" type="submit" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
          </form> : <>
            {GOOGLE_CLIENT_ID && <div className="or"><span>or</span></div>}
            <form className="stack" style={{ gap: 8 }} onSubmit={mail} noValidate>
              <label htmlFor="siEmail">Email me a sign-in link</label>
              <input id="siEmail" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <button className="btn ghost block" type="submit" disabled={busy}>{busy ? "Sending…" : "Send link"}</button>
            </form></>)}
      </>}
      {err && <div className="small" role="alert"><p style={{ color: "var(--ribbon)" }}>{err}</p><Link href="/network-access">Help with work or school networks</Link></div>}
      <p className="tiny muted">We use your name and email to run your account and to send reminders about celebrations you're in (you can turn these off). Marketing emails only if you tick the box. See our <Link href="/privacy">Privacy Policy</Link>.</p>
    </Sheet>
  );
}
