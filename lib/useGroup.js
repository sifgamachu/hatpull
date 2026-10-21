"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "./db";
import { getG, setG } from "./store";

// Loads a celebration with this browser's tokens and keeps it fresh by polling.
export function useGroup(gid) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState(null);
  const fast = useRef(false);

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
      const s = await rpc("hp_state", { p_gid: gid, p_mtok: tokens.mtok, p_atok: tokens.atok });
      setState(s); setError(null);
      setG(gid, { name: s.group.name, date: s.group.date, occasion: s.group.occasion, ...(s.me ? { mid: s.me.id, myName: s.me.name } : {}) });
    } catch (e) { setError(/not_found/.test(e.message) ? "not_found" : /forbidden/.test(e.message) ? "no_access" : "network"); }
  }, [gid, tokens]);

  useEffect(() => {
    if (!tokens) return; load();
    let timer; const tick = () => { timer = setTimeout(async () => { if (!document.hidden) await load(); tick(); }, fast.current ? 1500 : 6000); };
    tick(); const vis = () => { if (!document.hidden) load(); }; document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", vis); };
  }, [tokens, load]);

  return { state, error, tokens, reload: load, setFast: v => (fast.current = v) };
}
