-- QA security fixes (2026-10-21): draw made in the database, results date can't move earlier, profile validation, size caps
alter table public.hp_groups add column if not exists results_after date;

update public.hp_groups set results_after = event_date where results_after is null and event_date is not null;

-- ---------- draw + validation helpers (private) ----------
-- The draw runs inside the database so nobody, including the organizer, can supply or choose the result.
-- Randomized greedy assignment with restarts: nobody draws themselves, exclusions (giver|receiver) are respected.
create or replace function public.hp_draw_dfs(p_order text[], k int, p_avail text[], p_ex jsonb, p_res jsonb) returns jsonb
language plpgsql volatile set search_path = public as $$
declare g text := p_order[k]; r text; o jsonb; c int;
begin
  if k > array_length(p_order, 1) then return p_res; end if;
  c := coalesce(nullif(current_setting('hp.steps', true), ''), '0')::int + 1;
  perform set_config('hp.steps', c::text, true);
  if c > 20000 then return null; end if;
  for r in select v from unnest(p_avail) v where v <> g and not (p_ex ? (g || '|' || v)) order by random() loop
    o := hp_draw_dfs(p_order, k + 1, array_remove(p_avail, r), p_ex, p_res || jsonb_build_object(g, r));
    if o is not null then return o; end if;
  end loop;
  return null;
end $$;

create or replace function public.hp_draw(p_ids text[], p_excl jsonb) returns jsonb
language plpgsql volatile set search_path = public as $$
declare
  n int := coalesce(array_length(p_ids, 1), 0);
  ex jsonb := '{}'::jsonb; x jsonb; att int; ord text[]; avail text[]; cand text[]; g text; r text; res jsonb; ok boolean;
begin
  if n < 2 then return null; end if;
  for x in select * from jsonb_array_elements(coalesce(p_excl, '[]'::jsonb)) loop
    ex := ex || jsonb_build_object((x->>'a') || '|' || (x->>'b'), true);
  end loop;
  -- Quick impossibility checks: everyone needs someone to give to and someone to receive from.
  if exists (select 1 from unnest(p_ids) a where not exists (select 1 from unnest(p_ids) b where b <> a and not (ex ? (a || '|' || b))))
     or exists (select 1 from unnest(p_ids) b where not exists (select 1 from unnest(p_ids) a where a <> b and not (ex ? (a || '|' || b)))) then
    return null;
  end if;
  -- Most constrained givers first, random among equals.
  select array_agg(a order by (select count(*) from unnest(p_ids) b where b <> a and not (ex ? (a || '|' || b))), random())
    into ord from unnest(p_ids) a;
  -- Fast path: randomized greedy with a few restarts (almost always succeeds for real groups).
  for att in 1..30 loop
    avail := p_ids; res := '{}'::jsonb; ok := true;
    foreach g in array ord loop
      select array_agg(v) into cand from unnest(avail) v where v <> g and not (ex ? (g || '|' || v));
      if cand is null then ok := false; exit; end if;
      r := cand[1 + floor(random() * array_length(cand, 1))::int];
      res := res || jsonb_build_object(g, r);
      avail := array_remove(avail, r);
    end loop;
    if ok then return res; end if;
  end loop;
  -- Exhaustive randomized backtracking for tightly constrained groups (bounded work).
  if n > 60 then return null; end if;
  perform set_config('hp.steps', '0', true);
  return hp_draw_dfs(ord, 1, p_ids, ex, '{}'::jsonb);
end $$;

-- Members: 1..200 objects with short safe ids and 1..40 char names, ids unique.
create or replace function public.hp_valid_members(p_members jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p_members) = 'array'
     and jsonb_array_length(p_members) between 1 and 200
     and not exists (select 1 from jsonb_array_elements(p_members) m
                     where jsonb_typeof(m) <> 'object' or coalesce(m->>'id','') !~ '^[A-Za-z0-9_-]{1,12}$'
                        or char_length(coalesce(m->>'name','')) not between 1 and 40)
     and (select count(distinct m->>'id') from jsonb_array_elements(p_members) m) = jsonb_array_length(p_members) $$;

-- Exclusions: up to 2000 {a,b} pairs that only reference the given member ids.
create or replace function public.hp_clean_excl(p_excl jsonb, p_ids text[]) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('a', x->>'a', 'b', x->>'b')), '[]'::jsonb)
  from (select x from jsonb_array_elements(case when jsonb_typeof(p_excl) = 'array' then p_excl else '[]'::jsonb end) x limit 2000) q
  where (x->>'a') = any(p_ids) and (x->>'b') = any(p_ids) and (x->>'a') <> (x->>'b') $$;

