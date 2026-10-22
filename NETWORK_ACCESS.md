# Work and school network access

Prepared 2026-10-22. An organization's own filtering and identity policies determine access; no site configuration can guarantee admission on every managed network.

## Changes

- Self-host Outfit, Young Serif and JetBrains Mono through pinned Fontsource packages. There is no Google Fonts stylesheet or font connection. Font licenses are served at `/font-licenses.txt`.
- Preserve HTTPS, HSTS, CSP and existing authentication controls. Restrict the CSP font source to the site itself and data URLs.
- Bound browser Supabase connection waits to 20 seconds, preserving caller cancellation. The wrapper does not retry writes. Bound loading of Google's optional sign-in script to 10 seconds and allow another attempt after failure.
- Add connection-help links to invitation, celebration and sign-in errors and the footer. Email sign-in remains available when Google sign-in is unavailable.
- Publish `/network-access` and `/network-allowlist.txt` on both public domains, with exact hostnames, optional dependencies, mail sender and IT verification steps. Include the public help page in each domain's sitemap.
- Update Next.js to 15.5.28, React to 19.3.1, Supabase JS to 2.118.0 and Vercel Analytics to 2.0.1 to address dependency advisories and maintain compatibility. Override PostCSS to 8.5.31. Migrate route params and request headers to the asynchronous Next.js API.
- Keep Cloudflare records DNS-only with direct Vercel hosting. Switching to a proxy solely for traffic counts would not establish corporate-network approval. Use Vercel Analytics for visits.

## Validation

- `npm audit`: zero reported vulnerabilities after the dependency updates on 2026-10-22. This is a dependency audit, not a complete security certification.
- `node --test scripts/network.test.mjs`: request forwarding, single write, timeout, cancellation and recovery tests passed.
- `node scripts/check-search.cjs`: both hostnames' canonical links, schema, robots, sitemaps and redirects passed against the local production build.
- `node scripts/check-network.cjs`: both hostnames' security headers, same-origin font files, IT guides, licenses, dynamic route rendering and social images passed against the local production build.
- Local browser: the help page rendered, and a picker spin with fictional names completed.

Run `npx next build` before pushing. After Vercel is Ready, run the same checks with `SEARCH_CHECK_BASE=live` and `NETWORK_CHECK_BASE=live`, confirm `/api/health`, and inspect the live help page. These checks do not exercise an actual employer's or school's firewall.

## Vendor classification checks: not completed

- FortiGuard: owner authorized human verification. The service rejected two verification attempts with a security-check failure. No category result was obtained and no review was submitted.
- Palo Alto Test A Site: lookup returned a CAPTCHA validation error. No category result or review submission was obtained.
- Zscaler Site Review: service said it was available only to Zscaler customers accessing it through Zscaler cloud. No category result or review submission was obtained.

Do not infer a good or bad reputation from these portal errors. Use the actual organization's block page to identify its filtering vendor, the blocked hostname and category. If misclassified, submit an accurate review through that vendor's portal or ask the organization's IT team to do so. Never change domains to evade a deliberate policy decision.

## Review text to use if a classification is inaccurate

> Hatpull is operated by Teregna LLC. onlinenamepickertool.com provides a free browser-based random name picker for classrooms, meetings and group activities. secretsantageneratorapp.com organizes voluntary gift exchanges, invitations and wish lists. No extension or software installation is required. Please review the domain's current content and assign the appropriate category under your taxonomy. Technical details and a feature-specific hostname list are available at /network-access.

Before submitting, add the vendor's actual current classification and the specific correction supported by its taxonomy. Do not claim certification, universal safety or an educational category solely to obtain access.

## Owner / IT follow-up

1. Share the downloadable guide with the relevant organization and test on its real managed browser/network.
2. Record any block category and hostname, with invitation tokens and personal information removed.
3. Have the organization review the exact required hostnames under its normal policy. No platform-wide Vercel/Supabase wildcard or fixed hosting IP list is needed.
4. Complete any vendor review requiring a human verification challenge or a customer account. No vendor approval has been claimed here.

References: [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/), [Vercel reverse-proxy guidance](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment), [Next.js 15 migration](https://nextjs.org/docs/app/guides/upgrading/version-15), [Supabase initialization](https://supabase.com/docs/reference/javascript/initializing).
