import { createClient } from "@supabase/supabase-js";

// Public connection details. The publishable key is designed to ship to browsers: every table is locked,
// and all reads/writes go through security-definer Postgres functions that check each person's private token.
// Environment variables override these if set.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj";

let client;
export function sb() {
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: false } });
  return client;
}
export async function rpc(fn, args) {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
}
