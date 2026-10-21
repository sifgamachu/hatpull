"use client";
import { useEffect, useRef, useState } from "react";
// Footer string lights: a drooping wire with glass bulbs that glow and twinkle, sized to the footer.
export default function Garland() {
  const ref = useRef(null); const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setW(Math.max(240, el.parentElement?.clientWidth || 600));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el.parentElement);
    window.addEventListener("hp:festive", measure);
    return () => { ro.disconnect(); window.removeEventListener("hp:festive", measure); };
  }, []);
  const cols = ["#E8364B", "#F5C04A", "#2FAE6A", "#3D8BE0", "#F07ACB", "#FF8A2B"];
  const n = Math.max(4, Math.round(w / 58)), sw = w / n; let wire = "M0 8"; const bulbs = [];
  for (let i = 0; i < n; i++) {
    const xm = i * sw + sw / 2, x1 = i * sw + sw, sag = 18 + ((i * 7) % 5);
    wire += ` Q${xm.toFixed(1)} ${sag * 2} ${x1.toFixed(1)} 8`;
    const by = sag + 5, rot = (i % 2 ? 1 : -1) * (8 + ((i * 13) % 10));
    bulbs.push(
      <g key={i} className="bulb" style={{ "--c": cols[i % cols.length], "--d": `${((i * 0.71) % 3.2).toFixed(2)}s` }} transform={`translate(${xm.toFixed(1)} ${by}) rotate(${rot}) scale(1.3)`}>
        <ellipse className="halo" cx="0" cy="13" rx="11" ry="13" />
        <rect className="cap" x="-3.2" y="-1" width="6.4" height="6" rx="1.2" />
        <g className="lit"><path className="glass" d="M0 4.6 C6 6.5 7.2 15.5 0 23.5 C-7.2 15.5 -6 6.5 0 4.6Z" /><ellipse className="shine" cx="-2.2" cy="11" rx="1.3" ry="3.4" /></g>
      </g>
    );
  }
  return (
    <div className="garland" ref={ref} aria-hidden="true">
      {w > 0 && <svg viewBox={`0 0 ${Math.round(w)} 66`} preserveAspectRatio="none"><path className="wire" d={wire} />{bulbs}</svg>}
    </div>
  );
}
