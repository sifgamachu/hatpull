"use client";
import { useEffect } from "react";
import { sb } from "@/lib/db";
import { syncAccount } from "@/lib/auth";
// Defer SDK work until the synchronous Auth callback releases its session lock.
export default function AuthSync() {
  useEffect(() => {
    let timer;
    const { data } = sb().auth.onAuthStateChange((e, session) => { if (session && (e === "SIGNED_IN" || e === "INITIAL_SESSION")) { clearTimeout(timer); timer = setTimeout(() => syncAccount(), 0); } });
    return () => { clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);
  return null;
}
