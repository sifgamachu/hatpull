-- Patch only age/gender on an editable wish list. Guest access is intentional:
-- hp_me validates the existing private participant token, including child ownership.
-- The row lock coordinates with hp_add_wish/hp_change_wish without replacing items.
create or replace function public.hp_set_wish_demographics(p_gid text, p_mtok text, p_target text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.hp_members; target public.hp_members; next_profile jsonb;
begin
  me := public.hp_me(p_gid,p_mtok);
  if me.id is null then raise exception 'forbidden'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'invalid_preferences'; end if;
  if (p_patch - array['age','who']) <> '{}'::jsonb
     or exists(select 1 from jsonb_each(p_patch) e where jsonb_typeof(e.value) <> 'string')
     or (p_patch ? 'who' and p_patch->>'who' not in ('','women','men'))
     or (p_patch ? 'age' and p_patch->>'age' not in ('','Under 5','5–11','12–17','18–29','30–44','45–64','65+'))
  then raise exception 'invalid_preferences'; end if;
  select * into target from public.hp_members where group_id=p_gid and id=p_target
    and (id=me.id or (kid and parent_id=me.id)) for update;
  if target.id is null then raise exception 'forbidden'; end if;
  next_profile := coalesce(target.profile,'{}'::jsonb) || p_patch;
  if octet_length(next_profile::text)>20000 then raise exception 'too large'; end if;
  update public.hp_members set profile=next_profile where group_id=p_gid and id=p_target;
  return jsonb_build_object('age',coalesce(next_profile->>'age',''),'who',coalesce(next_profile->>'who',''));
end $$;
revoke all on function public.hp_set_wish_demographics(text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.hp_set_wish_demographics(text,text,text,jsonb) to anon,authenticated;
