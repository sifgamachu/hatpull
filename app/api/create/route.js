import { NextResponse } from "next/server";
import { rpc } from "@/lib/db";
import { drawNames, rid } from "@/lib/core";

// Light per-IP limit (per server instance). The database also has a global circuit breaker.
const hits = new Map(); const WINDOW = 10 * 60 * 1000, LIMIT = 20;
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > WINDOW) hits.delete(k);
  return arr.length > LIMIT;
}

// Creates a celebration. The draw runs here on the server so the organizer's browser never sees the results.
export async function POST(req) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    if (limited(ip)) return NextResponse.json({ error: "You've created a lot of celebrations in a short time. Wait a few minutes and try again." }, { status: 429 });
    const b = await req.json();
    const clean = s => String(s ?? "").trim();
    const people = (b.people || []).map(clean).filter(Boolean).map(s => s.slice(0, 40));
    const mode = b.mode === "wish" ? "wish" : "draw";
    if (!clean(b.name)) return NextResponse.json({ error: "Give the celebration a name." }, { status: 400 });
    if (new Set(people.map(p => p.toLowerCase())).size !== people.length) return NextResponse.json({ error: "Two people have the same name." }, { status: 400 });
    if (people.length > 200) return NextResponse.json({ error: "A group can have up to 200 people." }, { status: 400 });
    if (mode === "draw" && people.length < 3) return NextResponse.json({ error: "A draw needs at least 3 people." }, { status: 400 });
    if (mode === "wish" && people.length < 2) return NextResponse.json({ error: "Add at least 2 people." }, { status: 400 });

    const members = people.map(name => ({ id: rid(6), name }));
    const idOf = n => members.find(m => m.name === n)?.id;
    const exclusions = mode === "draw" ? (b.exclusions || []).map(x => ({ a: idOf(clean(x.a)), b: idOf(clean(x.b)) })).filter(x => x.a && x.b && x.a !== x.b) : [];
    let assignment = null;
    if (mode === "draw") { assignment = drawNames(members.map(m => m.id), exclusions); if (!assignment) return NextResponse.json({ error: "These exclusions leave no valid draw." }, { status: 400 }); }
    const orgMid = b.includeMe && clean(b.orgName) ? idOf(clean(b.orgName).slice(0, 40)) : null;

    const out = await rpc("hp_create_group", { p: {
      name: clean(b.name).slice(0, 80), occasion: clean(b.occasion).slice(0, 40), date: clean(b.date), budget: clean(b.budget).slice(0, 12), cur: clean(b.cur).slice(0, 4) || "$",
      note: clean(b.note).slice(0, 500), mode, settings: { wishVis: "all", mail: { on: false, vis: "drawn" }, venue: { type: "", address: "" } },
      exclusions, org_name: clean(b.orgName).slice(0, 40), members, assignment, org_mid: orgMid,
    } });
    return NextResponse.json(out);
  } catch (e) {
    if (/busy/.test(e.message)) return NextResponse.json({ error: "We're very busy right now. Try again in a minute." }, { status: 503 });
    return NextResponse.json({ error: "Couldn't create the celebration. Try again." }, { status: 500 });
  }
}
