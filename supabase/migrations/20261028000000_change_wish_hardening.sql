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
