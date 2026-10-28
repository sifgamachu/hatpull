// One write at a time: a slow earlier selection must never overwrite a newer one.
// Only explicitly changed fields are sent, so unrelated profile data stays intact.
export function createProfileSaveQueue({ save, onStatus, onSaved }) {
  let pending = {}, running = false, disposed = false, waiters = [];
  const status = value => { if (!disposed) onStatus?.(value); };
  async function drain() {
    if (running || !Object.keys(pending).length) return;
    running = true; status('saving');
    let success = false;
    try {
      while (Object.keys(pending).length) {
        const patch = pending; pending = {};
        try { await save(patch); }
        catch { pending = { ...patch, ...pending }; status('error'); return; }
      }
      success = true; status('saved');
      if (!disposed) onSaved?.();
    } finally {
      running = false;
      const finished = waiters; waiters = [];
      finished.forEach(resolve=>resolve(success));
    }
  }
  return {
    change(patch) { pending = { ...pending, ...patch }; status('saving'); void drain(); },
    retry() { void drain(); },
    // Continue waits for every queued choice, including an age committed on blur.
    flush() {
      if (!running && !Object.keys(pending).length) return Promise.resolve(true);
      return new Promise(resolve=>{waiters.push(resolve);void drain();});
    },
    // Submitted edits finish even if the page unmounts; callbacks no longer run.
    dispose() { disposed = true; },
  };
}
