# Hatpull capacity verification — 30 October 2026

**100,000 simultaneous end-to-end users: NOT VERIFIED. The current Micro environment failed the progressive load test before that level.**

## Changes prepared and verified

- Bounded FIFO queue for up to 48 waiting cold catalog searches, with three upstream calls active per instance and an eight-second queue deadline. Previously, excess simultaneous cold searches immediately failed.
- Cache hits and requests sharing an in-flight search no longer consume the office IP cold-search allowance. Cold requests retain a fixed-window limit and truthful Retry-After values. One short, jittered browser retry is allowed; exhausted provider quotas are not repeatedly retried.
- A compact, token-checked `hp_reveal` RPC replaces reveal followed by an immediate full roster download. The expected draw round is checked under the member lock. Sixteen private revision counters avoid the shared group-row write on ordinary reveals, while existing clients still invalidate their polling version.
- The dashboard immediately displays the confirmed recipient, unlocks that recipient's link, and advances the next-step prompt. A confirmation from another member, token, group, recipient or round is ignored.

These improvements are not a distributed retailer quota manager or a guarantee of infrastructure capacity.

## Evidence

99 automated tests passed. The Next.js production build passed. A production-mode local browser connected only to the isolated test database successfully revealed a fictional participant's name and opened the correct recipient's wishlist. Strict CSP was retained; development-mode React refresh was incompatible with that CSP, so the browser check used a production build.

Hosted database: isolated project `xsawkjdsxvoppmcqphos`, branch `codex-capacity-100k-20261029`, Micro (1 GB RAM, 60 DB connections). 100 synthetic groups and 20,000 fictional participants; 200 members per group with three wishes each. No real emails or store purchases. Test creation was authorized explicitly. Production groups were never used as load fixtures.

| Scenario | Virtual participants | p95 journey | HTTP result |
|---|---:|---:|---|
| Legacy reveal + immediate full state | 1,000 | 6,096 ms | 2,000 / 2,000 successful |
| Compact reveal | 1,000 | 1,450 ms | 1,000 / 1,000 successful |
| Compact reveal | 2,000 | 1,994 ms | 2,000 / 2,000 successful |
| Compact reveal | 5,000 | Failed | 4,356 HTTP successes; 644 fetch/connection errors |
| Preference → gift save → reveal → recipient list | 500 | 942 ms | 2,500 / 2,500 successful |
| Same mixed journey | 1,000 | 9,179 ms | 5,000 / 5,000 successful |
| Same mixed journey | 2,000 | 26,526 ms | 10,000 / 10,000 successful, latency failure |

Reveal starts were spread across one second. Mixed-journey starts were spread over ten seconds, with a 250–500 ms pause before adding a gift. Peak in-flight HTTP requests and load-generator memory/event-loop lag are recorded in the JSON files. These are HTTP virtual participants, not 100,000 browser engines. The 1,000-user compact-reveal run had 662 ms generator p99 event-loop lag; do not extrapolate linearly. The source of the 5,000-user fetch errors was not isolated to database versus network/load generator. The ramp stopped on failure; no 100,000-user production blast was attempted.

The legacy/new comparison used the same new database migration. At 1,000 reveals, response bodies fell from about 35.9 MB across the two-call journey to 133 KB for acknowledgements. Later normal polls still occur; this is not a claim that all roster traffic disappears.

Local catalog adapter tests (simulated retailer, not live eBay): 50 different cold searches completed with at most three provider calls active; 200 concurrent requests from one office IP for the same query all succeeded with one provider request. These tests do not prove live retailer quota capacity.

Raw results: [hosted-reveal.json](hosted-reveal.json), [hosted-journey.json](hosted-journey.json). Runner: `scripts/load-capacity-journey.mjs`, deliberately restricted to the authorized staging project. It needs a local publishable-key connection file at `/private/tmp/hatpull-capacity-connection.json`; credentials are not committed. Reruns require resetting only fictional fixture state and must never target production. An initial discarded runner incorrectly parsed empty HTTP 204 responses as JSON; the corrected recorded run handles them properly.

