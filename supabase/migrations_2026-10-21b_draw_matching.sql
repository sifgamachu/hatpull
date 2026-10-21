-- Fair + exact draw (rejection sampling, then matching), results date floor, unwrap-gated visibility, 30s live countdown
drop function if exists public.hp_draw_dfs(text[], int, text[], jsonb, jsonb);

create or replace function public.hp_draw(p_ids text[], p_excl jsonb) returns jsonb
language plpgsql volatile set search_path = public as $$
-- A valid draw: everyone gives once and receives once, nobody draws themselves, no excluded giver->receiver pair.
-- 1) Rejection sampling (shuffle until valid): every valid draw is equally likely; fast for real groups.
-- 2) Fallback for tightly constrained groups: random-order bipartite matching (BFS augmenting paths), which
--    always finds a valid draw when one exists.
declare
  n int := coalesce(array_length(p_ids, 1), 0);
  pos jsonb := '{}'::jsonb; ok boolean[]; x jsonb; a int; b int; t int; g int; r int; u int; prev int; good boolean;
  p int[]; owner int[]; mg int[]; par int[]; seen boolean[]; q int[]; qh int; found int; rord int[]; gord int[];
begin
  if n < 2 then return null; end if;
  for i in 1..n loop pos := pos || jsonb_build_object(p_ids[i], i); end loop;
  ok := array_fill(true, array[n * n]);
  for i in 1..n loop ok[(i - 1) * n + i] := false; end loop;
  for x in select * from jsonb_array_elements(coalesce(p_excl, '[]'::jsonb)) loop
    a := (pos->>(x->>'a'))::int; b := (pos->>(x->>'b'))::int;
    if a is not null and b is not null then ok[(a - 1) * n + b] := false; end if;
  end loop;
  for t in 1..400 loop
    select array_agg(v order by random()) into p from generate_series(1, n) v;
    good := true;
    for i in 1..n loop if not ok[(i - 1) * n + p[i]] then good := false; exit; end if; end loop;
    if good then return (select jsonb_object_agg(p_ids[i], p_ids[p[i]]) from generate_series(1, n) i); end if;
  end loop;
  owner := array_fill(0, array[n]); mg := array_fill(0, array[n]);
  select array_agg(v order by random()) into rord from generate_series(1, n) v;
  select array_agg(v order by random()) into gord from generate_series(1, n) v;
  foreach g in array gord loop
    par := array_fill(0, array[n]); seen := array_fill(false, array[n]); q := array[g]; qh := 1; found := 0;
    while qh <= coalesce(array_length(q, 1), 0) and found = 0 loop
      u := q[qh]; qh := qh + 1;
      foreach r in array rord loop
        if ok[(u - 1) * n + r] and not seen[r] then
          seen[r] := true; par[r] := u;
          if owner[r] = 0 then found := r; exit; end if;
          q := q || owner[r];
        end if;
      end loop;
    end loop;
    if found = 0 then return null; end if;
    r := found;
    while r <> 0 loop
      u := par[r]; prev := mg[u]; mg[u] := r; owner[r] := u; r := prev;
    end loop;
  end loop;
  return (select jsonb_object_agg(p_ids[i], p_ids[mg[i]]) from generate_series(1, n) i);
end $$;

revoke all on function public.hp_draw(text[], jsonb) from public, anon, authenticated;

