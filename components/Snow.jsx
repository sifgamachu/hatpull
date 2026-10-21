"use client";
import { useEffect, useRef } from "react";

// Layered snowfall: faint distant flakes, soft middle flakes, and close-up flakes that include
// tumbling six-armed crystals, drifting on a slowly changing breeze.
export default function Snow({ density = 2600 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const soft = r => { const k = document.createElement("canvas"), d = Math.ceil(r * 2); k.width = k.height = d; const g = k.getContext("2d");
      const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, d, d); return k; };
    const crystal = (r, seed) => { const k = document.createElement("canvas"), d = Math.ceil(r * 2 + 6); k.width = k.height = d; const g = k.getContext("2d");
      g.translate(d / 2, d / 2); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineCap = "round"; g.lineWidth = Math.max(0.8, r / 9);
      g.shadowColor = "rgba(255,255,255,.8)"; g.shadowBlur = r / 3;
      const b1 = 0.35 + (seed % 3) * 0.1, b2 = 0.62 + (seed % 2) * 0.08, bl = 0.28 + (seed % 4) * 0.05;
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r); g.stroke();
        [b1, b2].forEach((p, j) => { const y = -r * p, l = r * bl * (j ? 0.75 : 1); g.beginPath(); g.moveTo(0, y); g.lineTo(-l * 0.7, y - l * 0.7); g.moveTo(0, y); g.lineTo(l * 0.7, y - l * 0.7); g.stroke(); });
        g.restore(); }
      g.beginPath(); g.arc(0, 0, r * 0.12, 0, 6.283); g.fillStyle = "rgba(255,255,255,.95)"; g.fill();
      return k; };
    const SOFT = [1, 1.6, 2.4, 3.4, 5, 7, 9].map(r => ({ r, img: soft(r) }));
    const CRYS = Array.from({ length: 6 }, (_, i) => crystal(7 + i * 1.6, i));
    const pickSoft = r => SOFT.reduce((a, b) => (Math.abs(b.r - r) < Math.abs(a.r - r) ? b : a)).img;
    let W = 0, H = 0, flakes = [];
    const make = (layer, y) => {
      const L = [{ r: [0.5, 1.3], v: [0.35, 0.65], a: [0.25, 0.5], amp: [0.2, 0.5] }, { r: [1.3, 2.6], v: [0.7, 1.15], a: [0.55, 0.85], amp: [0.4, 0.9] }, { r: [3, 6.5], v: [1.2, 1.9], a: [0.55, 0.9], amp: [0.6, 1.4] }][layer];
      const rnd = ([lo, hi]) => lo + Math.random() * (hi - lo);
      const r = rnd(L.r), isCrys = layer === 2 && Math.random() < 0.55;
      return { layer, r, x: Math.random() * W, y: y ?? Math.random() * H, v: rnd(L.v) * (0.85 + r * 0.04), a: rnd(L.a), amp: rnd(L.amp),
        ph: Math.random() * 6.283, fq: 0.008 + Math.random() * 0.018, rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * 0.02,
        img: isCrys ? CRYS[(Math.random() * CRYS.length) | 0] : pickSoft(layer === 2 ? r * 1.4 : r), crys: isCrys, flip: Math.random() * 6.283 };
    };
    const size = () => {
      const rect = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = rect.width; H = rect.height; c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / density);
      flakes = []; for (let i = 0; i < n; i++) { const p = Math.random(); flakes.push(make(p < 0.58 ? 0 : p < 0.9 ? 1 : 2)); }
      flakes.sort((a, b) => a.layer - b.layer);
    };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    let raf, last = performance.now(), t = 0, gust = 0, gustTarget = 0, nextGust = 4000, alive = true, visible = true;
    // Pause when the snow is scrolled off-screen or the tab is hidden, to save phone batteries.
    const io = new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } });
    io.observe(c);
    const frame = now => {
      if (!alive || !visible || document.hidden) { if (alive && visible && !reduce) setTimeout(() => { last = performance.now(); raf = requestAnimationFrame(frame); }, 500); return; }
      const dt = Math.min(48, now - last) / 16.67; last = now; t += dt * 16.67;
      nextGust -= dt * 16.67; if (nextGust <= 0) { gustTarget = (Math.random() - 0.35) * 1.6; nextGust = 3000 + Math.random() * 6000; }
      gust += (gustTarget - gust) * 0.006 * dt; gustTarget *= Math.pow(0.997, dt);
      const breeze = Math.sin(t * 0.00023) * 0.35 + Math.sin(t * 0.00071) * 0.15 + gust;
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        if (!reduce) {
          const depth = 0.35 + f.layer * 0.45;
          f.ph += f.fq * dt; f.y += f.v * dt; f.x += (breeze * depth + Math.sin(f.ph) * f.amp * 0.35) * dt;
          f.rot += f.vr * dt; f.flip += 0.02 * dt;
          if (f.y - f.r * 2 > H) Object.assign(f, make(f.layer, -f.r * 3));
          if (f.x < -20) f.x = W + 20; else if (f.x > W + 20) f.x = -20;
        }
        const fade = f.y > H - 50 ? Math.max(0, (H - f.y) / 50) : 1;
        ctx.globalAlpha = f.a * fade;
        if (f.crys) { const s = f.r * 2.2, sx = Math.abs(Math.cos(f.flip)) * 0.55 + 0.45; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(sx, 1); ctx.drawImage(f.img, -s / 2, -s / 2, s, s); ctx.restore(); }
        else { const s = f.layer === 2 ? f.r * 2.8 : f.r * 2.2; ctx.drawImage(f.img, f.x - s / 2, f.y - s / 2, s, s); }
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame(performance.now());
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [density]);
  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}
