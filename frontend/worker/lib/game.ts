/* Pure game-logic ports: XP levels, streaks, hearts, badges.
   Identical behavior to backend/src/utils/{level,streak,hearts,badges}.ts
   (kept in sync — the frontend lib/level.js mirrors these thresholds too). */

import type { Row } from "../db/client";
import { streakOf } from "../db/serialize";

/* ---------- Levels ---------- */

const STEP_AFTER = 150; // L1 0, L2 100, L3 250, L4 450, L5 700 then +150

export function getLevelForXpPrecise(xp: number): number {
  const x = Math.max(0, Math.floor(xp));
  if (x < 100) return 1;
  if (x < 250) return 2;
  if (x < 450) return 3;
  if (x < 700) return 4;
  return 5 + Math.floor((x - 700) / STEP_AFTER);
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 450;
  if (level === 5) return 700;
  return 700 + (level - 5) * STEP_AFTER;
}

/* ---------- Streak (timezone-aware, freeze-aware) ---------- */

export function toDayStr(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function calcStreak(
  row: Row,
  current: { count: number; lastActiveDate: string | null },
  now = new Date(),
): { count: number; lastActiveDate: Date; freezeUsed: boolean } {
  const tz = String(row.timezone ?? "Asia/Kolkata");
  const todayStr = toDayStr(now, tz);
  const last = current.lastActiveDate ? toDayStr(new Date(current.lastActiveDate), tz) : null;

  const count = current.count ?? 0;
  if (!last) return { count: 1, lastActiveDate: now, freezeUsed: false };
  if (last === todayStr) return { count, lastActiveDate: new Date(current.lastActiveDate!), freezeUsed: false };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (last === toDayStr(yesterday, tz)) return { count: count + 1, lastActiveDate: now, freezeUsed: false };

  const dayBeforeYesterday = new Date(now);
  dayBeforeYesterday.setDate(now.getDate() - 2);
  const freezes = Number(row.freezes ?? 0);
  if (last === toDayStr(dayBeforeYesterday, tz) && freezes > 0) {
    return { count: count + 1, lastActiveDate: now, freezeUsed: true };
  }
  return { count: 1, lastActiveDate: now, freezeUsed: false };
}

/* ---------- Hearts ---------- */

export const HEART_CAP = 3;
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000; // 4h → 1 heart, 12h → 3
export const HEART_PRICE_SINGLE = 20;
export const HEART_PRICE_FULL = 50;
export const FREEZE_PRICE = 50;
export const CC_PER_LESSON = 5;
export const CC_PERFECT_BONUS = 10;

export type HeartsState = {
  hearts: number;
  heartsUpdatedAt: string;
  regenInMs: number;
  fullInMs: number;
  needsSave: boolean;
};

export function calcHeartsState(row: Row, now = new Date()): HeartsState {
  const hearts = Math.min(HEART_CAP, Math.max(0, Number(row.hearts ?? HEART_CAP)));
  if (!row.hearts_updated_at) {
    const iso = now.toISOString();
    return {
      hearts,
      heartsUpdatedAt: iso,
      regenInMs: hearts >= HEART_CAP ? 0 : HEART_REGEN_MS,
      fullInMs: hearts >= HEART_CAP ? 0 : (HEART_CAP - hearts) * HEART_REGEN_MS,
      needsSave: true,
    };
  }
  const updatedAt = new Date(String(row.hearts_updated_at));
  if (hearts >= HEART_CAP) {
    return { hearts, heartsUpdatedAt: updatedAt.toISOString(), regenInMs: 0, fullInMs: 0, needsSave: false };
  }
  const elapsed = now.getTime() - updatedAt.getTime();
  if (elapsed < HEART_REGEN_MS) {
    return {
      hearts,
      heartsUpdatedAt: updatedAt.toISOString(),
      regenInMs: HEART_REGEN_MS - elapsed,
      fullInMs: (HEART_CAP - hearts) * HEART_REGEN_MS - elapsed,
      needsSave: false,
    };
  }
  const regen = Math.floor(elapsed / HEART_REGEN_MS);
  const newHearts = Math.min(HEART_CAP, hearts + regen);
  const newUpdatedAt = new Date(updatedAt.getTime() + regen * HEART_REGEN_MS);
  const remaining = HEART_REGEN_MS - (elapsed % HEART_REGEN_MS);
  return {
    hearts: newHearts,
    heartsUpdatedAt: newUpdatedAt.toISOString(),
    regenInMs: newHearts >= HEART_CAP ? 0 : remaining,
    fullInMs: newHearts >= HEART_CAP ? 0 : (HEART_CAP - newHearts) * HEART_REGEN_MS + remaining,
    needsSave: regen > 0,
  };
}

/* ---------- Badges ---------- */

export type BadgeId = "first_lesson" | "five_lessons" | "perfect" | "streak_3" | "streak_7" | "night_owl";

export function checkBadges(
  row: Row,
  ctx: { totalCompleted: number; isPerfect: boolean; now?: Date },
): BadgeId[] {
  const now = ctx.now ?? new Date();
  const have = new Set<string>(jsonArray(row.badges, []));
  const out: BadgeId[] = [];

  if (ctx.totalCompleted >= 1 && !have.has("first_lesson")) out.push("first_lesson");
  if (ctx.totalCompleted >= 5 && !have.has("five_lessons")) out.push("five_lessons");
  if (ctx.isPerfect && !have.has("perfect")) out.push("perfect");

  const streak = streakOf(row).count;
  if (streak >= 3 && !have.has("streak_3")) out.push("streak_3");
  if (streak >= 7 && !have.has("streak_7")) out.push("streak_7");

  try {
    const tz = String(row.timezone ?? "Asia/Kolkata");
    const hourStr = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now);
    const hour = Number(hourStr);
    if ((hour >= 22 || hour < 4) && !have.has("night_owl")) out.push("night_owl");
  } catch {}

  return out;
}

/** Language/locale-safe JSON array column reader (subset of jsonParseSafe). */
function jsonArray<T = string>(value: unknown, fallback: T[]): T[] {
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}
