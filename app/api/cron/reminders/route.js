import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { serverRpc, usingSecretKey } from "@/lib/serverDb";
import { reminderPayload } from "@/lib/email";
import { runReminders } from "@/lib/reminder-worker.mjs";
import { sendResend } from "@/lib/resend-transport.mjs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!usingSecretKey || !process.env.RESEND_API_KEY) return NextResponse.json({ skipped: "Email sending isn't configured yet." });
  try {
    const result = await runReminders({ rpc: serverRpc, prepare: reminderPayload, runId: randomUUID(),
      send: (payload, key) => sendResend(payload, key, { key: process.env.RESEND_API_KEY }) });
    return NextResponse.json(result);
  } catch {
    // Never return email bodies, recipients or provider credentials in cron logs.
    return NextResponse.json({ error: "Reminder processing interrupted; queued work will resume." }, { status: 500 });
  }
}
