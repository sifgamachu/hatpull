# Recipient-led gift matching

## Behavior

Before choosing a shop, shoppers can select up to three interests and a shipping country. Existing optional exact-age and gender choices seed the mix. Interests override adult gender ordering and are round-robin interleaved, so the first three previews represent different selected interests. Child pools remain age bounded, and explicitly incompatible age ranges in titles are filtered locally. No gender selection restricts manual browsing.

Both store cards and both shops consume the same browsing choices. Editing eBay preferences carries back to the store chooser and Amazon ideas. Interest/country choices stay in component memory for the visit; saved age/gender still use the existing profile workflow. No database migration, IP lookup, GPS, address inference, tracking profile or psychological score is used.

Live eBay searches use new fixed-price listings, the item-price budget, Best Match within each product family and an allowlisted delivery-country filter. Current availability and provider relevance refresh within the existing ten-minute bound. Public caches include country, budget, query and sort; exact ages, names, addresses and private notes are never included. Non-US searches/details suppress US postage estimates and direct the shopper to confirm shipping. Prices remain USD and tax/shipping are additional.

Amazon receives broad matching search terms and the existing US-dollar budget. Its cards are original illustrated ideas, not a live Amazon product feed. Amazon.com links do not filter shipping-country availability; this is disclosed. No fabricated trending labels, sales counts, ratings, prices or stock claims are added.

## Research and limits

[Carnegie Mellon University's review of gift-giving research](https://www.cmu.edu/piper/news/archives/2016/december/gifting-errors.html) reports that recipients often value a gift's usefulness over time while givers emphasize the exchange moment. Our design inference is to prioritize expressed interests and keep practical, enjoyable and comfortable categories in the mix. This does not validate demographic purchase predictions or a specific conversion uplift; our category ordering is an editable heuristic, not a trained model or market survey.

[eBay's documented Browse filters](https://developer.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html) define deliveryCountry as returning items that can be shipped to that country. Final seller restrictions, exact address, availability, duties and shipping cost must still be checked at the store. Best Match is provider relevance, not proof of popularity. A real trend ranking would require an approved sales/trend data source plus measurement; we do not currently have one.

## Validation and rollback

85 automated tests passed, including cross-country cache separation, country validation, foreign postage suppression, shared store suggestions, balanced interests, child boundaries, expiry, authorization and budget limits. Run `npm test`, `npx next build` and `node scripts/check-search.cjs` before publishing. Browser-check desktop/mobile preferences and both store paths. Reverting this feature requires no data migration; do not revert the completed primary-domain configuration with it.
