-- Hatpull schema. Tables are private (RLS on, no policies, no grants to API roles).
-- Every read/write goes through security-definer functions that check the caller's private token.

create table if not exists public.hp_groups (
  id text primary key,
  admin_token text not null,
  join_code text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  occasion text check (char_length(occasion) <= 40),
  event_date date,
  budget text check (char_length(budget) <= 12),
  cur text not null default '$' check (char_length(cur) <= 4),
  note text check (char_length(note) <= 500),
  mode text not null default 'draw' check (mode in ('draw','wish')),
  settings jsonb not null default '{}'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  org_name text check (char_length(org_name) <= 40),
  round int not null default 1,
  live_at timestamptz,
  results_after date,
  created_at timestamptz not null default now()
);
create table if not exists public.hp_members (
  group_id text not null references public.hp_groups(id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 40),
  kid boolean not null default false,
  parent_id text,
  is_org boolean not null default false,
  token text unique,
  claimed_at timestamptz,
  receiver_id text,
  drawn_round int,
  reset_count int not null default 0,
  profile jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  primary key (group_id, id)
);
create table if not exists public.hp_reservations (
  group_id text not null,
  owner_id text not null,
  item_id text not null,
  by_member text not null,
  created_at timestamptz not null default now(),
  primary key (group_id, owner_id, item_id),
  foreign key (group_id, owner_id) references public.hp_members(group_id, id) on delete cascade
);
create table if not exists public.hp_questions (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  to_member text not null,
  body text not null check (char_length(body) between 1 and 300),
  answer text check (char_length(answer) <= 300),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  foreign key (group_id, to_member) references public.hp_members(group_id, id) on delete cascade
);
create table if not exists public.hp_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.hp_groups(id) on delete cascade,
  member_id text,
  name text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists hp_messages_group_idx on public.hp_messages(group_id, created_at desc);
create index if not exists hp_questions_group_idx on public.hp_questions(group_id);
create index if not exists hp_reservations_group_idx on public.hp_reservations(group_id);
create index if not exists hp_groups_created_idx on public.hp_groups(created_at);

-- Columns added after launch (safe to rerun on an existing database)
alter table public.hp_members add column if not exists reset_count int not null default 0;
alter table public.hp_groups add column if not exists results_after date;
alter table public.hp_groups add column if not exists creator_hash text;
create index if not exists hp_groups_creator_idx on public.hp_groups(creator_hash, created_at);
update public.hp_groups set results_after = event_date where results_after is null and event_date is not null;

alter table public.hp_groups enable row level security;
alter table public.hp_members enable row level security;
alter table public.hp_reservations enable row level security;
alter table public.hp_questions enable row level security;
alter table public.hp_messages enable row level security;
revoke all on public.hp_groups, public.hp_members, public.hp_reservations, public.hp_questions, public.hp_messages from anon, authenticated;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.hp_tok(n int) returns text language sql volatile set search_path = public, extensions as $$
  select encode(extensions.gen_random_bytes(n), 'hex') $$;
revoke all on function public.hp_tok(int) from public, anon, authenticated;

-- ---------- draw + validation helpers (private) ----------
-- The draw runs inside the database so nobody, including the organizer, can supply or choose the result.
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
revoke all on function public.hp_draw(text[], jsonb), public.hp_valid_members(jsonb), public.hp_clean_excl(jsonb, text[]), public.hp_valid_profile(jsonb) from public, anon, authenticated;

-- ---------- create ----------
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
  -- Per-person limit (the API passes a one-way hash of the creator's IP address).
  if nullif(p->>'client','') is not null and (select count(*) from hp_groups where creator_hash = p->>'client' and created_at > now() - interval '1 hour') >= 30 then raise exception 'slow_down'; end if;
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
  insert into hp_groups(id, admin_token, join_code, name, occasion, event_date, results_after, budget, cur, note, mode, settings, exclusions, org_name, creator_hash)
  values (gid, atok, code, p->>'name', nullif(p->>'occasion',''), nullif(p->>'date','')::date, greatest(nullif(p->>'date','')::date, current_date), nullif(p->>'budget',''), coalesce(nullif(p->>'cur',''),'$'),
          nullif(p->>'note',''), md, coalesce(p->'settings','{}'), excl, p->>'org_name', left(nullif(p->>'client',''), 64));
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

-- ---------- join ----------
create or replace function public.hp_join_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'occasion', g.occasion, 'date', g.event_date, 'budget', g.budget, 'cur', g.cur,
    'org_name', g.org_name, 'mode', g.mode, 'note', g.note,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'claimed', m.token is not null) order by m.sort)
                         from hp_members m where m.group_id = g.id and not m.kid), '[]'))
  from hp_groups g where g.join_code = p_code $$;

