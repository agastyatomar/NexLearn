/* AI helpers shared by /api routes and the cron first-responder. */

import { nowIso } from "../db/serialize";
import type { AppConfig } from "../api/common";

export function providersKey(cfg: AppConfig): boolean {
  return Boolean(cfg.groqApiKey || cfg.openrouterApiKey);
}

const TUTOR_SYSTEM = `You are NexLearn AI, a friendly coding tutor for beginners in India learning JavaScript.
Rules you must follow:
- Hint-first: explain the concept and point at the mistake. NEVER give the full complete solution code.
- Short: at most 130 words. Plain text with at most one tiny snippet (6 lines max).
- Mirror the learner's language: if they write in Hinglish or Hindi, reply the same way; otherwise reply in simple English.
- Be encouraging, like a helpful senior. No emoji.`;

export function threadPrompt(input: { lessonTitle?: string | null; title: string; body: string }) {
  return [
    { role: "system" as const, content: TUTOR_SYSTEM + " You are answering a community question. End with one line inviting peers to add their take." },
    {
      role: "user" as const,
      content: `Lesson: ${input.lessonTitle ?? "General"}\n\nQuestion title: ${input.title}\n\nDetails: ${input.body}`,
    },
  ];
}

export async function chatCompleteFor(cfg: AppConfig, messages: { role: "system" | "user" | "assistant"; content: string }[], maxTokens = 450): Promise<{ text: string; provider: string; model: string }> {
  const defs: { name: string; key: string; model: string; baseUrl: string }[] = [];
  if (cfg.groqApiKey) defs.push({ name: "groq", key: cfg.groqApiKey, model: cfg.groqModel, baseUrl: "https://api.groq.com/openai/v1" });
  if (cfg.openrouterApiKey) defs.push({ name: "openrouter", key: cfg.openrouterApiKey, model: cfg.openrouterModel, baseUrl: "https://openrouter.ai/api/v1" });
  if (!defs.length) throw new Error("No AI provider configured (missing API keys).");
  let lastError: unknown = null;
  for (const def of defs) {
    try {
      const res = await fetch(`${def.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${def.key}` },
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

/* System author for first-responder replies. */
export async function ensureAiUser(cfg: AppConfig): Promise<Record<string, unknown>> {
  const existing = await cfg.db
    .prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?1)`)
    .bind("nexlearn-ai")
    .first();
  if (existing) return existing as Record<string, unknown>;
  const id = crypto.randomUUID();
  try {
    const passwordHash = await hashPasswordRaw(crypto.randomUUID());
    await cfg.db
      .prepare(
        `INSERT INTO users (id, username, email, password_hash, google_id, name, xp, level, timezone, badges,
           onboarding_completed, is_system, created_at, updated_at)
         VALUES (?1, 'nexlearn-ai', 'ai@nexlearn.internal', ?2, NULL, 'NexLearn AI', 0, 1, 'Asia/Kolkata', '[]', 1, 1, ?3, ?3)`,
      )
      .bind(id, passwordHash, nowIso())
      .run();
  } catch {
    // Lost a create race — fetch the winner
  }
  const winner = await cfg.db
    .prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER('nexlearn-ai')`)
    .first();
  if (!winner) throw new Error("Could not ensure AI user.");
  return winner as Record<string, unknown>;
}

async function hashPasswordRaw(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const b64 = (bytes: Uint8Array) => {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  return `pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

/** Fire an AI first reply for one due thread (used by the cron). */
export async function aiFirstReplyForThread(cfg: AppConfig, thread: Record<string, unknown>): Promise<void> {
  try {
    const threadId = String(thread.id);
    const peerReplies = await cfg.db
      .prepare(`SELECT COUNT(*) AS n FROM replies WHERE thread_id = ?1 AND is_ai = 0`)
      .bind(threadId)
      .first<{ n: number }>();
    if (Number(peerReplies?.n ?? 0) > 0) {
      await cfg.db.prepare(`UPDATE threads SET ai_reply_pending = NULL WHERE id = ?1`).bind(threadId).run();
      return; // peers got there first — stay out of the way
    }
    let lessonTitle: string | null = null;
    if (thread.lesson_id) {
      const lesson = await cfg.db
        .prepare(`SELECT title FROM lessons WHERE id = ?1`)
        .bind(String(thread.lesson_id))
        .first<{ title: string }>();
      lessonTitle = lesson?.title ?? null;
    }
    const result = await chatCompleteFor(cfg, threadPrompt({ lessonTitle, title: String(thread.title), body: String(thread.body) }));
    const aiUser = await ensureAiUser(cfg);
    const aiUserId = String(aiUser.id);
    const replyId = crypto.randomUUID();
    const now = nowIso();
    await cfg.db.batch([
      cfg.db
        .prepare(`INSERT INTO replies (id, thread_id, author_id, body, votes, upvoted_by, is_accepted, is_ai, created_at, updated_at)
                  VALUES (?1, ?2, ?3, ?4, 0, '[]', 0, 1, ?5, ?5)`)
        .bind(replyId, threadId, aiUserId, result.text, now),
      cfg.db
        .prepare(`UPDATE threads SET reply_count = reply_count + 1, ai_reply_pending = NULL, updated_at = ?2 WHERE id = ?1`)
        .bind(threadId, now),
    ]);
  } catch (e) {
    console.error("[ai-first-reply]", e instanceof Error ? e.message : e);
    // Leave ai_reply_pending intact for the next cron tick
  }
}
