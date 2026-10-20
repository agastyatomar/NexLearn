-- Harden browser-role grants and index foreign-key columns reported by Supabase advisors.
-- This migration is safe to re-run and does not modify user data.

revoke all privileges on all tables in schema public from anon, authenticated;

grant select on public.courses, public.units, public.lessons to anon, authenticated;
grant select on public.exercises to anon, authenticated;
grant select (id, username, display_name, avatar_url, xp, level, streak_count, timezone, badges, bio, is_private, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio, is_private, timezone)
  on public.profiles to authenticated;
grant select on public.progress, public.xp_events, public.ai_usage to authenticated;
grant select on public.threads, public.replies to anon, authenticated;
grant insert, update, delete on public.threads, public.replies to authenticated;
grant select, insert, delete on public.thread_votes, public.reply_votes to authenticated;
grant insert on public.reports to authenticated;

drop policy if exists user_credentials_deny_all on public.user_credentials;
create policy user_credentials_deny_all on public.user_credentials
  for all to anon, authenticated using (false) with check (false);
drop policy if exists exercise_solutions_deny_all on public.exercise_solutions;
create policy exercise_solutions_deny_all on public.exercise_solutions
  for all to anon, authenticated using (false) with check (false);
drop policy if exists ai_cache_deny_all on public.ai_cache;
create policy ai_cache_deny_all on public.ai_cache
  for all to anon, authenticated using (false) with check (false);

create index if not exists thread_votes_user_idx on public.thread_votes(user_id);
create index if not exists reply_votes_user_idx on public.reply_votes(user_id);
create index if not exists threads_accepted_reply_idx on public.threads(accepted_reply_id);
create index if not exists threads_lesson_idx on public.threads(lesson_id);
create index if not exists xp_events_lesson_idx on public.xp_events(lesson_id);
