-- Run as an administrative role in the NexLearn Supabase SQL Editor.
-- These checks assert policy coverage and least-privilege browser grants; they do not mutate data.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ) then
    raise exception 'Security test failed: a public table has RLS disabled';
  end if;

  if has_table_privilege('anon', 'public.user_credentials', 'SELECT')
     or has_table_privilege('authenticated', 'public.user_credentials', 'SELECT') then
    raise exception 'Security test failed: browser role can read user credentials';
  end if;

  if has_table_privilege('anon', 'public.exercise_solutions', 'SELECT')
     or has_table_privilege('authenticated', 'public.exercise_solutions', 'SELECT') then
    raise exception 'Security test failed: browser role can read exercise solutions';
  end if;

  if has_table_privilege('anon', 'public.ai_cache', 'SELECT')
     or has_table_privilege('authenticated', 'public.ai_cache', 'SELECT') then
    raise exception 'Security test failed: browser role can read the AI cache';
  end if;

  if has_column_privilege('anon', 'public.profiles', 'age', 'SELECT')
     or has_column_privilege('authenticated', 'public.profiles', 'age', 'SELECT') then
    raise exception 'Security test failed: browser role can read private profile age';
  end if;

  if has_column_privilege('authenticated', 'public.threads', 'votes', 'UPDATE')
     or has_column_privilege('authenticated', 'public.threads', 'reply_count', 'UPDATE')
     or has_column_privilege('authenticated', 'public.replies', 'votes', 'UPDATE')
     or has_column_privilege('authenticated', 'public.replies', 'is_accepted', 'UPDATE') then
    raise exception 'Security test failed: browser role can modify server-managed community counters/state';
  end if;

  if has_column_privilege('authenticated', 'public.reports', 'status', 'INSERT') then
    raise exception 'Security test failed: browser role can set report moderation status';
  end if;

  if not has_column_privilege('authenticated', 'public.threads', 'title', 'UPDATE') then
    raise exception 'Security test failed: expected thread title edit grant is missing';
  end if;
end;
$$;

select 'NexLearn Supabase schema security checks passed' as result;
