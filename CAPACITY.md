# Capacity changes — 2026-10-22

## Changes

- Group dashboards request member summaries rather than every person's full wishlist. A wishlist page fetches only its selected profile. The existing token checks, private wishlist/address rules, and hidden gift reservations remain enforced in SQL.
- A monotonically increasing group revision makes an unchanged poll return just a revision. Group, member, message, question and reservation writes invalidate it. Authorization is checked even when the revision matches.
- Requests are serialized and deduplicated; refreshes after writes wait for older requests and then fetch fresh state. Polling starts at 10 seconds, adds ±15% jitter, pauses in hidden tabs, and backs off to 60 seconds while unchanged. Members waiting to draw stay within 15 seconds before jitter so they receive a 30-second live-draw countdown. Countdown animation uses the browser clock, without 1.5-second database polling.
- Questions load in stable pages of 50 with a timestamp/ID cursor. Dashboard question badges use an aggregate count.
- Signed-in creators receive a rate-limit allowance tied to a server-verified account, instead of sharing their entire office's IP allowance. Anonymous limits remain 20/10 minutes per server and 30/hour across servers; the 600-new-groups/minute database breaker remains. The account allowance has the same numbers. This is abuse protection, not a throughput guarantee.
- Supabase office auth limits were explicitly authorized, saved, and verified: email requests 300/5 minutes/IP, code verifications 300/5 minutes/IP, token requests 600/5 minutes/IP. The project-wide 500 auth emails/hour limit and 60-second per-address cooldown remain. Sign-in screens explain rate limits and offer a manual retry countdown.
- Reminders use a private durable database queue. A single leased worker claims jobs, freezes the exact provider request, sends with a stable idempotency key, and atomically records success. Temporary failures retry with backoff; consent and suppression are rechecked. Each run has a 240-second work budget, a 300-second Vercel deadline, bounded database/provider requests, and a 500 ms pause between sends. Jobs resume after a crashed worker's lease expires.
- Vercel invokes the reminder worker every five minutes. Due week/tomorrow reminders are discovered from 15:00 UTC through that day, in batches of 500. Unsent jobs expire at UTC midnight, so an outdated “tomorrow” message is not sent later. A 23-hour retry ceiling also stays within Resend's 24-hour idempotency window. Email bodies are cleared after terminal status; deleting the account or group cascades to its jobs.

## Evidence and limits

Tests used a disposable hosted Supabase Micro branch (1 GB, 60 database connections), with five synthetic 200-person groups, 40 long wishlist items per member, and no production data or email sends. The load generator ran on one client machine; these are short workload checks, not a measured maximum or long-duration service guarantee. HTTP timings include that client's network path. Group IDs and tokens in test scripts are synthetic and the scripts refuse the production project.

| Scenario | Simulated people | Requests | Errors | 95th percentile |
|---|---:|---:|---:|---:|
| Browse/poll, 45 seconds | 100 | 300 | 0 | 198 ms |
| Browse/poll, 45 seconds | 200 | 600 | 0 | 178 ms |
| Browse/poll, 45 seconds | 500 | 1,502 | 0 | 154 ms |
| Browse/poll, 45 seconds | 1,000 | 3,000 | 0 | 252 ms |
| Wait for draw, 10–15s polling, 45 seconds | 1,000 | 3,489 | 0 | 277 ms |
| Reveal + full refresh, starts over 1 second | 200 | 400 | 0 | 1,932 ms per person |
| Reveal + full refresh, starts over 1 second | 1,000 | 2,000 | 0 | 6,261 ms per person |

The waiting test included a synthetic profile save, invalidating one group's revision and producing 200 additional full summaries. Raw results are in `capacity-load-results.json`, `capacity-waiting-results.json`, and `capacity-reveal-results.json`.

In the local rich-profile fixture, the old response was about 1.95 MB, a dashboard summary about 30 KB (roughly 98.5% less), and an unchanged response 17 bytes. These are uncompressed JSON sizes for that fixture, not typical production traffic estimates.

`npm test` covers SQL authorization and privacy, invalidation, keyset pagination, queue leases, frozen payloads, retries, consent, account deletion, request deduplication, cancellation and timeout behavior. A production-mode local browser check loaded a 200-person dashboard and saved/reloaded a selected wishlist. `npx next build` must pass before pushing.

The next capacity constraints are bursts of writes contending on the same group revision, the Micro database's shared CPU/connections, auth email limits, and shared provider quotas. The 1,000-person reveal test shows materially slower responses than the 200-person test. No compute or subscription upgrade was made. Initial group creation still allows up to 200 participants plus up to 50 child profiles. Static name-picker use happens in the browser and is a different workload.

For a large announced event, test its expected mix and duration in staging and observe database CPU, connection saturation, request errors, Vercel runtime, email queue age and provider quotas. Do not extrapolate the short 1,000-person check into an unlimited-user claim. Reminders are paced below 2 sends/second, with practical throughput lower because of network/database time and worker breaks; the 15:00–24:00 UTC delivery window is finite.

## Deployment and recovery

1. Apply `supabase/migrations/20261022224111_capacity_polling_and_reminders.sql` before deploying the new client. It is additive; old `hp_state` clients remain supported. Do not rerun this migration after it has been recorded as applied.
2. For a fresh database, load `supabase/schema.sql` first, then `supabase/migrations/` in order. Legacy migrations outside that directory are already included in `schema.sql`.
3. Run `npm test` and `npx next build`; push `main`; verify Vercel Ready, both health routes, group creation, selected wishlist save/refresh, and an authenticated cron invocation.
4. Inspect queue status counts and oldest pending job without printing recipients or payloads. `last_error` contains only bounded error categories. An abandoned job can be reclaimed once its lease expires. Failed expired jobs should be reviewed; do not blindly requeue previously sent/ambiguous jobs after the provider's idempotency window.
5. If the new UI needs rollback, redeploy the previous application revision. Leave the additive migration in place: old RPCs still work. If reminders need to be paused, pause cron first. Do not run the legacy sender while new jobs are in flight; wait for the worker lease to expire, reconcile ambiguous deliveries, and only then resume an older sender. Both versions record confirmed deliveries in `hp_email_log`.
6. The temporary `codex-capacity-test` branch must be deleted after verification to avoid ongoing branch costs. Reproduction requires a new disposable branch and explicitly updating the test scripts' project guard. Never point them at production.

Provider reference: [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
