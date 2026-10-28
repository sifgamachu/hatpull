# Hatpull primary domain cutover

The owner requested hatpull.com as the primary application address on October 27, 2026. This first deployment prepares the application to serve the Secret Santa homepage at hatpull.com, changes public metadata/canonicals, structured data, navigation, reminder destinations, sitemaps and installation support, and retains the old host during DNS cutover. The online name picker remains on its own domain.

The legacy eBay account-deletion notification endpoint and verified email sending/reply domains remain unchanged. API requests on the legacy domain must continue reaching the application, rather than being redirected, so webhook verification and external callbacks keep working.

Before enabling permanent redirects from the legacy site: verify hatpull.com and www.hatpull.com in the correct Vercel project, point both DNS records to Vercel, remove the Cloudflare redirect in the opposite direction, verify HTTPS, add the new Supabase callback and Google JavaScript origin, then change the Supabase Site URL. Keep old auth redirects allowed for existing links.

Validation before this preparation deployment: 81 tests, `npx next build`, and `scripts/check-search.cjs` passed. The search check covers canonical hosts, schema, crawl rules, sitemaps and public route aliases.

Browser storage is origin-scoped. Accounts and celebrations remain in the same Supabase project, but users may need to sign in again on the new domain. Existing invitation URLs must retain their complete paths and query parameters. Do not copy authentication credentials through URLs. Participants without accounts can reopen their invitation to recover access.

The owner confirmed that hatpul.com (one l) was a typo and meant hatpull.com (two ls). No one-l domain was purchased or configured. The actual legacy domain is secretsantageneratorapp.com, not a guessed spelling variation.

## Final cutover

Both hatpull.com and www.hatpull.com are assigned to Hatpull Production in Vercel and use DNS-only A records at 76.76.21.21, a supported Vercel address. Ownership TXT records are public verification values. HTTPS was verified on the apex before enabling old-host redirects. Cloudflare's opposite-direction rule is disabled. Supabase Site URL is https://hatpull.com, with https://hatpull.com/auth/callback** allowed. Google OAuth retains the Supabase callback and adds https://hatpull.com as a JavaScript origin; its public homepage/privacy/terms now use Hatpull.

The final middleware permanently redirects secretsantageneratorapp.com, its www alias and www.hatpull.com to https://hatpull.com, keeping paths and queries. Legacy API endpoints remain reachable for registered callbacks. The independent name picker remains separate. The live/domain search script checks the old homepage, gift finder, fictional invitation path, auth return, robots and sitemap, plus legacy health and both sites' canonical metadata.

Keep the legacy domains and their valid certificates active so shared links and search-engine migrations can continue. Google's [site-move guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) recommends permanent redirects and updated canonical URLs. Rankings are not guaranteed and recrawling takes time.
