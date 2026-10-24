-- QA fixes 2026-10-24 (all additive / replace-in-place; safe to re-run).
-- 1. A participant link always works even if this device also holds a stale or foreign organizer key.
-- 2. An organizer who joined under a non-organizer name gets that member's view (no peeking at reservations on their own list).
-- 3. Groups without a date never unlock the full results list.
-- 4. Reservations must point at a real wish and are capped; per-member limits on questions, messages and kid profiles.
-- 5. Wish links must be http(s); organizer settings are type-checked so a bad value can't break the group page.

CREATE OR REPLACE FUNCTION public.hp_state(p_gid text, p_mtok text, p_atok text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g hp_groups; me hp_members; v hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  -- A participant link always works. A stale or foreign organizer key only matters when there is no participant link.
  adm := case when me.id is not null then public.hp_is_admin(p_gid, p_atok) else public.hp_organizer_access(p_gid, p_atok) end;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  -- An organizer who is also in the group always gets their member view (no peeking at their own reservations).
  v := me;
  if adm and me.id is null then
    select * into v from hp_members where group_id = p_gid and not kid and user_id = auth.uid() order by is_org desc limit 1;
    if v.id is null then select * into v from hp_members where group_id = p_gid and is_org; end if;
  end if;
  vis_all := g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn';
  mail_on := coalesce(g.settings->'mail'->>'on', '') = 'true';
  mail_all := coalesce(g.settings->'mail'->>'vis','drawn') = 'all';
  return jsonb_build_object(
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'occasion', g.occasion, 'date', g.event_date, 'budget', g.budget, 'cur', g.cur,
       'note', g.note, 'mode', g.mode, 'settings', g.settings, 'exclusions', g.exclusions, 'org_name', g.org_name, 'round', g.round,
       'live_at', g.live_at, 'created_at', g.created_at, 'join_code', case when adm then g.join_code end),
    'is_admin', adm,
    'me', case when me.id is null then null else jsonb_build_object('id', me.id, 'name', me.name, 'receiver_id', me.receiver_id,
       'drawn', coalesce(me.drawn_round = g.round, false), 'is_org', me.is_org, 'reset_count', me.reset_count, 'linked', me.user_id is not null, 'linked_to_me', me.user_id is not null and me.user_id = auth.uid()) end,
    'members', coalesce((select jsonb_agg(x order by s) from (
       select m.sort as s, jsonb_build_object('id', m.id, 'name', m.name, 'kid', m.kid, 'parent_id', m.parent_id, 'is_org', m.is_org,
         'claimed', m.token is not null or m.kid, 'drawn', coalesce(m.drawn_round = g.round, false),
         'wishes', case when jsonb_typeof(m.profile->'items') = 'array' then jsonb_array_length(m.profile->'items') else 0 end,
         'visible', (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or (v.receiver_id = m.id and v.drawn_round = g.round) or m.kid),
         'profile', case when (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or (v.receiver_id = m.id and v.drawn_round = g.round) or m.kid)
              then (m.profile - 'address')
                   || case when m.profile ? 'address' and (m.id = v.id or m.parent_id = v.id
                             or (mail_on and (mail_all or (v.receiver_id = m.id and v.drawn_round = g.round))))
                      then jsonb_build_object('address', m.profile->'address') else '{}'::jsonb end
              else null end) as x
       from hp_members m where m.group_id = g.id) q), '[]'),
    'reservations', coalesce((select jsonb_agg(jsonb_build_object('owner', r.owner_id, 'item', r.item_id, 'mine', r.by_member = v.id))
       from hp_reservations r join hp_members o on o.group_id = r.group_id and o.id = r.owner_id
       where r.group_id = g.id and (v.id is null or (o.id <> v.id and o.parent_id is distinct from v.id))), '[]'),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'to', q.to_member, 'body', q.body, 'answer', q.answer, 'at', q.created_at) order by q.created_at desc)
       from hp_questions q where q.group_id = g.id), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'body', x.body, 'at', x.created_at) order by x.created_at desc)
       from (select * from hp_messages where group_id = g.id order by created_at desc limit 100) x), '[]')
  );
end $function$;

