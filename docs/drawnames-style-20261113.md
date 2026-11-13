# DrawNames style applied to Hatpull

Studied November 13, 2026: the live public [homepage](https://www.drawnames.com/), [Secret Santa setup](https://www.drawnames.com/secret-santa-generator), and [Gift Finder](https://www.drawnames.com/gift-finder), using the browser alongside the existing October product study.

## Observed style

- A white header with the brand at left and sign-in/menu at right.
- A pale lavender seasonal background and large rounded white content panels.
- Heavy, dark sans-serif headings, generous spacing, and plain readable body text.
- Red primary drawing actions on the homepage; blue links, form actions, selection controls, and finder accents.
- A large introductory heading, three checkmarked routes into the product, and a prominent drawing action.
- White form cards with light blue outlines, simple inputs, and clear Continue controls.

## Implementation

`app/drawnames-style.css` is imported after the existing styles and scopes the new palette to pages containing `.journey-surface`. It supersedes the previous evergreen Christmas theme on those pages. Existing Hatpull gift artwork and product content remain in place.

`StartHero.jsx` now uses the reference's heading → three entry links → reassurance → red drawing action hierarchy. `Header.jsx` uses a native expandable menu with all existing destinations. Following a menu link closes it; Escape closes it and returns focus to the summary. The account/sign-in control remains outside the menu.

Setup, wish-list profile cards, account hubs, and the gift workspace receive coordinated blue controls, white cards and lavender surfaces. No database, authentication, provider integration, invitation, or assignment logic changes are included.

## Validation

- `npm test`: 119 tests passed, zero failures, against current GitHub main plus the style changes.
- `git diff --check`: passed.
- `npm run build`: passed against current GitHub main plus the style changes.
- Browser checks: homepage and organizer first step render the lavender/white theme with red homepage and blue Continue actions.
- The initial startup issue was traced to iCloud dataless dependency files. A fresh locked dependency installation in `/private/tmp` resolved it.
- Release applies only these five files on top of `6e21dbe825c3537b3feb0e1a428d4ef87220f734`, preserving newer gift-saving features.

The reference's DrawNames logo, proprietary illustrations, testimonials, app ratings and usage counts were not added to Hatpull. This is an implementation of the observed visual patterns using Hatpull's existing brand and truthful product claims.