-- Wish-list profile shape: an object of short strings plus up to 50 items of short strings.
create or replace function public.hp_valid_profile(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'object'
     and not exists (select 1 from jsonb_each(p) e where e.key <> 'items' and (jsonb_typeof(e.value) <> 'string' or char_length(e.value #>> '{}') > 1000))
     and (not p ? 'items' or (jsonb_typeof(p->'items') = 'array' and jsonb_array_length(p->'items') <= 50
          and not exists (select 1 from jsonb_array_elements(p->'items') it
                          where jsonb_typeof(it) <> 'object'
                             or exists (select 1 from jsonb_each(it) f where jsonb_typeof(f.value) <> 'string' or char_length(f.value #>> '{}') > 500)))) $$;
revoke all on function public.hp_draw(text[], jsonb), public.hp_draw_dfs(text[], int, text[], jsonb, jsonb), public.hp_valid_members(jsonb), public.hp_clean_excl(jsonb, text[]), public.hp_valid_profile(jsonb) from public, anon, authenticated;

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
  values (gid, atok, code, p->>'name', nullif(p->>'occasion',''), nullif(p->>'date','')::date, nullif(p->>'date','')::date, nullif(p->>'budget',''), coalesce(nullif(p->>'cur',''),'$'),
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
         'visible', (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or v.receiver_id = m.id or m.kid),
         'profile', case when (v.id is null or m.id = v.id or m.parent_id = v.id or vis_all or v.receiver_id = m.id or m.kid)
              then (m.profile - 'address')
                   || case when m.profile ? 'address' and (m.id = v.id or m.parent_id = v.id
                             or (mail_on and (mail_all or v.receiver_id = m.id)))
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

create or replace function public.hp_save_profile(p_gid text, p_mtok text, p_target text, p_profile jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  if char_length(p_profile::text) > 20000 then raise exception 'too large'; end if;
  if not hp_valid_profile(p_profile) then raise exception 'invalid profile'; end if;
  update hp_members set profile = p_profile where group_id = p_gid and id = p_target and (id = me.id or (kid and parent_id = me.id));
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function public.hp_reserve(p_gid text, p_mtok text, p_owner text, p_item text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null or p_owner = me.id then raise exception 'forbidden'; end if;
  if p_on and not exists (
    select 1 from hp_members o join hp_groups g on g.id = o.group_id
    where o.group_id = p_gid and o.id = p_owner and o.parent_id is distinct from me.id
      and (g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn' or me.receiver_id = o.id or o.kid)
  ) then raise exception 'forbidden'; end if;
  if p_on then
    insert into hp_reservations(group_id, owner_id, item_id, by_member) values (p_gid, p_owner, left(p_item, 20), me.id) on conflict do nothing;
  else
    delete from hp_reservations where group_id = p_gid and owner_id = p_owner and item_id = p_item and by_member = me.id;
  end if;
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
    results_after = case when nd is null then results_after else greatest(coalesce(results_after, nd), nd) end,
    budget = case when p ? 'budget' then nullif(left(p->>'budget', 12),'') else budget end,
    cur = coalesce(nullif(left(p->>'cur', 4),''), cur),
    note = case when p ? 'note' then nullif(left(p->>'note', 500),'') else note end,
    settings = case when p ? 'settings' then p->'settings' else settings end
  where id = p_gid;
end $$;

create or replace function public.hp_admin_redraw(p_gid text, p_atok text, p_members jsonb, p_exclusions jsonb, p_assignment jsonb) returns void
language plpgsql security definer set search_path = public as $$
-- p_assignment is ignored (kept for compatibility): the new draw is always made here, in the database.
declare m jsonb; i int := 0; ids text[]; g hp_groups; excl jsonb; asg jsonb;
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
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
end $$;

create or replace function public.hp_results(p_gid text, p_atok text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups;
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  select * into g from hp_groups where id = p_gid;
  -- Unlocks once the event day is over everywhere in the Americas (noon UTC the next day), and only
  -- against the latest date the organizer ever set, so moving the date back doesn't reveal results early.
  if g.results_after is null or now() < (g.results_after + 1)::timestamp at time zone 'UTC' + interval '12 hours' then return null; end if;
  return (select jsonb_agg(jsonb_build_object('giver', a.name, 'receiver', b.name) order by a.sort)
          from hp_members a join hp_members b on b.group_id = a.group_id and b.id = a.receiver_id where a.group_id = p_gid and not a.kid);
end $$;
