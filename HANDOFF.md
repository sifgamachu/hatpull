# Hatpull — handoff: finish sign-in, emails and lock-down

Written 2026-10-21. Read this whole file before changing anything. **Never commit or print secret values.**

## Dedicated Gift Finder preferences page — 2026-10-27

`/gift-finder` now starts with a centered 400px preference card: exact age, gender, up to three interests, delivery country and Continue. Continue opens the separate `/gift-finder/shops` route. The shared App Router layout retains the selected celebration, browsing preferences and gift list while moving between these routes, including browser Back. The shops route has a concise preference recap and Edit preferences; the old inline interest form was removed. Product previews do not mount before the first Continue. A direct visit to the shops route is still supported and uses saved participant demographics or broad defaults. Transient browsing choices are not persisted across a full reload.

The shared store chooser's Edit preferences also uses the compact full-page card inside a wish list; saved age/gender remain handled by the existing private profile step. eBay catalog filters, gift saving, direct Amazon links, pricing caps, and the incoming share-gift page keep their existing behavior. No schema, credential or environment changes. Validation and route details: `docs/gift-preference-pages-20261027.md`.

## Compact personal-info step before stores — 2026-10-27

Empty wish lists start with a centered personal-information card capped at 400px, with exact age first, vertically stacked gender choices and Continue. Stores and catalog previews do not mount until Continue succeeds. Continue flushes the existing serialized demographic save queue, including an age committed by the click itself; failures keep the form open for retry. Invalid ages cannot advance. The shop screen provides Edit preferences to return to the card; saved choices are retained. Wish lists that already contain gifts open directly to their collection and browsing. The viewer/reservation flow is unchanged.

Gift Finder's preference dialog uses the same compact width and a single Continue action. Interests remain available in an expandable section and in the shop chooser. The festive theme and direct Amazon links remain intact. No schema, credential or environment changes. Validation: 87 tests, including Continue/save race and retry coverage; desktop and 390px mobile checks with fictional participants.

## One age box and direct Amazon browsing — 2026-10-27

The shared age control is now one editable combobox: type an exact age or open and scroll the 0–120 list in the same field. Arrow keys/Enter select, Tab/blur save completed values, and Escape cancels an edit. Invalid ages prevent shop selection; existing age groups are retained until changed. Age copy explains gift matching and no longer says “optional.” Blank ages remain supported without a schema change.

The Amazon card and the eBay header's Amazon link open Amazon.com directly in a new tab with broad recipient terms, the first selected interest and the USD budget cap. Non-USD amounts are not treated as dollars. Existing affiliate tagging/disclosure stays in place. There is no intermediate Hatpull Amazon shop. “Already have an Amazon wish list?” separately reveals the existing one-link setup on demand. Amazon API access is still required for an actual in-page Amazon catalog; no approval or imported product data is implied. The festive theme, eBay discovery and wishlist permissions remain unchanged.

## Hatpull primary domain and matching signals — 2026-10-27

hatpull.com is the primary app address. Legacy secretsantageneratorapp.com page links permanently redirect with their path/query intact; legacy APIs and verified email domains remain unchanged. Vercel/Cloudflare and Supabase/Google return URLs were configured for the new domain. Users may need to sign in again because browser storage is origin-scoped; old invitation links still recover guest access. The owner subsequently bought hatpul.com (one l); apex and www now permanently redirect through Vercel to hatpull.com. See `docs/hatpull-domain-cutover-20261027.md`.

Shop previews now share optional interest and shipping-country choices. Interests override adult gender ordering, mix across categories, and retain child age guards and the budget cap. eBay uses live Best Match listings filtered for the selected delivery country; Amazon remains illustrated matching browse links. These are explained heuristics, not a trained psychological model or verified trend feed. See `docs/gift-matching-signals-20261027.md`.

## Personalized store previews — 2026-10-27

Both shop cards now preview gifts for the saved age/gender before opening a store. eBay requests three matching product families with two-request concurrency and shows one real photo, title and current item price per family within the USD cap. The full catalog reuses those searches. Amazon shows clearly labeled original illustrated ideas without prices or stock claims, followed by six matching search links inside its shop. The live Amazon adapter still returns `not_configured`; no Amazon catalog access is implied.

All three previews remain visible on mobile. Stale responses cannot replace a newer selection, expired eBay data refreshes, and missing/broken photos fall back to labeled ideas. Clearly incompatible child age ranges in listing titles are filtered locally; unspecified ages still require checking the listing. No schema, environment or real celebration changes. Validation: 81 tests, production build and isolated desktop/mobile browser checks. See `docs/personalized-store-previews-20261027.md`.

## Type an age, then choose a store — 2026-10-27

