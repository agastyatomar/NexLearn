import { Hono } from "hono";
import { z } from "zod";
import { aiUsageFor, upsertAiUsage, exerciseById, lessonTitleById } from "../db/queries";
import { sha256Hex, nowIso } from "../db/serialize";
import type { AppConfig, IssueLike } from "./common";
import { validationError, rateLimit } from "./common";
import { jsonParseSafe } from "../db/serialize";

const askBody = z.object({
  lessonId: z.string().min(1).optional().nullable(),
  exerciseId: z.string().min(1).optional().nullable(),
  question: z.string().trim().min(1, "Ask something first.").max(1000),
  code: z.string().max(4000).optional().nullable(),
});

export const TUTOR_SYSTEM = `You are NexLearn AI, a friendly coding tutor for beginners in India learning JavaScript.
Rules you must follow:
- Hint-first: explain the concept and point at the mistake. NEVER give the full complete solution code.
- Short: at most 130 words. Plain text with at most one tiny snippet (6 lines max).
- Mirror the learner's language: if they write in Hinglish or Hindi, reply the same way; otherwise reply in simple English.
- Be encouraging, like a helpful senior. No emoji.`;

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ChatResult = { text: string; provider: string; model: string };

function providers(cfg: AppConfig) {
  const list: { name: string; key: string; model: string; baseUrl: string }[] = [];
  if (cfg.groqApiKey) list.push({ name: "groq", key: cfg.groqApiKey, model: cfg.groqModel, baseUrl: "https://api.groq.com/openai/v1" });
  if (cfg.openrouterApiKey)
    list.push({ name: "openrouter", key: cfg.openrouterApiKey, model: cfg.openrouterModel, baseUrl: "https://openrouter.ai/api/v1" });
  return list;
}

function isAiConfigured(cfg: AppConfig): boolean {
  return providers(cfg).length > 0;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function aiBudget(cfg: AppConfig, userId: string) {
  const limit = cfg.aiDailyLimit;
  const doc = await aiUsageFor(cfg.db, userId, todayKey()).first<{ count: number }>();
  const used = Number(doc?.count ?? 0);
  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit, usedToday: used };
}

async function chatComplete(cfg: AppConfig, messages: ChatMessage[], maxTokens = 400): Promise<ChatResult> {
  const defs = providers(cfg);
  if (!defs.length) throw new Error("No AI provider configured (missing API keys).");
  let lastError: unknown = null;
  for (const def of defs) {
    try {
      const res = await fetch(`${def.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${def.key}`,
          ...(def.name === "openrouter"
            ? { "HTTP-Referer": "https://nexlearn.workers.dev", "X-Title": "NexLearn" }
            : {}),
        },
        body: JSON.stringify({ model: def.model, messages, temperature: 0.7, max_tokens: Math.max(maxTokens, 150) }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`${def.name} HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error(`${def.name} empty response`);
      return { text, provider: def.name, model: def.model };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All AI providers failed.");
}

export function aiRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();
  const askLimiter = rateLimit(20, 60_000, "Too many questions at once, take a breath and try again.");

  // GET /api/ai/status
  router.get("/status", requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const budget = await aiBudget(cfg, userId);
    return c.json({ ...budget, configured: isAiConfigured(cfg) });
  });

  // POST /api/ai/help — hint-first doubt helper (501 until keys configured)
  router.post("/help", askLimiter, requireAuth, async (c) => {
    if (!isAiConfigured(cfg)) {
      return c.json({ message: "AI help isn't configured yet. Ask the community instead." }, 501);
    }
    const parsed = askBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const userId = c.get("userId") as string;
    const { lessonId, exerciseId, question, code } = parsed.data;

    let lessonTitle: string | null = null;
    let exerciseType: string | null = null;
    let exercisePrompt: string | null = null;
    if (lessonId) {
      const lesson = await lessonTitleById(cfg.db, lessonId).first();
      if (!lesson) return c.json({ message: "Lesson not found." }, 404);
      lessonTitle = String(lesson.title);
    }
    if (exerciseId) {
      const exercise = await exerciseById(cfg.db, exerciseId).first();
      if (!exercise) return c.json({ message: "Exercise not found." }, 404);
      exerciseType = String(exercise.type);
      const full = await cfg.db.prepare(`SELECT prompt FROM exercises WHERE id = ?1`).bind(exerciseId).first<{ prompt: string }>();
      exercisePrompt = full?.prompt ?? null;
      // Never attach the stored solution — the tutor must not leak answers
    }

    // Cache: identical doubts share one answer, don't spend budget
    const key = await sha256Hex([question.trim().toLowerCase(), code?.trim() ?? "", exerciseId ?? "", lessonId ?? ""].join("\n---\n"));
    const cached = await cfg.db
      .prepare(`SELECT answer, provider FROM ai_cache WHERE key = ?1 AND created_at > ?2`)
      .bind(key, new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .first<{ answer: string; provider: string }>();
    if (cached) {
      const budget = await aiBudget(cfg, userId);
      return c.json({ answer: cached.answer, provider: cached.provider, cached: true, ...budget });
    }

    const budget = await aiBudget(cfg, userId);
    if (!budget.allowed) {
      return c.json(
        {
          message: `You've used today's ${budget.limit} AI answers — they reset tomorrow. The community never runs out.`,
          ...budget,
        },
        429,
      );
    }

    const lines = [
      `Lesson: ${lessonTitle ?? "JavaScript basics"}`,
      `Exercise (${exerciseType ?? "code"}): ${exercisePrompt ?? ""}`,
    ];
    if (code && code.trim()) lines.push(`Learner's current work:\n${code.trim().slice(0, 1500)}`);
    lines.push(`Learner's question: ${question.trim()}`);
    const messages: ChatMessage[] = [
      { role: "system", content: TUTOR_SYSTEM },
      { role: "user", content: lines.join("\n\n") },
    ];

    try {
      const result = await chatComplete(cfg, messages, 400);
      await cfg.db.batch([
        cfg.db
          .prepare(`INSERT INTO ai_cache (key, answer, provider, model_name, created_at, updated_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?5)
                    ON CONFLICT(key) DO UPDATE SET answer = excluded.answer, provider = excluded.provider,
                      model_name = excluded.model_name, updated_at = excluded.updated_at`)
          .bind(key, result.text, result.provider, result.model, nowIso()),
        upsertAiUsage(cfg.db, crypto.randomUUID(), userId, todayKey(), nowIso()),
      ]);
      const after = await aiBudget(cfg, userId);
      return c.json({ answer: result.text, provider: result.provider, cached: false, ...after });
    } catch {
      return c.json({ message: "The AI helper is taking a break. Try again in a bit." }, 502);
    }
  });

  return router;
}

