import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile, readdir } from 'node:fs/promises';

export async function testDatabase({ enforceOrganizer = true } = {}) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema extensions; create schema auth;
    create table auth.users(id uuid primary key, is_anonymous boolean default false, email_confirmed_at timestamptz, phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;`);
  await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
    if (!enforceOrganizer && file.includes('enforce_organizer_accounts')) continue;
    await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
  return db;
}
