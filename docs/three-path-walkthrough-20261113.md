# Three-path walkthrough and highlights

November 13, 2026. User confirmed the three paths mean **Draw names**, **Share wish lists**, and **Find gifts**.

## Reference checked in the browser

- DrawNames draw setup: organizer → people → exclusions → occasion → date → budget → message → email confirmation.
- DrawNames wish-list group: organizer → people → occasion → date → budget → message → email confirmation. No exclusions or draw step.
- DrawNames Gift Finder: search `coffee mug` → products → photo/detail preview → heart/save action → sign-in/email-code prompt.

The reference walkthrough stopped at email confirmation/sign-in. No email was supplied, no reference group was confirmed, and no real invitation was sent. Authenticated downstream reference behavior was not verified in this session.

## Changes to Hatpull

- All three paths stay available as tabs, right-aligned on desktop, with a blue active-path highlight and visible checkmarks.
- Setup now separates occasion, date, budget and invitation message, following the reference's one-decision-at-a-time structure. Hatpull keeps its final review and required organizer sign-in.
- Current setup stage and progress are visible above the form; completed sidebar stages have checkmarks. Selected choices and errors have stronger outlines. Keyboard focus moves to each new question.
- Review edits return to the appropriate individual screen. Switching draw/wish setup remounts the correct mode. Version 1/2 drafts retain their data; new drafts recover all new stages.
- Gift browsing shows Preferences → Choose a store → Save gifts, with current/completed stages highlighted. A Browse gifts now action is available near the top of preferences.
- Corrected progress that previously marked invitations complete as soon as the organizer had joined. Group invitation progress now completes when everyone has joined.
- Corrected wish-only welcome text and organizer-only invitation guidance so they do not promise a drawn name or an unavailable personal wish list.

## Hatpull browser verification

Tests used a separate localhost app, an in-memory PGlite database loaded with the real schema/migrations, fictional participants, and a local sign-in-code fixture. Catalog browsing proxied the deployed public read-only eBay endpoint; saves went only into the local database. The QA code and configuration are outside the release checkout.

| Path | Verified in the UI |
| --- | --- |
| Draw names | Organizer, pasted four-person roster, reciprocal exclusion, occasion, date, $25 budget, message, review, reload recovery, local organizer sign-in and creation. After correcting a QA-only CORS schema-header omission and recreating the same fixture through the creation API: invitation, copy action, preferences, store selection, live product preview, saved wish, and revealed match. The final match respected the exclusion. |
| Share wish lists | Organizer not participating, two members, no exclusion stage, occasion/date/budget/message, direct review edit and return, successful creation, invitation, participant-name confirmation and joining, and saved wish-list-only gift. |
| Find gifts | Destination list selection, age 32 and Coffee & tea preferences, store selection, eBay search, 24 results capped at $25, product preview, save confirmation, one-item cart for the correct participant, full wish list and reload persistence. |

No production celebration, participant, wish or reservation was changed. No invitation/reminder was sent, no retailer order was placed, and no account or provider integration was changed.

## Validation

- `npm test`: 120 passed, 0 failed, including draft migration, split-stage validation and route ordering.
- Production build: passed, including the final UI and copy corrections.
- `git diff --check`: passed.
- Production output checked for the local fixture URL/key; no matches.

This matches the studied public flow and visual cues, while retaining Hatpull's existing retailer integrations and account rules. It does not claim identical inventory or private DrawNames implementation.
