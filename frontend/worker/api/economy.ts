import { Hono } from "hono";
import { z } from "zod";
import { userPrepared, updateUser } from "../db/queries";
import { streakOf, nowIso } from "../db/serialize";
import {
  HEART_CAP,
  HEART_REGEN_MS,
  HEART_PRICE_SINGLE,
  HEART_PRICE_FULL,
  FREEZE_PRICE,
  calcHeartsState,
  toDayStr,
} from "../lib/game";
import type { AppConfig, IssueLike } from "./common";
import { validationError, rateLimit } from "./common";

const dailyGoalSchema = z.object({ dailyGoalXp: z.number().int().min(10).max(200) });
const refillSchema = z.object({ type: z.enum(["single", "full"]).default("single") });

export function economyRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();
  const users = userPrepared(cfg.db);
  const readLimiter = rateLimit(120, 60_000);
  const writeLimiter = rateLimit(60, 60_000, "Too many tries, slow down.");

  // GET /api/economy/me
  router.get("/me", readLimiter, requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const user = await users.byId(userId);
    if (!user) return c.json({ message: "User not found." }, 404);

    const heartsState = calcHeartsState(user, new Date());
    if (heartsState.needsSave || !user.hearts_updated_at) {
      await updateUser(
        cfg.db,
        userId,
        { hearts: heartsState.hearts, hearts_updated_at: heartsState.heartsUpdatedAt },
        nowIso(),
      ).run();
      user.hearts = heartsState.hearts;
      user.hearts_updated_at = heartsState.heartsUpdatedAt;
    }

    const tz = String(user.timezone ?? "Asia/Kolkata");
    const todayStr = toDayStr(new Date(), tz);
    const dailyXp = user.daily_xp_date === todayStr ? Number(user.daily_xp ?? 0) : 0;
    const dailyGoalXp = Number(user.daily_goal_xp ?? 50);

    return c.json({
      cc: Number(user.cc ?? 0),
      hearts: heartsState.hearts,
      heartsCap: HEART_CAP,
      heartsUpdatedAt: heartsState.heartsUpdatedAt,
      regenInMs: heartsState.regenInMs,
      fullInMs: heartsState.fullInMs,
      regenMs: HEART_REGEN_MS,
      dailyGoalXp,
      dailyXp,
      dailyProgress: Math.min(1, dailyXp / Math.max(1, dailyGoalXp)),
      dailyGoalCompleted: dailyXp >= dailyGoalXp,
      freezes: Number(user.freezes ?? 0),
      xp: Number(user.xp ?? 0),
      level: Number(user.level ?? 1),
      streak: streakOf(user),
      prices: {
        heartSingle: HEART_PRICE_SINGLE,
        heartFull: HEART_PRICE_FULL,
        freeze: FREEZE_PRICE,
      },
    });
  });

  // PATCH /api/economy/daily-goal
  router.patch("/daily-goal", writeLimiter, requireAuth, async (c) => {
    const parsed = dailyGoalSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ message: "Validation failed.", errors: { dailyGoalXp: "Daily goal must be 10..200 XP." } }, 400);
    }
    let v = parsed.data.dailyGoalXp;
    if (![20, 30, 50, 80, 100].includes(v)) v = Math.min(200, Math.max(10, v));
    await updateUser(cfg.db, c.get("userId") as string, { daily_goal_xp: v }, nowIso()).run();
    const fresh = await users.byId(c.get("userId") as string);
    if (!fresh) return c.json({ message: "User not found." }, 404);
    return c.json({ message: "Daily goal updated.", dailyGoalXp: Number(fresh.daily_goal_xp) });
  });

  // POST /api/economy/hearts/consume
  router.post("/hearts/consume", writeLimiter, requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const user = await users.byId(userId);
    if (!user) return c.json({ message: "User not found." }, 404);

    // Regen view + persist when needed
    const pre = calcHeartsState(user, new Date());
    if (pre.needsSave || !user.hearts_updated_at) {
      await updateUser(
        cfg.db,
        userId,
        { hearts: pre.hearts, hearts_updated_at: pre.heartsUpdatedAt },
        nowIso(),
      ).run();
      user.hearts = pre.hearts;
      user.hearts_updated_at = pre.heartsUpdatedAt;
    }

    if (Number(user.hearts ?? 0) <= 0) {
      const state = calcHeartsState(user, new Date());
      return c.json(
        {
          message: "No hearts left. Wait for regen or buy more with CC.",
          hearts: Number(user.hearts ?? 0),
          regenInMs: state.regenInMs,
          fullInMs: state.fullInMs,
          needsPurchase: true,
        },
        403,
      );
    }

    const afterConsumeHearts = Math.max(0, Number(user.hearts ?? HEART_CAP) - 1);
    const wentFromFull = Number(user.hearts ?? 0) >= HEART_CAP;
    const updates: Record<string, unknown> = { hearts: afterConsumeHearts };
    if (wentFromFull) updates.hearts_updated_at = new Date().toISOString();
    await updateUser(cfg.db, userId, updates, nowIso()).run();
    user.hearts = afterConsumeHearts;
    if (wentFromFull) user.hearts_updated_at = updates.hearts_updated_at as string;

    const after = calcHeartsState(user, new Date());
    return c.json({
      message: "Heart consumed.",
      hearts: Number(user.hearts),
      regenInMs: after.regenInMs,
      fullInMs: after.fullInMs,
      cc: Number(user.cc ?? 0),
    });
  });

  // POST /api/economy/hearts/refill { type: 'single' | 'full' }
  router.post("/hearts/refill", writeLimiter, requireAuth, async (c) => {
    const parsed = refillSchema.safeParse((await c.req.json().catch(() => ({}))) || {});
    const type = parsed.success ? parsed.data.type : "single";

    const userId = c.get("userId") as string;
    const user = await users.byId(userId);
    if (!user) return c.json({ message: "User not found." }, 404);

    const pre = calcHeartsState(user, new Date());
    if (pre.needsSave) {
      await updateUser(cfg.db, userId, { hearts: pre.hearts, hearts_updated_at: pre.heartsUpdatedAt }, nowIso()).run();
      user.hearts = pre.hearts;
      user.hearts_updated_at = pre.heartsUpdatedAt;
    }

    const hearts = Number(user.hearts ?? HEART_CAP);
    if (hearts >= HEART_CAP) return c.json({ message: "Hearts are already full." }, 400);

    const cost = type === "full" ? HEART_PRICE_FULL : HEART_PRICE_SINGLE;
    const gain = type === "full" ? HEART_CAP - hearts : 1;
    if (Number(user.cc ?? 0) < cost) {
      return c.json({ message: `Not enough CC. Need ${cost} CC.`, cost, cc: Number(user.cc ?? 0) }, 402);
    }

    const newHearts = Math.min(HEART_CAP, hearts + gain);
    const updates: Record<string, unknown> = {
      cc: Number(user.cc ?? 0) - cost,
      hearts: newHearts,
    };
    if (newHearts >= HEART_CAP) updates.hearts_updated_at = new Date().toISOString();
    await updateUser(cfg.db, userId, updates, nowIso()).run();
    user.cc = updates.cc as number;
    user.hearts = newHearts;
    if (updates.hearts_updated_at) user.hearts_updated_at = updates.hearts_updated_at as string;

    const after = calcHeartsState(user, new Date());
    return c.json({
      message: type === "full" ? "Hearts refilled!" : "Heart restored!",
      hearts: Number(user.hearts),
      cc: Number(user.cc),
      cost,
      regenInMs: after.regenInMs,
    });
  });

  // POST /api/economy/freeze/buy
  router.post("/freeze/buy", writeLimiter, requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const user = await users.byId(userId);
    if (!user) return c.json({ message: "User not found." }, 404);

    if (Number(user.cc ?? 0) < FREEZE_PRICE) {
      return c.json(
        { message: `Not enough CC. Freeze costs ${FREEZE_PRICE} CC.`, cost: FREEZE_PRICE, cc: Number(user.cc ?? 0) },
        402,
      );
    }
    if (Number(user.freezes ?? 0) >= 5) {
      return c.json({ message: "You can hold max 5 freezes." }, 400);
    }

    const updates = { cc: Number(user.cc ?? 0) - FREEZE_PRICE, freezes: Number(user.freezes ?? 0) + 1 };
    await updateUser(cfg.db, userId, updates, nowIso()).run();
    return c.json({ message: "Streak freeze purchased!", freezes: updates.freezes, cc: updates.cc, cost: FREEZE_PRICE });
  });

  return router;
}