create or replace function public.hp_claim(p_code text, p_mid text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare gid text; t text := hp_tok(18);
begin
  select id into gid from hp_groups where join_code = p_code;
  if gid is null then raise exception 'not_found'; end if;
  update hp_members set token = t, claimed_at = now() where group_id = gid and id = p_mid and token is null and not kid;
  if not found then raise exception 'taken'; end if;
  return jsonb_build_object('id', gid, 'mid', p_mid, 'token', t);
end $$;

-- ---------- state ----------
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
end $$;

-- ---------- member actions ----------
create or replace function public.hp_me(p_gid text, p_mtok text) returns hp_members
language sql stable security definer set search_path = public as $$
  select * from hp_members where group_id = p_gid and token = p_mtok and p_mtok is not null $$;
revoke all on function public.hp_me(text, text) from public, anon, authenticated;

create or replace function public.hp_mark_drawn(p_gid text, p_mtok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update hp_members m set drawn_round = g.round from hp_groups g where g.id = m.group_id and m.group_id = p_gid and m.token = p_mtok and p_mtok is not null;
  if not found then raise exception 'forbidden'; end if;
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
      and (g.mode <> 'draw' or coalesce(g.settings->>'wishVis','all') <> 'drawn' or (me.receiver_id = o.id and me.drawn_round = g.round) or o.kid)
  ) then raise exception 'forbidden'; end if;
  if p_on then
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
  if (select count(*) from hp_questions where group_id = p_gid and created_at > now() - interval '1 hour') > 60 then raise exception 'slow down'; end if;
  insert into hp_questions(group_id, to_member, body) values (p_gid, p_to, left(p_body, 300));
end $$;

create or replace function public.hp_answer(p_gid text, p_mtok text, p_qid uuid, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  update hp_questions set answer = left(p_answer, 300), answered_at = now() where id = p_qid and group_id = p_gid and to_member = me.id;
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function public.hp_message(p_gid text, p_mtok text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  if (select count(*) from hp_messages where group_id = p_gid and created_at > now() - interval '1 hour') > 120 then raise exception 'slow down'; end if;
  insert into hp_messages(group_id, member_id, name, body) values (p_gid, me.id, me.name, left(p_body, 500));
end $$;

create or replace function public.hp_add_kid(p_gid text, p_mtok text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me hp_members := hp_me(p_gid, p_mtok); nid text := 'k' || substr(hp_tok(4),1,6);
begin
  if me.id is null then raise exception 'forbidden'; end if;
  if (select count(*) from hp_members where group_id = p_gid and kid) >= 50 then raise exception 'too many'; end if;
  insert into hp_members(group_id, id, name, kid, parent_id, sort) values (p_gid, nid, left(p_name, 40), true, me.id, 1000);
  return nid;
end $$;

-- ---------- organizer actions ----------
create or replace function public.hp_is_admin(p_gid text, p_atok text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from hp_groups where id = p_gid and admin_token = p_atok and p_atok is not null) $$;
revoke all on function public.hp_is_admin(text, text) from public, anon, authenticated;

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

create or replace function public.hp_admin_live(p_gid text, p_atok text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now() + interval '30 seconds';
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  update hp_groups set live_at = t where id = p_gid;
  return t;
end $$;

create or replace function public.hp_admin_delete(p_gid text, p_atok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  delete from hp_groups where id = p_gid;
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

create or replace function public.hp_admin_reset_member(p_gid text, p_atok text, p_mid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  -- Frees a claimed name so its owner can pick it again from the invitation link. The match itself is kept.
  update hp_members set token = null, claimed_at = null, drawn_round = null, reset_count = reset_count + 1
   where group_id = p_gid and id = p_mid and not kid and token is not null;
  if not found then raise exception 'not_joined'; end if;
end $$;

create or replace function public.hp_admin_roster(p_gid text, p_atok text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  return (select jsonb_build_object('mode', g.mode, 'exclusions', g.exclusions,
     'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) order by m.sort) from hp_members m where m.group_id = g.id and not m.kid), '[]'))
     from hp_groups g where g.id = p_gid);
end $$;

revoke all on function public.hp_create_group(jsonb), public.hp_join_info(text), public.hp_claim(text, text), public.hp_state(text, text, text),
  public.hp_mark_drawn(text, text), public.hp_save_profile(text, text, text, jsonb), public.hp_reserve(text, text, text, text, boolean),
  public.hp_ask(text, text, text, text), public.hp_answer(text, text, uuid, text), public.hp_message(text, text, text), public.hp_add_kid(text, text, text),
  public.hp_admin_update(text, text, jsonb), public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb), public.hp_admin_live(text, text),
  public.hp_admin_delete(text, text), public.hp_results(text, text), public.hp_admin_roster(text, text), public.hp_admin_reset_member(text, text, text) from public;
grant execute on function public.hp_create_group(jsonb), public.hp_join_info(text), public.hp_claim(text, text), public.hp_state(text, text, text),
  public.hp_mark_drawn(text, text), public.hp_save_profile(text, text, text, jsonb), public.hp_reserve(text, text, text, text, boolean),
  public.hp_ask(text, text, text, text), public.hp_answer(text, text, uuid, text), public.hp_message(text, text, text), public.hp_add_kid(text, text, text),
  public.hp_admin_update(text, text, jsonb), public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb), public.hp_admin_live(text, text),
  public.hp_admin_delete(text, text), public.hp_results(text, text), public.hp_admin_roster(text, text), public.hp_admin_reset_member(text, text, text) to anon, authenticated;

-- ===== Accounts (2026-10-21d) =====
-- Optional accounts (Supabase Auth: Google or email link) and email preferences.
-- Signing in is never required. When a person signs in, their name in a group is linked to their account:
--  * the name can then only be picked again by that same account (a reset can't be used to see their match),
--  * their celebrations come back on any device,
--  * they can get reminder emails, and separately opt in to marketing emails.

alter table public.hp_members add column if not exists user_id uuid;
alter table public.hp_groups add column if not exists owner_id uuid;
create index if not exists hp_members_user_idx on public.hp_members(user_id) where user_id is not null;
create index if not exists hp_groups_owner_idx on public.hp_groups(owner_id) where owner_id is not null;

create table if not exists public.hp_profiles (
  user_id uuid primary key,
  email text,
  name text,
  reminders boolean not null default true,
  marketing boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_text text,
  marketing_withdrawn_at timestamptz,
  unsub_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.hp_email_log (
  user_id uuid not null,
  group_id text not null,
  kind text not null,
  sent_on date not null default current_date,
  primary key (user_id, group_id, kind, sent_on)
);
alter table public.hp_profiles enable row level security;
alter table public.hp_email_log enable row level security;
revoke all on table public.hp_profiles, public.hp_email_log from anon, authenticated;

-- The signed-in user's profile, created on first use from the sign-in details.
create or replace function public.hp_account() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); j jsonb := auth.jwt(); p hp_profiles;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into hp_profiles(user_id, email, name, unsub_token)
  values (uid, j->>'email', left(coalesce(j->'user_metadata'->>'full_name', j->'user_metadata'->>'name', ''), 80), hp_tok(16))
  on conflict (user_id) do update set email = coalesce(excluded.email, hp_profiles.email), updated_at = now()
  returning * into p;
  return jsonb_build_object('email', p.email, 'name', p.name, 'reminders', p.reminders, 'marketing', p.marketing,
    'marketing_consent_at', p.marketing_consent_at);
end $$;

create or replace function public.hp_set_prefs(p_reminders boolean, p_marketing boolean, p_consent_text text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); was boolean;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform hp_account();
  select marketing into was from hp_profiles where user_id = uid;
  update hp_profiles set
    reminders = coalesce(p_reminders, reminders),
    marketing = coalesce(p_marketing, marketing),
    marketing_consent_at = case when p_marketing and not was then now() else marketing_consent_at end,
    marketing_consent_text = case when p_marketing and not was then left(p_consent_text, 500) else marketing_consent_text end,
    marketing_withdrawn_at = case when p_marketing = false and was then now() else marketing_withdrawn_at end,
    updated_at = now()
  where user_id = uid;
end $$;

-- Link this device's celebration tokens to the signed-in account.
create or replace function public.hp_link(p_gid text, p_mtok text, p_atok text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m hp_members; linked_member boolean := false; linked_owner boolean := false;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_mtok is not null then
    select * into m from hp_members where group_id = p_gid and token = p_mtok;
    if m.id is not null then
      if m.user_id is null then update hp_members set user_id = uid where group_id = p_gid and id = m.id; linked_member := true;
      elsif m.user_id = uid then linked_member := true;
      else raise exception 'linked_elsewhere'; end if;
    end if;
  end if;
  if p_atok is not null and hp_is_admin(p_gid, p_atok) then
    update hp_groups set owner_id = coalesce(owner_id, uid) where id = p_gid;
    linked_owner := (select owner_id = uid from hp_groups where id = p_gid);
  end if;
  return jsonb_build_object('member', linked_member, 'owner', linked_owner);
end $$;

-- Everything this account belongs to, with fresh tokens (a reset linked name gets a new private link here).
create or replace function public.hp_my() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  update hp_members set token = hp_tok(18), claimed_at = now() where user_id = uid and token is null and not kid;
  return coalesce((
    select jsonb_agg(x) from (
      select g.id as gid, g.name, g.event_date as date, g.occasion, m.token as mtok, m.id as mid, m.name as "myName",
             case when g.owner_id = uid then g.admin_token end as atok
      from hp_members m join hp_groups g on g.id = m.group_id where m.user_id = uid and not m.kid
      union all
      select g.id, g.name, g.event_date, g.occasion, null, null, null, g.admin_token
      from hp_groups g where g.owner_id = uid and not exists (select 1 from hp_members m where m.group_id = g.id and m.user_id = uid)
    ) x), '[]'::jsonb);
end $$;

-- Claiming a name that's linked to an account requires being signed in as that account.
create or replace function public.hp_claim(p_code text, p_mid text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare gid text; t text := hp_tok(18); owner uuid; uid uuid := auth.uid();
begin
  select id into gid from hp_groups where join_code = p_code;
  if gid is null then raise exception 'not_found'; end if;
  select user_id into owner from hp_members where group_id = gid and id = p_mid and not kid;
  if owner is not null and (uid is null or uid <> owner) then raise exception 'protected'; end if;
  update hp_members set token = t, claimed_at = now(), user_id = coalesce(user_id, uid)
   where group_id = gid and id = p_mid and token is null and not kid;
  if not found then raise exception 'taken'; end if;
  return jsonb_build_object('id', gid, 'mid', p_mid, 'token', t);
end $$;

create or replace function public.hp_join_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'occasion', g.occasion, 'date', g.event_date, 'budget', g.budget, 'cur', g.cur,
    'org_name', g.org_name, 'mode', g.mode, 'note', g.note,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'claimed', m.token is not null,
                                                             'protected', m.user_id is not null, 'mine', m.user_id = auth.uid()) order by m.sort)
                         from hp_members m where m.group_id = g.id and not m.kid), '[]'))
  from hp_groups g where g.join_code = p_code $$;

-- One-click unsubscribe from an email link (no sign-in needed). kind: 'marketing' or 'all'.
create or replace function public.hp_unsubscribe(p_token text, p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update hp_profiles set
    marketing = false,
    marketing_withdrawn_at = case when marketing then now() else marketing_withdrawn_at end,
    reminders = case when p_kind = 'all' then false else reminders end,
    updated_at = now()
  where unsub_token = p_token;
  return found;
end $$;

-- Delete my account data: unlink my names (they stay in their groups), drop my profile and email history.
create or replace function public.hp_forget_me() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  update hp_members set user_id = null where user_id = uid;
  update hp_groups set owner_id = null where owner_id = uid;
  delete from hp_email_log where user_id = uid;
  delete from hp_profiles where user_id = uid;
end $$;

-- For the daily reminder job only (server key): who gets which reminder today.
create or replace function public.hp_due_reminders() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select p.user_id, p.email, coalesce(nullif(p.name, ''), m.name) as name, m.name as member_name, g.id as gid, g.name as group_name,
           g.event_date as date, g.budget, g.cur, (g.event_date - current_date) as days, p.unsub_token,
           g.mode, coalesce(m.drawn_round = g.round, false) as drawn,
           case when jsonb_typeof(m.profile->'items') = 'array' then jsonb_array_length(m.profile->'items') else 0 end as wishes,
           case when (g.event_date - current_date) = 1 then 'tomorrow'
                when (g.event_date - current_date) = 7 then 'week' end as kind
    from hp_members m join hp_groups g on g.id = m.group_id join hp_profiles p on p.user_id = m.user_id
    where p.reminders and p.email is not null and not m.kid and g.event_date - current_date in (1, 7)
      and not exists (select 1 from hp_email_log l where l.user_id = p.user_id and l.group_id = g.id
                      and l.kind = case when (g.event_date - current_date) = 1 then 'tomorrow' else 'week' end)
  ) x $$;

create or replace function public.hp_log_sent(p_user uuid, p_gid text, p_kind text) returns void
language sql security definer set search_path = public as $$
  insert into hp_email_log(user_id, group_id, kind) values (p_user, p_gid, p_kind) on conflict do nothing $$;

revoke all on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text), public.hp_link(text, text, text), public.hp_my(),
  public.hp_forget_me(), public.hp_unsubscribe(text, text), public.hp_due_reminders(), public.hp_log_sent(uuid, text, text),
  public.hp_claim(text, text), public.hp_join_info(text) from public;
grant execute on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text), public.hp_link(text, text, text),
  public.hp_my(), public.hp_forget_me() to authenticated;
grant execute on function public.hp_unsubscribe(text, text), public.hp_claim(text, text), public.hp_join_info(text) to anon, authenticated;
grant execute on function public.hp_due_reminders(), public.hp_log_sent(uuid, text, text) to service_role;

-- hp_state: tell the page whether this person's name is linked to an account
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
end $$;

-- Consent proof: where and how marketing consent was given (with timestamp and exact text above).
alter table public.hp_profiles add column if not exists marketing_consent_source text;
-- Permanent do-not-email list (one-way hash of the address), kept even after an account is deleted.
create table if not exists public.hp_suppression (email_hash text primary key, reason text, created_at timestamptz not null default now());
alter table public.hp_suppression enable row level security;
revoke all on table public.hp_suppression from anon, authenticated;

drop function if exists public.hp_set_prefs(boolean, boolean, text);
create or replace function public.hp_set_prefs(p_reminders boolean, p_marketing boolean, p_consent_text text, p_source text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); was boolean; em text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform hp_account();
  select marketing, email into was, em from hp_profiles where user_id = uid;
  update hp_profiles set
    reminders = coalesce(p_reminders, reminders),
    marketing = coalesce(p_marketing, marketing),
    marketing_consent_at = case when p_marketing and not was then now() else marketing_consent_at end,
    marketing_consent_text = case when p_marketing and not was then left(p_consent_text, 500) else marketing_consent_text end,
    marketing_consent_source = case when p_marketing and not was then left(p_source, 200) else marketing_consent_source end,
    marketing_withdrawn_at = case when p_marketing = false and was then now() else marketing_withdrawn_at end,
    updated_at = now()
  where user_id = uid;
  if p_marketing = false and was and em is not null then
    insert into hp_suppression(email_hash, reason) values (encode(digest(lower(em), 'sha256'), 'hex'), 'marketing_withdrawn') on conflict do nothing;
  end if;
  if p_marketing and em is not null then delete from hp_suppression where email_hash = encode(digest(lower(em), 'sha256'), 'hex'); end if;
end $$;

create or replace function public.hp_unsubscribe(p_token text, p_kind text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare em text;
begin
  update hp_profiles set
    marketing = false,
    marketing_withdrawn_at = case when marketing then now() else marketing_withdrawn_at end,
    reminders = case when p_kind = 'all' then false else reminders end,
    updated_at = now()
  where unsub_token = p_token returning email into em;
  if em is null then return false; end if;
  insert into hp_suppression(email_hash, reason) values (encode(digest(lower(em), 'sha256'), 'hex'), 'unsubscribed_' || coalesce(p_kind, 'marketing')) on conflict do nothing;
  return true;
end $$;

create or replace function public.hp_forget_me() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); em text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select email into em from hp_profiles where user_id = uid;
  -- Keep only a one-way hash so we never email this address again by mistake.
  if em is not null then insert into hp_suppression(email_hash, reason) values (encode(digest(lower(em), 'sha256'), 'hex'), 'account_deleted') on conflict do nothing; end if;
  update hp_members set user_id = null where user_id = uid;
  update hp_groups set owner_id = null where owner_id = uid;
  delete from hp_email_log where user_id = uid;
  delete from hp_profiles where user_id = uid;
end $$;

-- Everything we hold about the signed-in person, as JSON (data portability / access requests).
create or replace function public.hp_export_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'account', (select to_jsonb(p) - 'unsub_token' from hp_profiles p where p.user_id = uid),
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('celebration', g.name, 'date', g.event_date, 'your_name', m.name, 'wish_list', m.profile)) from hp_members m join hp_groups g on g.id = m.group_id where m.user_id = uid), '[]'),
    'organized', coalesce((select jsonb_agg(jsonb_build_object('celebration', g.name, 'date', g.event_date)) from hp_groups g where g.owner_id = uid), '[]'),
    'emails_sent', coalesce((select jsonb_agg(jsonb_build_object('celebration', l.group_id, 'kind', l.kind, 'date', l.sent_on)) from hp_email_log l where l.user_id = uid), '[]'));
