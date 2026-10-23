import { NextResponse } from "next/server";
import { serverRpc, verifiedCreator } from "@/lib/serverDb";
import { drawNames, rid } from "@/lib/core";

// Organizer changes people or exclusions. The new draw itself is made inside the database (hp_draw);
// the check here only gives a friendly error before saving.
// Body: { gid, add?: [name], remove?: [id], exclusions?: [{a,b}] (member ids) }
export async function POST(req) {
  try {
    const userId = await verifiedCreator(req.headers.get("authorization"));
    const b = await req.json();
    const roster = await serverRpc("hp_owned_roster", { p_gid: b.gid, p_owner: userId });
    if (!roster) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    let members = roster.members.filter(m => !(b.remove || []).includes(m.id));
    for (const n of (b.add || []).map(s => String(s).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").trim().slice(0, 40)).filter(Boolean)) {
      if (members.some(m => m.name.toLowerCase() === n.toLowerCase())) return NextResponse.json({ error: `${n} is already in the group.` }, { status: 400 });
      members.push({ id: rid(6), name: n });
    }
    const ids = new Set(members.map(m => m.id));
    const exclusions = (b.exclusions ?? roster.exclusions ?? []).filter(x => ids.has(x.a) && ids.has(x.b) && x.a !== x.b);
    let assignment = null;
    if (roster.mode === "draw") {
      if (members.length < 3) return NextResponse.json({ error: "A draw needs at least 3 people." }, { status: 400 });
      assignment = drawNames(members.map(m => m.id), exclusions);
      if (!assignment) return NextResponse.json({ error: "That change leaves no valid draw. Remove an exclusion first." }, { status: 400 });
    }
    await serverRpc("hp_redraw_owned_group", { p_gid: b.gid, p_owner: userId, p_members: members, p_exclusions: exclusions });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (/invalid_session|not_signed_in/.test(e.message)) return NextResponse.json({ error: "Sign in to the organizer account to manage this celebration." }, { status: 401 });
    if (/no_valid_draw/.test(e.message)) return NextResponse.json({ error: "That change leaves no valid draw. Remove an exclusion first." }, { status: 400 });
    const msg = /forbidden/.test(e.message) ? "Not allowed." : "Couldn't save that change. Try again.";
    return NextResponse.json({ error: msg }, { status: /forbidden/.test(e.message) ? 403 : 500 });
  }
}
