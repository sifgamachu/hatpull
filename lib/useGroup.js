"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "./db";
import { getG, setG } from "./store";
import { normState } from "./core";

// Loads a celebration with this browser's tokens and keeps it fresh by polling.
// Polling backs off while nothing changes (6s → 45s) and snaps back to 6s on any change or user action,
// so idle open tabs cost the database very little. Hidden tabs don't poll at all.
const BASE = 6000, MAX = 45000, FAST = 1500;
export function useGroup(gid) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState(null);
  const fast = useRef(false);
  const last = useRef(""), delay = useRef(BASE);

  useEffect(() => {
    // tokens can arrive in a personal link (?t= member, ?a= organizer); save them and clean the address bar
    const u = new URL(location.href); const t = u.searchParams.get("t"), a = u.searchParams.get("a");
    if (t || a) { setG(gid, { ...(t ? { mtok: t } : {}), ...(a ? { atok: a } : {}) }); u.searchParams.delete("t"); u.searchParams.delete("a"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    const g = getG(gid); setTokens(g ? { mtok: g.mtok || null, atok: g.atok || null } : { mtok: null, atok: null });
  }, [gid]);

  const load = useCallback(async () => {
    if (!tokens) return;
    if (!tokens.mtok && !tokens.atok) { setError("no_access"); return; }
    try {
      const s = normState(await rpc("hp_state", { p_gid: gid, p_mtok: tokens.mtok, p_atok: tokens.atok }));
      const sig = JSON.stringify(s);
      if (sig === last.current) { delay.current = Math.min(MAX, delay.current * 1.6); return s; }
      last.current = sig; delay.current = BASE;
      setState(s); setError(null);
      setG(gid, { name: s.group.name, date: s.group.date, occasion: s.group.occasion, ...(s.me ? { mid: s.me.id, myName: s.me.name } : {}) });
    } catch (e) { setError(/not_found/.test(e.message) ? "not_found" : /forbidden/.test(e.message) ? "no_access" : "network"); }
  }, [gid, tokens]);

  useEffect(() => {
    if (!tokens) return; load();
    let timer; const tick = () => { timer = setTimeout(async () => { if (!document.hidden) await load(); tick(); }, fast.current ? FAST : delay.current); };
    tick();
    const wake = () => { if (document.hidden) return; delay.current = BASE; clearTimeout(timer); load(); tick(); };
    document.addEventListener("visibilitychange", wake); window.addEventListener("focus", wake);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); };
  }, [tokens, load]);

  const reload = useCallback(() => { delay.current = BASE; return load(); }, [load]);
  return { state, error, tokens, reload, setFast: v => (fast.current = v) };
}
