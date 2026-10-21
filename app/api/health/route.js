import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// Reports only whether server settings are present (never their values).
export function GET() {
  return NextResponse.json({ ok: true, serverKey: !!process.env.SUPABASE_SECRET_KEY, email: !!process.env.RESEND_API_KEY, cron: !!process.env.CRON_SECRET });
}
