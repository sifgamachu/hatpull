import { accountDeletionHandler } from "../../../../lib/account-deletion.mjs";
// Deletes the signed-in person's sign-in record (Supabase Auth user). Needs SUPABASE_SECRET_KEY on the server.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co";
const PUB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj";
export async function POST(req) {
  return accountDeletionHandler({ url: URL, publishableKey: PUB, secret: process.env.SUPABASE_SECRET_KEY })(req);
}
