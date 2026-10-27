# Christmas styling and product preview, October 27, 2026

## Presentation

The Secret Santa homepage restores Santa-hat branding, an evergreen hero, red/gold/green presents, Christmas lights and snowfall. Existing reduced-motion and offscreen animation handling remain. Christmas setup, invitations, joining, dashboards and wish lists enable the existing seasonal theme. Gift Finder and the personal hub also use it. The theme removes its document class on unmount so it does not leak into unrelated routes. Explicit non-Christmas celebrations keep their ordinary theme.

The product sheet is now one vertical column: contained large photograph, optional thumbnail gallery, prominent heart/save pill, product title and brand, affiliate disclosure, retailer offer with current price and shipping, provider description and expandable specifications. The save control and close header stay accessible when scrolling. Saved items lead directly to the existing gift-list drawer. Provider expiry and unavailable/error behavior are retained.

The supplied DrawNames screenshot guided the layout only. In-page photos, titles and prices remain sourced through Hatpull's eBay Browse integration, with eBay attribution and outbound links. The uploaded Dior photograph is not substituted for an unrelated listing. No Amazon API access or exact competitor inventory is claimed. Amazon browsing and shared-list linking remain unchanged. No credentials, permissions, environment variables, database schema or production celebration data changed.

December 19, 24 and 25, 2026, Other/custom date, exact age choices and four-person exclusion rules from the preceding release are retained.

## Verification

- All 78 existing automated tests pass; the normal production `npx next build` passes before publication.
- Local browser QA uses a disposable in-memory database and fictional Sam/Alex/Taylor celebration, with live public eBay products. No invitations or real group writes.
- Full product photo, gallery, retailer price and details verified on desktop and at 390px; one-tap save appears in the gift-list drawer, and Escape restores focus to the triggering product.
- Mobile panel has no horizontal overflow. Sticky save/close controls remain usable while scrolling. Desktop/mobile Christmas homepage checked, including button contrast.
- Source review confirms Christmas routing is conditional on celebration occasion/name where applicable. The standalone picker does not receive the festive theme.

## Rollback

Revert this presentation commit to return to the preceding journey theme and two-column product preview. No database or environment rollback is required.
