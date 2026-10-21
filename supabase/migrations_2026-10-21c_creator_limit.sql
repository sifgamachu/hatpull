-- Per-person creation limit (hashed IP from the API)
alter table public.hp_groups add column if not exists creator_hash text;
create index if not exists hp_groups_creator_idx on public.hp_groups(creator_hash, created_at);

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