end $$;

-- Reminders skip anyone on the do-not-email list.
create or replace function public.hp_due_reminders() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select p.user_id, p.email, coalesce(nullif(p.name, ''), m.name) as name, m.name as member_name, g.id as gid, g.name as group_name,
           g.event_date as date, g.budget, g.cur, (g.event_date - current_date) as days, p.unsub_token,
           g.mode, coalesce(m.drawn_round = g.round, false) as drawn,
           case when jsonb_typeof(m.profile->'items') = 'array' then jsonb_array_length(m.profile->'items') else 0 end as wishes,
           case when (g.event_date - current_date) = 1 then 'tomorrow' else 'week' end as kind
    from hp_members m join hp_groups g on g.id = m.group_id join hp_profiles p on p.user_id = m.user_id
    where p.reminders and p.email is not null and not m.kid and g.event_date - current_date in (1, 7)
      and not exists (select 1 from hp_suppression s where s.email_hash = encode(digest(lower(p.email), 'sha256'), 'hex') and s.reason in ('unsubscribed_all', 'account_deleted'))
      and not exists (select 1 from hp_email_log l where l.user_id = p.user_id and l.group_id = g.id
                      and l.kind = case when (g.event_date - current_date) = 1 then 'tomorrow' else 'week' end)
  ) x $$;

