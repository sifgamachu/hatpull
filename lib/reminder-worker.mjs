// Dependencies are injected so failure/retry behavior can be tested without sending mail.
export async function runReminders({ rpc, prepare, send, runId, now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)), budgetMs = 240000 }) {
  if (!await rpc("hp_reminder_start", { p_run: runId })) return { busy: true };
  const started = now(), out = { enqueued: 0, sent: 0, retried: 0, failed: 0, cancelled: 0 };
  try {
    out.enqueued = await rpc("hp_reminder_enqueue", {});
    for (let i = 0; i < 500 && now() - started < budgetMs; i++) {
      const job = await rpc("hp_reminder_claim", { p_run: runId });
      if (!job) break;
      const args = { p_job: job.job_id, p_run: runId };
      try {
        const payload = await rpc("hp_reminder_prepare", { ...args, p_payload: job.payload || prepare(job) });
        if (!payload) { await rpc("hp_reminder_finish", { ...args, p_status: "cancelled" }); out.cancelled++; continue; }
        await send(payload, `hatpull-reminder/${job.job_id}`);
        if (!await rpc("hp_reminder_finish", { ...args, p_status: "sent" })) throw new Error("completion_not_recorded");
        out.sent++;
      } catch (e) {
        // 401/403 means our key is wrong or revoked: keep the reminder queued and stop, don't drop it.
        const auth = e.status === 401 || e.status === 403;
        const retry = !e.status || auth || e.status === 429 || e.status >= 500;
        await rpc("hp_reminder_finish", { ...args, p_status: retry ? "pending" : "failed",
          p_error: e.status ? `provider_${e.status}` : "temporary_failure",
          p_retry_seconds: auth ? 1800 : Math.max(e.retryAfter || 0, Math.min(3600, 30 * 2 ** Math.min(job.attempts, 6))) });
        if (auth) console.error("reminders: email provider rejected the API key (", e.status, "); reminders paused until it is fixed");
        out[retry ? "retried" : "failed"]++;
        if (e.status === 429 || e.status === 401 || e.status === 403) break;
      }
      await sleep(500); // <=2 requests/s leaves room for sign-in emails and other apps.
    }
    return out;
  } finally {
    await rpc("hp_reminder_stop", { p_run: runId });
  }
}
