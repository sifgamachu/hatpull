export const POLL_BASE = 10000;
export const POLL_MAX = 60000;
// An organizer starts a live draw 30 seconds ahead. Waiting members must hear
// about it before that deadline even after a long idle period.
export const pollCeiling = state => state?.group?.mode === "draw" && state.me && !state.me.drawn ? 15000 : POLL_MAX;

export const pollDelay = (delay, random = Math.random) => Math.round(delay * (0.85 + random() * 0.3));

// A refresh after a write must run AFTER any older request, not reuse its stale result.
export function createGroupLoader(fetchState, onState, onUnchanged = () => {}) {
  let version = null, pending = null, followup = null, active = true;
  function load(force = false) {
    if (!active) return Promise.resolve();
    if (pending) {
      if (!force) return pending;
      // Coalesce a burst of writes, while keeping a refresh AFTER the older read.
      if (!followup) followup = pending.catch(() => {}).then(() => {
        followup = null;
        return load(true);
      });
      return followup;
    }
    pending = (async () => {
      const result = await fetchState(force ? null : version);
      if (!active) return;
      version = result.version;
      if (result.state) onState(result.state);
      else onUnchanged();
      return result.state;
    })().finally(() => { pending = null; });
    return pending;
  }
  return { load, dispose() { active = false; } };
}
