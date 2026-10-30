-- Reveal writes no longer serialize on one group row. Sixteen private revision
-- buckets preserve polling invalidation, including for already-open clients.
-- No existing group/member/wish is deleted or rewritten.
create table public.hp_reveal_revisions (
  group_id text not null references public.hp_groups(id) on delete cascade,
  bucket smallint not null check (bucket between 0 and 15),
  revision bigint not null default 1,
  primary key(group_id,bucket)
);
alter table public.hp_reveal_revisions enable row level security;
revoke all on public.hp_reveal_revisions from public,anon,authenticated;

create or replace function public.hp_bump_group_version() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='hp_groups' then new.state_version:=old.state_version+1; return new; end if;
  if tg_table_name='hp_members' and tg_op='UPDATE' then
    -- An ordinary reveal changes only drawn_round. Other member changes retain
    -- the existing group revision and privacy/token invalidation behavior.
    if (to_jsonb(new)-'drawn_round') = (to_jsonb(old)-'drawn_round') then
      if new.drawn_round is distinct from old.drawn_round then
        insert into public.hp_reveal_revisions(group_id,bucket,revision)
          values(new.group_id,(abs(hashtext(new.id)::bigint)%16)::smallint,1)
          on conflict(group_id,bucket) do update set revision=hp_reveal_revisions.revision+1;
      end if;
      return null;
    end if;
  end if;
  if tg_op<>'INSERT' then update hp_groups set state_version=state_version+1 where id=old.group_id; end if;
  if tg_op='INSERT' or (tg_op='UPDATE' and new.group_id is distinct from old.group_id) then
    update hp_groups set state_version=state_version+1 where id=new.group_id;
  end if;
  return null;
end $$;
revoke all on function public.hp_bump_group_version() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.hp_state_delta(p_gid text, p_mtok text, p_atok text, p_profile text DEFAULT NULL::text, p_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g hp_groups; me hp_members; v hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean; qp jsonb; revision text;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  -- A participant link always works. A stale or foreign organizer key only matters when there is no participant link.
  adm := case when me.id is not null then public.hp_is_admin(p_gid, p_atok) else public.hp_organizer_access(p_gid, p_atok) end;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  revision := g.state_version::text || ':' || coalesce((select sum(r.revision) from public.hp_reveal_revisions r where r.group_id=p_gid),0)::text;
  if p_version = revision then return jsonb_build_object('version', revision); end if;
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
  return jsonb_build_object('version', revision, 'state', jsonb_build_object(
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

-- Constant-size acknowledgement; no profiles, reservations, tokens, other
-- assignments, or group roster are returned. The member lock also serializes
-- against organizer redraw/reset and makes the expected-round check reliable.
create or replace function public.hp_reveal(p_gid text,p_mtok text,p_round integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare me hp_members; g hp_groups; recipient_name text;
begin
  if p_mtok is null then raise exception 'forbidden'; end if;
  select * into me from hp_members where group_id=p_gid and token=p_mtok for update;
  if me.id is null then raise exception 'forbidden'; end if;
  select * into g from hp_groups where id=p_gid;
  if p_round is null or g.round<>p_round then raise exception 'draw_changed'; end if;
  if g.mode<>'draw' or me.kid or me.receiver_id is null then raise exception 'no_draw'; end if;
  if me.drawn_round is distinct from g.round then
    update hp_members set drawn_round=g.round where group_id=p_gid and id=me.id;
  end if;
  select name into recipient_name from hp_members where group_id=p_gid and id=me.receiver_id;
  return jsonb_build_object('group_id',p_gid,'round',g.round,'member_id',me.id,'drawn',true,
    'receiver',jsonb_build_object('id',me.receiver_id,'name',recipient_name));
end $$;
revoke all on function public.hp_reveal(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.hp_reveal(text,text,integer) to anon,authenticated;