The editable wish list now offers a typed age field alongside the scrollable 0–120 dropdown, then the available Amazon/eBay store chooser. It no longer opens the eBay catalog by default. Typed ages commit on blur or Enter through the existing profile save queue; invalid values show an error, blank remains optional, and existing age groups are preserved until edited. Gift Finder's preference dialog uses the same control.

Selecting eBay mounts personalized, budget-filtered products. Selecting Amazon first does not mount the eBay catalog; Amazon browsing links use broad age/gender terms plus the USD budget, and its shared-list setup appears inside that shop. Amazon product cards still require approved API access. Switching shops keeps the shared gift list and existing eBay searches. Store cards retain their small previews; full catalog requests begin on eBay selection. No database, credential or environment changes. Validation: 78 tests, production build and desktop/mobile browser checks with isolated fictional participants. See `docs/age-and-store-choice-20261027.md`.

## Christmas styling and photo-first product preview — 2026-10-27

The Secret Santa homepage has its Christmas look again: Santa-hat branding, evergreen/red/gold colors, lights, snowfall and wrapped-gift artwork. Setup, invitations, joining, dashboards and wish lists use the festive theme for Christmas celebrations; the finder and personal hub are festive too. The theme cleans up on navigation, leaving unrelated picker pages unchanged. Existing reduced-motion handling is retained. December 19/24/25, Other/custom date, exact ages and four-person exclusion rules remain unchanged.

Product previews now follow a vertical photo-first layout with a large contained photo, thumbnail gallery, prominent Add to wish list pill, clear retailer/price panel, description and expandable details. The current in-page catalog remains eBay; Amazon's external shared-list flow is unchanged. No fabricated Amazon products, prices, ratings or popularity counts. Existing product expiry, one-tap saves, private-list authorization and provider attribution remain intact. No database or environment changes. See `docs/christmas-product-preview-20261027.md` for validation and rollback.

## Exact ages, date choices and varied gifts — 2026-10-27

Exclusions now require four draw participants in setup, organizer editing and creation/redraw APIs. Three-person setup ignores stale draft exclusions. Secret Santa 2026 offers December 19, 24 and 25 plus Other/custom date. Exact-age dropdowns (0–120, optional) replace ranges while preserving legacy choices.

Default gift inspiration replaces “gift set men” with a varied, age-appropriate catalog mix. The Men/adult pool includes Stanley mugs, AUXITO inflators, DEERC drones, JBL speakers, SWANLAKE socket sets and DeWalt bits. Compact image cards offer one-tap heart saving. Results progressively load with two-request concurrency, shared public caches and the existing item-price cap. Stock and prices remain eBay’s, so exact DrawNames inventory is not guaranteed. Cold inspiration pages use up to six searches; monitor provider usage as traffic grows.

Migration `20261027220613_exact_wish_age.sql` is applied and verified on Hatpul with a rolled-back test. No real celebration was changed. 78 tests and the production build pass. See `docs/gift-matching-20261027.md` for verification, architecture, limitations and rollback.

## Full celebration journey — 2026-10-26

The homepage, setup wizard, invitations, participant joining, dashboard and wish lists now share one responsive design. Setup runs through organizer → people → exclusions → celebration details → review; wish-only groups skip exclusions. Review sections can be edited directly and old setup drafts migrate to the new stages. Organizer sign-in and the existing authenticated creation API remain required.

New `/wish-lists` and `/friends` hubs accompany `/my`, using a shared loader with four-request concurrency and account-change guards. Celebration navigation and next-action prompts lead to invitations, wishes or the user's own reveal as appropriate. Optional age/gender choices still populate budget-aware eBay products directly in the wish list. No database, credentials or live group data were changed for this release.

Validation: 71 tests passed and `npx next build` passed. Local browser checks used a disposable database with fictional participants: full setup, review edits, saved draft recovery, sign-in gate, invitation joining, product saving, hub counts, and 390px mobile layouts. See `docs/celebration-journey-20261026.md` for architecture, scope and rollback. This implements the core public journey; reusable standalone lists and full cross-celebration reservations remain separate future work.

## Wish list → gender/age → automatic products — 2026-10-26

The editable wish list now starts with optional gender cards and an age range, followed directly by live eBay product suggestions. Changes save automatically and refresh the catalog without a wizard, store choice or Search click. The cart-style list remains available throughout; an eBay gift still saves with one tap. Existing saved profile choices also seed the standalone Gift Finder. Amazon remains the existing external shared-list flow.

`supabase/migrations/20261027011756_wishlist_demographics.sql` was applied to Hatpul before the app deployment. `hp_set_wish_demographics` accepts only allowlisted age/who patches, locks the participant row and preserves gifts, hobbies and addresses. Private participant-token and owner/child checks are retained. Anonymous/authenticated execute is intentional; direct table writes remain forbidden. The save queue serializes rapid selections, retains failed changes for Retry, and avoids overwriting unrelated fields.

