-- Additive rollout: apply before the application deploy. Existing routes keep working.
alter table public.hp_groups add column owner_claimed_at timestamptz;
update public.hp_groups set owner_claimed_at = now() where owner_id is not null;

-- Preserve the fact that a group has had an owner, including account deletion during rollout.
create or replace function public.hp_mark_owner_claimed() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null or old.owner_id is not null then
    new.owner_claimed_at := coalesce(old.owner_claimed_at, new.owner_claimed_at, now());
  end if;
  return new;
end $$;
revoke all on function public.hp_mark_owner_claimed() from public, anon, authenticated, service_role;
create trigger hp_groups_owner_claimed before update of owner_id on public.hp_groups
for each row execute function public.hp_mark_owner_claimed();

-- Only the trusted server supplies p_owner, after Auth.getUser verifies the access token.
-- Ownership and the organizer's participant identity are committed with creation.
create or replace function public.hp_create_owned_group(p jsonb, p_owner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if p_owner is null or not exists (select 1 from auth.users where id = p_owner and not coalesce(is_anonymous, false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_signed_in'; end if;
  result := public.hp_create_group(p);
  update public.hp_groups set owner_id = p_owner, owner_claimed_at = now() where id = result->>'id';
  update public.hp_members set user_id = p_owner where group_id = result->>'id' and id = result->>'org_mid';
  return result;
end $$;

create or replace function public.hp_owned_roster(p_gid text, p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_owner is null or not exists (select 1 from auth.users where id = p_owner and not coalesce(is_anonymous, false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from hp_groups where id = p_gid and owner_id = p_owner) then raise exception 'forbidden'; end if;
  return (select jsonb_build_object('mode', g.mode, 'exclusions', g.exclusions,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) order by m.sort) from hp_members m where m.group_id = g.id and not m.kid), '[]'))
    from hp_groups g where g.id = p_gid);
end $$;

CREATE OR REPLACE FUNCTION public.hp_redraw_owned_group(p_gid text, p_owner uuid, p_members jsonb, p_exclusions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- Only the server can call this; p_owner comes from a verified Auth session.
declare m jsonb; i int := 0; ids text[]; g hp_groups; excl jsonb; asg jsonb;
begin
  if p_owner is null or not exists (select 1 from auth.users where id = p_owner and not coalesce(is_anonymous, false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_signed_in'; end if;
  perform 1 from hp_groups where id = p_gid and owner_id = p_owner for update;
  if not found then raise exception 'forbidden'; end if;
  if not hp_valid_members(p_members) then raise exception 'invalid members'; end if;
  select * into g from hp_groups where id = p_gid;
  select array_agg(x->>'id') into ids from jsonb_array_elements(p_members) x;
  if g.mode = 'draw' then
    if array_length(ids, 1) < 3 then raise exception 'too few'; end if;
    excl := hp_clean_excl(p_exclusions, ids);
    asg := hp_draw(ids, excl);
    if asg is null then raise exception 'no_valid_draw'; end if;
  else
    excl := '[]'::jsonb;
  end if;
  -- Removed members: drop their reservations on other lists, then the members (cascades their own list, questions, kids).
  delete from hp_reservations where group_id = p_gid and not (by_member = any(ids))
     and by_member not in (select id from hp_members where group_id = p_gid and kid);
  delete from hp_members where group_id = p_gid and not kid and not (id = any(ids));
  delete from hp_members k where k.group_id = p_gid and k.kid and not exists (select 1 from hp_members pm where pm.group_id = p_gid and pm.id = k.parent_id);
  for m in select * from jsonb_array_elements(p_members) loop
    i := i + 1;
    insert into hp_members(group_id, id, name, sort, receiver_id) values (p_gid, m->>'id', left(m->>'name', 40), i, asg->>(m->>'id'))
    on conflict (group_id, id) do update set sort = excluded.sort, receiver_id = excluded.receiver_id, name = excluded.name;
  end loop;
  update hp_groups set exclusions = excl, round = round + case when g.mode = 'draw' then 1 else 0 end, live_at = null where id = p_gid;
end $function$;

revoke all on function public.hp_create_owned_group(jsonb, uuid), public.hp_owned_roster(text, uuid),
  public.hp_redraw_owned_group(text, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.hp_create_owned_group(jsonb, uuid), public.hp_owned_roster(text, uuid),
  public.hp_redraw_owned_group(text, uuid, jsonb, jsonb) to service_role;

