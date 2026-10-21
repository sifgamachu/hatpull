-- Supabase grants new functions to anon/authenticated by default; "revoke ... from public" alone doesn't remove that.
revoke execute on function public.hp_due_reminders(), public.hp_log_sent(uuid, text, text) from anon, authenticated, public;
revoke execute on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text, text), public.hp_link(text, text, text), public.hp_my(), public.hp_forget_me(), public.hp_export_me() from anon, public;
grant execute on function public.hp_due_reminders(), public.hp_log_sent(uuid, text, text) to service_role;
grant execute on function public.hp_account(), public.hp_set_prefs(boolean, boolean, text, text), public.hp_link(text, text, text), public.hp_my(), public.hp_forget_me(), public.hp_export_me() to authenticated;
