"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc, sb } from "./db";
import { getG, setG } from "./store";
import { normState } from "./core";
import { createGroupLoader, POLL_BASE, POLL_MAX, pollDelay, pollCeiling } from "./group-sync.mjs";

export function useGroup(gid, profileId = null) {
  const [state, setState] = useState(null), [error, setError] = useState(null), [tokens, setTokens] = useState(null);
  const loader = useRef(null);
  useEffect(() => {
    const u = new URL(location.href), t = u.searchParams.get("t"), a = u.searchParams.get("a");
    if (t || a) { setG(gid, { ...(t ? { mtok: t } : {}), ...(a ? { atok: a } : {}) }); u.searchParams.delete("t"); u.searchParams.delete("a"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    const g = getG(gid);
    setTokens({ mtok: g?.mtok || null, atok: g?.atok || null });
  }, [gid]);

  useEffect(() => {
    if (!tokens) return;
    setState(null); setError(null);
    if (!tokens.mtok && !tokens.atok) { setError("no_access"); return; }
    let active = true, timer, delay = POLL_BASE, ceiling = POLL_MAX, lastWake = 0;
    const args = { p_gid: gid, p_mtok: tokens.mtok, p_atok: tokens.atok, p_profile: profileId };
    const current = createGroupLoader(version => rpc("hp_state_delta", { ...args, p_version: version }), s => {
      delay = POLL_BASE;
      ceiling = pollCeiling(s);
      s = normState(s); setState(s); setError(null);
      setG(gid, { name: s.group.name, date: s.group.date, occasion: s.group.occasion, ...(s.me ? { mid: s.me.id, myName: s.me.name } : {}) });
    }, () => { delay = Math.min(ceiling, delay * 1.6); setError(null); });
    async function load(force = false) {
      try { return await current.load(force); }
      catch (e) {
        if (!active) return;
        const kind = /not_found/.test(e.message) ? "not_found" : /forbidden/.test(e.message) ? "no_access" : "network";
        delay = Math.min(POLL_MAX, delay * 2); setError(kind);
        if (kind === "no_access" && tokens.mtok && !tokens.atok) setG(gid, { mtok: null, mid: null });
      }
    }
    loader.current = load;
    function schedule() {
      clearTimeout(timer);
      if (active) timer = setTimeout(async () => { if (!document.hidden) await load(); schedule(); }, pollDelay(delay));
    }
    function wake() {
      if (document.hidden || Date.now() - lastWake < 1500) return;
      lastWake = Date.now(); delay = POLL_BASE; clearTimeout(timer);
      load().finally(schedule);
    }
    // Account identity affects linked_to_me even when no group rows change.
    let authUid;
    const { data: auth } = sb().auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      if (authUid !== undefined && uid !== authUid) { clearTimeout(timer); setTimeout(() => { if (active) load(true).finally(schedule); }, 0); }
      authUid = uid;
    });
    load(true).finally(schedule);
    document.addEventListener("visibilitychange", wake); window.addEventListener("focus", wake);
    return () => { active = false; current.dispose(); clearTimeout(timer); loader.current = null; auth.subscription.unsubscribe(); document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); };
  }, [gid, profileId, tokens]);
  const reload = useCallback(() => loader.current?.(true), []);
  return { state, error, tokens, reload };
}