## Production database verification

`reveal_capacity` was applied successfully. An anonymous-role, rolled-back four-person fixture verified recipient receipt, poll invalidation, wrong-token rejection and stale-round rejection. Both existing-data checksums remained identical: 6 groups and 27 members. No group, member, wish or database was deleted. The private revision table is not readable by the anonymous role. Security advisors show the existing token-guarded SECURITY DEFINER and no-policy RLS advisories, plus the pre-existing leaked-password-protection warning; no public table-read access was added.

## Remaining gates for the 100,000-user target

1. **Production-equivalent staging and measured compute sizing.** Production is Micro, one primary, no replicas. Current mixed-journey latency already fails at 2,000 scheduled participants. Measure higher compute with the same workloads, then reduce authenticated roster refresh work and write contention where the new measurements justify it. Do not infer a guaranteed user capacity from CPU or connection counts.
2. **Distributed load generators.** Multiple independent generators and network locations must maintain 100,000 active sessions for at least 30 minutes, followed by burst and recovery tests. Include a control target to detect generator/network saturation. Ramp through 1k, 5k, 10k, 25k, 50k and 100k, stopping on errors or latency thresholds. A single laptop test is insufficient.
3. **A–Z coverage.** Cover organizer sign-in, create, invitation/claim, personal details, store selection/search/pagination/detail, add/edit/remove wishes, redraw/reveal, recipient access, reservation and persistence after refresh. Mix realistic 5/10/20-person groups and the 200-person maximum. Test older open clients, shared office IPs and mobile clients. Authentication fixture tokens do not count as testing new logins.
4. **Sign-in and email quotas.** Production UI confirmed 300 sign-in requests and 300 verification requests per five minutes per IP, 600 token refreshes per five minutes per IP, and a 60-second per-address email interval. The previous email/hour value was 500; the current UI redacted that field, so reconfirm it before planning a launch. Participant private links can avoid sign-in, but organizers cannot. Do not disable abuse protection or send 100,000 real test emails. Provider capacity and controlled delivery tests are separate gates.
5. **Retailer limits and shared cache.** Current cache/admission controls are per Vercel instance plus public CDN caching. Distinct searches across many instances still need a shared, provider-compliant cache and global quota accounting. Verify the actual eBay application allowance and request growth approval if needed. Amazon is an outbound store link until product API access is approved. Stubbed retailer tests must be labelled as such.
6. **Vercel burst capacity and cost controls.** The project is Pro with Fluid Compute and iad1. Vercel documents 30,000 concurrent function instances for Pro and a 1,000-per-ten-second regional burst scaling rate; those are function limits, not simultaneous website-user limits. Do not buy Enterprise solely because the desired user count is 100,000. Verify function error rate, queue time, cache hit rate and spend during a distributed test.
7. **Acceptance gates.** At full load: under 0.1% unexpected HTTP errors; p95 ordinary reads/writes under two seconds; p95 full journey under ten seconds excluding deliberate think time and external checkout; no lost/duplicate wishes, cross-person data leaks, deadlocks or incorrect draw assignments; recovery within two minutes after a burst. Monitor CPU, connections, locks, provider quota and delivery backlog. No launch guarantee until these gates pass.

## Spending and retained environment

The isolated branch is retained; no deletion has been authorized in this capacity task. Micro compute is approximately $0.01344/hour before tax, subject to the account's actual billing. A separate approval request is pending for at most two hours of 4XL test compute at $1.32/hour (whole billing hours), capped at $5 extra compute charges, followed by restoring Micro. It is not a production upgrade or a 100k certification. The proposed upgrade has not been confirmed.

References checked 30 October 2026: [Supabase compute billing](https://supabase.com/docs/guides/platform/manage-your-usage/compute), [Supabase pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [Vercel concurrency scaling](https://vercel.com/docs/functions/concurrency-scaling).
