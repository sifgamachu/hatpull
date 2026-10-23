# Hatpull

Free tools for picking random names and organizing gift exchanges, made by Teregna LLC.

## Try the tools

| Tool | Use it for | What it does |
| --- | --- | --- |
| [Random Name Picker](https://onlinenamepickertool.com/) | Classroom turns, meeting order and prepared giveaway entries | Spin a name wheel with up to 1,000 entries, optionally remove winners, and copy the latest 20 results. The name list stays in this browser; no account is needed. |
| [Secret Santa Generator](https://secretsantageneratorapp.com/) | Family, friend and workplace gift exchanges | Draw names for 3–200 participants, set exclusions, share an invitation and add wish lists with private gift reservations. Organizers must sign in with Google or email; participant accounts are optional. |

The picker selects from your existing list. It does not invent new baby, business or character names. For a gift exchange where everyone gives and receives, use the separate Secret Santa generator.

- [Name-picker guide: duplicates, repeat winners, saving results and privacy](https://onlinenamepickertool.com/random-name-picker-guide)
- [How a Hatpull gift exchange works](https://secretsantageneratorapp.com/how-it-works)
- [About Hatpull](https://secretsantageneratorapp.com/about)
- [Contact](https://secretsantageneratorapp.com/contact)

## Development

One Next.js app serves both sites. `drawnamesonlinetool.com` redirects to the Secret Santa site.

Hosting is picked by the `host` header in `middleware.js`.

## Stack
Next.js 15 (App Router) on Vercel, Supabase Postgres. Group data access goes through security-definer Postgres functions (`hp_*`) that check the caller's account or private token; the tables are not readable with the public key. The draw runs server-side in `/api/create` and `/api/redraw`. Organizer access to completed exchange results follows the celebration's reveal rules.

Read [HANDOFF.md](HANDOFF.md) before making changes and run `npx next build` before publishing. Search checks and discovery work are documented in [SEARCH_VISIBILITY.md](SEARCH_VISIBILITY.md).

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=            # optional, defaults to the Hatpull project
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # optional, defaults to the Hatpull publishable key
NEXT_PUBLIC_AMAZON_TAG=             # optional Amazon Associates tag
```

## Database
`supabase/schema.sql` creates every table and function. Run it once in the Supabase SQL editor (or via migration).
