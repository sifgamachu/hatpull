import { NextResponse } from "next/server";
import { serverRpc, usingSecretKey } from "@/lib/serverDb";
import { reminderEmail, sendEmail } from "@/lib/email";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
// Runs daily (vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!usingSecretKey || !process.env.RESEND_API_KEY) return NextResponse.json({ skipped: "Email sending isn't configured yet." });
  const due = await serverRpc("hp_due_reminders", {});
  let sent = 0, failed = 0;
  for (const r of due) {
    try { await sendEmail({ to: r.email, ...reminderEmail(r) }); await serverRpc("hp_log_sent", { p_user: r.user_id, p_gid: r.gid, p_kind: r.kind }); sent++; }
    catch { failed++; }
    await new Promise(z => setTimeout(z, 120)); // stay under the provider's rate limit
  }
  return NextResponse.json({ due: due.length, sent, failed });
}
