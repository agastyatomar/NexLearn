import type { Row } from "./client";

/* ---- Shared response/serializer helpers ----
   Everything here preserves the exact JSON contract the existing Express
   backend produces, so the current frontend keeps working unchanged. */

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function jsonParseSafe<T>(text: unknown, fallback: T): T {
  if (typeof text !== "string") return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Streak embedded object as Mongoose serialized it. */
export function streakOf(row: Row): { count: number; lastActiveDate: string | null } {
  const last = typeof row.streak_last_active === "string" ? row.streak_last_active : null;
  return { count: Number(row.streak_count ?? 0), lastActiveDate: last };
}

export function badgesOf(row: Row): string[] {
  return jsonParseSafe<string[]>(row.badges, []);
}

/** The shared public user shape used by auth.ts + users.ts. */
export function toPublicUser(row: Row, opts: { includeEmail?: boolean } = {}) {
  const username = String(row.username ?? "");
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    username,
    name: String(row.name ?? username),
    avatar: row.avatar != null ? String(row.avatar) : null,
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    streak: streakOf(row),
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    badges: badgesOf(row),
    createdAt: String(row.created_at),
    age: row.age != null ? Number(row.age) : null,
    country: row.country != null ? String(row.country) : null,
    countryCode: row.country_code != null ? String(row.country_code) : null,
    language: row.language != null ? String(row.language) : null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    bio: row.bio != null ? String(row.bio) : null,
    isPrivate: Boolean(row.is_private),
    // Economy
    cc: Number(row.cc ?? 0),
    hearts: Number(row.hearts ?? 0),
    heartsUpdatedAt: row.hearts_updated_at != null ? String(row.hearts_updated_at) : null,
    dailyGoalXp: Number(row.daily_goal_xp ?? 50),
    dailyXp: Number(row.daily_xp ?? 0),
    dailyXpDate: row.daily_xp_date != null ? String(row.daily_xp_date) : null,
    freezes: Number(row.freezes ?? 0),
    needsUsername: username.startsWith("google_user_"),
  };
}

export function toPublicUserNoEmails(row: Row) {
  const u = toPublicUser(row);
  type PublicUser = ReturnType<typeof toPublicUser>;
  const { email: _email, ...rest } = u as PublicUser & { email?: string };
  void _email;
  return rest;
}

/** lesson / unit / course / exercise docs keep Mongoose-shaped `_id` fields. */
export function courseDoc(row: Row, units: unknown[] = []) {
  return {
    _id: String(row.id),
    title: String(row.title),
    language: String(row.language),
    description: String(row.description),
    order: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    units,
  };
}

export function unitDoc(row: Row, lessons: unknown[] = []) {
  return {
    _id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : "",
    order: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lessons,
  };
}

export function lessonDoc(row: Row) {
  return {
    _id: String(row.id),
    unitId: String(row.unit_id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : "",
    order: Number(row.sort_order),
    xpReward: Number(row.xp_reward),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function exerciseDoc(row: Row) {
  return {
    _id: String(row.id),
    lessonId: String(row.lesson_id),
    type: String(row.type),
    prompt: String(row.prompt),
    content: jsonParseSafe(row.content, {}),
    solution: jsonParseSafe(row.solution, {}),
    explanation: String(row.explanation),
    hints: jsonParseSafe<string[]>(row.hints, []),
    order: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function progressDoc(row: Row) {
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    lessonId: String(row.lesson_id),
    status: String(row.status),
    score: Number(row.score),
    bestScore: Number(row.best_score),
    attempts: Number(row.attempts),
    firstTry: Boolean(row.first_try),
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
