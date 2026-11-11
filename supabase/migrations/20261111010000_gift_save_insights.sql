-- Gift-save insights (2026-11-11).
-- Every gift a participant saves is also recorded in an anonymous log so Teregna can see which
-- products, stores and save methods people actually use. The log holds NO group id, member id,
-- names, notes, sizes/colors or tokens: only the product reference, store, how it was saved, and
-- the celebration's occasion/budget band. It is readable only with the service role (no RLS grants).

create table if not exists public.hp_gift_saves (
  id bigint generated always as identity primary key,
  saved_at timestamptz not null default now(),
  store text not null,                -- 'amazon' | 'ebay' | other host (e.g. 'target.com')
  kind text not null default 'item',  -- 'item' | 'list' (a whole Amazon wish-list link)
  asin text,                          -- Amazon product id when known
  product_key text,                   -- ASIN, eBay item id, or host+path (no query string)
  title text,                         -- product name as supplied by the participant (max 120)
  source text not null default 'unknown', -- 'button' | 'paste' | 'return' | 'share' | 'catalog' | 'list' | 'unknown'
  occasion text,
  budget_band text,                   -- e.g. '≤25', '26-50', '51-100', '>100', 'none'
  currency text
);
alter table public.hp_gift_saves enable row level security;
revoke all on public.hp_gift_saves from public, anon, authenticated;
create index if not exists hp_gift_saves_saved_at on public.hp_gift_saves (saved_at desc);
create index if not exists hp_gift_saves_product on public.hp_gift_saves (product_key);