create or replace function public.hp_create_group(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare gid text := substr(hp_tok(8),1,12); atok text := hp_tok(18); code text := hp_tok(10);
        omid text := p->>'org_mid'; otok text; m jsonb; i int := 0; ids text[]; excl jsonb; asg jsonb;
        md text := case when p->>'mode' = 'wish' then 'wish' else 'draw' end;
begin
  if not hp_valid_members(p->'members') then raise exception 'invalid members'; end if;
  if char_length(coalesce(p->'settings','{}')::text) > 4000 then raise exception 'too large'; end if;
  -- Circuit breaker against scripted spam: real peak traffic is far below this.
  if (select count(*) from hp_groups where created_at > now() - interval '1 minute') >= 600 then raise exception 'busy'; end if;
  select array_agg(x->>'id') into ids from jsonb_array_elements(p->'members') x;
  if md = 'draw' then
    if array_length(ids, 1) < 3 then raise exception 'too few'; end if;
    excl := hp_clean_excl(p->'exclusions', ids);
    asg := hp_draw(ids, excl);
    if asg is null then raise exception 'no_valid_draw'; end if;
  else
    if array_length(ids, 1) < 2 then raise exception 'too few'; end if;
    excl := '[]'::jsonb;
  end if;
  if omid is not null and not (omid = any(ids)) then omid := null; end if;
  insert into hp_groups(id, admin_token, join_code, name, occasion, event_date, results_after, budget, cur, note, mode, settings, exclusions, org_name)
  values (gid, atok, code, p->>'name', nullif(p->>'occasion',''), nullif(p->>'date','')::date, greatest(nullif(p->>'date','')::date, current_date), nullif(p->>'budget',''), coalesce(nullif(p->>'cur',''),'$'),
          nullif(p->>'note',''), md, coalesce(p->'settings','{}'), excl, p->>'org_name');
  for m in select * from jsonb_array_elements(p->'members') loop
    i := i + 1;
    insert into hp_members(group_id, id, name, receiver_id, sort, is_org)
    values (gid, m->>'id', m->>'name', asg->>(m->>'id'), i, coalesce((m->>'id') = omid, false));
  end loop;
  if omid is not null then
    otok := hp_tok(18);
    update hp_members set token = otok, claimed_at = now() where group_id = gid and id = omid;
  end if;
  return jsonb_build_object('id', gid, 'admin_token', atok, 'join_code', code, 'org_mid', omid, 'org_token', otok);
end $$;

create or replace function public.hp_admin_update(p_gid text, p_atok text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare nd date := case when p ? 'date' then nullif(p->>'date','')::date end;
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  if char_length(coalesce(p->'settings','{}')::text) > 4000 then raise exception 'too large'; end if;
  update hp_groups set
    name = coalesce(nullif(left(p->>'name', 80),''), name),
    event_date = case when p ? 'date' then nd else event_date end,
    -- The date the organizer may see results can only move later, so moving the date back can't unlock them early.
    results_after = case when nd is null then results_after else greatest(coalesce(results_after, nd), nd, current_date) end,
    budget = case when p ? 'budget' then nullif(left(p->>'budget', 12),'') else budget end,
    cur = coalesce(nullif(left(p->>'cur', 4),''), cur),
    note = case when p ? 'note' then nullif(left(p->>'note', 500),'') else note end,
    settings = case when p ? 'settings' then p->'settings' else settings end
  where id = p_gid;
end $$;

create or replace function public.hp_state(p_gid text, p_mtok text, p_atok text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups; me hp_members; v hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  adm := p_atok is not null and g.admin_token = p_atok;
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
       'drawn', coalesce(me.drawn_round = g.round, false), 'is_org', me.is_org, 'reset_count', me.reset_count) end,
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
end $$;

create or replace function public.hp_reserve(p_gid text, p_mtok text, p_owner text, p_item text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null or p_owner = me.id then raise exception 'forbidden'; end if;
  if p_on and not exists (
    select 1 from hp_members o join hp_groups g on g.id = o.group_id
    where o.group_id = p_gid and o.id = p_owner and o.parent_id is distinct from me.id
      and (g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn' or (me.receiver_id = o.id and me.drawn_round = g.round) or o.kid)
  ) then raise exception 'forbidden'; end if;
  if p_on then
    insert into hp_reservations(group_id, owner_id, item_id, by_member) values (p_gid, p_owner, left(p_item, 20), me.id) on conflict do nothing;
  else
    delete from hp_reservations where group_id = p_gid and owner_id = p_owner and item_id = p_item and by_member = me.id;
  end if;
end $$;

create or replace function public.hp_admin_live(p_gid text, p_atok text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now() + interval '30 seconds';
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  update hp_groups set live_at = t where id = p_gid;
  return t;
end $$;