CREATE OR REPLACE FUNCTION public.hp_state_delta(p_gid text, p_mtok text, p_atok text, p_profile text DEFAULT NULL::text, p_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g hp_groups; me hp_members; v hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean; qp jsonb;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  -- A participant link always works. A stale or foreign organizer key only matters when there is no participant link.
  adm := case when me.id is not null then public.hp_is_admin(p_gid, p_atok) else public.hp_organizer_access(p_gid, p_atok) end;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  if p_version = g.state_version::text then return jsonb_build_object('version', g.state_version::text); end if;
  -- An organizer who is also in the group always gets their member view (no peeking at their own reservations).
  v := me;
  if adm and me.id is null then
    select * into v from hp_members where group_id = p_gid and not kid and user_id = auth.uid() order by is_org desc limit 1;
    if v.id is null then select * into v from hp_members where group_id = p_gid and is_org; end if;
  end if;
  vis_all := g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn';
  mail_on := coalesce(g.settings->'mail'->>'on', '') = 'true';
  mail_all := coalesce(g.settings->'mail'->>'vis','drawn') = 'all';
  qp := public.hp_questions_page(p_gid, p_mtok, p_atok, p_profile);
  return jsonb_build_object('version', g.state_version::text, 'state', jsonb_build_object(
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'occasion', g.occasion, 'date', g.event_date, 'budget', g.budget, 'cur', g.cur,
       'note', g.note, 'mode', g.mode, 'settings', g.settings, 'exclusions', g.exclusions, 'org_name', g.org_name, 'round', g.round,
       'live_at', g.live_at, 'created_at', g.created_at, 'join_code', case when adm then g.join_code end),
    'is_admin', adm,
    'me', case when me.id is null then null else jsonb_build_object('id', me.id, 'name', me.name, 'receiver_id', me.receiver_id,
       'drawn', coalesce(me.drawn_round = g.round, false), 'is_org', me.is_org, 'reset_count', me.reset_count, 'linked', me.user_id is not null, 'linked_to_me', me.user_id is not null and me.user_id = auth.uid()) end,
    'members', coalesce((select jsonb_agg(x order by s) from (
       select m.sort as s, jsonb_build_object('id', m.id, 'name', m.name, 'kid', m.kid, 'parent_id', m.parent_id, 'is_org', m.is_org,
         'claimed', m.token is not null or m.kid, 'drawn', coalesce(m.drawn_round = g.round, false),
         'wishes', case when jsonb_typeof(m.profile->'items') = 'array' then jsonb_array_length(m.profile->'items') else 0 end,
         'visible', (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or (v.receiver_id = m.id and v.drawn_round = g.round) or m.kid),
         'profile', case when m.id = p_profile and (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or (v.receiver_id = m.id and v.drawn_round = g.round) or m.kid)
              then (m.profile - 'address')
                   || case when m.profile ? 'address' and (m.id = v.id or m.parent_id = v.id
                             or (mail_on and (mail_all or (v.receiver_id = m.id and v.drawn_round = g.round))))
                      then jsonb_build_object('address', m.profile->'address') else '{}'::jsonb end
              else null end) as x
       from hp_members m where m.group_id = g.id) q), '[]'),
    'reservations', coalesce((select jsonb_agg(jsonb_build_object('owner', r.owner_id, 'item', r.item_id, 'mine', r.by_member = v.id))
       from hp_reservations r join hp_members o on o.group_id = r.group_id and o.id = r.owner_id
       where r.group_id = g.id and r.owner_id = p_profile and (v.id is null or (o.id <> v.id and o.parent_id is distinct from v.id))), '[]'),
    'unanswered_count', (select count(*) from hp_questions where group_id = g.id and to_member = me.id and answer is null),
    'questions', qp->'questions',
    'questions_more', qp->'more',
    'messages', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'body', x.body, 'at', x.created_at) order by x.created_at desc)
       from (select * from hp_messages where group_id = g.id order by created_at desc limit 100) x), '[]')
  ));
end $function$;

CREATE OR REPLACE FUNCTION public.hp_questions_page(p_gid text, p_mtok text, p_atok text, p_target text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g hp_groups; me hp_members; rows jsonb;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  if me.id is null and not public.hp_organizer_access(p_gid, p_atok) then raise exception 'forbidden'; end if;
  -- Existing questions are shared within the group, without the questioner's identity.
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'to', q.to_member, 'body', q.body, 'answer', q.answer, 'at', q.created_at) order by q.created_at desc, q.id desc), '[]')
  into rows from (select * from hp_questions where group_id = p_gid and to_member = p_target
    and (p_before is null or (created_at,id) < (p_before,p_before_id)) order by created_at desc,id desc limit 51) q;
  return jsonb_build_object('questions', case when jsonb_array_length(rows)>50 then rows - 50 else rows end, 'more', jsonb_array_length(rows)>50);
end $function$;

-- 3. Results only unlock after a real event date.
create or replace function public.hp_no_dateless_results() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.event_date is null then new.results_after := null; end if;
  return new;
end $$;
drop trigger if exists hp_groups_no_dateless_results on public.hp_groups;
create trigger hp_groups_no_dateless_results before insert or update of event_date, results_after on public.hp_groups
  for each row execute function public.hp_no_dateless_results();
revoke all on function public.hp_no_dateless_results() from public, anon, authenticated;
update public.hp_groups set results_after = null where event_date is null and results_after is not null;

alter table public.hp_questions add column if not exists asked_by text; -- server-only, used for per-member limits; never returned