Matching uses broad eBay search keywords, not inferred identity or a trained recommendation system. Only allowlisted choices go into public catalog queries; names, addresses, notes and birthdays are excluded. Adult ranges 30–44 and 45–64 share the broad adult query. The USD celebration item-price cap remains enforced; shipping/tax and non-USD conversion remain separate. Mobile prioritizes the product grid and keeps the existing budget cap; detailed price controls remain in Gift Finder.

Validation: 66 automated tests passed, including profile preservation, guest/child authorization, failure/retry and rapid-change ordering. Local browser QA used fictional participants in an isolated database with live public eBay results: selections refresh products, persist after reload, keep the $25 cap and preserve a one-tap saved gift. Production SQL was verified inside a rolled-back transaction; no QA group remains. Security advisors retain existing notices, plus the expected execute notices for this explicitly token-checked RPC. See `docs/wishlist-recommendations-20261026.md` for scope and rollback.

## Public demo and organizer guide — 2026-10-25

The homepage now has direct choices for a name draw, wish-list group and Gift Finder, plus a clearly labeled fictional sample at `/#try-a-draw`. `DrawPreview` uses the existing `drawNames` helper with Sam/Alex excluded in both directions, reveals Sam's recipient, and opens illustrative wishes. All sample state is component memory; it does not call an API, save a real group or touch private celebrations. Organizer sign-in requirements are retained.

`/secret-santa-rules` provides original planning guidance, a checklist and a copyable group-message template. Clipboard failure has a manual-copy fallback. Its static content, article/breadcrumb/FAQ metadata, sitemap entry and homepage/footer/setup-guide links support discovery. Competitive observations and unimplemented opportunities are in `docs/drawnames-review-20261025.md`; no competitor account workflow, source code, reviews or artwork was reproduced.

## Search identity and wish-list discovery — 2026-10-25

The owner confirmed Hatpull remains the brand. Keep the current Secret Santa and picker canonical domains; no migration to hatpull.com was made. The homepage title is “Free Secret Santa Generator & Wish Lists | Hatpull.” Its shopping explanation and the existing wish-list landing page describe direct eBay saving, one-time Amazon list linking, recipient access, and the limits of budget filtering and reservation sync. Landing-page Open Graph site names consistently use Hatpull. These public descriptions and internal links do not change private lists or account behavior.

Search Console checked October 25: the Secret Santa domain had 39 web-search impressions, 0 clicks and average position 57.8 for the available October 19–23 data. Homepage: 32 impressions, average position 69.8. Google indexed the homepage with the expected canonical; the sitemap was read successfully October 24 and listed 21 discovered pages. The wish-list landing page was still unknown to Google before this update. Impressions are appearances in search results, not site visits or keyword search-volume estimates. A rename or domain move is not justified as a traffic fix by this report.

## Shop selection and retailer layouts — 2026-10-24

Gift Finder opens with available eBay and Amazon shop cards. The eBay section uses white space, rounded search, blue actions and real catalog photos; Amazon uses a navy/gold department-browsing layout with original category illustrations and links to Amazon. Hatpull remains clearly identified. Store cards and headers use unaltered official logo downloads: eBay's multicolor heritage logo and Amazon's publisher-approved “Available at Amazon” lockup. See `STORE_LOGOS.md` for sources and usage notes. Pending partner applications are not shown as active shops.

All shops / Switch to controls preserve mounted searches and filters. The eBay shop card now previews real product photos directly from eBay's image CDN using the initial budget-filtered catalog search. The full catalog reuses that request and its memory cache on selection. Thumbnails refresh at provider expiry and fall back cleanly on missing/broken images. The celebration budget and private cart-style gift list continue across shops. The fixed list dock appears after entering a shop; the header list button also works in the shop lobby. Amazon remains an external browsing + shared-list-link flow, without product import, cart sync or checkout claims. Amazon's Creators API dashboard still requires an approved Associates account as verified October 24; its illustrations remain category artwork until licensed product-image access is granted. No credentials, API permissions or database changes are needed.

## Cart-style gift list — 2026-10-24

Gift Finder now has a persistent Your gift list button with saved-item count, an inline side panel, automatic add confirmations, size/color/notes editing, and Remove with Undo. Closing the panel preserves the active search. Private list data remains component memory only and is cleared when the account or participant changes. Product photos reuse unexpired public catalog data; the panel never stores catalog titles/prices in the database.

