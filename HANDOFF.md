# Hatpull — handoff: finish sign-in, emails and lock-down

Written 2026-10-21. Read this whole file before changing anything. **Never commit or print secret values.**

## Cart-style gift list — 2026-10-24

Gift Finder now has a persistent Your gift list button with saved-item count, an inline side panel, automatic add confirmations, size/color/notes editing, and Remove with Undo. Closing the panel preserves the active search. Private list data remains component memory only and is cleared when the account or participant changes. Product photos reuse unexpired public catalog data; the panel never stores catalog titles/prices in the database.

Apply `supabase/migrations/20261024181207_gift_list_cart_actions.sql` before deploying this UI. `hp_change_wish` serializes edits/removal/undo on the same participant row as quick additions, preserving unrelated wishes and profile fields. Its anonymous execute grant is intentional for guest participants: `hp_me` and the owner/child check enforce the same private-token permissions as `hp_add_wish`. It returns only the editable participant’s items, never reservations or other profile fields. No table grants or authentication settings change.

## eBay catalog service — 2026-10-24

Server-only `/api/gifts/ebay` supports US new fixed-price product search and single-item details using the basic Browse API scope. `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_CAMPAIGN_ID`, and `EBAY_NOTIFICATION_TOKEN` belong only in Hatpull's Vercel Production environment. Prices/images expire after ten minutes; bounded per-instance caching and concurrency limits protect provider quota. Public eBay results additionally use a five-minute maximum edge cache bounded by original expiry, plus a bounded memory-only client cache. Retailer tabs preserve search state; only public catalog responses are cached. No buyer/seller identity fields are retained. Wishlist records use canonical product references and participant-authored preferences.

The production keyset is activated: eBay verified `https://secretsantageneratorapp.com/api/ebay/notifications` and its test notification succeeded. A real $25 search returned 24 products, photos and Hatpull affiliate links; single-item lookup also passed. The callback acknowledges without persisting/logging the payload because the integration never stores eBay user identity data. If adding identity data later, implement signature validation and deletion processing before collecting it. The eBay/Amazon store selector uses the existing `hp_add_wish` flow; eBay item and variation links are refreshed for the wish owner and authorized gift-giver. No database migration is needed. See `GIFT_CATALOG.md` for limits and rollback.

## Shopping partner verification — 2026-10-23

The root layout includes Impact's public site-verification meta tag for the owner's Target affiliate application. This proves website ownership only; it does not mean Target has approved the application or granted product-feed access. No tracking script or retailer API credential is included.

## Amazon list setup — 2026-10-23

Gift Finder and the participant editor now lead with one-time Amazon wish-list linking. Save a view-only sharing link once, keep selecting gifts on Amazon, and let the gift-giver open that same list from Hatpull. This reuses `hp_add_wish`; no new migration, privilege or Amazon credential is needed. The dedicated card opens Amazon and does not imply catalog import, budget enforcement or purchase tracking. Individual gifts remain available. See `GIFT_CATALOG.md` and the URL/privacy regression tests.

## Easier gift saving — 2026-10-23

Gift Finder now uses the selected celebration’s current budget. Participants can paste and save a product link without a required name or price; size/color remain optional. Compatible installed browsers can share a product directly to Hatpull and confirm Save. See `GIFT_CATALOG.md` for behavior, limits and verification. Apply the additive `20261023182707_quick_wish_append.sql` migration before the corresponding app deployment. It deliberately retains private-token access for guest participants while restricting additions to their own or their child’s list.

## Organizer account rollout — 2026-10-23

Organizers must sign in with Google or email before creating a celebration. The wizard preserves setup through sign-in. Participants still join by invitation without mandatory accounts. Existing owned groups require their owning account; an older unowned group can be connected once using its original private organizer link plus a verified account. Claiming rotates the old organizer key. New organizer links contain no access token.

Rollout order (do not reverse):
1. Apply `supabase/migrations/20261023172343_prepare_organizer_accounts.sql` to Hatpul. It adds ownership history and service-only account-verified creation/redraw entry points without interrupting the previous app.
2. Run `npm test` and `npx next build`, deploy the new app, and wait for Vercel Ready.
3. Apply `supabase/migrations/20261023172349_enforce_organizer_accounts.sql`. It enforces owner identity on organizer reads/actions, enables explicit legacy claiming, and revokes the previous anonymous/token-only server entry points.
4. Verify live signed-out create/redraw return 401, signed-in creation saves the owner, management works for the owner, old organizer keys do not grant signed-out management, and guest invitations still work. Check security advisors against the baseline.

Account deletion removes organizer access but preserves shared celebrations for participants. `owner_claimed_at` prevents an old key from claiming a deleted owner's group. Delete the celebration first if its shared data should be removed. Do not restore old token-only grants as a rollback; keep the ownership enforcement and fix the app forward.

