import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./network.mjs";

// Public connection details. The publishable key is designed to ship to browsers: every table is locked,
// and all reads/writes go through security-definer Postgres functions that check each person's private token.
// Environment variables override these if set.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj";

let client;
export function sb() {
  // Optional sign-in (Google or email link). Sessions live in this browser only; signed-out use works as before.
  if (!client) client = createClient(URL, KEY, { global: { fetch: fetchWithTimeout }, auth: { persistSession: typeof window !== "undefined", autoRefreshToken: typeof window !== "undefined", detectSessionInUrl: true, storageKey: "hatpull.auth" } });
  return client;
}
export async function rpc(fn, args) {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
}