Apply `supabase/migrations/20261024181207_gift_list_cart_actions.sql` before deploying this UI. `hp_change_wish` serializes edits/removal/undo on the same participant row as quick additions, preserving unrelated wishes and profile fields. Its anonymous execute grant is intentional for guest participants: `hp_me` and the owner/child check enforce the same private-token permissions as `hp_add_wish`. It returns only the editable participant’s items, never reservations or other profile fields. No table grants or authentication settings change.

## eBay catalog service — 2026-10-24

Server-only `/api/gifts/ebay` supports US new fixed-price product search and single-item details using the basic Browse API scope. `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_CAMPAIGN_ID`, and `EBAY_NOTIFICATION_TOKEN` belong only in Hatpull's Vercel Production environment. Prices/images expire after ten minutes; bounded per-instance caching and concurrency limits protect provider quota. Public eBay results additionally use a five-minute maximum edge cache bounded by original expiry, plus a bounded memory-only client cache. Retailer tabs preserve search state; only public catalog responses are cached. No buyer/seller identity fields are retained. Wishlist records use canonical product references and participant-authored preferences.

The production keyset is activated: eBay verified `https://secretsantageneratorapp.com/api/ebay/notifications` and its test notification succeeded. A real $25 search returned 24 products, photos and Hatpull affiliate links; single-item lookup also passed. The callback acknowledges without persisting/logging the payload because the integration never stores eBay user identity data. If adding identity data later, implement signature validation and deletion processing before collecting it. The eBay/Amazon store selector uses the existing `hp_add_wish` flow; eBay item and variation links are refreshed for the wish owner and authorized gift-giver. No database migration is needed. See `GIFT_CATALOG.md` for limits and rollback.

## Stress and security round — 2026-10-28 (READ FIRST)

Two migrations are in the repo but **not yet applied to production** (owner approval pending). Apply in this order with the Supabase SQL editor or MCP `apply_migration` (filenames sort before already-applied ones, so `supabase db push` needs `--include-all`):
1. `supabase/migrations/20261024120000_qa_fixes.sql` — participant link wins over a stale organizer key, owner can't see reservations on own list, dateless groups never unlock results, reservations must reference a real wish (cap 50), per-member limits, http(s)-only wish links, settings sanitised, stale reservations dropped on redraw.
2. `supabase/migrations/20261028000000_change_wish_hardening.sql` — `hp_change_wish` restore uses add-gift link rules and removal clears its reservation; redraw locks members before the group (fixes deadlocks with concurrent wish saves — verified locally: 3/3 redraws failed before, 0 after; member p95 5.4s → 0.25s); exclusions up to 40,000 kept (previously >2,000 silently dropped, letting people draw someone they excluded); repeat reveals don't bump the revision; second reserver gets `already_reserved`; auto-RLS helper revoked from API roles.
Both are additive/replace-in-place and pass all 92 tests; production data was checked compatible (no non-http wish links, settings keys only wishVis/mail/venue). Do not write new migrations that redefine these functions from older copies.

Live security checks (2026-10-28, from a browser): all hp_* tables deny anon reads; service/admin RPCs deny anon; GraphQL disabled; no storage buckets; auth providers google+email only with email confirmation; security headers present; no source maps; API routes reject unauthenticated calls. Local stress results and scripts: see the 2026-10-28 session notes (reveal cost grows with group size squared; one hot group row serializes writes; limits are soft under concurrency). `/api/gifts/ebay` now has a per-IP limit (20/min/instance).

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


## Gift preferences and quick look — 2026-10-25

The eBay Gift Finder now offers an optional two-step flow: gender/age radio choices, then up to three interest checkboxes. Choices produce removable chips and change the existing public eBay query. Clearing preferences retains the price cap, and changing participant clears browsing preferences. This is keyword-based inspiration, not a guarantee of age suitability or a reconstruction of DrawNames' private recommendation algorithm.

Product images and titles open a Hatpull quick-look sheet with the listing's gallery, price, selected specifications and plain-text short description. Saving uses the existing `hp_add_wish` flow and shared cart; the separate eBay button still opens the retailer. Closing the preview preserves the search and filters. Details share the existing bounded, expiring catalog cache; no catalog data is added to wish records. Amazon remains browse-and-link until product API access is approved.

Public UX references: https://www.drawnames.com/gift-finder, https://www.drawnames.com/features and https://www.drawnames.com/help. Only public behavior was studied; no private wish lists or purchases were changed. eBay query syntax reference: https://www.edp.ebay.com/support/knowledge-base/2190.

Validation: 61 tests passed, including query/budget bounds, cache freshness, catalog sanitization and existing wishlist SQL tests. Production build passed. Browser checks cover real public eBay results, multi-select controls, cancellation, removable chips, budget retention, quick look and unsigned wishlist selection. Responsive checks use a 390px viewport.
