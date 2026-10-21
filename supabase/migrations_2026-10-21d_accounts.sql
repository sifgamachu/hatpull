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
