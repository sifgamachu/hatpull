# Hatpull

One Next.js app serving two sites:

- **secretsantageneratorapp.com**: Secret Santa generator (draw names, exclusions, one invite link, live draw, wish lists with secret reservations, anonymous questions, group messages, kids' lists, gift finder)
- **onlinenamepickertool.com**: spinning-wheel name picker
- **drawnamesonlinetool.com**: 301 redirect to the Secret Santa site

Hosting is picked by the `host` header in `middleware.js`.

## Stack
Next.js 14 (App Router) on Vercel, Supabase Postgres. All data access goes through security-definer Postgres functions (`hp_*`) that check each person's private token; the tables are not readable with the public key. The draw runs server-side in `/api/create` and `/api/redraw`, so the organizer's browser never receives the results.

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=            # optional, defaults to the Hatpull project
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # optional, defaults to the Hatpull publishable key
NEXT_PUBLIC_AMAZON_TAG=             # optional Amazon Associates tag
```

## Database
`supabase/schema.sql` creates every table and function. Run it once in the Supabase SQL editor (or via migration).
