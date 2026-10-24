import { Hono } from "hono";
import { z } from "zod";
import { updateUser } from "../db/queries";
import { progressFor, countCompleted, allProgressForUser, countExercises, lessonTitleById, userPrepared } from "../db/queries";
import { insertXpEvent, upsertProgress } from "../db/progress-sql";
import { progressDoc, nowIso, streakOf } from "../db/serialize";
import { getLevelForXpPrecise, calcStreak, checkBadges, toDayStr, CC_PER_LESSON, CC_PERFECT_BONUS } from "../lib/game";
import type { AppConfig, IssueLike } from "./common";
import { validationError } from "./common";

const progressBody = z.object({
  lessonId: z.string().min(1),
  score: z.number().min(0).max(100),
  completed: z.boolean().optional().default(false),
  firstTry: z.boolean().optional(),
  correctCount: z.number().min(0).max(20).optional(),
  total: z.number().min(1).max(20).optional(),
});

export function progressRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();
  const users = userPrepared(cfg.db);

  // POST /api/progress — upsert progress, award XP + streak + badges + CC on first completion
  router.post("/", requireAuth, async (c) => {
    const parsed = progressBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const { lessonId, score, completed, firstTry, correctCount: ccIn, total: totalIn } = parsed.data;
    const userId = c.get("userId") as string;

    const lesson = await lessonTitleById(cfg.db, lessonId).first();
    if (!lesson) return c.json({ message: "Lesson not found." }, 404);

    const exerciseCount = await countExercises(cfg.db, lessonId).first<{ n: number }>();
    const total = totalIn ?? (Number(exerciseCount?.n ?? 0) || 5);
    const correctCount = ccIn ?? Math.round((score / 100) * total);

    const existing = await progressFor(cfg.db, userId, lessonId).first();
    const attempts = Number((existing as { attempts?: number } | null)?.attempts ?? 0) + 1;
    const bestScore = Math.max(Number((existing as { best_score?: number } | null)?.best_score ?? 0), score);
    const wasCompleted = (existing as { status?: string } | null)?.status === "completed";
    const nowCompleted = completed || score >= 80;
    const status = nowCompleted ? "completed" : score > 0 ? "in_progress" : "not_started";

    await upsertProgress(cfg.db, {
      userId,
      lessonId,
      status,
      score,
      bestScore,
      attempts,
      firstTry: existing ? Boolean((existing as { first_try?: number }).first_try) : (firstTry ?? true),
      completedAt: nowCompleted ? nowIso() : String((existing as { completed_at?: string } | null)?.completed_at ?? "") || null,
      now: nowIso(),
    }).run();

    // Award on first completion only
    let xpAwarded = 0;
    let ccAwarded = 0;
    let newBadges: string[] = [];
    let levelUp: { from: number; to: number } | null = null;
    let streakUpdated: { count: number; lastActiveDate: string } | null = null;
    let freezeUsed = false;

    if (nowCompleted && !wasCompleted) {
      const perExercise = 5 * Math.min(correctCount, total);
      const lessonBonus = 10;
      const perfectBonus = score === 100 ? 5 : 0;
      xpAwarded = Math.min(perExercise + lessonBonus + perfectBonus, total * 5 + 15);

      const user = await users.byId(userId);
      if (user) {
        const oldXp = Number(user.xp ?? 0);
        const oldLevel = getLevelForXpPrecise(oldXp);
        const streakRes = calcStreak(user, streakOf(user));
        const newXp = oldXp + xpAwarded;
        const newLevel = getLevelForXpPrecise(newXp);

        const totalCompletedRow = await countCompleted(cfg.db, userId).first<{ n: number }>();
        const totalCompleted = Number(totalCompletedRow?.n ?? 0) + 1;
        const badgesToAdd = checkBadges(user, { totalCompleted, isPerfect: score === 100, now: new Date() });

        const updates: Record<string, unknown> = { streak_count: streakRes.count, streak_last_active: streakRes.lastActiveDate.toISOString() };
        if (badgesToAdd.length) {
          const merged = Array.from(new Set([...(JSON.parse(String(user.badges ?? "[]")) as string[]), ...badgesToAdd]));
          updates.badges = JSON.stringify(merged);
          newBadges = badgesToAdd;
        }
        if (newLevel > oldLevel) levelUp = { from: oldLevel, to: newLevel };

        ccAwarded = CC_PER_LESSON + (score === 100 ? CC_PERFECT_BONUS : 0);
        const tz = String(user.timezone ?? "Asia/Kolkata");
        const todayStr = toDayStr(new Date(), tz);
        const staleDay = user.daily_xp_date !== todayStr;
        updates.daily_xp = staleDay ? xpAwarded : Number(user.daily_xp ?? 0) + xpAwarded;
        if (staleDay) updates.daily_xp_date = todayStr;
        updates.xp = newXp;
        updates.level = newLevel;
        updates.cc = Number(user.cc ?? 0) + ccAwarded;
        if (streakRes.freezeUsed) {
          freezeUsed = true;
          updates.freezes = Math.max(0, Number(user.freezes ?? 0) - 1);
        }
        await cfg.db.batch([
          insertXpEvent(cfg.db, crypto.randomUUID(), userId, lessonId, "lesson_complete", xpAwarded, nowIso()),
          updateUser(cfg.db, userId, updates, nowIso()),
        ]);
        streakUpdated = { count: streakRes.count, lastActiveDate: streakRes.lastActiveDate.toISOString() };
      }
    }

    const userAfter = await users.byId(userId);
    return c.json({
      progress: progressDoc((await cfg.db.prepare(`SELECT * FROM progress WHERE user_id = ?1 AND lesson_id = ?2`).bind(userId, lessonId).first()) ?? {}),
      xpAwarded,
      ccAwarded,
      freezeUsed,
      newBadges,
      levelUp,
      streak: streakUpdated ?? (userAfter ? streakOf(userAfter) : null),
      user: userAfter
        ? {
            id: String(userAfter.id),
            xp: Number(userAfter.xp ?? 0),
            level: Number(userAfter.level ?? 1),
            streak: streakOf(userAfter),
            badges: JSON.parse(String(userAfter.badges ?? "[]")) as string[],
            cc: Number(userAfter.cc ?? 0),
            hearts: Number(userAfter.hearts ?? 3),
            freezes: Number(userAfter.freezes ?? 0),
            dailyGoalXp: Number(userAfter.daily_goal_xp ?? 50),
            dailyXp: Number(userAfter.daily_xp ?? 0),
          }
        : null,
    });
  });

  // GET /api/progress/me
  router.get("/me", requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const list = await allProgressForUser(cfg.db, userId).all();
    return c.json({
      progress: ((list.results ?? []) as Record<string, unknown>[]).map(progressDoc),
    });
  });

  // GET /api/progress/:lessonId
  router.get("/:lessonId", requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const lessonId = c.req.param("lessonId");
    const doc = await progressFor(cfg.db, userId, lessonId).first();
    return c.json({ progress: doc ? progressDoc(doc) : null });
  });

  return router;
}

