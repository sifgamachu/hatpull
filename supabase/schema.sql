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

-- ---------- create ----------
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
  update hp_members set profile = p_profile where group_id = p_gid and id = p_target and (id = me.id or (kid and parent_id = me.id));
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function public.hp_reserve(p_gid text, p_mtok text, p_owner text, p_item text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me hp_members := hp_me(p_gid, p_mtok);
begin
  if me.id is null or p_owner = me.id then raise exception 'forbidden'; end if;
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
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  update hp_groups set
    name = coalesce(nullif(left(p->>'name', 80),''), name),
    event_date = case when p ? 'date' then nullif(p->>'date','')::date else event_date end,
    budget = case when p ? 'budget' then nullif(left(p->>'budget', 12),'') else budget end,
    cur = coalesce(nullif(left(p->>'cur', 4),''), cur),
    note = case when p ? 'note' then nullif(left(p->>'note', 500),'') else note end,
    settings = case when p ? 'settings' then p->'settings' else settings end
  where id = p_gid;
end $$;

create or replace function public.hp_admin_redraw(p_gid text, p_atok text, p_members jsonb, p_exclusions jsonb, p_assignment jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m jsonb; i int := 0; ids text[];
begin
  if not hp_is_admin(p_gid, p_atok) then raise exception 'forbidden'; end if;
  if jsonb_array_length(p_members) > 200 then raise exception 'too many members'; end if;
  select coalesce(array_agg(x->>'id'), '{}') into ids from jsonb_array_elements(p_members) x;
  delete from hp_members where group_id = p_gid and not kid and not (id = any(ids));
  delete from hp_members k where k.group_id = p_gid and k.kid and not exists (select 1 from hp_members pm where pm.group_id = p_gid and pm.id = k.parent_id);
  for m in select * from jsonb_array_elements(p_members) loop
    i := i + 1;
    insert into hp_members(group_id, id, name, sort, receiver_id) values (p_gid, m->>'id', left(m->>'name', 40), i, p_assignment->>(m->>'id'))
    on conflict (group_id, id) do update set sort = excluded.sort, receiver_id = excluded.receiver_id, name = excluded.name;
  end loop;
  update hp_groups set exclusions = coalesce(p_exclusions, '[]'), round = round + case when p_assignment is null then 0 else 1 end, live_at = null where id = p_gid;
end $$;

create or replace function public.hp_admin_live(p_gid text, p_atok text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now() + interval '10 seconds';
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
  if g.event_date is null or g.event_date >= current_date then return null; end if;
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
