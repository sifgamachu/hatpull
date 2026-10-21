import { NextResponse } from "next/server";
// Deletes the signed-in person's sign-in record (Supabase Auth user). Needs SUPABASE_SECRET_KEY on the server.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rkpglmwjpwbrxbluvsqm.supabase.co";
const PUB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj";
export async function POST(req) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const who = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUB, authorization: `Bearer ${token}` } });
  if (!who.ok) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await who.json();
  if (!secret) return NextResponse.json({ error: "Account deletion is being set up. Email hello@secretsantageneratorapp.com and we'll delete it." }, { status: 501 });
  const r = await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: secret, authorization: `Bearer ${secret}` } });
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Couldn't delete the sign-in record." }, { status: 500 });
}
