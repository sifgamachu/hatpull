"use client";
import { useEffect, useState } from 'react';
import { useUser } from './auth';
import { allG } from './store';
import { rpc } from './db';

// Fetch current budgets and editable participants only; do not download wish-list profiles.
export function useGiftContexts() {
  const user = useUser(), identity = user === undefined ? undefined : user?.id || null;
  const [snapshot, setSnapshot] = useState(null), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (identity === undefined) return;
    let active = true, generation = 0, signature = '';
    async function load(force = false) {
      const groups = allG().filter(g => g.mtok);
      const next = JSON.stringify(groups.map(g => [g.gid, g.mtok]).sort());
      if (!force && signature === next) return;
      signature = next;
      const current = ++generation, contexts = []; let failures = 0, index = 0;
      setSnapshot(s => ({ identity, contexts: s?.identity === identity ? s.contexts : [], loading: true, failures: 0 }));
      await Promise.all(Array.from({ length: Math.min(4, groups.length) }, async () => {
        while (index < groups.length) {
          const g = groups[index++];
          try {
            const { state: s } = await rpc('hp_state_delta', { p_gid: g.gid, p_mtok: g.mtok, p_atok: null, p_profile: null, p_version: null });
            if (!s?.me) continue;
            for (const m of s.members) if (m.id === s.me.id || (m.kid && m.parent_id === s.me.id)) {
              contexts.push({ gid: g.gid, mid: m.id, name: s.group.name, person: m.name, budget: s.group.budget, cur: s.group.cur });
            }
          } catch (e) { if (!/forbidden|not_found/.test(e.message)) failures++; }
        }
      }));
      if (active && current === generation) setSnapshot({ identity, contexts: contexts.sort((a,b) => a.name.localeCompare(b.name) || a.person.localeCompare(b.person)), loading: false, failures });
    }
    const changed = () => load(), wake = () => { if (!document.hidden) load(true); };
    load(true); window.addEventListener('hatpull:groups', changed); window.addEventListener('storage', changed); window.addEventListener('focus', wake);
    return () => { active = false; generation++; window.removeEventListener('hatpull:groups', changed); window.removeEventListener('storage', changed); window.removeEventListener('focus', wake); };
  }, [identity, revision]);
  return { ...(snapshot && snapshot.identity === identity ? snapshot : { contexts: [], loading: true, failures: 0 }), user, retry: () => setRevision(x => x + 1) };
}
