import type { Context, MiddlewareHandler } from "hono";
import type { D1Like } from "../db/client";

/* Module augmentation so `c.set/get` accepts our session variables everywhere. */
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userRow: Record<string, unknown>;
  }
}

export interface AppConfig {
  db: D1Like;
  jwtSecret: string;
  isProd: boolean;
  // Optional integrations — degrade gracefully when unset (same as Express)
  googleClientId: string;
  appwriteEndpoint: string;
  appwriteProjectId: string;
  appwriteBucketId: string;
  appwriteApiKey: string;
  groqApiKey: string;
  openrouterApiKey: string;
  groqModel: string;
  openrouterModel: string;
  aiDailyLimit: number;
  aiAutoReplyDelayMs: number;
}

/* ---------- Errors / validation (same JSON shapes as Express) ---------- */

export type FieldIssues = { path: (string | number)[]; message: string }[];
export type IssueLike = { path: readonly (string | number)[]; message: string };

export function jsonError(c: Context, status: number, message: string, extra?: Record<string, unknown>) {
  return c.json({ message, ...(extra ?? {}) }, status as 400);
}

export function validationError(c: Context, issues: IssueLike[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return c.json({ message: "Validation failed.", errors }, 400);
}

export function notFound(c: Context, what = "Lesson not found.") {
  return c.json({ message: what }, 404);
}

/* ---------- Rate limiting (per-isolate, in-memory) ----------
   The old express-rate-limit middleware had per-process counters; on Workers
   isolates are ephemeral — this is best-effort abuse damping, plus D1 free
   tier quotas and the per-IP Cloudflare protections act as backstops. */

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

/** Test helper: clears all in-memory rate-limit buckets. */
export function resetRateLimits() {
  buckets.clear();
}

export function rateLimit(max: number, windowMs = WINDOW_MS, message?: string): MiddlewareHandler {
  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const key = `${c.req.path.split("/")[2] ?? "api"}:${ip}`; // bucket per route-family + ip
    const now = Date.now();
    const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      return c.json({ message: message ?? "Too many requests, try again later." }, 429);
    }
    arr.push(now);
    buckets.set(key, arr);
    // Opportunistic global cleanup
    if (buckets.size > 50_000) {
      for (const [k, v] of buckets) {
        if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
      }
    }
    await next();
  };
}

/* ---------- ID / misc validators ---------- */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Accepts our UUID ids; rejects weird strings so lookups stay safe. */
export function isId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 64 && /^[0-9a-zA-Z_-]+$/.test(value);
}

export const isUuid = UUID_RE;

export function fromWorkerEnv(wenv: {
  DB?: D1Like;
  JWT_SECRET?: string;
  NODE_ENV?: string;
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
}): AppConfig | { error: string } {
  if (!wenv.DB) return { error: "D1 binding DB is not configured." };
  if (!wenv.JWT_SECRET) return { error: "JWT_SECRET secret is not configured (wrangler secret put JWT_SECRET)." };
  const num = (raw: string | undefined, fallback: number) => {
    const v = Number(raw);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    db: wenv.DB,
    jwtSecret: wenv.JWT_SECRET,
    isProd: (wenv.NODE_ENV ?? "production") !== "development",
    googleClientId: wenv.GOOGLE_CLIENT_ID ?? "",
    appwriteEndpoint: wenv.APPWRITE_ENDPOINT ?? "",
    appwriteProjectId: wenv.APPWRITE_PROJECT_ID ?? "",
    appwriteBucketId: wenv.APPWRITE_BUCKET_ID ?? "",
    appwriteApiKey: wenv.APPWRITE_API_KEY ?? "",
    groqApiKey: wenv.GROQ_API_KEY ?? "",
    openrouterApiKey: wenv.OPENROUTER_API_KEY ?? "",
    groqModel: wenv.GROQ_MODEL ?? "openai/gpt-oss-20b",
    openrouterModel: wenv.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
    aiDailyLimit: num(wenv.AI_DAILY_LIMIT, 20),
    aiAutoReplyDelayMs: num(wenv.AI_AUTO_REPLY_DELAY_MS, 180_000),
  };
}