-- 4. Reservations: only real wishes, at most 50 per member per group.
create or replace function public.hp_reserve(p_gid text, p_mtok text, p_owner text, p_item text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
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
  else
    delete from hp_reservations where group_id = p_gid and owner_id = p_owner and item_id = p_item and by_member = me.id;
  end if;
end $$;

create or replace function public.hp_ask(p_gid text, p_mtok text, p_to text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null or p_to = me.id then raise exception 'forbidden'; end if;
  if not exists (select 1 from hp_members where group_id = p_gid and id = p_to and not kid) then raise exception 'forbidden'; end if;
  if (select count(*) from hp_questions where group_id = p_gid and created_at > now() - interval '1 hour') > 60 then raise exception 'slow down'; end if;
  if (select count(*) from hp_questions q where q.group_id = p_gid and q.asked_by = me.id and q.created_at > now() - interval '1 hour') >= 15 then raise exception 'slow down'; end if;
  insert into hp_questions(group_id, to_member, body, asked_by) values (p_gid, p_to, left(p_body, 300), me.id);
end $$;

create or replace function public.hp_message(p_gid text, p_mtok text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  if (select count(*) from hp_messages where group_id = p_gid and created_at > now() - interval '1 hour') > 120 then raise exception 'slow down'; end if;
  if (select count(*) from hp_messages where group_id = p_gid and member_id = me.id and created_at > now() - interval '1 hour') >= 30 then raise exception 'slow down'; end if;
  insert into hp_messages(group_id, member_id, name, body) values (p_gid, me.id, me.name, left(p_body, 500));
end $$;

create or replace function public.hp_add_kid(p_gid text, p_mtok text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me hp_members := hp_me(p_gid, p_mtok); nid text := 'k' || substr(hp_tok(4),1,6);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  if (select count(*) from hp_members where group_id = p_gid and kid) >= 50 then raise exception 'too many'; end if;
  if (select count(*) from hp_members where group_id = p_gid and kid and parent_id = me.id) >= 10 then raise exception 'too many'; end if;
  insert into hp_members(group_id, id, name, kid, parent_id, sort) values (p_gid, nid, left(p_name, 40), true, me.id, 1000);
  return nid;
end $$;

-- 5. Wish links must be web links. Same rules as before plus: any item "u" must start with http:// or https://.
create or replace function public.hp_valid_profile(p jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(p) = 'object'
     and not exists (select 1 from jsonb_each(p) e where e.key <> 'items' and (jsonb_typeof(e.value) <> 'string' or char_length(e.value #>> '{}') > 1000))
     and (not p ? 'items' or (jsonb_typeof(p->'items') = 'array' and jsonb_array_length(p->'items') <= 50
          and not exists (select 1 from jsonb_array_elements(p->'items') it
                          where jsonb_typeof(it) <> 'object'
                             or exists (select 1 from jsonb_each(it) f where jsonb_typeof(f.value) <> 'string' or char_length(f.value #>> '{}') > 500)
                             or (coalesce(it->>'u','') <> '' and it->>'u' !~* '^https?://')))) $$;

-- Settings are reduced to the known keys with known types before they are stored.
create or replace function public.hp_clean_settings(p jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'wishVis', case when p->>'wishVis' in ('all','drawn') then p->>'wishVis' else 'all' end,
    'mail', jsonb_build_object('on', coalesce(p->'mail'->>'on','') = 'true', 'vis', case when p->'mail'->>'vis' in ('all','drawn') then p->'mail'->>'vis' else 'drawn' end),
    'venue', jsonb_build_object('type', left(coalesce(p->'venue'->>'type',''), 40), 'address', left(coalesce(p->'venue'->>'address',''), 300))
  ) || coalesce((select jsonb_object_agg(k, v) from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) e(k, v)
                 where k not in ('wishVis','mail','venue') and jsonb_typeof(v) in ('string','boolean','number') and char_length(v::text) <= 200), '{}'::jsonb) $$;
revoke all on function public.hp_clean_settings(jsonb) from public, anon, authenticated;

create or replace function public.hp_admin_update(p_gid text, p_atok text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare nd date := case when p ? 'date' then nullif(p->>'date','')::date end;
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  if char_length(coalesce(p->'settings','{}')::text) > 4000 then raise exception 'too large'; end if;
  update hp_groups set
    name = coalesce(nullif(left(p->>'name', 80),''), name),
    event_date = case when p ? 'date' then nd else event_date end,
    results_after = case when nd is null then results_after else greatest(coalesce(results_after, nd), nd, current_date) end,
    budget = case when p ? 'budget' then nullif(left(p->>'budget', 12),'') else budget end,
    cur = coalesce(nullif(left(p->>'cur', 4),''), cur),
    note = case when p ? 'note' then nullif(left(p->>'note', 500),'') else note end,
    settings = case when p ? 'settings' then public.hp_clean_settings(p->'settings') else settings end
  where id = p_gid;
end $$;
revoke all on function public.hp_admin_update(text,text,jsonb) from public, anon, service_role;
grant execute on function public.hp_admin_update(text,text,jsonb) to authenticated;

-- Lint: fixed search_path on the remaining helpers.
alter function public.hp_valid_members(jsonb) set search_path = public;
alter function public.hp_clean_excl(jsonb, text[]) set search_path = public;
