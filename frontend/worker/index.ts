/* NexLearn worker entry — serves BOTH the Next.js app (via OpenNext) and the
   Hono /api on the same origin (session cookies stay first-party). */

import { Hono } from "hono";
import { fromWorkerEnv, type AppConfig } from "./api/common";
import { authRouter } from "./api/auth";
import { coursesRouter } from "./api/courses";
import { lessonsRouter } from "./api/lessons";
import { progressRouter } from "./api/progress";
import { communityRouter } from "./api/community";
import { usersRouter } from "./api/users";
import { leaderboardRouter } from "./api/leaderboard";
import { economyRouter } from "./api/economy";
import { aiRouter } from "./api/ai";
import { providersKey, aiFirstReplyForThread } from "./lib/ai-cron";
import { nowIso } from "./db/serialize";

export interface Env {
  DB?: unknown;
  JWT_SECRET?: string;
  NODE_ENV?: string;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  GOOGLE_CLIENT_ID?: string;
  APPWRITE_ENDPOINT?: string;
  APPWRITE_PROJECT_ID?: string;
  APPWRITE_BUCKET_ID?: string;
  APPWRITE_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENROUTER_MODEL?: string;
  AI_DAILY_LIMIT?: string;
  AI_AUTO_REPLY_DELAY_MS?: string;
}

/* OpenNext generated handler — set up by `opennextjs-cloudflare build`.
   Default config has no Durable Objects, so a simple re-export is enough. */

type NextHandler = { fetch: (request: Request, env: unknown, ctx: unknown) => Response | Promise<Response> };

let nextHandlerPromise: Promise<NextHandler> | null = null;
function loadNextHandler(): Promise<NextHandler> {
  if (!nextHandlerPromise) {
    // @ts-expect-error — generated at build time by opennextjs-cloudflare
    nextHandlerPromise = import("../.open-next/worker.js").then((m) => m.default ?? m);
  }
  return nextHandlerPromise;
}

/* Exported for tests (bun test runs the worker against an in-memory D1). */
export function buildApi(cfg: AppConfig) {
  const api = new Hono();

  /* Mounted WITH the /api prefix: the worker's fetch hands the full URL to
     this app (single origin keeps session cookies first-party). */
  api.get("/api", (c) => c.json({ ok: true, service: "nexlearn-worker", env: cfg.isProd ? "production" : "development" }));
  api.get("/api/health", (c) =>
    c.json({ ok: true, service: "nexlearn-worker", env: cfg.isProd ? "production" : "development" }),
  );

  const { router: auth, requireAuth } = authRouter(cfg);
  api.route("/api/auth", auth);
  api.route("/api/courses", coursesRouter(cfg));
  api.route("/api/lessons", lessonsRouter(cfg, requireAuth));
  api.route("/api/progress", progressRouter(cfg, requireAuth));
  api.route("/api/threads", communityRouter(cfg, requireAuth));
  api.route("/api/users", usersRouter(cfg, requireAuth));
  api.route("/api/leaderboard", leaderboardRouter(cfg, requireAuth));
  api.route("/api/economy", economyRouter(cfg, requireAuth));
  api.route("/api/ai", aiRouter(cfg, requireAuth));

  api.notFound((c) => c.json({ message: "Not found." }, 404));
  api.onError((err, c) => {
    console.error("[api]", err instanceof Error ? `${err.stack ?? err.message}` : err);
    return c.json({ message: "Internal server error." }, 500);
  });
  return api;
}

let apiSingleton: Hono | null = null;
function apiFor(env: Env): { api: Hono; cfg: AppConfig } | { configError: string } {
  const resolved = fromWorkerEnv({
    DB: env.DB as never,
    JWT_SECRET: env.JWT_SECRET,
    NODE_ENV: env.NODE_ENV,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    APPWRITE_ENDPOINT: env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: env.APPWRITE_PROJECT_ID,
    APPWRITE_BUCKET_ID: env.APPWRITE_BUCKET_ID,
    APPWRITE_API_KEY: env.APPWRITE_API_KEY,
    GROQ_API_KEY: env.GROQ_API_KEY,
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
    GROQ_MODEL: env.GROQ_MODEL,
    OPENROUTER_MODEL: env.OPENROUTER_MODEL,
    AI_DAILY_LIMIT: env.AI_DAILY_LIMIT,
    AI_AUTO_REPLY_DELAY_MS: env.AI_AUTO_REPLY_DELAY_MS,
  });
  if ("error" in resolved) return { configError: resolved.error };
  if (!apiSingleton) apiSingleton = buildApi(resolved);
  return { api: apiSingleton, cfg: resolved };
}

async function handleApi(request: Request, env: Env, ctx: unknown): Promise<Response> {
  const resolved = apiFor(env);
  if ("configError" in resolved) {
    return Response.json({ message: resolved.configError }, { status: 503 });
  }
  return resolved.api.fetch(request, env as never, ctx as never);
}

export default {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      // Health always answers, even without D1/secret — orchestrators ping it.
      return Response.json({ ok: true, service: "nexlearn-worker", env: env.NODE_ENV === "development" ? "development" : "production" });
    }
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, env, ctx);
    }
    const handler = await loadNextHandler();
    return handler.fetch(request, env, ctx);
  },

  // Cron: AI first-responder for unanswered threads (runs every minute)
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    const resolved = apiFor(env);
    if ("configError" in resolved) return;
    const { cfg } = resolved;
    ctx.waitUntil(runAiFirstReplyCron(cfg));
  },
} as ExportedObjectFromEnv<Env>;

// Minimal structural alias so the default export works on Workers runtimes and
// in bun test with a shim env.
type ExportedObjectFromEnv<E> = {
  fetch: (request: Request, env: E, ctx: unknown) => Response | Promise<Response>;
  scheduled?: (event: unknown, env: E, ctx: { waitUntil: (p: Promise<unknown>) => void }) => void | Promise<void>;
};

/* ---------- AI first-reply cron (PRD 5.5) ----------
   Cloudflare Queues are paid; an in-process timeout dies with the isolate.
   Cron Trigger + `ai_reply_pending` is the free-reliable equivalent of the old
   3-minute delayed first reply. */

async function runAiFirstReplyCron(cfg: AppConfig): Promise<void> {
  if (!providersKey(cfg)) return; // AI keys not configured — nothing to do
  const db = cfg.db;
  const due = await db
    .prepare(
      `SELECT * FROM threads
       WHERE ai_reply_pending IS NOT NULL AND ai_reply_pending <= ?1
         AND reply_count = 0
       ORDER BY ai_reply_pending ASC LIMIT 5`,
    )
    .bind(nowIso())
    .all();
  for (const row of (due.results ?? []) as Record<string, unknown>[]) {
    await aiFirstReplyForThread(cfg, row);
  }
}
