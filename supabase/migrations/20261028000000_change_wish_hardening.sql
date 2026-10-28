-- Security round 3 (2026-10-28): hp_change_wish restore uses the same link rules as hp_add_wish,
-- and removing a wish also removes its reservation. Replace-in-place; safe to re-run.
create or replace function public.hp_change_wish(p_gid text, p_mtok text, p_target text, p_action text, p_wish jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me hp_members; target hp_members; items jsonb; old_wish jsonb; next_wish jsonb; profile jsonb; item_id text;
begin
  me := hp_me(p_gid,p_mtok);
  if me.id is null then raise exception 'forbidden'; end if;
  select * into target from hp_members where group_id=p_gid and id=p_target
    and (id=me.id or (kid and parent_id=me.id)) for update;
  if target.id is null then raise exception 'forbidden'; end if;
  item_id := p_wish->>'id';
  if p_action is null or p_action not in ('edit','remove','restore') or p_wish is null
    or jsonb_typeof(p_wish)<>'object' or char_length(p_wish::text)>2000
    or coalesce(item_id,'') !~ '^[A-Za-z0-9_-]{1,20}$' then raise exception 'invalid_wish'; end if;
  items := coalesce(target.profile->'items','[]'::jsonb);
  select x into old_wish from jsonb_array_elements(items) x where x->>'id'=item_id;
  if p_action='edit' then
    if old_wish is null then raise exception 'wish_not_found'; end if;
    if (p_wish-array['id','size','color','n'])<>'{}'::jsonb then raise exception 'invalid_wish'; end if;
    if (p_wish ? 'size' and (jsonb_typeof(p_wish->'size')<>'string' or length(p_wish->>'size')>40))
      or (p_wish ? 'color' and (jsonb_typeof(p_wish->'color')<>'string' or length(p_wish->>'color')>40))
      or (p_wish ? 'n' and (jsonb_typeof(p_wish->'n')<>'string' or length(p_wish->>'n')>140))
      then raise exception 'invalid_wish'; end if;
    next_wish := old_wish || (p_wish-'id');
    select coalesce(jsonb_agg(case when x->>'id'=item_id then next_wish else x end order by pos),'[]'::jsonb)
      into items from jsonb_array_elements(items) with ordinality as e(x,pos);
  elsif p_action='remove' then
    select coalesce(jsonb_agg(x order by pos),'[]'::jsonb) into items
      from jsonb_array_elements(items) with ordinality as e(x,pos) where x->>'id'<>item_id;
    -- A removed wish takes its reservation with it, so a later undo doesn't silently re-link it.
    delete from hp_reservations r where r.group_id = p_gid and r.owner_id = p_target and r.item_id = p_wish->>'id';
  else
    -- Undo is idempotent and never overwrites a newer copy of the same gift.
    if old_wish is null then
      if (p_wish-array['id','t','u','n','q','p','a','priority','size','color','art'])<>'{}'::jsonb
        or coalesce(length(trim(p_wish->>'t')),0) not between 1 and 120 then raise exception 'invalid_wish'; end if;
      -- Same link rules as adding a gift: web links only, bounded length, and a well-formed Amazon id.
      if exists(select 1 from jsonb_each(p_wish) f where jsonb_typeof(f.value) <> 'string')
        or (coalesce(p_wish->>'u','') <> '' and (length(p_wish->>'u') > 400 or p_wish->>'u' !~* '^https?://'))
        or coalesce(p_wish->>'a','') !~ '^([A-Z0-9]{10})?$' then raise exception 'invalid_wish'; end if;
      if jsonb_array_length(items)>=40 then raise exception 'wish_list_full'; end if;
      items := items || jsonb_build_array(p_wish);
    end if;
    next_wish := coalesce(old_wish,p_wish);
  end if;
  profile := jsonb_set(target.profile,'{items}',items);
  if octet_length(profile::text)>19000 then raise exception 'wish_list_full'; end if;
  perform hp_save_profile(p_gid,p_mtok,p_target,profile);
  return jsonb_build_object('items',items,'wish',case when p_action='remove' then old_wish else next_wish end);
end $$;
revoke all on function public.hp_change_wish(text,text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.hp_change_wish(text,text,text,text,jsonb) to anon,authenticated;

-- Hygiene: the auto-RLS event-trigger helper doesn't need to be callable by API roles.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
alter function public.hp_valid_profile(jsonb) set search_path = public;


-- 7. Stress-test fixes.
-- 7a. Redraw locks member rows before the group row, matching participant writes (no more deadlocks).
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
  -- Lock member rows first (same order as every participant write: member row, then group row via the
  -- revision trigger), then the group. Taking the group first deadlocked with concurrent wish saves.
  perform 1 from hp_members where group_id = p_gid order by id for update;
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

-- 7b. Exclusions are never silently dropped. A 200-person group has at most 39,800 ordered pairs.
create or replace function public.hp_clean_excl(p_excl jsonb, p_ids text[]) returns jsonb
language plpgsql immutable set search_path = public as $$
declare n int := case when jsonb_typeof(p_excl) = 'array' then jsonb_array_length(p_excl) else 0 end;
begin
  if n > 40000 then raise exception 'too_many_exclusions'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('a', a, 'b', b)), '[]'::jsonb)
          from (select distinct x->>'a' a, x->>'b' b
                from jsonb_array_elements(case when n > 0 then p_excl else '[]'::jsonb end) x
                where (x->>'a') = any(p_ids) and (x->>'b') = any(p_ids) and (x->>'a') <> (x->>'b')) q);
end $$;

-- 7c. Revealing again doesn't touch the group revision, so repeat taps during a big reveal are free.
create or replace function public.hp_mark_drawn(p_gid text, p_mtok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_mtok is null then raise exception 'forbidden'; end if;
  update hp_members m set drawn_round = g.round from hp_groups g
   where g.id = m.group_id and m.group_id = p_gid and m.token = p_mtok and m.drawn_round is distinct from g.round;
  if not found and not exists (select 1 from hp_members where group_id = p_gid and token = p_mtok) then raise exception 'forbidden'; end if;
end $$;

-- 7d. Two people reserving the same gift: the second one is told, instead of both seeing "Reserved".
create or replace function public.hp_reserve(p_gid text, p_mtok text, p_owner text, p_item text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok); holder text;
begin
  if me.id is null or p_owner = me.id then raise exception 'forbidden'; end if;
  if p_on and not exists (
    select 1 from hp_members o join hp_groups g on g.id = o.group_id
    where o.group_id = p_gid and o.id = p_owner and o.parent_id is distinct from me.id
      and (g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn' or (me.receiver_id = o.id and me.drawn_round = g.round) or o.kid)
      and jsonb_typeof(o.profile->'items') = 'array'
      and exists (select 1 from jsonb_array_elements(o.profile->'items') it where it->>'id' = p_item)
  ) then raise exception 'forbidden'; end if;
  if p_on then
    if (select count(*) from hp_reservations where group_id = p_gid and by_member = me.id) >= 50 then raise exception 'too many'; end if;
    insert into hp_reservations(group_id, owner_id, item_id, by_member) values (p_gid, p_owner, left(p_item, 20), me.id) on conflict do nothing;
    if not found then
      select by_member into holder from hp_reservations where group_id = p_gid and owner_id = p_owner and item_id = left(p_item, 20);
      if holder is distinct from me.id then raise exception 'already_reserved'; end if;
    end if;
  else
    delete from hp_reservations where group_id = p_gid and owner_id = p_owner and item_id = p_item and by_member = me.id;
  end if;
end $$;
