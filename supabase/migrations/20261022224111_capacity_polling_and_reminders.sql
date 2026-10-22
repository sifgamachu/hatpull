-- Existing hp_state stays available to already-open clients and wishlist import.
-- New clients read a revision and only the selected wishlist, preserving token authorization.
alter table public.hp_groups add column if not exists state_version bigint not null default 1;
create or replace function public.hp_bump_group_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'hp_groups' then new.state_version := old.state_version + 1; return new; end if;
  if tg_op <> 'INSERT' then update hp_groups set state_version = state_version + 1 where id = old.group_id; end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.group_id is distinct from old.group_id) then
    update hp_groups set state_version = state_version + 1 where id = new.group_id;
  end if;
  return null;
end $$;
revoke all on function public.hp_bump_group_version() from public, anon, authenticated;
create trigger hp_groups_version before update on public.hp_groups for each row execute function public.hp_bump_group_version();
create trigger hp_members_version after insert or update or delete on public.hp_members for each row execute function public.hp_bump_group_version();
create trigger hp_reservations_version after insert or update or delete on public.hp_reservations for each row execute function public.hp_bump_group_version();
create trigger hp_questions_version after insert or update or delete on public.hp_questions for each row execute function public.hp_bump_group_version();
create trigger hp_messages_version after insert or update or delete on public.hp_messages for each row execute function public.hp_bump_group_version();

create index if not exists hp_questions_member_page_idx on public.hp_questions(group_id, to_member, created_at desc, id desc);
create index if not exists hp_groups_event_date_idx on public.hp_groups(event_date);

create or replace function public.hp_questions_page(p_gid text, p_mtok text, p_atok text, p_target text,
  p_before timestamptz default null, p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups; me hp_members; rows jsonb;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  if p_mtok is not null then select * into me from hp_members where group_id = p_gid and token = p_mtok; end if;
  if not coalesce(g.admin_token = p_atok, false) and me.id is null then raise exception 'forbidden'; end if;
  -- Existing questions are shared within the group, without the questioner's identity.
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'to', q.to_member, 'body', q.body, 'answer', q.answer, 'at', q.created_at) order by q.created_at desc, q.id desc), '[]')
  into rows from (select * from hp_questions where group_id = p_gid and to_member = p_target
    and (p_before is null or (created_at,id) < (p_before,p_before_id)) order by created_at desc,id desc limit 51) q;
  return jsonb_build_object('questions', case when jsonb_array_length(rows)>50 then rows - 50 else rows end, 'more', jsonb_array_length(rows)>50);
