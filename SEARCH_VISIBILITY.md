# Search visibility — 2026-10-22

## Verified baseline
- Google Search Console has verified domain properties for secretsantageneratorapp.com and onlinenamepickertool.com.
- URL Inspection says both homepages are on Google and indexed. This is not evidence of high ranking for non-brand searches.
- The Secret Santa sitemap was successfully read on October 20 (10 discovered pages at that read). Overview reports zero clicks; page-indexing reports are still processing.
- Bing Webmaster sign-in works. The Secret Santa domain has been added but ownership verification is pending owner authorization. Do not claim Bing indexing until verified.

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
- Production search checks passed for both domains after deployment. Google accepted both homepage recrawl requests into its priority crawl queue and accepted both sitemap resubmissions. The /how-it-works guide was not yet indexed (unknown to Google); a first-indexing request was started.
- Complete Bing verification after authorization, submit both domain sitemaps, and inspect Bing indexing reports.
- Measure actual impressions, clicks, indexed URLs and query positions in Search Console; measure AI referral traffic separately. There is no guaranteed ChatGPT/Claude inclusion or ranking.
- Add useful original guidance based on real customer questions, rather than mass-producing near-duplicate keyword pages.
- Earn relevant mentions and links through genuine partnerships and useful resources. No fabricated testimonials, purchased ranking links, or unsolicited outreach was performed.
- Optional future audit: mobile Core Web Vitals once enough real-user data is available.

## Primary guidance
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- OpenAI publisher discovery: https://help.openai.com/en/articles/12627856
- Anthropic search crawlers: https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler

Google states that ordinary SEO fundamentals apply to its AI features; special AI text files or schema are not required. Crawler access makes content eligible for discovery, not guaranteed placement.
