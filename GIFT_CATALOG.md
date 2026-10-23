# Amazon browsing and wish lists

The public gift finder and the wish-list browsing panel now show one **Browse your gift on Amazon** link. The on-site search and product gallery were removed at the owner’s request. No catalog API request is made by this browsing component. In a US-dollar celebration, its link includes the group’s spending limit; for other currencies it explains that Amazon.com uses US dollars. The affiliate tag is supplied by `NEXT_PUBLIC_AMAZON_TAG`.

Wish lists still support exact product links, size/color preferences, most-wanted flags, editing, and private reservations. No database migration is required. Existing illustrated wishes and old `?idea=` links remain compatible. No generated gallery images are used or deployed.

The public Gift Finder includes an expandable “Sharing by text or social media” guide covering opt-in messaging, eligible public social accounts, disclosures, personal-contact purchases and support requests. It distinguishes sharing Hatpull for gift exchanges from Associates promoting affiliate links, links directly to Amazon’s official US policies, and records the verification date. Recheck those sources before changing the guidance.

## Current activation boundary

The Hatpull Associates account has tracking ID `hatpull-20`. As checked during implementation, it has no qualifying sales and no Creators API credentials. Browsing is intentionally handled on Amazon, where customers see current product photos and prices. The site does not display a product gallery. People can still save exact product links from Amazon or another shop, write their preferences, and reserve gifts privately.

Amazon currently requires an accepted Associates account and at least 10 qualifying sales in the preceding 30 days for Creators API access. Check the current requirements before activation:

- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
- https://affiliate-program.amazon.com/help/operating/policies

Do not manufacture qualifying sales or buy through your own links. Do not scrape Amazon photos, reviews or prices as a workaround.

## Optional future catalog activation in Hatpull's Vercel project

Reintroducing on-site catalog browsing requires a separate UI change; saving credentials alone will not restore it. The existing adapter remains available for exact-product wish-list lookups. After Amazon grants access, create North America / US **version 3.1 LWA credentials** in Associates → Tools → Creators API. Save these as server-only Production environment variables in the **hatpull** Vercel project:

- `AMAZON_CREATORS_CLIENT_ID`
- `AMAZON_CREATORS_CLIENT_SECRET`

Keep the existing public `NEXT_PUBLIC_AMAZON_TAG=hatpull-20`. Never prefix the client ID or secret with `NEXT_PUBLIC_`, commit credentials, or print credential values. This adapter targets the US marketplace and the current LWA token endpoint, not legacy PA-API signing or older Creators API credential versions. Redeploy after setting environment variables.

## Acceptance checks if on-site catalog browsing is reintroduced

1. Open `/gift-finder`, search for coffee, and select a $25 maximum. Confirm real Amazon photos and timestamped prices appear; every displayed price must be at most $25 before shipping/tax.
2. Test the same search in a $15 group: increasing the filter must never exceed $15. Prices with unknown currency, no stock, or restricted display must not appear in budget search results.
3. Save a product into your own wish list, enter size/color and most-wanted status, edit it, reload, and verify persistence. Amazon title/photo/price data must not be written into the saved profile. Profiles store ASIN, canonical link and participant-authored preferences only.
4. Open the list as a different participant, reserve the gift, and confirm the owner cannot see the reservation. Buying happens at the merchant; a reservation does not purchase an item.
5. Confirm all Amazon links carry `hatpull-20` and the page displays the Associate disclosure and price/content notices. API-provided detail links retain their other parameters.
6. Check desktop/mobile and a non-USD celebration. The site must not present US-dollar amounts as another currency or claim an unverified conversion.
7. Remove/disable API credentials in a preview deployment, or simulate provider failure: wish-list editing and manual links must keep working with a clear fallback. No raw provider response, token or credential should reach the browser.

## Data handling and limits

`/api/gifts` makes server-only calls to Amazon's fixed endpoints. Search accepts bounded terms, budget and page fields; item lookup accepts at most ten valid ASINs. Same-instance concurrent requests deduplicate; at most three provider calls run at once. Bounded in-memory results expire after 30 minutes and failures on auth/rate limits trigger a one-minute cooldown. This is not a distributed rate limiter. Review Amazon quota and add shared request controls before high-volume catalog use.

Browser/CDN responses use `no-store`. Clients clear and refresh expired product data. No product images, catalog descriptions, live prices, ratings or stock data are persisted in profiles or local storage. A participant's own spending limit/estimate is labeled separately from the current merchant price. Catalog searches transmit search terms or product IDs to Amazon, not participant names, member tokens, addresses or group IDs.

Wish lists permit up to 40 items and check the complete profile payload conservatively before saving. Existing lists remain compatible. Size, color and priority are optional strings; database ownership/RLS/reservation rules remain in force.

## Verification and rollback

Run `npm test` for catalog security/filter/cache checks, database save/ownership/privacy checks, and existing capacity/network regression tests. Run `npx next build` before every main push. Main deploys production automatically.

To disable live catalog calls without removing wish-list improvements, remove the two server-only Creators API environment variables and redeploy. To roll back the full feature, revert the feature commit, run the production build, then deploy that revision. No schema rollback is needed.
