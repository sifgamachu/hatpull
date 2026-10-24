# Store browsing and wish lists

## eBay product catalog — October 24, 2026

Gift Finder and the participant's Browse gift ideas panel offer eBay and Amazon. eBay displays real new, fixed-price US listings with photos, timestamped prices, category/keyword search, pagination and a maximum item price. A selected USD celebration clamps the maximum to its current budget. Shipping and tax are explicitly additional; non-USD budgets are not silently converted. Search terms and budgets are submitted deliberately, not sent on every keystroke.

Choosing Add to wish list uses the existing `hp_add_wish` RPC. It saves a neutral title, canonical eBay item/variation link, and participant-authored preferences only. The owner's and authorized gift-giver's cards fetch fresh product details; private reservation behavior remains unchanged. All eBay catalog content, images, seller/buyer identities and prices are excluded from stored profiles. No database migration is needed. Existing Amazon list linking and manual gift links remain available.

Production application credentials, affiliate campaign ID and notification verification token are stored as server-only Vercel secrets. The notification endpoint was accepted by eBay and Send Test Notification succeeded. Real production search returned 24 coffee products at or below $25 with 24 images and 24 Hatpull affiliate links; single-item detail also succeeded. The adapter uses the basic application scope and search/single-item endpoints, not restricted bulk getItems or checkout APIs.

`/api/gifts/ebay` validates bounded keywords, budgets, page numbers and item IDs. It allows only fixed eBay API origins, whitelists product fields and image/link origins, deduplicates requests, caches normalized results for ten minutes, and caps each server instance at three concurrent provider calls and 60 requests/minute. These are per-instance protections, not a distributed daily quota guarantee. Browser/CDN responses use no-store. Missing credentials/provider errors leave the other-store and manual-link flows working.

Account deletion notifications use `/api/ebay/notifications`. Hatpull does not collect eBay personal identities or orders; notification payloads are acknowledged without storage or logging. Any future identity-data feature must implement signature validation and deletion processing before it collects that data.

Configuration: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_CAMPAIGN_ID`, `EBAY_NOTIFICATION_TOKEN`. Keep all server-only. To stop API calls, remove the client credentials and redeploy; catalog fallback appears. Do not regenerate credentials unnecessarily.

The Amazon-only notes below describe earlier iterations and Amazon's separate eligibility boundary.

## One Amazon wish-list link — October 23, 2026

The main Gift Finder flow is now **Use my Amazon wish list**. Participants save their view-only Amazon list sharing link once using the existing `hp_add_wish` endpoint. The link is stored as an ordinary wish with the title “My Amazon wish list”; no migration or new privilege is needed. Supported Amazon marketplace hosts and recognized list paths are validated and canonicalized, stripping tracking parameters. Product URLs, cart URLs, editing invitations, spoofed domains and unresolved short links are rejected in the list setup.

After setup, the participant keeps using Amazon’s Add to List. Hatpull shows a clearly labeled **View Amazon wish list** card. Products, prices, updates and purchases remain on Amazon; Hatpull does not import list contents or connect an Amazon account. Amazon’s list sharing settings still control whether the recipient can open it. Whole-list cards do not offer a misleading reserve-this-gift button. Existing individual gifts and private reservations remain available through the secondary individual-gift flow.

The chosen celebration’s budget remains visible and is included in USD Amazon gift-search links. It does not enforce spending on a linked Amazon list. Existing member-token ownership and the organizer’s wish-list visibility rules apply to the saved link. A list can be renamed or removed in the normal Hatpull wish-list editor.

## Quick gift saving — October 23, 2026

The Gift Finder reads current budgets from the participant’s accessible celebrations. It remembers the last selected list and includes a USD maximum in the Amazon search URL. Other currencies are shown as the celebration budget without pretending to convert them into dollars. Amazon controls its results and checkout prices; tax and shipping still need checking.

Participants can use **Paste & save gift**, or paste a link and save, without entering a title, price or options. Names come only from participant-shared text, a descriptive supplied URL slug, or a neutral placeholder. No retailer page scraping is performed. Size, color and notes can be added later. The new `hp_add_wish` RPC appends under a row lock and deduplicates retries, requiring the existing member token and ownership of the target list (including a parent’s child list). It preserves other profile fields.

On compatible installed browsers, **Share → Hatpull** opens `/share-gift`, asks which wish list to use, and requires an explicit Save. The manifest includes a GET share target and PNG install icons; the service worker adds install support but caches no private content. Unsupported browsers use the same paste flow. Incoming product links are removed from the address bar after parsing, omitted from analytics, and restorable locally for up to one hour to survive sign-in. This is a shared link, not a purchase, Amazon wish-list import, cart sync or automatic selection tracking.

Deployment: apply `supabase/migrations/20261023182707_quick_wish_append.sql` before deploying the app. Verify wrong-member/null-token requests fail, duplicate saves return the existing wish, parent access works, the selected budget reaches the Amazon URL, and the gift is visible to its authorized gift-giver. Test the inbound share route and paste fallback; OS share-menu availability depends on installation/browser support.

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
