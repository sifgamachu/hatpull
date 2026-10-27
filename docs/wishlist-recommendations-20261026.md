# Wish-list recommendations — 2026-10-26

## Reference and implementation

DrawNames' public gift finder (https://www.drawnames.com/gift-finder) exposes gender choices and age filtering that change product suggestions. This was observed in the browser. Hatpull applies the requested sequence directly on the editable wish list: choose gender and age, see automatic suggestions, tap Add to gift list. No private competitor implementation or account data was accessed.

Gender choices are optional No preference, Female and Male. Age ranges match Hatpull's existing profile values, with Any age / prefer not to say. The values can be changed at any time. Existing profiles are reused, and owned child lists follow the same permissions as the rest of the wish-list editor. Viewing someone else's wish list does not reveal these editing controls.

Suggestions are eBay keyword matches, not a guarantee of suitability. Under 5 uses toddler, children use kids/boys/girls, teens use teen, 18–29 uses young adult, and 65+ uses senior. The two middle adult ranges share broad adult matching. No preference is inferred from a name. No private free text is sent to the catalog endpoint. Users can search any gift regardless of their choices.

## Verification

- `npm test`: 66 passed, 0 failed.
- Production-mode Next build and local browser flow use an isolated PGlite fixture; no invitation emails or persistent production QA groups.
- Female/12–17 produced `gift set teen women`; Male/5–11 produced `gift set boys`; Female/18–29 produced `gift set young adult women`. The $25 item-price cap stayed applied, and live eBay results changed automatically.
- One-tap saving added a product to the cart-style drawer. Reload retained both that wish and the selected demographics.
- Desktop and narrow mobile layouts checked; no horizontal page overflow. Selected cards remain legible in dark mode.
- The additive production RPC passed preservation/authorization checks in a rolled-back transaction. Anonymous direct member-table writes remain denied.
- Supabase advisors: existing RLS/no-policy, mutable-search-path and leaked-password-protection notices remain. The new RPC adds the expected anonymous/authenticated SECURITY DEFINER execute notices because guest participant tokens are intentional. Its search path is fixed and owner/child authorization is enforced. Background: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Rollback

Revert the app change to restore the former wish-list editor. Leave the additive RPC in place during rollback; it changes no existing signatures and saved age/who fields are already supported by the previous editor. Do not remove participant-token authorization or grant direct table access. If retiring the RPC later, first confirm no deployed UI calls it.

## Limits

Amazon products still require approved catalog access; this change does not import Amazon lists or manufacture Amazon product data. USD item price is constrained by the celebration budget, but shipping/tax can add cost. Non-USD groups retain the existing explicit currency notice. Future refinement can add interests and better age ranking without making the initial flow longer.
