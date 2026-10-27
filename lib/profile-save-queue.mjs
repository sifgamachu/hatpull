// One write at a time: a slow earlier selection must never overwrite a newer one.
// Only explicitly changed fields are sent, so unrelated profile data stays intact.
export function createProfileSaveQueue({ save, onStatus, onSaved }) {
  let pending = {}, running = false, disposed = false;
  const status = value => { if (!disposed) onStatus?.(value); };
  async function drain() {
    if (running || !Object.keys(pending).length) return;
    running = true; status('saving');
    try {
      while (Object.keys(pending).length) {
        const patch = pending; pending = {};
        try { await save(patch); }
        catch { pending = { ...patch, ...pending }; status('error'); return; }
      }
      status('saved');
      if (!disposed) onSaved?.();
    } finally { running = false; }
  }
  return {
    change(patch) { pending = { ...pending, ...patch }; status('saving'); void drain(); },
    retry() { void drain(); },
    // Submitted edits finish even if the page unmounts; callbacks no longer run.
    dispose() { disposed = true; },
  };
}
