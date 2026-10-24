import { Hono } from "hono";
import { toPublicUser } from "../db/serialize";
import { streakOf, badgesOf } from "../db/serialize";
import { nowIso } from "../db/serialize";
import type { AppConfig } from "./common";
import { rateLimit } from "./common";

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function serialize(row: Record<string, unknown>, rank: number) {
  return {
    rank,
    id: String(row.id),
    username: String(row.username),
    name: String(row.name),
    avatar: row.avatar != null ? String(row.avatar) : null,
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    streak: { count: Number(row.streak_count ?? 0) },
    badgesCount: badgesOf(row).length,
    badges: badgesOf(row),
    country: row.country != null ? String(row.country) : null,
    countryCode: row.country_code != null ? String(row.country_code) : null,
    createdAt: nowIso() && String(row.created_at),
  };
}

const LB_COLS = `id, username, name, avatar, xp, level, streak_count, streak_last_active, badges,
  country, country_code, onboarding_completed, is_private, timezone, email, created_at, updated_at`;

export function leaderboardRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();

  // GET /api/leaderboard — global XP ranking, public + onboarded only
  router.get("/", rateLimit(100, 60_000, "Too many requests, slow down a little."), requireAuth, async (c) => {
    const rawLimit = Number(c.req.query("limit"));
    const rawOffset = Number(c.req.query("offset"));
    const rawPage = Number(c.req.query("page"));
    const limit = clamp(rawLimit || 25, 1, 100);
    let offset = 0;
    if (Number.isFinite(rawPage) && rawPage > 0) offset = (Math.floor(rawPage) - 1) * limit;
    else if (Number.isFinite(rawOffset) && rawOffset >= 0) offset = Math.floor(rawOffset);
    offset = clamp(offset, 0, 100000);

    const totalRow = await cfg.db
      .prepare(`SELECT COUNT(*) AS n FROM users WHERE onboarding_completed = 1 AND is_private != 1`)
      .first<{ n: number }>();
    const total = Number(totalRow?.n ?? 0);
    if (offset > total) offset = Math.max(0, total - (total % limit));

    const docsRes = await cfg.db
      .prepare(
        `SELECT ${LB_COLS} FROM users
         WHERE onboarding_completed = 1 AND is_private != 1
         ORDER BY xp DESC, created_at ASC
         LIMIT ?1 OFFSET ?2`,
      )
      .bind(limit, offset)
      .all();
    const docs = (docsRes.results ?? []) as Record<string, unknown>[];
    const leaderboard = docs.map((u, i) => serialize(u, offset + i + 1));

    const viewerId = c.get("userId") as string;
    const users = cfg.db;
    const meDoc = await users
      .prepare(`SELECT ${LB_COLS} FROM users WHERE id = ?1`)
      .bind(viewerId)
      .first();
    void toPublicUser;

    let me: ReturnType<typeof serialize> | null = null;
    let meMeta: { notRankedReason?: string } | null = null;
    if (meDoc) {
      const row = meDoc as Record<string, unknown>;
      const onboardingDone = Boolean(row.onboarding_completed);
      const isPrivate = Boolean(row.is_private);
      if (!onboardingDone) {
        meMeta = { notRankedReason: "complete_onboarding" };
        me = { ...serialize(row, 0), rank: 0 };
      } else if (isPrivate) {
        meMeta = { notRankedReason: "private_profile" };
        me = { ...serialize(row, 0), rank: 0 };
      } else {
        const xp = Number(row.xp ?? 0);
        const createdAt = String(row.created_at);
        const higherRow = await users
          .prepare(
            `SELECT COUNT(*) AS n FROM users
             WHERE onboarding_completed = 1 AND is_private != 1 AND xp > ?1`,
          )
          .bind(xp)
          .first<{ n: number }>();
        const sameEarlierRow = await users
          .prepare(
            `SELECT COUNT(*) AS n FROM users
             WHERE onboarding_completed = 1 AND is_private != 1 AND xp = ?1 AND created_at < ?2`,
          )
          .bind(xp, createdAt)
          .first<{ n: number }>();
        const rank = Number(higherRow?.n ?? 0) + Number(sameEarlierRow?.n ?? 0) + 1;
        me = serialize(row, rank);
      }
    }

    void streakOf;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = offset + leaderboard.length < total;

    return c.json({
      leaderboard,
      total,
      limit,
      offset,
      page,
      totalPages,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      prevOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      me,
      meMeta,
    });
  });

  return router;
}
