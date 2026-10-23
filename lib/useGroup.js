"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "./db";
import { useUser } from "./auth";
import { getG, setG } from "./store";
import { normState } from "./core";
import { createGroupLoader, POLL_BASE, POLL_MAX, pollDelay, pollCeiling } from "./group-sync.mjs";

export function useGroup(gid, profileId = null) {
  const user = useUser(), identity = user?.id || null;
  const [snapshot, setSnapshot] = useState(null), [error, setError] = useState(null), [tokens, setTokens] = useState(null);
  const state = snapshot?.identity === identity && snapshot?.gid === gid ? snapshot.value : null;
  const loader = useRef(null);
  useEffect(() => {
    const u = new URL(location.href), t = u.searchParams.get("t"), a = u.searchParams.get("a");
    if (t || a) { setG(gid, { ...(t ? { mtok: t } : {}), ...(a ? { atok: a } : {}) }); u.searchParams.delete("t"); u.searchParams.delete("a"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    const refreshTokens = () => {
      const g = getG(gid), next = { gid, mtok: g?.mtok || null, atok: g?.atok || null };
      setTokens(previous => previous?.gid === gid && previous?.mtok === next.mtok && previous?.atok === next.atok ? previous : next);
    };
    refreshTokens();
    window.addEventListener("hatpull:groups", refreshTokens); window.addEventListener("storage", refreshTokens);
    return () => { window.removeEventListener("hatpull:groups", refreshTokens); window.removeEventListener("storage", refreshTokens); };
  }, [gid]);

  useEffect(() => {
    if (!tokens || tokens.gid !== gid || user === undefined) return;
    setSnapshot(null); setError(null);
    let active = true, timer, delay = POLL_BASE, ceiling = POLL_MAX, lastWake = 0;
    const args = { p_gid: gid, p_mtok: tokens.mtok, p_atok: tokens.atok, p_profile: profileId };
    const current = createGroupLoader(version => rpc("hp_state_delta", { ...args, p_version: version }), s => {
      delay = POLL_BASE;
      ceiling = pollCeiling(s);
      s = normState(s); setSnapshot({ value: s, identity, gid }); setError(null);
      setG(gid, { name: s.group.name, date: s.group.date, occasion: s.group.occasion, ...(s.me ? { mid: s.me.id, myName: s.me.name } : {}) });
    }, () => { delay = Math.min(ceiling, delay * 1.6); setError(null); });
    async function load(force = false) {
      try { return await current.load(force); }
      catch (e) {
        if (!active) return;
        const organizerError = ["organizer_sign_in_required", "organizer_claim_required", "not_group_owner", "organizer_unavailable"].find(k => e.message.includes(k));
        const kind = organizerError || (/not_found/.test(e.message) ? "not_found" : /forbidden/.test(e.message) ? "no_access" : "network");
        delay = Math.min(POLL_MAX, delay * 2); setError(kind);
        if (kind !== "network") setSnapshot(null);
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
    load(true).finally(schedule);
    document.addEventListener("visibilitychange", wake); window.addEventListener("focus", wake);
    return () => { active = false; current.dispose(); clearTimeout(timer); loader.current = null; document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); };
  }, [gid, profileId, tokens, identity, user === undefined]);
  const reload = useCallback(() => loader.current?.(true), []);
  return { state, error, tokens, reload };
}
