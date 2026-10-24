-- NexLearn initial schema (SQLite / Cloudflare D1).
-- Mirrors the MongoDB/Mongoose models 1:1 (User, Course, Unit, Lesson,
-- Exercise, Progress, XPEvent, Thread, Reply, Report, AiUsage, AiCache).
-- IDs are UUIDv4-shaped TEXT (crypto.randomUUID()).
-- Timestamps are stored as TEXT ISO-8601, matching how Mongoose JSON-serializes Date.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY,
  username             TEXT NOT NULL,
  email                TEXT NOT NULL,
  password_hash        TEXT,                                -- null for Google-only accounts
  google_id            TEXT,                                -- Google ID-token `sub`
  name                 TEXT NOT NULL,
  avatar               TEXT,
  avatar_file_id       TEXT,
  xp                   INTEGER NOT NULL DEFAULT 0,
  level                INTEGER NOT NULL DEFAULT 1,
  streak_count         INTEGER NOT NULL DEFAULT 0,
  streak_last_active   TEXT,
  timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  badges               TEXT NOT NULL DEFAULT '[]',           -- JSON array of badge ids
  bio                  TEXT,
  is_private           INTEGER NOT NULL DEFAULT 0,
  age                  INTEGER,
  country              TEXT,
  country_code         TEXT,
  language             TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  cc                   INTEGER NOT NULL DEFAULT 50,          -- NexLearn Cash
  hearts               INTEGER NOT NULL DEFAULT 3,
  hearts_updated_at    TEXT,
  daily_goal_xp        INTEGER NOT NULL DEFAULT 50,
  daily_xp             INTEGER NOT NULL DEFAULT 0,
  daily_xp_date        TEXT,                                 -- YYYY-MM-DD in user's timezone
  freezes              INTEGER NOT NULL DEFAULT 0,
  is_system            INTEGER NOT NULL DEFAULT 0,           -- nexlearn-ai account
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci   ON users(LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci      ON users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id     ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_leaderboard          ON users(xp DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS users_leaderboard_filtered ON users(onboarding_completed, is_private, xp DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'javascript',
  description TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS courses_language_order ON courses(language, sort_order);

CREATE TABLE IF NOT EXISTS units (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS units_course_order ON units(course_id, sort_order);

CREATE TABLE IF NOT EXISTS lessons (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  xp_reward   INTEGER NOT NULL DEFAULT 10,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lessons_unit_order ON lessons(unit_id, sort_order);

CREATE TABLE IF NOT EXISTS exercises (
  id          TEXT PRIMARY KEY,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('multiple_choice','fill_blank','arrange','predict_output','fix_bug','write_code','ai_prompt')),
  prompt      TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '{}',   -- JSON
  solution    TEXT NOT NULL DEFAULT '{}',   -- JSON — client-graded today (same as Express)
  explanation TEXT NOT NULL,
  hints       TEXT NOT NULL DEFAULT '[]',   -- JSON array
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS exercises_lesson_order ON exercises(lesson_id, sort_order);

CREATE TABLE IF NOT EXISTS progress (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  score        INTEGER NOT NULL DEFAULT 0,
  best_score   INTEGER NOT NULL DEFAULT 0,
  attempts     INTEGER NOT NULL DEFAULT 0,
  first_try    INTEGER NOT NULL DEFAULT 1,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS progress_user_lesson ON progress(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS xp_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  TEXT,
  source     TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS xp_events_user_time ON xp_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS threads (
  id                TEXT PRIMARY KEY,
  lesson_id         TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  author_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  votes             INTEGER NOT NULL DEFAULT 0,
  upvoted_by        TEXT NOT NULL DEFAULT '[]',   -- JSON array of user ids
  reply_count       INTEGER NOT NULL DEFAULT 0,
  accepted_reply_id TEXT,
  ai_reply_pending  TEXT,                          -- ISO time when AI first reply fires (cron)
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS threads_time       ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS threads_votes      ON threads(votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_lesson     ON threads(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_ai_pending ON threads(ai_reply_pending) WHERE ai_reply_pending IS NOT NULL;

CREATE TABLE IF NOT EXISTS replies (
  id          TEXT PRIMARY KEY,
  thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  votes       INTEGER NOT NULL DEFAULT 0,
  upvoted_by  TEXT NOT NULL DEFAULT '[]',   -- JSON array of user ids
  is_accepted INTEGER NOT NULL DEFAULT 0,
  is_ai       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS replies_thread ON replies(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('thread','reply')),
  target_id   TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_target ON reports(target_type, target_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  count      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_user_day ON ai_usage(user_id, day);

CREATE TABLE IF NOT EXISTS ai_cache (
  key        TEXT PRIMARY KEY,           -- sha256 of normalized prompt
  answer     TEXT NOT NULL,
  provider   TEXT NOT NULL,
  model_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_cache_ttl ON ai_cache(created_at);