Validation: 27 automated tests pass, including database role permissions, wrong-account access, legacy claims, deleted owners, guest participation, wishlist privacy, and reminder/capacity regressions. The production build passes. Browser checks confirm the sign-in gate and setup recovery after reload and in a new tab. The historical setup and prior rollback notes below predate this ownership requirement.

## What Hatpull is
Free Secret Santa / gift-exchange site (drawnames.com alternative), a Teregna LLC product.
- Live: https://secretsantageneratorapp.com (main) · https://onlinenamepickertool.com (name picker) · drawnamesonlinetool.com 301-redirects
- Repo: https://github.com/sifgamachu/hatpull (branch `main`; every push auto-deploys to production on Vercel)
- Stack: Next.js 15.5.28 App Router, React 19.3.1 + supabase-js 2.118.0. All database access is through `SECURITY DEFINER` RPCs (`hp_*`), tables have RLS on and no grants.

## Dashboards
| What | Link |
|---|---|
| Vercel project | https://vercel.com/sifgamachu-4154s-projects/hatpull |
| Vercel env vars | https://vercel.com/sifgamachu-4154s-projects/hatpull/settings/environment-variables |
| Supabase project ("Hatpul", ref `rkpglmwjpwbrxbluvsqm`) | https://supabase.com/dashboard/project/rkpglmwjpwbrxbluvsqm |
| Supabase SQL editor | https://supabase.com/dashboard/project/rkpglmwjpwbrxbluvsqm/sql/new |
| Supabase auth providers | https://supabase.com/dashboard/project/rkpglmwjpwbrxbluvsqm/auth/providers |
| Supabase API keys | https://supabase.com/dashboard/project/rkpglmwjpwbrxbluvsqm/settings/api-keys |
| Google Cloud project `hatpull` (OAuth) | https://console.cloud.google.com/auth/clients?project=hatpull |
| Resend (Pro) domain | https://resend.com/domains (send.secretsantageneratorapp.com — verified) |
| Resend API keys | https://resend.com/api-keys |
| Health check (shows which server settings are present, never values) | https://secretsantageneratorapp.com/api/health |

Careful: the Teregna Supabase org and the Vercel team hold ~10 other projects (teregna-queue, VidShook, etc.). Make sure you are in **hatpull** (Vercel) / **Hatpul** (Supabase).

## Done already
- Accounts migration applied to production (`supabase/migrations_2026-10-21d_accounts.sql` + grant fix `..._21e_account_grants.sql`). Verified: anon cannot call `hp_my`, `hp_due_reminders`, `hp_log_sent`, account functions are signed-in only.
- Supabase Auth: Site URL + redirect URLs set for both domains and Vercel previews; magic-link and confirm-signup templates include `{{ .Token }}` (6-digit code); custom SMTP via Resend saved (smtp.resend.com:465, user `resend`, sender `reminders@send.secretsantageneratorapp.com`); email rate limit raised to 500/h.
- Resend: Pro plan, `send.secretsantageneratorapp.com` verified (DKIM + SPF via Cloudflare).
- Google Auth Platform (project `hatpull`): branding (Hatpull, privacy/terms links, both domains authorized), scopes openid/email/profile, **published to production**, Web client "Hatpull web" with JS origins for both domains (+www) and redirect `https://rkpglmwjpwbrxbluvsqm.supabase.co/auth/v1/callback`.
  - Client ID (public): `615204645499-mm7lndspv5bc2s7k09e86utdjq1vb7j3.apps.googleusercontent.com`
- Site: email sign-in is ON (`lib/auth.js` → `EMAIL_SIGNIN` defaults on). Google button is ON via `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel Production.
- Legal name "Teregna LLC" in `lib/core.js`. Privacy/terms rewritten.

## Completed setup — reference steps (verified 2026-10-22 UTC)

### 1. Vercel environment variables (owner pastes values; Production)
At the env-vars link above, add for **Production** (and Preview if wanted):
- `SUPABASE_SECRET_KEY` — Supabase API keys page → Secret key (`sb_secret_…`)
- `RESEND_API_KEY` — Resend API keys → create, Sending access, domain send.secretsantageneratorapp.com
- `CRON_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — `615204645499-mm7lndspv5bc2s7k09e86utdjq1vb7j3.apps.googleusercontent.com` (only after step 2 works)

Then redeploy (push any commit, or Vercel → Deployments → Redeploy). **Verify:** `curl -s https://secretsantageneratorapp.com/api/health` → `"serverKey":true,"email":true,"cron":true`.
If it still says false: the vars were added to another project or only to Preview/Development.

### 2. Google provider in Supabase
Auth providers → Google: Enable ON, Client IDs = the client ID above, Client Secret = `GOCSPX-…` (from Google Cloud → Clients → Hatpull web; add a new secret if lost), Skip nonce checks OFF → **Save** (button at bottom of the panel). Row must show **Enabled**.
Watch for browser autofill: an old "teregna-queue" value was autofilled into these fields once — clear it.