revoke all on function public.hp_set_prefs(boolean, boolean, text, text), public.hp_export_me(), public.hp_unsubscribe(text, text), public.hp_forget_me(), public.hp_due_reminders() from public;
grant execute on function public.hp_set_prefs(boolean, boolean, text, text), public.hp_export_me(), public.hp_forget_me() to authenticated;
grant execute on function public.hp_unsubscribe(text, text) to anon, authenticated;
grant execute on function public.hp_due_reminders() to service_role;

-- Supabase grants new functions to anon/authenticated by default; "revoke ... from public" alone doesn't remove that.
revoke execute on function public.hp_due_reminders(), public.hp_log_sent(uuid, text, text) from anon, authenticated, public;
revoke execute on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text, text), public.hp_link(text, text, text), public.hp_my(), public.hp_forget_me(), public.hp_export_me() from anon, public;
grant execute on function public.hp_due_reminders(), public.hp_log_sent(uuid, text, text) to service_role;
grant execute on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text, text), public.hp_link(text, text, text), public.hp_my(), public.hp_forget_me(), public.hp_export_me() to authenticated;
-- Run AFTER SUPABASE_SECRET_KEY is set in Vercel and deployed: only the website's server may create groups or redraw.
revoke execute on function public.hp_create_group(jsonb) from anon, authenticated, public;
revoke execute on function public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb) from anon, authenticated, public;
grant execute on function public.hp_create_group(jsonb) to service_role;
grant execute on function public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb) to service_role;
