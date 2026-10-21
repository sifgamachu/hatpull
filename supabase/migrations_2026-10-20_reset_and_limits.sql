-- Applied to production 2026-10-20: organizer reset, creation circuit breaker, no-organizer fix
alter table public.hp_members add column if not exists reset_count int not null default 0;

create index if not exists hp_groups_created_idx on public.hp_groups(created_at);

create or replace function public.hp_create_group(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare gid text := substr(hp_tok(8),1,12); atok text := hp_tok(18); code text := substr(hp_tok(6),1,10);
        omid text := p->>'org_mid'; otok text; m jsonb; i int := 0;
begin
  if jsonb_array_length(coalesce(p->'members','[]')) > 200 then raise exception 'too many members'; end if;
  -- Circuit breaker against scripted spam: real peak traffic is far below this.
  if (select count(*) from hp_groups where created_at > now() - interval '1 minute') >= 600 then raise exception 'busy'; end if;
  insert into hp_groups(id, admin_token, join_code, name, occasion, event_date, budget, cur, note, mode, settings, exclusions, org_name)
  values (gid, atok, code, p->>'name', nullif(p->>'occasion',''), nullif(p->>'date','')::date, nullif(p->>'budget',''), coalesce(nullif(p->>'cur',''),'$'),
          nullif(p->>'note',''), coalesce(p->>'mode','draw'), coalesce(p->'settings','{}'), coalesce(p->'exclusions','[]'), p->>'org_name');
  for m in select * from jsonb_array_elements(p->'members') loop
    i := i + 1;
    insert into hp_members(group_id, id, name, receiver_id, sort, is_org)
    values (gid, m->>'id', m->>'name', p->'assignment'->>(m->>'id'), i, coalesce((m->>'id') = omid, false));
  end loop;
  if omid is not null then
    otok := hp_tok(18);
    update hp_members set token = otok, claimed_at = now() where group_id = gid and id = omid;
  end if;
  return jsonb_build_object('id', gid, 'admin_token', atok, 'join_code', code, 'org_mid', omid, 'org_token', otok);
end $$;

create or replace function public.hp_state(p_gid text, p_mtok text, p_atok text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups; me hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  adm := p_atok is not null and g.admin_token = p_atok;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  if not adm and me.id is null then raise exception 'forbidden'; end if;
  vis_all := g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn';
  mail_on := coalesce((g.settings->'mail'->>'on')::boolean, false);
  mail_all := coalesce(g.settings->'mail'->>'vis','drawn') = 'all';
  return jsonb_build_object(
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'occasion', g.occasion, 'date', g.event_date, 'budget', g.budget, 'cur', g.cur,
       'note', g.note, 'mode', g.mode, 'settings', g.settings, 'exclusions', g.exclusions, 'org_name', g.org_name, 'round', g.round,
       'live_at', g.live_at, 'created_at', g.created_at, 'join_code', case when adm then g.join_code end),
    'is_admin', adm,
    'me', case when me.id is null then null else jsonb_build_object('id', me.id, 'name', me.name, 'receiver_id', me.receiver_id,
       'drawn', coalesce(me.drawn_round = g.round, false), 'is_org', me.is_org, 'reset_count', me.reset_count) end,
    'members', coalesce((select jsonb_agg(x order by s) from (
       select m.sort as s, jsonb_build_object('id', m.id, 'name', m.name, 'kid', m.kid, 'parent_id', m.parent_id, 'is_org', m.is_org,
         'claimed', m.token is not null or m.kid, 'drawn', coalesce(m.drawn_round = g.round, false),
         'wishes', coalesce(jsonb_array_length(m.profile->'items'), 0),
         'visible', (me.id is null or m.id = me.id or m.parent_id = me.id or vis_all or me.receiver_id = m.id or m.kid),
         'profile', case when (me.id is null or m.id = me.id or m.parent_id = me.id or vis_all or me.receiver_id = m.id or m.kid)
              then (m.profile - 'address')
                   || case when m.profile ? 'address' and (m.id = me.id or m.parent_id = me.id
                             or (mail_on and (mail_all or me.receiver_id = m.id)))
                      then jsonb_build_object('address', m.profile->'address') else '{}'::jsonb end
              else null end) as x
       from hp_members m where m.group_id = g.id) q), '[]'),
    'reservations', coalesce((select jsonb_agg(jsonb_build_object('owner', r.owner_id, 'item', r.item_id, 'mine', r.by_member = me.id))
       from hp_reservations r join hp_members o on o.group_id = r.group_id and o.id = r.owner_id
       where r.group_id = g.id and (me.id is null or (o.id <> me.id and o.parent_id is distinct from me.id))), '[]'),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'to', q.to_member, 'body', q.body, 'answer', q.answer, 'at', q.created_at) order by q.created_at desc)
       from hp_questions q where q.group_id = g.id), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'body', x.body, 'at', x.created_at) order by x.created_at desc)
       from (select * from hp_messages where group_id = g.id order by created_at desc limit 100) x), '[]')
  );
end $$;

create or replace function public.hp_admin_reset_member(p_gid text, p_atok text, p_mid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  -- Frees a claimed name so its owner can pick it again from the invitation link. The match itself is kept.
  update hp_members set token = null, claimed_at = null, drawn_round = null, reset_count = reset_count + 1
   where group_id = p_gid and id = p_mid and not kid and token is not null;
  if not found then raise exception 'not_joined'; end if;
end $$;

revoke all on function public.hp_admin_reset_member(text, text, text) from public;

grant execute on function public.hp_admin_reset_member(text, text, text) to anon, authenticated;
