-- NexLearn PostgreSQL foundation for Supabase.
-- Safe, additive schema. No secrets and no destructive operations.
-- The existing Express app still uses Mongoose until its routes are ported.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.current_user_id()
returns text
language sql
stable
set search_path = pg_catalog, auth
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (select auth.uid()::text)
  );
$$;
revoke all on function private.current_user_id() from public;
grant execute on function private.current_user_id() to anon, authenticated;

create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  username text not null unique check (char_length(username) between 3 and 30),
  display_name text not null,
  avatar_url text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_count integer not null default 0 check (streak_count >= 0),
  streak_last_active_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  badges text[] not null default '{}',
  avatar_file_id text,
  bio text check (bio is null or char_length(bio) <= 160),
  is_private boolean not null default false,
  age integer check (age is null or age between 13 and 80),
  country text,
  country_code text check (country_code is null or char_length(country_code) = 2),
  language text,
  onboarding_completed boolean not null default false,
  nexlearn_cash integer not null default 50 check (nexlearn_cash >= 0),
  hearts integer not null default 3 check (hearts between 0 and 3),
  hearts_updated_at timestamptz,
  daily_goal_xp integer not null default 50 check (daily_goal_xp between 10 and 200),
  daily_xp integer not null default 0 check (daily_xp >= 0),
  daily_xp_date date,
  freezes integer not null default 0 check (freezes between 0 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credentials are isolated from profile data and never exposed through the Data API.
create table if not exists public.user_credentials (
  user_id text primary key references public.profiles(id) on delete cascade,
  email text not null unique,
  password_hash text,
  google_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (password_hash is not null or google_id is not null)
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.courses (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  language text not null default 'javascript',
  description text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_language_order_idx on public.courses(language, order_index);
create index if not exists courses_order_idx on public.courses(order_index);

create table if not exists public.units (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists units_course_order_idx on public.units(course_id, order_index);

create table if not exists public.lessons (
  id text primary key default gen_random_uuid()::text,
  unit_id text not null references public.units(id) on delete cascade,
  title text not null,
  description text not null default '',
  order_index integer not null default 0,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_unit_order_idx on public.lessons(unit_id, order_index);

-- Public exercise content is separated from solutions so browser keys cannot read answers.
create table if not exists public.exercises (
  id text primary key default gen_random_uuid()::text,
  lesson_id text not null references public.lessons(id) on delete cascade,
  type text not null check (type in ('multiple_choice','fill_blank','arrange','predict_output','fix_bug','write_code','ai_prompt')),
  prompt text not null,
  content jsonb not null,
  explanation text not null,
  hints text[] not null default '{}',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exercises_lesson_order_idx on public.exercises(lesson_id, order_index);
create table if not exists public.exercise_solutions (
  exercise_id text primary key references public.exercises(id) on delete cascade,
  solution jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  score integer not null default 0 check (score between 0 and 100),
  best_score integer not null default 0 check (best_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  first_try boolean not null default true,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists progress_user_idx on public.progress(user_id);
create index if not exists progress_lesson_idx on public.progress(lesson_id);

create table if not exists public.threads (
  id text primary key default gen_random_uuid()::text,
  lesson_id text references public.lessons(id) on delete set null,
  author_id text not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 10 and 2000),
  votes integer not null default 0 check (votes >= 0),
  reply_count integer not null default 0 check (reply_count >= 0),
  accepted_reply_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists threads_created_idx on public.threads(created_at desc);
create index if not exists threads_votes_created_idx on public.threads(votes desc, created_at desc);
create index if not exists threads_author_idx on public.threads(author_id);

create table if not exists public.replies (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null references public.threads(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  votes integer not null default 0 check (votes >= 0),
  is_accepted boolean not null default false,
  is_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists replies_thread_created_idx on public.replies(thread_id, created_at);
create index if not exists replies_author_idx on public.replies(author_id);
alter table public.threads drop constraint if exists threads_accepted_reply_id_fkey;
alter table public.threads add constraint threads_accepted_reply_id_fkey
  foreign key (accepted_reply_id) references public.replies(id) on delete set null;

create table if not exists public.thread_votes (
  thread_id text not null references public.threads(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create table if not exists public.reply_votes (
  reply_id text not null references public.replies(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  target_type text not null check (target_type in ('thread','reply')),
  target_id text not null,
  reporter_id text not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create index if not exists reports_reporter_idx on public.reports(reporter_id);

create table if not exists public.xp_events (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  lesson_id text references public.lessons(id) on delete set null,
  source text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_created_idx on public.xp_events(user_id, created_at desc);

create table if not exists public.ai_usage (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create table if not exists public.ai_cache (
  id text primary key default gen_random_uuid()::text,
  cache_key text not null unique,
  answer text not null,
  provider text not null,
  model_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_cache_created_idx on public.ai_cache(created_at);

-- RLS is enabled on every public table. Privileged backend access stays server-side only.
alter table public.profiles enable row level security;
alter table public.user_credentials enable row level security;
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_solutions enable row level security;
alter table public.progress enable row level security;
alter table public.threads enable row level security;
alter table public.replies enable row level security;
alter table public.thread_votes enable row level security;
alter table public.reply_votes enable row level security;
alter table public.reports enable row level security;
alter table public.xp_events enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_cache enable row level security;

-- Public learning content is read-only to browser roles.
drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses for select to anon, authenticated using (true);
drop policy if exists units_public_read on public.units;
create policy units_public_read on public.units for select to anon, authenticated using (true);
drop policy if exists lessons_public_read on public.lessons;
create policy lessons_public_read on public.lessons for select to anon, authenticated using (true);
drop policy if exists exercises_public_read on public.exercises;
create policy exercises_public_read on public.exercises for select to anon, authenticated using (true);

-- Profile reads only expose a safe column allowlist; private profiles are visible only to their owner.
drop policy if exists profiles_public_or_owner_read on public.profiles;
create policy profiles_public_or_owner_read on public.profiles for select to anon, authenticated
using (is_private = false or id = private.current_user_id());
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated
using (id = private.current_user_id()) with check (id = private.current_user_id());

-- Progress and XP are readable only by the owning user. Writes are intentionally server-only
-- so a browser cannot award itself XP, set completion, or change economy balances.
drop policy if exists progress_owner_read on public.progress;
create policy progress_owner_read on public.progress for select to authenticated
using (user_id = private.current_user_id());
drop policy if exists xp_events_owner_read on public.xp_events;
create policy xp_events_owner_read on public.xp_events for select to authenticated
using (user_id = private.current_user_id());
drop policy if exists ai_usage_owner_read on public.ai_usage;
create policy ai_usage_owner_read on public.ai_usage for select to authenticated
using (user_id = private.current_user_id());

-- Community content is public to read; users can write only as themselves.
drop policy if exists threads_public_read on public.threads;
create policy threads_public_read on public.threads for select to anon, authenticated using (true);
drop policy if exists threads_owner_insert on public.threads;
create policy threads_owner_insert on public.threads for insert to authenticated
with check (author_id = private.current_user_id());
drop policy if exists threads_owner_update on public.threads;
create policy threads_owner_update on public.threads for update to authenticated
using (author_id = private.current_user_id()) with check (author_id = private.current_user_id());
drop policy if exists threads_owner_delete on public.threads;
create policy threads_owner_delete on public.threads for delete to authenticated
using (author_id = private.current_user_id());

drop policy if exists replies_public_read on public.replies;
create policy replies_public_read on public.replies for select to anon, authenticated using (true);
drop policy if exists replies_owner_insert on public.replies;
create policy replies_owner_insert on public.replies for insert to authenticated
with check (author_id = private.current_user_id());
drop policy if exists replies_owner_update on public.replies;
create policy replies_owner_update on public.replies for update to authenticated
using (author_id = private.current_user_id()) with check (author_id = private.current_user_id());
drop policy if exists replies_owner_delete on public.replies;
create policy replies_owner_delete on public.replies for delete to authenticated
using (author_id = private.current_user_id());

drop policy if exists thread_votes_owner_all on public.thread_votes;
create policy thread_votes_owner_all on public.thread_votes for all to authenticated
using (user_id = private.current_user_id()) with check (user_id = private.current_user_id());
drop policy if exists reply_votes_owner_all on public.reply_votes;
create policy reply_votes_owner_all on public.reply_votes for all to authenticated
using (user_id = private.current_user_id()) with check (user_id = private.current_user_id());

drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert on public.reports for insert to authenticated
with check (reporter_id = private.current_user_id());

-- No anon/authenticated policies or grants for credentials, exercise solutions, reports read access,
-- AI cache, or server-managed economy writes.
revoke all on public.user_credentials, public.exercise_solutions, public.ai_cache from anon, authenticated;
revoke all on public.reports from anon, authenticated;
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

-- Sequence-free UUID IDs need no sequence grants. Keep credentials and server-only tables inaccessible
-- through the browser Data API; the backend must store its privileged key only in server env vars.
