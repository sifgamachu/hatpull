"use client";
import { useEffect, useRef } from "react";
// Name tags tumbling out of a Santa hat.
export default function SantaHat() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d");
    const names = ["Abeba", "Sam", "Lina", "Dawit", "Maya", "Tomas", "Hana", "Kofi", "Grandma", "Leo"];
    const colors = [["#EDC25E", "#2A1D04"], ["#F7F2E7", "#0F3328"], ["#D9384B", "#FFFFFF"], ["#3E9A6B", "#FFFFFF"]];
    const ox = 280, oy = 380;
    const tags = names.map((n, i) => ({ n, c: colors[i % 4], t: -i * 34 }));
    const reset = t => { t.x = ox + (Math.random() - 0.5) * 60; t.y = oy; t.vx = (Math.random() - 0.5) * 3.4; t.vy = -4.4 - Math.random() * 2.6; t.r = (Math.random() - 0.5) * 0.6; t.vr = (Math.random() - 0.5) * 0.05; t.t = 0; };
    tags.forEach(t => { const d = t.t; reset(t); t.t = d; });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; let raf, alive = true;
    const tag = t => {
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.r);
      ctx.font = "600 18px Outfit, sans-serif"; const w = Math.max(70, ctx.measureText(t.n).width + 44);
      ctx.fillStyle = t.c[0]; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + 12, -17); ctx.lineTo(w / 2, -17); ctx.lineTo(w / 2, 17); ctx.lineTo(-w / 2 + 12, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#0F3328"; ctx.beginPath(); ctx.arc(-w / 2 + 14, 0, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = "#D9384B"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 14, 0); ctx.quadraticCurveTo(-w / 2 - 4, -14, -w / 2 - 16, -6); ctx.stroke();
      ctx.fillStyle = t.c[1]; ctx.textBaseline = "middle"; ctx.fillText(t.n, -w / 2 + 26, 1); ctx.restore();
    };
    const hat = () => {
      ctx.fillStyle = "#C62F42"; ctx.beginPath(); ctx.moveTo(150, 420); ctx.bezierCurveTo(160, 300, 250, 230, 360, 250); ctx.bezierCurveTo(430, 262, 470, 300, 488, 350); ctx.bezierCurveTo(460, 330, 420, 320, 400, 330); ctx.lineTo(420, 420); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#A9263A"; ctx.beginPath(); ctx.moveTo(360, 250); ctx.bezierCurveTo(430, 262, 470, 300, 488, 350); ctx.bezierCurveTo(460, 330, 420, 320, 400, 330); ctx.bezierCurveTo(400, 300, 385, 270, 360, 250); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(492, 360, 26, 0, 7); ctx.fill();
      ctx.fillStyle = "#F7F2E7"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(150 + i * 34, 430 + Math.sin(i * 1.7) * 3, 26, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(140, 418, 292, 24);
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(ox, 404, 118, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#3E9A6B"; ctx.beginPath(); ctx.ellipse(196, 424, 20, 9, -0.5, 0, 7); ctx.fill(); ctx.fillStyle = "#2F7D55"; ctx.beginPath(); ctx.ellipse(226, 424, 20, 9, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#D9384B"; [[205, 418], [217, 418], [211, 409]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); });
    };
    const draw = () => {
      if (!alive) return; ctx.clearRect(0, 0, 560, 560);
      tags.forEach((t, i) => {
        if (!reduce) { t.t++; if (t.t > 0) { t.x += t.vx; t.y += t.vy; t.vy += 0.07; t.r += t.vr; } if (t.t > 0 && t.y > oy + 10 && t.vy > 0) reset(t); }
        else if (!t.placed) { t.placed = 1; t.x = 130 + (i % 3) * 150; t.y = 70 + Math.floor(i / 3) * 62; t.r = i % 2 ? 0.1 : -0.08; t.t = 1; }
        if (t.t > 0 && t.y < oy + 6) tag(t);
      });
      hat(); if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw(); return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  return <div className="hat"><canvas ref={ref} width="560" height="560" role="img" aria-label="Name tags tumbling out of a Santa hat" /></div>;
}
