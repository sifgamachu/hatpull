"use client";
// Organizers use Google or email sign-in; participant accounts remain optional.
import { useEffect, useState } from "react";
import { sb, rpc } from "./db";
import { allG, setG } from "./store";

export const CONSENT_TEXT = "Yes, send me Hatpull holiday gift ideas and an invitation to run Secret Santa again next year, from Teregna. I can unsubscribe at any time. (v2)";
const OPTIN = "hatpull.optin";

export function useUser() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  useEffect(() => {
    let alive = true;
    sb().auth.getSession().then(({ data }) => { if (alive) setUser(data.session?.user || null); }).catch(() => { if (alive) setUser(null); });
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return user;
}

const back = next => `${location.origin}/auth/callback?next=${encodeURIComponent(next || location.pathname + location.search)}`;
const rememberOptIn = on => { try { on ? localStorage.setItem(OPTIN, "1") : localStorage.removeItem(OPTIN); } catch {} };

export async function signInWithGoogle({ next, marketing } = {}) {
  rememberOptIn(marketing);
  const { error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: back(next), queryParams: { prompt: "select_account" } } });
  if (error) throw error;
}
export async function signInWithEmail(email, { next, marketing } = {}) {
  rememberOptIn(marketing);
  const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: back(next), shouldCreateUser: true } });
  if (error) throw error;
}
export async function verifyEmailCode(email, code) {
  const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
  if (error) throw error;
}
// Google's own button (Google Identity Services): official branding, and Google's popup names our site.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export const EMAIL_SIGNIN = process.env.NEXT_PUBLIC_EMAIL_SIGNIN !== "0";
let gisLoading;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  gisLoading ||= new Promise((ok, fail) => {
    const s = document.createElement("script");
    const stop = () => { clearTimeout(timer); s.onload = null; s.onerror = null; };
    const failed = () => { stop(); s.remove(); fail(new Error("Google sign-in is unavailable on this connection.")); };
    const timer = setTimeout(failed, 10000);
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => { stop(); ok(); }; s.onerror = failed;
    document.head.appendChild(s);
  }).catch(error => { gisLoading = undefined; throw error; });
  return gisLoading;
}
async function sha256hex(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
export async function renderGoogleButton(el, { onSignedIn, onError, marketing }) {
  if (!GOOGLE_CLIENT_ID || !el) return false;
  await loadGis();
  const raw = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID, nonce: await sha256hex(raw), use_fedcm_for_prompt: true, itp_support: true,
    callback: async ({ credential }) => {
      try {
        rememberOptIn(marketing());
        const { error } = await sb().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
        if (error) throw error;
        await syncAccount(); onSignedIn?.();
      } catch (e) { onError?.(e); }
    },
  });
  window.google.accounts.id.renderButton(el, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", width: Math.min(360, el.clientWidth || 320) });
  return true;
}
export async function signOut() { try { window.google?.accounts?.id?.disableAutoSelect(); } catch {} await sb().auth.signOut(); }

// Restore owned groups and link participant tokens. Legacy organizer claims require an explicit action.
export async function syncAccount() {
  try {
    await rpc("hp_account", {});
    try { if (localStorage.getItem(OPTIN)) { await rpc("hp_set_prefs", { p_reminders: null, p_marketing: true, p_consent_text: CONSENT_TEXT, p_source: "sign-in sheet checkbox" }); localStorage.removeItem(OPTIN); } } catch {}
    for (const g of allG()) {
      if (!g.mtok && !g.atok) continue;
      try { await rpc("hp_link", { p_gid: g.gid, p_mtok: g.mtok || null, p_atok: g.atok || null }); } catch {}
    }
    const mine = await rpc("hp_my", {});
    for (const x of mine || []) {
      const cur = allG().find(y => y.gid === x.gid) || {};
      setG(x.gid, { name: x.name, date: x.date, occasion: x.occasion,
        ...(x.mtok ? { mtok: x.mtok, mid: x.mid, myName: x.myName } : {}),
        ...(x.atok ? { atok: x.atok, role: "organizer" } : cur.role ? {} : { role: "member" }) });
    }
    return mine || [];
  } catch { return []; }
}
