# Personalized store previews — October 27, 2026

The store chooser now shows relevant gift ideas before the participant chooses eBay or Amazon. Saved age/gender choices determine the families; the celebration's USD budget caps real eBay item prices and is included in Amazon search links. Shipping and tax remain additional. Non-USD budgets are not silently converted: eBay retains its $50 catalog default and Amazon omits the USD price filter.

## Implementation

- `store-preview-ideas.mjs` maps existing allowlisted inspiration families to original generic titles and artwork. Private names, addresses and notes are never included.
- `EbayStorePreview` calls the shared inspiration loader for three families with one product per family and two concurrent requests. It progressively displays real photos, titles and prices. The full catalog reuses the public memory cache. All three previews remain visible on small screens.
- `loadGiftInspiration` accepts optional family/result limits, retaining the six-family/four-products-per-family defaults for the full catalog. Explicit child age ranges in listing titles are checked locally against an exact selected age. Unknown age guidance remains visible; purchasers must check the retailer's product details.
- Changes to saved preferences invalidate old preview keys. Responses from abandoned requests cannot overwrite newer selections; expired data refreshes. Unavailable or broken photos fall back to labeled ideas, not invented products or prices.
- `StoreIdeaPreview` and `GiftArtwork` supply original illustrations for Amazon and eBay's fallback. `AmazonGiftShop` uses the same plan for six personalized ideas and external searches. Only the selected retailer's full shopping section mounts; list/cart controls remain shared.

## Amazon boundary

The live `/api/gifts` adapter returned `not_configured` on October 27. Illustrations are explicitly labeled gift ideas; current Amazon photos, prices and availability remain on Amazon. No Amazon page was scraped and no eBay image was represented as an Amazon product. Review the [official Program IP License](https://affiliate-program.amazon.com/help/operating/policies) when approved API/feed access becomes available. No credentials or provider permissions changed in this release.

## Validation

- 81 automated tests pass. New coverage checks three distinct preview searches, one result per family, the budget ceiling, demographic changes, complete idea mappings, private-field exclusion and explicit child age ranges.
- The production build passes. Local browser checks used fictional participants in an isolated in-memory database; no live group was created or edited and no invitations were sent.
- Desktop: adult male/female selections and age eight update both cards before store selection. An explicit ages 3–5/4–6 listing is excluded for age eight. Current adult eBay previews include a mug, inflator and drone within the $25 cap.
- Amazon-first browsing retains matching ideas and the selected budget in external links without mounting the eBay catalog. It makes no product-price or inventory claims.
- Mobile at 390px displays three previews in each card without horizontal overflow. Screenshots are saved in the workspace's `hatpull-personalized-previews-20261027` folder.

## Limits and rollback

Cold previews use up to three provider searches; choosing eBay can load the remaining three full-catalog families. Existing caches and concurrency limits apply, but these are not a distributed daily-quota guarantee. A store may return fewer than three suitable products; no missing stock is fabricated. Matching is based on broad search families, not a learned recommendation model.

Revert this release's commit, run `npx next build`, and publish the reverted main revision. There are no schema or environment changes to undo.
