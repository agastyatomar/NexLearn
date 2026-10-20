# NexLearn Supabase migration status

## Status: database foundation only — do not merge/deploy as the app migration yet

This branch adds a PostgreSQL schema and row-level security (RLS) foundation for the MongoDB/Mongoose data model. It does **not** yet port the Express handlers from Mongoose to PostgreSQL/Supabase. The existing backend still requires `MONGODB_URI` and calls Mongoose APIs; changing an environment variable will not connect it to this database.

The schema was applied to the dedicated Supabase project `NexLearn` in `ap-south-1`. The source migrations are in `supabase/migrations/`; no credentials or API keys are committed.

## Audited existing backend

Routes and endpoints reviewed:

- `auth.ts`: register, login, logout, me, onboarding, Google sign-in.
- `courses.ts`: course list and course units.
- `lessons.ts`: lesson detail and exercises.
- `progress.ts`: submit lesson progress, user progress, lesson progress.
- `community.ts`: thread list/create/stream/detail, replies, votes, accepted replies, reports.
- `users.ts`: profile updates, avatar upload, public user profile.
- `leaderboard.ts`: leaderboard.
- `economy.ts`: balance, daily goal, hearts, freeze purchase.
- `ai.ts`: AI status and help.

Mongoose models reviewed: User, Course, Unit, Lesson, Exercise, Progress, Thread, Reply, Report, XPEvent, AiUsage, AiCache.

## Table mapping

- `profiles`: non-credential profile, learning stats and economy fields.
- `user_credentials`: email, password hash, Google subject; intentionally inaccessible to browser roles.
- `courses`, `units`, `lessons`: learning hierarchy.
- `exercises` + `exercise_solutions`: prompt/content and answers are split so browser roles cannot query answer keys.
- `progress`, `xp_events`, `ai_usage`, `ai_cache`: learning progress and AI accounting/cache.
- `threads`, `replies`, `thread_votes`, `reply_votes`, `reports`: community and moderation.
- IDs are text with UUID defaults to support existing Mongo ObjectId-shaped IDs during a future data import.

## Security design

- RLS is enabled on every public table.
- Browser roles can read published course/unit/lesson/exercise content only.
- Profile reads are limited to a safe column allowlist; private profiles are owner-only. Age/country and credentials are not granted to browser roles.
- Progress and XP events are owner-readable; writes that could award XP or modify economy state are server-only.
- Community rows are public-readable; owner policies constrain row ownership. Column-level grants prevent users from changing vote counts, reply counts, accepted status, AI flags, or report moderation status.
- Credentials, exercise solutions, and AI cache have no browser privileges and explicit deny-all policies.
- The backend must keep any privileged Supabase key in server-side environment variables. Never use a service-role/secret key in `NEXT_PUBLIC_*` variables.

The RLS helper accepts Supabase Auth's `auth.uid()` and a trusted PostgREST `request.jwt.claim.sub`. The current app uses its own JWT/cookie authentication, so the future database adapter must establish the user context safely or keep user data access behind authenticated server handlers. Do not assume these policies alone make the existing Express app compatible.

## Verification performed

- Applied the three schema/security migrations to the dedicated Supabase project.
- Queried PostgreSQL catalog: all 16 public tables have RLS enabled.
- Ran `supabase/tests/security_checks.sql` logic against the live project: passed (no browser read access to credentials, solutions, AI cache, or private age; no browser writes to server-managed counters/moderation state).
- Supabase security advisor returned no findings after the hardening migrations.
- Performance advisor on a newly created empty database reports unused indexes because no application workload has exercised them yet. The initial unindexed foreign-key findings were addressed with indexes.

## Remaining work before merge

1. Replace `backend/src/config/db.ts` and `env.ts` Mongo connection configuration with a PostgreSQL/Supabase server adapter.
2. Port all nine route modules and all Mongoose queries, preserving response JSON, validation, transactions, cookies, and rate limits.
3. Replace ObjectId assumptions and preserve the existing auth session contract; do not migrate to Supabase Auth implicitly.
4. Port seed scripts and fixtures; keep exercise answers server-only.
5. Add automated route/integration tests for register/login/logout, courses/lessons/exercise answers, progress/XP idempotency, community ownership/voting/reports, profiles, economy, and AI quota/cache.
6. Run backend typecheck/build and tests, then validate frontend compatibility before opening/recommending a merge.

This branch is intentionally not merge-ready until those application changes and tests are completed.
