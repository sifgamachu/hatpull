# Setup and gift discovery, October 27, 2026

## Requested behavior

- Exclusions require four draw participants. Three-person setup explains the rule, hides the exclusion editor and omits stale draft exclusions. Creation and redraw APIs enforce the same rule. Non-drawing child profiles do not count. Existing three-person groups can clear old exclusions.
- Secret Santa and Christmas suggest the Saturday before Christmas Eve, December 24 and December 25. For 2026 these are Saturday December 19, Thursday December 24 and Friday December 25. Other opens an optional custom date. Past suggestions are removed and the year rolls forward after Christmas.
- Wish-list and Gift Finder age selectors accept exact whole ages 0–120. Age and gender remain optional. Previously saved ranges stay readable until the participant selects an exact age; no age is inferred from a range or name.

## Product matching and presentation

The public DrawNames Gift Finder was inspected with Men / 35–50 selected. Its first products included a Stanley camp mug, AUXITO inflator, DEERC D20 drone, survival kit, speaker, kitchen knives, SWANLAKE sockets and DeWalt bits. Hatpull previously queried “gift set men,” producing mostly fragrance bundles.

Default inspiration now uses six varied product families per page and interleaves up to four products per family. Searches include the same relevant product brands/types where eBay has listings. Child and teen ages use different pools. Optional gender changes adult ordering; interests narrow the pool. Manual searches continue to search the requested product directly. This is explicit catalog selection, not a trained recommender or access to DrawNames’ private algorithm. It cannot guarantee the same stock, variants, prices or exact products as another retailer.

Requests are limited to two concurrent searches, up to six per inspiration page, using the existing public API/cache, deduplication, budget validation and provider expiry. Results render progressively and stale preference changes stop queued work. One failed family does not hide successful results. The tradeoff is more potential upstream requests than the old single query on cold searches; fixed shared queries and existing caches limit repetition, but this is not a global API-quota guarantee. Sorting applies to the displayed ideas. Product detail timestamps and expiry are preserved, and retailer content is never persisted as wish-list data.

The catalog has four columns on desktop and two on phones, square retailer images, heart/add controls, a compact title/price and shipping information. Price timestamps remain under Price details and in the product preview. No fabricated popularity, reviews or trending counts. Empty boxes, parts, speaker cases and socket organizers are excluded from inspiration. Users can still explicitly search any product. Prices and seller claims are supplied by eBay; check listing variants and final totals there.

## Database and privacy

CLI-generated migration `20261027220613_exact_wish_age.sql` broadens only the age validation of `hp_set_wish_demographics`. The private participant token, owner/child checks, row lock, patch-only updates, payload bound, fixed search path and grants are unchanged. It was applied to Hatpul and verified in a rolled-back transaction: exact age saved, existing wish and note retained, invalid age and invalid token rejected. No production QA rows remain.

The security advisor still reports the existing private-RLS/intentional token-authorized RPC notices, three older mutable-search-path helpers and the existing Auth password-protection notice. This migration does not widen table access. Exact ages and private profile text are not sent to retailer searches; the planner uses broad age categories internally.

## Validation

78 automated tests pass, including actual PostgreSQL-compatible migration/RPC tests, authorization, exact age bounds, legacy profiles, date weekdays/year rollover, exclusion roster rules, category diversity, budget/expiry preservation, deduplication, progressive loading, two-request concurrency, obsolete-response handling and accessory filters. `npx next build` passes before publishing.

Local browser QA used an isolated database and fictional participants, with live public eBay products: three/four-person exclusion gating, reciprocal exclusions, suggested and custom dates in review, age persistence after reload, varied products under the celebration cap, a one-tap saved wish appearing in the gift-list drawer, and a 390px layout without horizontal overflow. No real celebration or invitations were created.

## Rollback

Revert this app release to restore the prior presentation/search. The additive exact-age validation can remain. Do not restore the old RPC validator while exact-age clients are deployed. Legacy profile ranges are supported in both versions; the old UI will not offer numeric ages.
