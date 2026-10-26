# DrawNames public product review — October 25, 2026

## Scope and evidence

Reviewed DrawNames' public homepage, organizer entry screen, setup guide, feature directory, rules guide and no-self-match feature page. Its signed-in organizer flow stopped before advancing: automatic approval review rejected Continue because it could change a real group in the owner's account. No group was created or modified. Public documentation supplied the remaining workflow evidence; later account screens were not tested.

This is an observation of public product and content patterns. We do not have DrawNames' Search Console data, conversion rates, backlink analysis or private implementation. The observations do not establish why it ranks for a particular query. Its audience counters and ratings are self-published claims, not independently verified metrics.

## Useful patterns and Hatpull's response

| Public observation | Hatpull assessment | Response |
| --- | --- | --- |
| The homepage leads to a name draw, wish list or gift finder. [Source](https://www.drawnames.com/) | Hatpull offers those functions, but their entry points were spread across navigation and buttons. | Added three clear homepage choices with descriptions and direct actions. |
| A feature page offers a sample name reveal. [Source](https://www.drawnames.com/features/never-draw-your-own-name) | Hatpull explained the draw but required setup to experience it. | Added a fictional sample showing a match, a couple exclusion and the recipient's wishes. It uses Hatpull's own draw helper and does not create a group. |
| A dedicated rules guide links into the generator. [Source](https://www.drawnames.com/what-are-the-rules-for-secret-santa) | Hatpull had setup instructions and short rules, but no complete planning resource. | Added original rules, a budget example, organizer checklist, copyable invitation template and FAQs, linked from the homepage, setup guide and footer, and included in the sitemap. |
| A feature directory connects matching, wish lists and gift discovery. [Source](https://www.drawnames.com/features) | Hatpull already has relevant feature/occasion landing pages, so more near-duplicate pages would add little. | Preserve those pages and strengthen useful content and internal navigation. |
| Public instructions promote account-free draws. [Source](https://www.drawnames.com/how-to-draw-names) | Hatpull deliberately requires organizer sign-in; participants can join by invitation. | Keep the owner's approved account model. Offer the sample before sign-in and explain account requirements clearly. |
| The site promotes mobile apps, reviews and repeated annual use. [Source](https://www.drawnames.com/) | Hatpull has a smaller existing audience and no verified equivalent review history. | Do not invent counters, reviews or app-store listings. Native app distribution and repeat-organizer improvements remain separate projects. |
| The feature directory advertises a ChatGPT integration. [Source](https://www.drawnames.com/features) | Search visibility and an installable integration are separate routes to discovery. | A Hatpull ChatGPT app would require its own design, implementation, security review and submission. No listing or integration was created in this change. |

## Implementation boundaries

All new text, layout and demo code were authored for Hatpull. No DrawNames source code, product images, reviews, audience statistics or account data were copied into Hatpull. Existing official retailer logos and licensed catalog behavior remain unchanged. No changes to database, authentication, affiliate credentials, DNS, or user celebrations.

## Next priorities

1. Measure whether visitors use the sample and proceed to setup; use aggregate event counts without names, private links or wish contents if event instrumentation is added later.
2. Compare Search Console impressions, query positions and clicks against the October 25 baseline after enough new data arrives. Guide submission alone does not establish indexing or ranking.
3. Improve repeat-organizer setup and consider direct ChatGPT distribution as separately scoped features.
4. Earn real user feedback and relevant public mentions. No outreach or social posting was performed.

Google's [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) informed the choice to build a useful planning resource instead of producing numerous keyword variants.

## Validation before publishing

- Production build passed with the new static guide.
- Browser testing confirmed sample reveal, recipient wishes and reset. The observed Sam-to-Jordan result respected the Sam/Alex exclusion.
- The invitation template Copy action displayed its success confirmation.
- The demo and template were checked at a 375 CSS-pixel content width with no horizontal overflow. The temporary viewport override was reset afterward.
- Existing public search checks, extended for the new guide, passed for both domains: canonical URLs, redirects, structured data, robots and sitemaps. The rules guide appears only in the Secret Santa sitemap and its picker-domain alias redirects to the correct canonical.
- No real test celebration or invitation was needed.
