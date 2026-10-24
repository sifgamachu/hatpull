"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/db";
import { syncAccount } from "@/lib/auth";

// Only same-site paths. Rejects "//x", "/\x", control characters and anything that resolves off-site.
export function safeNext(next) {
  const raw = String(next || "");
  if (!raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw) || raw.startsWith("//")) return "/my";
  try { const u = new URL(raw, location.origin); return u.origin === location.origin ? u.pathname + u.search + u.hash : "/my"; }
  catch { return "/my"; }
}

export default function AuthCallback() {
  const router = useRouter(), q = useSearchParams(); const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const safe = safeNext(q.get("next"));
    if (q.get("error_description")) { setMsg("Sign-in was cancelled or didn't work. You can try again any time."); return; }
    let done = false;
    const finish = async () => { if (done) return; done = true; await syncAccount(); router.replace(safe); };
    sb().auth.getSession().then(({ data }) => { if (data.session) finish(); });
    const { data } = sb().auth.onAuthStateChange((_e, s) => { if (s) finish(); });
    const t = setTimeout(() => { if (!done) setMsg("This sign-in link has expired or was opened on a different device. Please request a new one."); }, 8000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [q, router]);
  return <div className="narrow panel stack"><h1 style={{ fontSize: 24 }}>{msg}</h1></div>;
}
