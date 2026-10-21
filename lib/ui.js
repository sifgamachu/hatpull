"use client";
// Small client-only helpers: toast, copy, burst.
export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2800);
}
export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); return true; }
  catch { toast("Couldn't copy. Select the text and copy it manually."); return false; }
}
export function burst(fromEl) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas"); c.className = "burst"; document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = fromEl?.getBoundingClientRect?.() || { left: W / 2, top: H / 2, width: 0, height: 0 };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const cols = ["#FFFFFF", "#D9384B", "#EDC25E", "#3E9A6B", "#FFFFFF"];
  const ps = Array.from({ length: 140 }, () => { const a = Math.random() * 6.283, v = 3 + Math.random() * 7; return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: 2 + Math.random() * 4, c: cols[(Math.random() * cols.length) | 0], rot: Math.random() * 6, flake: Math.random() < 0.4 }; });
  const t0 = performance.now();
  (function f(t) {
    const k = (t - t0) / 1800; ctx.clearRect(0, 0, W, H);
    if (k >= 1) { c.remove(); return; }
    ctx.globalAlpha = 1 - k * k;
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.985; p.rot += 0.1; ctx.fillStyle = p.c;
      if (p.flake) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.8, 0, 6.283); ctx.fill(); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25); ctx.restore(); }
    }
    requestAnimationFrame(f);
  })(t0);
}
