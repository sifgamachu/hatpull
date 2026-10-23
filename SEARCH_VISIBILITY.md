# Search visibility — updated 2026-10-23

## October 23 audit and changes
- Google URL Inspection confirms the picker homepage is indexed. Both properties' Search Performance reports show zero impressions/clicks in the currently available October 19–20 data; this does not establish all traffic or future performance. Page-indexing aggregate reports are still processing.
- Bing reports the Secret Santa homepage as **Discovered but not crawled** (discovered October 22). Its live URL test succeeds: **URL can be indexed by Bing**, with no SEO/GEO issues found. Successful live fetching is not evidence that Bing has indexed it.
- Public production checks pass for canonical URLs, redirects, schema, robots and sitemaps. The general web-retrieval tool could not fetch either homepage even though production checks and Bing's live test succeeded; this is not enough evidence to identify an OpenAI crawler block. OAI-SearchBot and Claude-SearchBot remain allowed by robots.txt.
- Improved picker title, description and visible explanation for the actual use case: picking from an existing list. Fixed the 500-name FAQ to match the tool's 1,000-entry limit and documented duplicate entries, local storage and the 20-result history limit.
- Added `/random-name-picker-guide` on the picker domain with classroom, giveaway and meeting workflows, matching Article/Breadcrumb metadata, links from the homepage/footer, and sitemap inclusion. The Secret Santa-domain duplicate redirects to the picker-domain canonical URL.
- The owner authorized Bing verification for the picker domain on October 23. Its homepage metadata now includes the existing account's public Bing ownership tag. Keep this tag after verification; it is a public ownership token, not an API secret.
- Google accepted the new picker guide into its priority crawl queue and accepted the updated picker sitemap on October 23. This is submission confirmation, not proof the guide is indexed.
- `LAUNCH_KIT.md` contains factual directory copy, a social introduction, a demonstration outline and an editor-message draft. None has been posted or sent. External editorial coverage and actual adoption remain necessary work; no ranking or AI recommendation is guaranteed.

## Verified baseline
- Google Search Console has verified domain properties for secretsantageneratorapp.com and onlinenamepickertool.com.
- URL Inspection says both homepages are on Google and indexed. This is not evidence of high ranking for non-brand searches.
- The Secret Santa sitemap was successfully read on October 20 (10 discovered pages at that read). Overview reports zero clicks; page-indexing reports are still processing.
- Bing Webmaster ownership for secretsantageneratorapp.com was verified after owner authorization. Its sitemap was submitted on October 22 and is processing. Bing also accepted the homepage and /how-it-works URLs for crawling; this is not yet evidence of Bing indexing.

## Implemented
- Redirect exact public duplicate paths and www hosts to their canonical locations. Private routes and Open Graph image routes are retained.
- Explicit search-crawler rules for OpenAI, Anthropic and Perplexity share the same private-path exclusions as other crawlers. Preview hosts disallow crawling.
- Sitemap URLs use known production origins and no longer claim every page changed at each request.
- Hatpull Organization and WebSite identity linked to both WebApplication records; no invented reviews, ratings or social profiles.
- Clearer product limits, optional-account benefits, privacy guidance, draw troubleshooting and tool-selection guidance in visible server-rendered pages.
- Allow large image previews and unrestricted text snippets on indexable pages; existing noindex remains on account, invite and private group pages.

## Validation
Run `npx next build` before publishing to main. Start the production server on port 3017, then `node scripts/check-search.cjs` for local routing, canonical, JSON-LD, robots and sitemap checks. Run `SEARCH_CHECK_BASE=live node scripts/check-search.cjs` after deployment. These checks inspect public pages only.

## Ongoing work
- Production search checks passed for both domains after deployment. Google accepted both homepage recrawl requests into its priority crawl queue and accepted both sitemap resubmissions. The /how-it-works guide was not yet indexed (unknown to Google); Google accepted its first-indexing request.
- Keep the public Bing ownership tags in both homepage metadata records. Verify the picker domain in the existing Bing account after the tag is deployed, submit its sitemap and key public URLs, then check the resulting crawl/index reports. Acceptance of a sitemap or URL submission does not establish indexing.
- Measure actual impressions, clicks, indexed URLs and query positions in Search Console; measure AI referral traffic separately. There is no guaranteed ChatGPT/Claude inclusion or ranking.
- Add useful original guidance based on real customer questions, rather than mass-producing near-duplicate keyword pages.
- Earn relevant mentions and links through genuine partnerships and useful resources. No fabricated testimonials, purchased ranking links, or unsolicited outreach was performed.
- Optional future audit: mobile Core Web Vitals once enough real-user data is available.

## Primary guidance
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- OpenAI search crawlers: https://developers.openai.com/api/docs/bots
- Anthropic search crawlers: https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler

Google states that ordinary SEO fundamentals apply to its AI features; special AI text files or schema are not required. Crawler access makes content eligible for discovery, not guaranteed placement.
