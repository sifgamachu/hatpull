# Age entry and store selection

The editable wishlist now follows optional gender/age → choose a store → browse that store. Amazon and eBay remain the available choices; pending affiliate applications are not presented as working stores.

## Implementation

- `AgeChoice` supports direct numeric-keyboard entry and the existing scrollable exact-age dropdown. Valid whole ages 0–120 commit on blur or Enter, avoiding a save/search per digit. Blank is optional. Invalid input remains editable with an accessible error. Escape restores the saved selection. Legacy age groups remain selected until explicitly changed.
- `WishProfileChoices` retains its serialized profile-only save queue and retry handling. The same age control is used in Gift Finder's preference sheet; invalid ages block the next step.
- `WishList` uses the existing `GiftStores` lobby directly below demographics, forwarding the profile and budget. No retailer is selected initially. Invalid ages block shop selection until corrected or cleared.
- The eBay catalog mounts only when selected. Store-card thumbnail previews remain a separate small public request. Visited stores remain mounted but inactive/hidden, preserving searches and filters.
- Amazon links carry allowlisted broad age/gender search terms and the existing USD budget filter. Amazon's shared-list setup is inside the Amazon section. Product browsing and purchase happen on Amazon; no Amazon product feed or cart sync is implied.
- Saved gifts remain in one Hatpull list across stores; the list button is always available in the shop header. The fixed dock appears after choosing a store or when the list already contains gifts.

## Validation

- `npm test`: all 78 tests pass, including profile preservation, authorization, save ordering, retries, exact ages, wishlist mutations and catalog matching.
- `npx next build`: passes.
- Isolated PGlite fixture with fictional participants and public eBay responses; no real celebration created or modified, no invitations sent.
- First wishlist load: 122 dropdown options (optional + 0–120), typed input, two shop buttons and no eBay catalog.
- Entered age 42 + Male, saved and reloaded: both persist, store chooser still shown.
- Age 121 shows an accessible error and disables shop selection; selecting 35 clears it and synchronizes the typed field. Age 0, 120, blank and Enter/blur commits verified.
- Amazon selected first: no eBay catalog; Amazon search contains `gift ideas men` and a $25 filter, with shared-list setup visible.
- eBay selection: personalized age-35/Men products load with the $25 cap. One-tap save persists a gift; switching stores retains the eBay search and shared list drawer.
- Gift Finder modal: typed age 12 followed directly by Next and Show gifts applies the correct age preference.
- 390px mobile viewport: both input methods fit without horizontal page overflow; store choices remain available. Desktop and mobile screenshots are saved in the workspace's `hatpull-shop-choice-20261027` folder.

## Rollback

Revert this UI commit and rebuild. No schema, credentials or environment changes were made; saved age and wishlist data remain compatible with the previous release.
