import { NextResponse } from "next/server";
import { serverRpc } from "@/lib/serverDb";
// One-click unsubscribe: works from the page above and from mail apps (RFC 8058 List-Unsubscribe-Post).
export async function POST(req) {
  const url = new URL(req.url);
  let t = url.searchParams.get("t"), kind = url.searchParams.get("k") || "marketing";
  if (!t) { try { const b = await req.json(); t = b.t; kind = b.kind || kind; } catch {} }
  if (!t) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  try { const ok = await serverRpc("hp_unsubscribe", { p_token: String(t).slice(0, 64), p_kind: kind === "all" ? "all" : "marketing" }); return NextResponse.json({ ok }, { status: ok ? 200 : 404 }); }
  catch { return NextResponse.json({ error: "Try again" }, { status: 500 }); }
}
