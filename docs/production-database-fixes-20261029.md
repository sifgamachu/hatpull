# Production database fixes — October 29, 2026

The two stress-tested database migrations were deployed to Hatpul (`rkpglmwjpwbrxbluvsqm`) at approximately 8:22–8:23 PM Eastern on October 29. The existing Hatpull website uses them immediately; no frontend behavior or environment variables were changed.

## Deployed migrations

| Repository source | Production migration history |
| --- | --- |
| `20261024120000_qa_fixes.sql` | `20261030002206_qa_fixes` |
| `20261028000000_change_wish_hardening.sql` | `20261030002254_change_wish_hardening` |

The history timestamps are UTC. Supabase MCP assigns the deployment timestamp, which differs from the checked-in filename. Both were applied in the documented order. Do not blindly replay the older source files through `db push --include-all`; inspect the name/content mapping first.

The first connector request returned an expired-request error. A fresh history/function check confirmed it had not run. One retry succeeded, followed by the second migration.

## Changes now active

- Redraw locks participant rows before the group row, matching gift writes and avoiding the demonstrated lock conflict.
- Wish restore validates links; removing a wish clears its reservation. Competing gift reservations report `already_reserved`.
- Repeat reveal requests do not increment the group revision.
- Large exclusion sets are retained up to 40,000 instead of silently discarded above 2,000.
- Participant links take precedence over stale organizer keys; organizers cannot inspect reservations on their own list.
- Dateless groups cannot unlock results. Message/question/child-profile limits, settings normalization, and fixed function search paths are active.
- The internal auto-RLS helper is no longer callable by public API roles.

## Verification

Before deploying, all 14 relevant existing repository function definitions matched production exactly. Existing data had no non-HTTP wish links and no dateless results requiring correction. All 92 automated tests passed again.

The earlier hosted stress test demonstrated three failed redraws and 29 failed edits out of 450 before these fixes, versus three successful redraws and 450 successful edits afterwards. That load test used a disposable branch; a high-volume test was not repeated against production.

After deploying, all 14 expected function definitions matched production. A four-person fictional celebration was exercised inside one rolled-back transaction: gift add/edit/remove/restore, invalid-token and foreign-list rejection, invalid-link rejection, duplicate reservation handling, own-list reservation privacy, stale-key handling, repeated reveals, redraw retaining wishes/members, and 2,280 exclusions all passed. The transaction left no fixture records.

Checksums and counts of production groups, members, and reservations were identical before and after deployment: six groups and 27 members. No real celebration was redrawn or deleted. Existing schema definitions and grants were saved locally before changes; no user records or secrets were exported.

Security advisors cleared all three mutable-search-path warnings, and exposed security-definer counts decreased by one for each API role after the internal helper grant was revoked. Existing token-checked RPC notices, private RLS tables without policies, and the existing leaked-password-protection notice remain. Relevant references: [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [security-definer RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Live HTTP checks also passed: homepage, Gift Finder, shops and an eBay search returned 200; health reported all four flags true. Signed-out creation and redraw requests correctly returned 401.

The production build (`npx next build`) passed before pushing these documentation updates. Its first attempt compiled but ran out of local disk space during static generation; the unchanged cached retry completed successfully without deleting files.

## Remaining capacity work

Distinct cold product searches still need bounded queuing and shared-office rate-limit review. A synchronized 1,000-person reveal remained around 6.6 seconds at p95 in the isolated test. This deployment does not claim to resolve those constraints or establish an absolute user maximum.

The owner requires fresh approval immediately before any high-risk deletion, even when cleanup was previously authorized. None was needed for this deployment. Any recovery should preserve production data and ownership enforcement; prefer a reviewed forward fix over restoring older unsafe functions.

