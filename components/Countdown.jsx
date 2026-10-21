"use client";
import { useEffect, useState } from "react";
import { xmasYear } from "@/lib/core";
export default function Countdown() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now == null) return <div className="countdown" style={{ minHeight: 64 }} />;
  const ms = new Date(xmasYear(), 11, 25) - now;
  if (ms <= 0) return <p className="countdown-label">Merry Christmas! 🎄</p>;
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return (
    <>
      <div className="countdown">{[[d, "days"], [h, "hours"], [m, "min"], [s, "sec"]].map(([v, l]) => <div key={l}><b>{String(v).padStart(2, "0")}</b><span>{l}</span></div>)}</div>
      <p className="countdown-label">{d > 40 ? "until Christmas. Plenty of time, but the best gifts sell out." : d > 14 ? "until Christmas. Time to draw names." : "until Christmas. Draw names tonight!"}</p>
    </>
  );
}
