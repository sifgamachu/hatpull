"use client";
import { useEffect } from "react";
import { sb } from "@/lib/db";
import { syncAccount } from "@/lib/auth";
// Whenever someone signs in, link this device's celebrations to their account and bring back the rest.
export default function AuthSync() {
  useEffect(() => {
    const { data } = sb().auth.onAuthStateChange((e, session) => { if (session && (e === "SIGNED_IN" || e === "INITIAL_SESSION")) syncAccount(); });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
