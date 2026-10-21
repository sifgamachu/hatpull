import { createClient } from "@supabase/supabase-js";

// All data goes through security-definer Postgres functions that check each person's private token.
// Tables themselves are not readable with the public key.
let client;
export function sb() {
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return client;
}
export async function rpc(fn, args) {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
}
