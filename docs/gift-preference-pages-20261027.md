# Gift Finder preferences → shops

## Behavior

- `/gift-finder`: one centered, phone-width card (maximum 400px) with age entry/dropdown, gender, up to three interest checkboxes, shipping country, and a full-width Continue button.
- `/gift-finder/shops`: store selection with matching previews and a compact preference summary. Edit preferences returns to the first route.
- Shared `app/gift-finder/layout.jsx` keeps the workspace, selected celebration, preferences, and private gift-list provider alive between routes. Browser Back/Forward work without losing choices. A full reload still resets transient interests/country, as before.
- Context changes retain the existing provider key boundary so private items/preferences do not leak between participants or accounts.
- No public preference fields are written to the database by this page. Existing private wish-list demographic saves are unchanged.
- Store previews are not mounted until the store page first opens. Hidden catalog searches stop when returning to preferences. The gift-list dock is hidden on the preference page.
- The new shops route is noindex/follow with the Gift Finder canonical to avoid duplicating the public landing page in search.
- Wishlist shop editing reuses the compact card; its separately saved age/gender step remains intact.

## Verification

- 87 existing tests passed.
- Production `npx next build` passed, including both routes.
- Browser: select age 35, Men, three interests, and Canada; fourth interest disabled.
- Continue changes URL to `/gift-finder/shops`, preserves chips, and produces an Amazon link with the selected recipient/interest.
- Browser Back and Edit preferences preserve exact age, gender, selected interests and country. Store cards are absent from the visible preference step.
- Age 121 disables Continue. Typing 36 then clicking Continue commits the age and shows 36 years old on the store page.
- Card measured 400px on desktop and 343px at 390px viewport, with no horizontal overflow.
- No real celebration was created or modified; shopping preferences are transient local UI state.

## Rollback

Revert this change's app/gift-finder routes, GiftStores, GiftFinderWorkspace, GiftPreferencePage, and appended CSS. No database or environment rollback is needed.
