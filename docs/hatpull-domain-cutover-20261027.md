# Hatpull primary domain cutover

The owner requested hatpull.com as the primary application address on October 27, 2026. This first deployment prepares the application to serve the Secret Santa homepage at hatpull.com, changes public metadata/canonicals, structured data, navigation, reminder destinations, sitemaps and installation support, and retains the old host during DNS cutover. The online name picker remains on its own domain.

The legacy eBay account-deletion notification endpoint and verified email sending/reply domains remain unchanged. API requests on the legacy domain must continue reaching the application, rather than being redirected, so webhook verification and external callbacks keep working.

Before enabling permanent redirects from the legacy site: verify hatpull.com and www.hatpull.com in the correct Vercel project, point both DNS records to Vercel, remove the Cloudflare redirect in the opposite direction, verify HTTPS, add the new Supabase callback and Google JavaScript origin, then change the Supabase Site URL. Keep old auth redirects allowed for existing links.

Validation before this preparation deployment: 81 tests, `npx next build`, and `scripts/check-search.cjs` passed. The search check covers canonical hosts, schema, crawl rules, sitemaps and public route aliases.

Browser storage is origin-scoped. Accounts and celebrations remain in the same Supabase project, but users may need to sign in again on the new domain. Existing invitation URLs must retain their complete paths and query parameters. Do not copy authentication credentials through URLs. Participants without accounts can reopen their invitation to recover access.

hatpul.com (one l) was not present among the owner's 12 Cloudflare domains; ownership needs confirmation before configuring it. The actual legacy domain is secretsantageneratorapp.com, not a guessed spelling variation.
