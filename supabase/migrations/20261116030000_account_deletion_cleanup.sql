-- Account deletion must clean application data regardless of which client requests it.
-- This migration does not delete any existing accounts or celebrations.
create or replace function public.hp_account() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); j jsonb := auth.jwt(); p hp_profiles;
begin
  -- A signed JWT alone can outlive its deleted auth user. Lock the auth row so
  -- a concurrent deletion cannot finish before this profile write commits.
  perform 1 from auth.users where id = uid and not coalesce(is_anonymous, false)
    and (email_confirmed_at is not null or phone_confirmed_at is not null) for key share;
  if not found then raise exception 'not_signed_in'; end if;
  insert into hp_profiles(user_id, email, name, unsub_token)
  values (uid, j->>'email', left(coalesce(j->'user_metadata'->>'full_name', j->'user_metadata'->>'name', ''), 80), hp_tok(16))
  on conflict (user_id) do update set email = coalesce(excluded.email, hp_profiles.email), updated_at = now()
  returning * into p;
  return jsonb_build_object('email', p.email, 'name', p.name, 'reminders', p.reminders, 'marketing', p.marketing,
    'marketing_consent_at', p.marketing_consent_at);
end $$;
revoke all on function public.hp_account() from public, anon, service_role;
grant execute on function public.hp_account() to authenticated;

create or replace function public.hp_cleanup_deleted_account() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare em text;
begin
  select coalesce(p.email, old.email) into em from hp_profiles p where p.user_id = old.id;
  em := coalesce(em, old.email);
  if em is not null then
    insert into hp_suppression(email_hash, reason)
    values (encode(digest(lower(em), 'sha256'), 'hex'), 'account_deleted')
    on conflict (email_hash) do update set reason = 'account_deleted';
  end if;
  update hp_members set user_id = null where user_id = old.id;
  update hp_groups set owner_id = null where owner_id = old.id;
  delete from hp_email_log where user_id = old.id;
  delete from hp_profiles where user_id = old.id;
  return old;
end $$;
revoke all on function public.hp_cleanup_deleted_account() from public, anon, authenticated, service_role;

create trigger hp_cleanup_before_auth_delete
before delete on auth.users
for each row execute function public.hp_cleanup_deleted_account();