### 3. Lock group creation to the server (only after `serverKey:true`)
Run `supabase/lock_create_to_server.sql` in the Supabase SQL editor. **Verify:**
- Creating a group on the live site still works (`POST /api/create` returns `id`, `join_code`, `admin_token`).
- Direct anon call fails:
  ```
  curl -s -X POST https://rkpglmwjpwbrxbluvsqm.supabase.co/rest/v1/rpc/hp_create_group \
    -H "apikey: sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj" -H "content-type: application/json" -d '{"p":{}}'
  ```
  → 401/permission denied.
- Delete any test group: `delete from public.hp_groups where name like 'QA %';`
If creation breaks, roll back immediately with `grant execute on function public.hp_create_group(jsonb), public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb) to anon, authenticated;`.
Append the lock SQL to `supabase/schema.sql` once applied.

### 4. Switch on the Google button
Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel (step 1) and redeploy. Test: Header → Sign in → "Continue with Google" popup shows "Hatpull" → signed in → Account page loads; `/account` shows email prefs; "Download my data" works.

### 5. Test reminders
- Sign in with email (link + 6-digit code arrive from reminders@send.secretsantageneratorapp.com).
- Create a group dated 7 days out, claim a name while signed in, then:
  `curl -s -H "Authorization: Bearer $CRON_SECRET" https://secretsantageneratorapp.com/api/cron/reminders` → `{"enqueued":1,"sent":1,...}` (on or after 15:00 UTC).
- Cron schedule is in `vercel.json` (every five minutes). Due reminders enter a durable queue from 15:00 UTC onward; retries continue through that UTC day. Response counts are `enqueued`, `sent`, `retried`, `failed`, and `cancelled` (or `busy`). See `CAPACITY.md` for recovery and limits.

### 6. Optional / owner items
- DMARC: Cloudflare TXT `_dmarc.secretsantageneratorapp.com` = `v=DMARC1; p=none;`.
- Mailing address for email footers: set `NEXT_PUBLIC_MAILING_ADDRESS` in Vercel (required before any marketing email).
- Resend account shows bot sign-ups ("Confirm your email address" to junk addresses, 1 complaint) from another app using this Resend account (elroicall/vidshook/scriptpin) — add bot protection there; complaints hurt Hatpull's deliverability too.
- Supabase org has spend cap ON; scheduled reminders exist to upgrade compute Dec 1 and downgrade Jan 5.

## Verification completed 2026-10-22 UTC
- Production health: `ok`, `serverKey`, `email`, and `cron` all true.
- Google provider enabled with nonce checks retained; live Google sign-in, account preferences, and JSON account export passed. Google consent displays the website domain rather than the Hatpull brand name. The previous Google client secret was left enabled.
- Creation/redraw grants locked to `service_role`; live website creation passed and anonymous direct creation returned 401/permission denied. Lock SQL appended to `schema.sql`.
- Resend keys are sending-only and restricted to `send.secretsantageneratorapp.com`: `Hatpull Production` for Vercel and `Hatpull Supabase SMTP` for Supabase SMTP. No secret values are stored here.
- Repaired Supabase SMTP authentication. After settings propagated, the owner test email was delivered and code sign-in succeeded. Supabase currently sends eight-digit codes; the UI now says “one-time code” and accepts up to eight digits.
- Created an isolated QA celebration seven days ahead using the database UTC date. Vercel Cron Jobs Run delivered one week reminder to the owner; the database recorded one send, zero remained due, and a second run did not add a duplicate.
- Signed-in creation now syncs the new celebration to the account immediately, rather than waiting for an Account-page visit.
- Optional owner items above remain separate. Supabase currently displays an organization billing grace-period warning; review billing to avoid quota-related interruption.

## Local dev
Capacity changes, hosted load-test evidence, remaining limits and rollback instructions are in `CAPACITY.md`. For a fresh database, apply `supabase/schema.sql` followed by files in `supabase/migrations/` in filename order. The legacy dated SQL files outside that directory are already incorporated into `schema.sql`.

Office sign-in limits saved and verified on 2026-10-22: email requests and code verifications 300 per five minutes per IP, token requests 600 per five minutes per IP. The 500 auth emails/hour project cap and 60-second per-address email cooldown remain in place.

Work/school access improvements, validation commands and incomplete vendor classification checks are documented in `NETWORK_ACCESS.md`. Public IT help is at `/network-access` on either domain.

```
npm install
NEXT_PUBLIC_SUPABASE_URL=https://rkpglmwjpwbrxbluvsqm.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj npm run dev
npx next build   # must pass before pushing
```
Key files: `lib/auth.js` (sign-in), `lib/email.js` + `app/api/cron/reminders` (reminders), `lib/serverDb.js` (secret-key client), `app/api/create` (creation), `middleware.js` (domain routing), `supabase/` (SQL). Commit small, push to `main`, confirm the Vercel deploy is READY, then verify live.
