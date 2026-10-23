-- Apply after the new application is ready. Participants retain their private-link access.
-- Recheck pre-existing owners in case one linked during the additive rollout.
update public.hp_groups set owner_claimed_at = now() where owner_id is not null and owner_claimed_at is null;

-- Organizer access belongs to a verified account. A copied organizer token alone is insufficient.
create or replace function public.hp_is_admin(p_gid text, p_atok text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.hp_groups g join auth.users u on u.id = g.owner_id
    where g.id = p_gid and g.owner_id = auth.uid() and not coalesce(u.is_anonymous,false)
      and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
  )
$$;
revoke all on function public.hp_is_admin(text, text) from public, anon, authenticated, service_role;

-- Internal helper: return actionable errors only to someone holding the existing private organizer key.
create or replace function public.hp_organizer_access(p_gid text, p_atok text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups; uid uuid := auth.uid();
begin
  if public.hp_is_admin(p_gid, p_atok) then return true; end if;
  select * into g from hp_groups where id = p_gid and admin_token = p_atok and p_atok is not null;
  if not found then return false; end if;
  if uid is null or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
    raise exception 'organizer_sign_in_required';
  end if;
  if g.owner_id is null and g.owner_claimed_at is null then raise exception 'organizer_claim_required'; end if;
  if g.owner_id is null then raise exception 'organizer_unavailable'; end if;
  raise exception 'not_group_owner';
end $$;
revoke all on function public.hp_organizer_access(text, text) from public, anon, authenticated, service_role;

-- Row locking makes a legacy claim atomic. An already-owned or deleted-owner group cannot be taken over.
create or replace function public.hp_claim_organizer(p_gid text, p_atok text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); g hp_groups;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_signed_in'; end if;
  select * into g from hp_groups where id=p_gid for update;
  if g.id is null then raise exception 'forbidden'; end if;
  if g.owner_id = uid then return jsonb_build_object('admin_token', g.admin_token); end if;
  if p_atok is null or g.admin_token <> p_atok then raise exception 'forbidden'; end if;
  if g.owner_id is not null then raise exception 'not_group_owner'; end if;
  if g.owner_claimed_at is not null then raise exception 'organizer_unavailable'; end if;
  update hp_groups set owner_id=uid, owner_claimed_at=now(), admin_token=hp_tok(18) where id=p_gid returning * into g;
  return jsonb_build_object('admin_token', g.admin_token);
end $$;
revoke all on function public.hp_claim_organizer(text, text) from public, anon, service_role;
grant execute on function public.hp_claim_organizer(text, text) to authenticated;

CREATE OR REPLACE FUNCTION public.hp_link(p_gid text, p_mtok text, p_atok text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); m hp_members; linked_member boolean := false; linked_owner boolean := false;
begin
  if uid is null or not exists(select 1 from auth.users where id = uid and not coalesce(is_anonymous,false) and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_signed_in'; end if;
  if p_mtok is not null then
    select * into m from hp_members where group_id = p_gid and token = p_mtok;
    if m.id is not null then
      if m.user_id is null then update hp_members set user_id = uid where group_id = p_gid and id = m.id; linked_member := true;
      elsif m.user_id = uid then linked_member := true;
      else raise exception 'linked_elsewhere'; end if;
    end if;
  end if;
  -- Signing in never silently claims a legacy organizer link.
  linked_owner := public.hp_is_admin(p_gid, p_atok);
  return jsonb_build_object('member', linked_member, 'owner', linked_owner);
end $function$;

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
  adm := public.hp_organizer_access(p_gid, p_atok);
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  -- An organizer who is also in the group always gets their member view (no peeking at their own reservations).
  v := me;
  if adm and me.id is null then select * into v from hp_members where group_id = p_gid and is_org; end if;
  vis_all := g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn';
  mail_on := coalesce((g.settings->'mail'->>'on')::boolean, false);
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
  adm := public.hp_organizer_access(p_gid, p_atok);
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  if p_version = g.state_version::text then return jsonb_build_object('version', g.state_version::text); end if;
  -- An organizer who is also in the group always gets their member view (no peeking at their own reservations).
  v := me;
  if adm and me.id is null then select * into v from hp_members where group_id = p_gid and is_org; end if;
  vis_all := g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn';
  mail_on := coalesce((g.settings->'mail'->>'on')::boolean, false);
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
  if not public.hp_organizer_access(p_gid, p_atok) and me.id is null then raise exception 'forbidden'; end if;
  -- Existing questions are shared within the group, without the questioner's identity.
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'to', q.to_member, 'body', q.body, 'answer', q.answer, 'at', q.created_at) order by q.created_at desc, q.id desc), '[]')
  into rows from (select * from hp_questions where group_id = p_gid and to_member = p_target
    and (p_before is null or (created_at,id) < (p_before,p_before_id)) order by created_at desc,id desc limit 51) q;
  return jsonb_build_object('questions', case when jsonb_array_length(rows)>50 then rows - 50 else rows end, 'more', jsonb_array_length(rows)>50);
end $function$;

-- The old server entry points must not allow anonymous creation or token-only redraws.
-- The new create wrapper, owned by postgres, can still use the existing internal draw implementation.
revoke all on function public.hp_create_group(jsonb), public.hp_admin_redraw(text,text,jsonb,jsonb,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.hp_admin_update(text,text,jsonb), public.hp_admin_live(text,text),
  public.hp_admin_delete(text,text), public.hp_admin_reset_member(text,text,text), public.hp_admin_roster(text,text),
  public.hp_results(text,text) from public, anon, service_role;
grant execute on function public.hp_admin_update(text,text,jsonb), public.hp_admin_live(text,text),
  public.hp_admin_delete(text,text), public.hp_admin_reset_member(text,text,text), public.hp_admin_roster(text,text),
  public.hp_results(text,text) to authenticated;
-- hp_forget_me intentionally leaves owner_claimed_at intact when it clears owner_id.

