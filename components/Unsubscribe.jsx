"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Festive from "./Festive";
export default function Unsubscribe() {
  const q = useSearchParams(); const t = q.get("t") || ""; const [done, setDone] = useState(null);
  async function go(kind) {
    const r = await fetch("/api/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t, kind }) }).catch(() => null);
    setDone(r && r.ok ? kind : "error");
  }
  return (
    <div className="narrow panel stack"><Festive on={false} />
      <h1 style={{ fontSize: 26 }}>Email preferences</h1>
      {done === "marketing" ? <p>You won't get marketing emails from us anymore. Reminders about celebrations you're in will continue.</p>
        : done === "all" ? <p>You're unsubscribed from all Hatpull emails.</p>
        : done === "error" ? <p>That link didn't work. You can change your emails from <Link href="/account">your account</Link>.</p>
        : <><p className="muted">Choose what to stop:</p>
            <div className="row"><button className="btn" onClick={() => go("marketing")}>Stop marketing emails</button><button className="btn ghost" onClick={() => go("all")}>Stop all emails</button></div></>}
    </div>
  );
}
