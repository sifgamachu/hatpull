import { NextResponse } from "next/server";
import { serverRpc } from "@/lib/serverDb";
import { createHash } from "crypto";
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
    // On Vercel, x-real-ip is set by the platform and can't be spoofed by the client.
    const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",").pop().trim() || "anon";
    if (limited(ip)) return NextResponse.json({ error: "You've created a lot of celebrations in a short time. Wait a few minutes and try again." }, { status: 429 });
    const b = await req.json();
    // Trim and strip invisible bidi/control characters that could be used to disguise names.
    const clean = s => String(s ?? "").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").trim();
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
    // Feasibility check only, for a friendly message; the real draw happens inside the database.
    if (mode === "draw" && !drawNames(members.map(m => m.id), exclusions)) { return NextResponse.json({ error: "These exclusions leave no valid draw." }, { status: 400 }); }
    const orgMid = b.includeMe && clean(b.orgName) ? idOf(clean(b.orgName).slice(0, 40)) : null;

    // A one-way hash of the creator's IP lets the database apply a per-person limit across all servers.
    const ipHash = createHash("sha256").update("hatpull:" + ip).digest("hex").slice(0, 32);
    const out = await serverRpc("hp_create_group", { p: {
      client: ipHash,
      name: clean(b.name).slice(0, 80), occasion: clean(b.occasion).slice(0, 40), date: clean(b.date), budget: clean(b.budget).slice(0, 12), cur: clean(b.cur).slice(0, 4) || "$",
      note: clean(b.note).slice(0, 500), mode, settings: { wishVis: "all", mail: { on: false, vis: "drawn" }, venue: { type: "", address: "" } },
      exclusions, org_name: clean(b.orgName).slice(0, 40), members, org_mid: orgMid,
    } });
    return NextResponse.json(out);
  } catch (e) {
    if (/no_valid_draw/.test(e.message)) return NextResponse.json({ error: "These exclusions leave no valid draw." }, { status: 400 });
    if (/slow_down/.test(e.message)) return NextResponse.json({ error: "You've created a lot of celebrations recently. Try again in a little while." }, { status: 429 });
    if (/busy/.test(e.message)) return NextResponse.json({ error: "We're very busy right now. Try again in a minute." }, { status: 503 });
    return NextResponse.json({ error: "Couldn't create the celebration. Try again." }, { status: 500 });
  }
}
