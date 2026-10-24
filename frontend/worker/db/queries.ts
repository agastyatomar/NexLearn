import type { D1Like, D1PreparedStatementLike, Row } from "./client";

/* ---------- Users ---------- */

const USER_COLS = `id, username, email, password_hash, google_id, name, avatar, avatar_file_id,
  xp, level, streak_count, streak_last_active, timezone, badges, bio, is_private,
  age, country, country_code, language, onboarding_completed,
  cc, hearts, hearts_updated_at, daily_goal_xp, daily_xp, daily_xp_date, freezes, is_system,
  created_at, updated_at`;

export function userPrepared(db: D1Like) {
  return {
    byId: async (id: string): Promise<Row | null> =>
      (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?1`).bind(id).first()) ?? null,
    byUsername: async (username: string): Promise<Row | null> =>
      (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE LOWER(username) = LOWER(?1)`).bind(username).first()) ?? null,
    byEmail: async (email: string): Promise<Row | null> =>
      (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE LOWER(email) = LOWER(?1)`).bind(email).first()) ?? null,
    byGoogleId: async (googleId: string): Promise<Row | null> =>
      (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE google_id = ?1`).bind(googleId).first()) ?? null,
  };
}

export type NewUserRow = {
  id: string;
  username: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  name: string;
  avatar?: string | null;
  xp?: number;
  level?: number;
  timezone?: string;
  onboardingCompleted?: boolean;
  badges?: string[];
  isSystem?: boolean;
};

export function insertUser(db: D1Like, u: NewUserRow, now: string) {
  return db
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, google_id, name, avatar,
        xp, level, streak_count, streak_last_active, timezone, badges, onboarding_completed,
        is_system, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 1, 0, NULL, ?8, ?9, ?10, ?11, ?12, ?12)`,
    )
    .bind(
      u.id,
      u.username,
      u.email,
      u.passwordHash,
      u.googleId,
      u.name,
      u.avatar ?? null,
      u.timezone ?? "Asia/Kolkata",
      JSON.stringify(u.badges ?? []),
      u.onboardingCompleted ? 1 : 0,
      u.isSystem ? 1 : 0,
      now,
    );
}

export function updateUser(db: D1Like, id: string, fields: Row, now: string) {
  const keys = Object.keys(fields);
  if (!keys.length) return db.prepare("SELECT 1 WHERE 0");
  const sets = keys.map((k, i) => `${k} = ?${i + 2}`);
  return db
    .prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = ?${keys.length + 2} WHERE id = ?1`)
    .bind(id, ...keys.map((k) => fields[k]), now);
}

export function selectUserStmt(db: D1Like, id: string) {
  return db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?1`).bind(id);
}

/* ---------- Courses / units / lessons / exercises ---------- */

export function listAllContent(db: D1Like): Promise<{
  courses: D1Result<unknown>;
  units: D1Result<unknown>;
  lessons: D1Result<unknown>;
}> {
  return (async () => {
    const courses = await db.prepare(`SELECT * FROM courses ORDER BY sort_order ASC`).all();
    const units = await db.prepare(`SELECT * FROM units ORDER BY sort_order ASC`).all();
    const lessons = await db.prepare(`SELECT * FROM lessons ORDER BY sort_order ASC`).all();
    return { courses, units, lessons } as { courses: D1Result<unknown>; units: D1Result<unknown>; lessons: D1Result<unknown> };
  })();
}

export function unitsByCourse(db: D1Like, courseId: string) {
  return db.prepare(`SELECT * FROM units WHERE course_id = ?1 ORDER BY sort_order ASC`).bind(courseId).all();
}

export function lessonsByUnit(db: D1Like, unitId: string) {
  return db.prepare(`SELECT * FROM lessons WHERE unit_id = ?1 ORDER BY sort_order ASC`).bind(unitId).all();
}

export function lessonById(db: D1Like, id: string) {
  return db.prepare(`SELECT * FROM lessons WHERE id = ?1`).bind(id);
}

export function exercisesByLesson(db: D1Like, lessonId: string) {
  return db.prepare(`SELECT * FROM exercises WHERE lesson_id = ?1 ORDER BY sort_order ASC`).bind(lessonId).all();
}

export function exerciseById(db: D1Like, id: string) {
  return db.prepare(`SELECT id, type, prompt, lesson_id FROM exercises WHERE id = ?1`).bind(id);
}

export function countExercises(db: D1Like, lessonId: string) {
  return db.prepare(`SELECT COUNT(*) AS n FROM exercises WHERE lesson_id = ?1`).bind(lessonId);
}

export function lessonTitleById(db: D1Like, id: string) {
  return db.prepare(`SELECT id, title FROM lessons WHERE id = ?1`).bind(id);
}

export function lessonTitlesByIds(db: D1Like, ids: string[]) {
  if (!ids.length) return db.prepare(`SELECT NULL AS id, NULL AS title WHERE 0`);
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(", ");
  return db
    .prepare(`SELECT id, title FROM lessons WHERE id IN (${placeholders})`)
    .bind(...ids);
}

/* ---------- Progress ---------- */

export function progressFor(db: D1Like, userId: string, lessonId: string) {
  return db.prepare(`SELECT * FROM progress WHERE user_id = ?1 AND lesson_id = ?2`).bind(userId, lessonId);
}

export function countCompleted(db: D1Like, userId: string) {
  return db
    .prepare(`SELECT COUNT(*) AS n FROM progress WHERE user_id = ?1 AND status = 'completed'`)
    .bind(userId);
}

export function allProgressForUser(db: D1Like, userId: string) {
  return db.prepare(`SELECT * FROM progress WHERE user_id = ?1`).bind(userId);
}

/* ---------- Community ---------- */

export function threadsByIds(db: D1Like, ids: string[]) {
  if (!ids.length) return db.prepare(`SELECT NULL AS id WHERE 0`);
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(", ");
  return db.prepare(`SELECT * FROM threads WHERE id IN (${placeholders})`).bind(...ids);
}

export function authorsByIds(db: D1Like, ids: string[]) {
  if (!ids.length) return db.prepare(`SELECT NULL AS id WHERE 0`);
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(", ");
  return db
    .prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`)
    .bind(...ids);
}

/* ---------- AI usage/cache ---------- */

export function aiUsageFor(db: D1Like, userId: string, day: string) {
  return db.prepare(`SELECT * FROM ai_usage WHERE user_id = ?1 AND day = ?2`).bind(userId, day);
}

export function upsertAiUsage(db: D1Like, id: string, userId: string, day: string, now: string) {
  return db
    .prepare(
      `INSERT INTO ai_usage (id, user_id, day, count, created_at, updated_at)
       VALUES (?1, ?2, ?3, 1, ?4, ?4)
       ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1, updated_at = ?4`,
    )
    .bind(id, userId, day, now);
}

export function quoteJoin(parts: string[]): string {
  return parts.join("\n---\n");
}