create or replace function public.hp_log_gift_save(p_gid text, p_wish jsonb, p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare g hp_groups; u text; host text; path text; store text; budget numeric; band text; item text;
begin
  select * into g from hp_groups where id = p_gid;
  u := coalesce(p_wish->>'u','');
  host := lower(substring(u from '^https?://([^/:?#]+)'));
  host := regexp_replace(coalesce(host,''), '^(www|smile|m)\.', '');
  path := substring(u from '^https?://[^/?#]+(/[^?#]*)');
  store := case
    when host ~ '(^|\.)amazon\.[a-z.]+$' or host in ('a.co','amzn.to','amzn.eu') then 'amazon'
    when host ~ '(^|\.)ebay\.[a-z.]+$' then 'ebay'
    else left(host, 80) end;
  item := substring(u from '/itm/(?:[^/]*/)?([0-9]{9,15})');
  begin budget := nullif(regexp_replace(coalesce(g.budget,''), '[^0-9.]', '', 'g'), '')::numeric;
  exception when others then budget := null; end;
  band := case when budget is null or budget <= 0 then 'none' when budget <= 25 then '≤25'
    when budget <= 50 then '26-50' when budget <= 100 then '51-100' else '>100' end;
  insert into hp_gift_saves(store, kind, asin, product_key, title, source, occasion, budget_band, currency)
  values (
    store,
    case when u ~ '/hz/wishlist/ls/' then 'list' else 'item' end,
    nullif(p_wish->>'a',''),
    left(coalesce(nullif(p_wish->>'a',''), item, host || coalesce(path,'')), 300),
    case when u ~ '/hz/wishlist/ls/' then null else left(trim(p_wish->>'t'), 120) end,
    case when p_source in ('button','paste','return','share','catalog','list') then p_source else 'unknown' end,
    left(g.occasion, 40), band, left(g.cur, 8));
exception when others then
  -- Insights must never block a participant's save.
  null;
end $$;
revoke all on function public.hp_log_gift_save(text,jsonb,text) from public, anon, authenticated;

-- Same behavior as before, plus an optional source tag and the anonymous log entry.
drop function if exists public.hp_add_wish(text,text,text,jsonb);
create or replace function public.hp_add_wish(p_gid text, p_mtok text, p_target text, p_wish jsonb, p_source text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me hp_members; target hp_members; items jsonb; existing jsonb; profile jsonb;
begin
  -- Serialize quick additions, and coordinate with profile saves, on the target member row.
  me := hp_me(p_gid,p_mtok);
  if me.id is null then raise exception 'forbidden'; end if;
  select * into target from hp_members where group_id=p_gid and id=p_target
    and (id=me.id or (kid and parent_id=me.id)) for update;
  if target.id is null then raise exception 'forbidden'; end if;
  if p_wish is null or jsonb_typeof(p_wish) <> 'object' or char_length(p_wish::text)>2000
     or coalesce(p_wish->>'id','') !~ '^[A-Za-z0-9_-]{1,20}$'
     or coalesce(length(trim(p_wish->>'t')),0) not between 1 and 120
     or coalesce(length(p_wish->>'u'),0) not between 1 and 400
     or p_wish->>'u' !~ '^https?://'
     or coalesce(p_wish->>'a','') !~ '^([A-Z0-9]{10})?$'
     or (p_wish - array['id','t','u','n','q','p','a','priority','size','color','art']) <> '{}'::jsonb
     or not hp_valid_profile(jsonb_build_object('items',jsonb_build_array(p_wish)))
     or (p_source is not null and length(p_source) > 20)
  then raise exception 'invalid_wish'; end if;
  items := coalesce(target.profile->'items','[]'::jsonb);
  select x into existing from jsonb_array_elements(items) x where
    x->>'id'=p_wish->>'id'
    or (coalesce(p_wish->>'a','')<>'' and x->>'a'=p_wish->>'a'
      and coalesce(x->>'size','')=coalesce(p_wish->>'size','') and coalesce(x->>'color','')=coalesce(p_wish->>'color',''))
    or (coalesce(p_wish->>'a','')='' and x->>'u'=p_wish->>'u'
      and coalesce(x->>'size','')=coalesce(p_wish->>'size','') and coalesce(x->>'color','')=coalesce(p_wish->>'color',''))
    limit 1;
  if existing is not null then return jsonb_build_object('added',false,'wish',existing); end if;
  if jsonb_array_length(items)>=40 then raise exception 'wish_list_full'; end if;
  profile := jsonb_set(target.profile,'{items}',items || jsonb_build_array(p_wish));
  if octet_length(profile::text)>19000 then raise exception 'wish_list_full'; end if;
  perform hp_save_profile(p_gid,p_mtok,p_target,profile);
  perform hp_log_gift_save(p_gid, p_wish, p_source);
  return jsonb_build_object('added',true,'wish',p_wish);
end $$;
revoke all on function public.hp_add_wish(text,text,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.hp_add_wish(text,text,text,jsonb,text) to anon,authenticated;

-- Ready-made analysis views (service role / SQL editor only).
create or replace view public.hp_gift_insights_top as
  select store, product_key, max(title) as title, count(*) as saves, min(saved_at) as first_saved, max(saved_at) as last_saved
  from hp_gift_saves where kind = 'item' group by store, product_key order by saves desc, last_saved desc;
create or replace view public.hp_gift_insights_daily as
  select date_trunc('day', saved_at)::date as day, store, source, count(*) as saves
  from hp_gift_saves group by 1,2,3 order by 1 desc, 4 desc;
revoke all on public.hp_gift_insights_top, public.hp_gift_insights_daily from public, anon, authenticated;

-- Seed the log once from wishes already saved (anonymous, no member/group ids kept).
insert into hp_gift_saves(saved_at, store, kind, asin, product_key, title, source, occasion, budget_band, currency)
select m.created_at,
  case when w->>'u' ~ 'amazon\.|//(a\.co|amzn\.)' then 'amazon' when w->>'u' ~ 'ebay\.' then 'ebay'
       else regexp_replace(lower(substring(w->>'u' from '^https?://([^/:?#]+)')), '^(www|m)\.', '') end,
  case when w->>'u' ~ '/hz/wishlist/ls/' then 'list' else 'item' end,
  nullif(w->>'a',''),
  left(coalesce(nullif(w->>'a',''), substring(w->>'u' from '/itm/(?:[^/]*/)?([0-9]{9,15})'),
       regexp_replace(lower(substring(w->>'u' from '^https?://([^/?#]+)')),'^(www|m)\.','') || coalesce(substring(w->>'u' from '^https?://[^/?#]+(/[^?#]*)'),'')), 300),
  case when w->>'u' ~ '/hz/wishlist/ls/' then null else left(trim(w->>'t'),120) end,
  'unknown', left(g.occasion,40), 'none', left(g.cur,8)
from hp_members m join hp_groups g on g.id = m.group_id,
     jsonb_array_elements(coalesce(m.profile->'items','[]'::jsonb)) w
where coalesce(w->>'u','') ~ '^https?://' and not exists (select 1 from hp_gift_saves);
