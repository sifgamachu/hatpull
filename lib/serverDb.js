import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./network.mjs";
import { requireOrganizer } from "./organizer-auth.mjs";

// Server-only database access for the API routes. When SUPABASE_SECRET_KEY is set in Vercel, group creation
// and redraws run with it, and the database refuses those two functions from anyone else (browsers included).
// A missing server key fails closed: the public key cannot call creation or redraw RPCs.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co";
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj";
let client;
function serverClient() {
  if (!client) client = createClient(URL, KEY, { global: { fetch: fetchWithTimeout }, auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
export async function verifiedCreator(authorization) {
  return requireOrganizer(authorization, token => serverClient().auth.getUser(token));
}
export async function serverRpc(fn, args) {
  const { data, error } = await serverClient().rpc(fn, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
}
export const usingSecretKey = !!process.env.SUPABASE_SECRET_KEY;
