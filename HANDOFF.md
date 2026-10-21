# Hatpull — handoff: finish sign-in, emails and lock-down

Written 2026-10-21. Read this whole file before changing anything. **Never commit or print secret values.**

## What Hatpull is
Free Secret Santa / gift-exchange site (drawnames.com alternative), a Teregna LLC product.
- Live: https://secretsantageneratorapp.com (main) · https://onlinenamepickertool.com (name picker) · drawnamesonlinetool.com 301-redirects
- Repo: https://github.com/sifgamachu/hatpull (branch `main`; every push auto-deploys to production on Vercel)
- Stack: Next.js 14 App Router + supabase-js. All database access is through `SECURITY DEFINER` RPCs (`hp_*`), tables have RLS on and no grants.

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
- Site: email sign-in is ON (`lib/auth.js` → `EMAIL_SIGNIN` defaults on). Google button is OFF until `GOOGLE_CLIENT_ID` is set.
- Legal name "Teregna LLC" in `lib/core.js`. Privacy/terms rewritten.

## Remaining — do in this order

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
  `curl -s -H "Authorization: Bearer $CRON_SECRET" https://secretsantageneratorapp.com/api/cron/reminders` → `{"due":1,"sent":1,...}`.
- Cron schedule is in `vercel.json` (daily 15:00 UTC).

### 6. Optional / owner items
- DMARC: Cloudflare TXT `_dmarc.secretsantageneratorapp.com` = `v=DMARC1; p=none;`.
- Mailing address for email footers: set `NEXT_PUBLIC_MAILING_ADDRESS` in Vercel (required before any marketing email).
- Resend account shows bot sign-ups ("Confirm your email address" to junk addresses, 1 complaint) from another app using this Resend account (elroicall/vidshook/scriptpin) — add bot protection there; complaints hurt Hatpull's deliverability too.
- Supabase org has spend cap ON; scheduled reminders exist to upgrade compute Dec 1 and downgrade Jan 5.

## Local dev
```
npm install
NEXT_PUBLIC_SUPABASE_URL=https://rkpglmwjpwbrxbluvsqm.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Y9Q8dkYGiw2iYCbKd5OTDA_PkIGjEuj npm run dev
npx next build   # must pass before pushing
```
Key files: `lib/auth.js` (sign-in), `lib/email.js` + `app/api/cron/reminders` (reminders), `lib/serverDb.js` (secret-key client), `app/api/create` (creation), `middleware.js` (domain routing), `supabase/` (SQL). Commit small, push to `main`, confirm the Vercel deploy is READY, then verify live.