end $$;
revoke all on function public.hp_questions_page(text,text,text,text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.hp_questions_page(text,text,text,text,timestamptz,uuid) to anon, authenticated;

create or replace function public.hp_state_delta(p_gid text, p_mtok text, p_atok text, p_profile text default null, p_version text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g hp_groups; me hp_members; v hp_members; adm boolean; vis_all boolean; mail_on boolean; mail_all boolean; qp jsonb;
begin
  select * into g from hp_groups where id = p_gid;
  if g.id is null then raise exception 'not_found'; end if;
  adm := p_atok is not null and g.admin_token = p_atok;
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
end $$;
revoke all on function public.hp_state_delta(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.hp_state_delta(text,text,text,text,text) to anon, authenticated;

-- Durable jobs contain private email content and are accessible only through server RPCs.
create table public.hp_reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hp_profiles(user_id) on delete cascade,
  group_id text not null references public.hp_groups(id) on delete cascade,
  kind text not null check (kind in ('tomorrow','week')),
  event_date date not null,
  due_date date not null,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  lease uuid,
  leased_until timestamptz,
  payload jsonb,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, kind, event_date)
);
create index hp_reminder_jobs_ready_idx on public.hp_reminder_jobs(next_attempt_at, created_at) where status in ('pending','sending');
create index hp_reminder_jobs_group_idx on public.hp_reminder_jobs(group_id);
alter table public.hp_reminder_jobs enable row level security;
revoke all on public.hp_reminder_jobs from public, anon, authenticated;
create table public.hp_reminder_worker (id boolean primary key default true check(id), lease uuid, leased_until timestamptz);
insert into public.hp_reminder_worker(id) values(true);
alter table public.hp_reminder_worker enable row level security;
revoke all on public.hp_reminder_worker from public, anon, authenticated;

create or replace function public.hp_reminder_start(p_run uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update hp_reminder_worker set lease=p_run, leased_until=now()+interval '330 seconds'
    where id and (leased_until is null or leased_until < now());
  return found;
end $$;

create or replace function public.hp_reminder_enqueue() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int; today date := (now() at time zone 'UTC')::date;
begin
  -- Preserve the original 15:00 UTC send time; discover new due jobs every five minutes thereafter.
  if (now() at time zone 'UTC')::time < time '15:00' then return 0; end if;
  insert into hp_reminder_jobs(user_id,group_id,kind,event_date,due_date,expires_at)
  select distinct p.user_id,g.id,case when g.event_date=today+1 then 'tomorrow' else 'week' end,
    g.event_date,today,((today+1)::timestamp at time zone 'UTC')
  from hp_groups g join hp_members m on m.group_id=g.id join hp_profiles p on p.user_id=m.user_id
  where g.event_date in (today+1,today+7) and not m.kid and p.reminders and p.email is not null
    and not exists(select 1 from hp_suppression s where s.email_hash=encode(digest(lower(p.email),'sha256'),'hex') and s.reason in ('unsubscribed_all','account_deleted'))
    and not exists(select 1 from hp_email_log l where l.user_id=p.user_id and l.group_id=g.id and l.kind=case when g.event_date=today+1 then 'tomorrow' else 'week' end)
    and not exists(select 1 from hp_reminder_jobs j where j.user_id=p.user_id and j.group_id=g.id and j.event_date=g.event_date and j.kind=case when g.event_date=today+1 then 'tomorrow' else 'week' end)
  order by 4,2,1 limit 500
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.hp_reminder_claim(p_run uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare j hp_reminder_jobs; r jsonb;
begin
  if not exists(select 1 from hp_reminder_worker where id and lease=p_run and leased_until>now()) then return null; end if;
  update hp_reminder_jobs set status='failed',last_error='delivery_window_expired',payload=null,lease=null
    where status in ('pending','sending') and (expires_at<=now() or first_attempt_at<now()-interval '23 hours');
  loop
    select * into j from hp_reminder_jobs where status in ('pending','sending') and next_attempt_at<=now()
      and (leased_until is null or leased_until<now()) order by next_attempt_at,created_at limit 1 for update skip locked;
    if not found then return null; end if;
    select jsonb_build_object('email',p.email,'name',coalesce(nullif(p.name,''),m.name),'member_name',m.name,
      'user_id',p.user_id,'gid',g.id,'group_name',g.name,'date',g.event_date,'budget',g.budget,'cur',g.cur,
      'days',g.event_date-(now() at time zone 'UTC')::date,'unsub_token',p.unsub_token,'mode',g.mode,
      'drawn',coalesce(m.drawn_round=g.round,false),'wishes',case when jsonb_typeof(m.profile->'items')='array' then jsonb_array_length(m.profile->'items') else 0 end,'kind',j.kind)
    into r from hp_groups g join hp_members m on m.group_id=g.id join hp_profiles p on p.user_id=m.user_id
    where g.id=j.group_id and p.user_id=j.user_id and g.event_date=j.event_date and not m.kid and p.reminders and p.email is not null
      and (j.payload is null or j.payload->'to'->>0=p.email)
      and not exists(select 1 from hp_suppression s where s.email_hash=encode(digest(lower(p.email),'sha256'),'hex') and s.reason in ('unsubscribed_all','account_deleted'))
    order by m.sort,m.id limit 1;
    if r is null then
      update hp_reminder_jobs set status='cancelled',payload=null,lease=null where id=j.id;
    else
      update hp_reminder_jobs set status='sending',attempts=attempts+1,lease=p_run,leased_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()) where id=j.id;
      return r || jsonb_build_object('job_id',j.id,'attempts',j.attempts+1,'payload',j.payload);
    end if;
  end loop;
end $$;

create or replace function public.hp_reminder_prepare(p_job uuid,p_run uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare result jsonb;
begin
  -- Freeze the exact API body across retries: changing it would invalidate the idempotency key.
  update hp_reminder_jobs j set payload=coalesce(j.payload,p_payload)
  where j.id=p_job and j.lease=p_run and j.status='sending' and j.leased_until>now() and j.expires_at>now()
    and exists(select 1 from hp_profiles p join hp_groups g on g.id=j.group_id
      where p.user_id=j.user_id and p.reminders and p.email=p_payload->'to'->>0 and g.event_date=j.event_date
      and not exists(select 1 from hp_suppression s where s.email_hash=encode(digest(lower(p.email),'sha256'),'hex') and s.reason in ('unsubscribed_all','account_deleted')))
  returning payload into result;
  return result;
end $$;

create or replace function public.hp_reminder_finish(p_job uuid,p_run uuid,p_status text,p_error text default null,p_retry_seconds int default 300) returns boolean
language plpgsql security definer set search_path = public as $$
declare j hp_reminder_jobs;
begin
  if p_status not in ('sent','pending','failed','cancelled') then raise exception 'invalid status'; end if;
  select * into j from hp_reminder_jobs where id=p_job and lease=p_run and status='sending' for update;
  if not found then return false; end if;
  if p_status='sent' then
    insert into hp_email_log(user_id,group_id,kind) values(j.user_id,j.group_id,j.kind) on conflict do nothing;
  end if;
  update hp_reminder_jobs set status=p_status,lease=null,leased_until=null,
    next_attempt_at=now()+make_interval(secs=>greatest(30,least(p_retry_seconds,3600))),
    last_error=left(p_error,80),sent_at=case when p_status='sent' then now() else null end,
    payload=case when p_status='pending' then payload else null end where id=p_job;
  return true;
end $$;

create or replace function public.hp_reminder_stop(p_run uuid) returns void
language sql security definer set search_path = public as $$
  update hp_reminder_worker set lease=null,leased_until=null where id and lease=p_run;
$$;
revoke all on function public.hp_reminder_start(uuid),public.hp_reminder_enqueue(),public.hp_reminder_claim(uuid),public.hp_reminder_prepare(uuid,uuid,jsonb),public.hp_reminder_finish(uuid,uuid,text,text,int),public.hp_reminder_stop(uuid) from public,anon,authenticated;
grant execute on function public.hp_reminder_start(uuid),public.hp_reminder_enqueue(),public.hp_reminder_claim(uuid),public.hp_reminder_prepare(uuid,uuid,jsonb),public.hp_reminder_finish(uuid,uuid,text,text,int),public.hp_reminder_stop(uuid) to service_role;
