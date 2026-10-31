-- Keep full-list editor saves from erasing a concurrent quick add or edit.
-- Additive API: existing atomic RPCs retain their internal profile writer.
create or replace function public.hp_save_profile_checked(
  p_gid text, p_mtok text, p_target text, p_profile jsonb, p_expected jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare me hp_members; target hp_members;
begin
  me := hp_me(p_gid,p_mtok);
  if me.id is null then raise exception 'forbidden'; end if;
  select * into target from hp_members where group_id=p_gid and id=p_target
    and (id=me.id or (kid and parent_id=me.id)) for update;
  if target.id is null then raise exception 'forbidden'; end if;
  if p_expected is null or target.profile is distinct from p_expected then
    raise exception 'profile_conflict';
  end if;
  if p_profile is null or not hp_valid_profile(p_profile)
    or octet_length(p_profile::text)>19000
    or jsonb_array_length(coalesce(p_profile->'items','[]'::jsonb))>40 then
    raise exception 'invalid profile';
  end if;
  perform hp_save_profile(p_gid,p_mtok,p_target,p_profile);
end $$;
revoke all on function public.hp_save_profile_checked(text,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.hp_save_profile_checked(text,text,text,jsonb,jsonb) to anon,authenticated;
