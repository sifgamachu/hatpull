"use client";
import { useEffect, useRef } from "react";
// Modal sheet: named by its first heading for screen readers, closes on Escape, focus moves inside and returns after.
export function Sheet({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current, prev = document.activeElement;
    const h = el?.querySelector("h1,h2,h3"); if (h) { if (!h.id) h.id = "sheet-" + Math.random().toString(36).slice(2, 8); el.setAttribute("aria-labelledby", h.id); }
    el?.querySelector("button, input, select, textarea, a[href]")?.focus({ preventScroll: true });
    const k = e => { if (e.key === "Escape") onClose?.(); };
    addEventListener("keydown", k);
    return () => { removeEventListener("keydown", k); prev?.focus?.({ preventScroll: true }); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="sheet" role="dialog" aria-modal="true" ref={ref} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}><div className="panel stack">{children}</div></div>;
}
