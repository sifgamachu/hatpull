-- Append a participant's wish atomically without replacing the rest of their profile.
-- Guest participants deliberately keep access through their existing private member token.
create or replace function public.hp_add_wish(p_gid text, p_mtok text, p_target text, p_wish jsonb)
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
  return jsonb_build_object('added',true,'wish',p_wish);
end $$;
revoke all on function public.hp_add_wish(text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.hp_add_wish(text,text,text,jsonb) to anon,authenticated;
