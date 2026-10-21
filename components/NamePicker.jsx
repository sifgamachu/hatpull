"use client";
import { useEffect, useRef, useState } from "react";
import { shuffle } from "@/lib/core";
import { burst, copy } from "@/lib/ui";

const SAMPLE = "Ava\nNoah\nMia\nLiam\nZara\nEthan\nSofia\nKai";
const PALETTE = ["#D9384B", "#EDC25E", "#2F8A5B", "#3C78B5", "#E07A3A", "#8E44AD", "#16A39A", "#E05A8C"];
const KEY = "hatpull.picker";

// Spinning wheel name picker: paste names, spin, get a fair random winner.
export default function NamePicker() {
  const [text, setText] = useState(SAMPLE);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [history, setHistory] = useState([]);
  const [removeWinner, setRemoveWinner] = useState(false);
  const spinBtn = useRef(null);
  const canvas = useRef(null), angleRef = useRef(0);
  // One name per line; commas only separate names when everything is on a single line ("Smith, John" stays one name).
  const all = (text.includes("\n") ? text.split("\n") : text.split(",")).map(s => s.trim()).filter(Boolean);
  const LIMIT = 1000, names = all.slice(0, LIMIT);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.text) setText(s.text); if (s?.removeWinner) setRemoveWinner(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ text, removeWinner })); } catch {} }, [text, removeWinner]);

  useEffect(() => {
    const c = canvas.current; if (!c) return; const ctx = c.getContext("2d");
    const S = c.width, R = S / 2 - 6, n = Math.max(names.length, 1), seg = (Math.PI * 2) / n;
    ctx.clearRect(0, 0, S, S); ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, i * seg, (i + 1) * seg); ctx.closePath();
      ctx.fillStyle = names.length ? PALETTE[i % PALETTE.length] : "#C9D3CE"; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.stroke();
      if (names[i]) {
        ctx.save(); ctx.rotate(i * seg + seg / 2); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        const fs = Math.max(11, Math.min(30, (seg * R) / 2.2, 520 / Math.max(6, names[i].length) / 2));
        ctx.font = `600 ${fs}px Outfit, system-ui, sans-serif`;
        ctx.fillStyle = [1].includes(i % PALETTE.length) ? "#2A1D04" : "#FFFFFF";
        const label = names[i].length > 22 ? names[i].slice(0, 21) + "…" : names[i];
        ctx.fillText(label, R - 16, 1); ctx.restore();
      }
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.stroke();
  }, [angle, text]); // eslint-disable-line react-hooks/exhaustive-deps

  function spin() {
    if (spinning || names.length < 2) return;
    setWinner(null); setSpinning(true);
    const n = names.length, seg = (Math.PI * 2) / n;
    const a = new Uint32Array(1); crypto.getRandomValues(a); const pick = a[0] % n;
    // the pointer sits at angle 0 (right side); land the middle of the picked slice there
    const start = angleRef.current, target = -(pick * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.7;
    const turns = 6 + Math.floor(Math.random() * 3);
    let end = target; while (end < start + turns * Math.PI * 2) end += Math.PI * 2;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, dur = reduce ? 10 : 4800 + Math.random() * 900, t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), cur = start + (end - start) * ease(k);
      angleRef.current = cur; setAngle(cur);
      if (k < 1) requestAnimationFrame(step);
      else { setSpinning(false); setWinner(names[pick]); setHistory(h => [names[pick], ...h].slice(0, 20)); setTimeout(() => burst(canvas.current), 30); }
    };
    requestAnimationFrame(step);
  }
  function closeWinner(remove) {
    if (remove && winner) { const idx = all.indexOf(winner); const next = all.slice(); next.splice(idx, 1); setText(next.join("\n")); }
    setWinner(null);
    setTimeout(() => spinBtn.current?.focus(), 0);
  }

  useEffect(() => { if (!winner) return; const k = e => { if (e.key === "Escape") closeWinner(removeWinner); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); });

  return (
    <div className="picker">
      <div className="stack">
        <div className="wheel-wrap">
          <canvas ref={canvas} width="1040" height="1040" onClick={spin} role="img" aria-label="Name wheel. Click to spin." />
          <div className="pointer" aria-hidden="true" />
          <button className="hub" onClick={spin} disabled={spinning || names.length < 2}>{spinning ? "…" : "SPIN"}</button>
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" ref={spinBtn} onClick={spin} disabled={spinning || names.length < 2}>{spinning ? "Spinning…" : "Spin the wheel"}</button>
        </div>
        {names.length < 2 && <p className="muted small" style={{ textAlign: "center" }}>Add at least two names to spin.</p>}
      </div>
      <div className="stack">
        <div className="panel stack">
          <div className="row between"><label htmlFor="names" style={{ margin: 0 }}>Names ({names.length})</label>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small ghost" onClick={() => setText(shuffle(all).join("\n"))} disabled={spinning}>Shuffle</button>
              <button className="btn small ghost" onClick={() => setText(all.slice().sort((a, b) => a.localeCompare(b)).join("\n"))} disabled={spinning}>Sort</button>
              <button className="btn small ghost" onClick={() => setText("")} disabled={spinning}>Clear</button>
            </div>
          </div>
          <textarea id="names" className="namebox" value={text} onChange={e => setText(e.target.value)} placeholder="One name per line" spellCheck="false" readOnly={spinning} />
          {all.length > LIMIT && <p className="small" role="status">The wheel uses the first {LIMIT} names. You have {all.length}.</p>}
          <label className="check"><input type="checkbox" checked={removeWinner} onChange={e => setRemoveWinner(e.target.checked)} /> Remove the winner after each spin</label>
        </div>
        {history.length > 0 && <div className="panel stack"><div className="row between"><h3>Picked so far</h3><button className="link" onClick={() => copy(history.join("\n"))}>Copy</button></div><div className="hist">{history.map((h, i) => <span className="chip" key={i}>{i + 1}. {h}</span>)}</div></div>}
      </div>
      {winner && (
        <div className="winner" onClick={e => { if (e.target === e.currentTarget) closeWinner(removeWinner); }}>
          <div className="panel stack" role="dialog" aria-modal="true" aria-label="Winner">
            <p className="eyebrow">We have a winner</p>
            <div className="big">{winner}</div>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={() => closeWinner(removeWinner)} autoFocus>{removeWinner ? "Remove & close" : "Close"}</button>
              {!removeWinner && <button className="btn ghost" onClick={() => closeWinner(true)}>Remove {winner.length > 14 ? "name" : winner}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
