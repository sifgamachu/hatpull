-- Run AFTER SUPABASE_SECRET_KEY is set in Vercel and deployed: only the website's server may create groups or redraw.
revoke execute on function public.hp_create_group(jsonb) from anon, authenticated, public;
revoke execute on function public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb) from anon, authenticated, public;
grant execute on function public.hp_create_group(jsonb) to service_role;
grant execute on function public.hp_admin_redraw(text, text, jsonb, jsonb, jsonb) to service_role;
