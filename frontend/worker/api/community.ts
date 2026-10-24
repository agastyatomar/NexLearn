import { Hono } from "hono";
import { z } from "zod";
import {
  lessonTitleById,
  lessonTitlesByIds,
  authorsByIds,
  upsertAiUsage,
} from "../db/queries";
import { upsertThreadVote, upsertReplyVote } from "../db/progress-sql";
import { nowIso, jsonParseSafe } from "../db/serialize";
import type { Row } from "../db/client";
import type { AppConfig, IssueLike } from "./common";
import { validationError, rateLimit } from "./common";
import { isId } from "./common";

function rateLimitRead() {
  return rateLimit(200, 60_000);
}
function rateLimitWrite() {
  return rateLimit(30, 60_000, "Too many posts, slow down a little.");
}

const threadBody = z.object({
  title: z.string().trim().min(5, "Give it a clear title (5+ characters).").max(120),
  body: z.string().trim().min(10, "Describe your doubt in a little more detail (10+ characters).").max(2000),
  lessonId: z.string().min(1).optional().nullable(),
});
const replyBody = z.object({ body: z.string().trim().min(1, "Write a reply first.").max(2000) });
const acceptBody = z.object({ replyId: z.string().min(1) });
const reportBody = z.object({
  targetType: z.enum(["thread", "reply"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(5, "Tell us briefly what's wrong (5+ characters).").max(500),
});

type AuthorInfo = { username: string; avatar: string | null };

async function authorMap(db: AppConfig["db"], ids: unknown[]): Promise<Map<string, AuthorInfo>> {
  const uniq = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniq.length) return new Map();
  const res = await authorsByIds(db, uniq).all();
  const m = new Map<string, AuthorInfo>();
  for (const r of (res.results ?? []) as Record<string, unknown>[]) {
    m.set(String(r.id), { username: String(r.username ?? "learner"), avatar: r.avatar != null ? String(r.avatar) : null });
  }
  return m;
}

async function lessonTitleMap(db: AppConfig["db"], ids: unknown[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniq.length) return new Map();
  const res = await lessonTitlesByIds(db, uniq).all();
  const m = new Map<string, string>();
  for (const r of (res.results ?? []) as Record<string, unknown>[]) m.set(String(r.id), String(r.title));
  return m;
}

function serializeThread(row: Row, authors: Map<string, AuthorInfo>, lessons: Map<string, string>, viewerId?: string) {
  const lessonId = row.lesson_id != null ? String(row.lesson_id) : null;
  const votes = Number(row.votes ?? 0);
  const author = authors.get(String(row.author_id));
  const upvotedBy = jsonParseSafe<string[]>(row.upvoted_by, []);
  return {
    id: String(row.id),
    lessonId,
    lessonTitle: lessonId ? (lessons.get(lessonId) ?? null) : null,
    title: String(row.title),
    body: String(row.body),
    votes,
    replyCount: Number(row.reply_count ?? 0),
    accepted: Boolean(row.accepted_reply_id),
    viewerUpvoted: viewerId ? upvotedBy.includes(viewerId) : false,
    author: {
      id: String(row.author_id),
      username: author?.username ?? "learner",
      avatar: author?.avatar ?? null,
    },
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function serializeReply(row: Row, authors: Map<string, AuthorInfo>, viewerId?: string) {
  const isAi = Boolean(row.is_ai);
  const votes = Number(row.votes ?? 0);
  const author = authors.get(String(row.author_id));
  const upvotedBy = jsonParseSafe<string[]>(row.upvoted_by, []);
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    body: String(row.body),
    votes,
    isAccepted: Boolean(row.is_accepted),
    isAi,
    viewerUpvoted: viewerId ? upvotedBy.includes(viewerId) : false,
    author: {
      id: String(row.author_id),
      username: isAi ? "NexLearn AI" : (author?.username ?? "learner"),
      avatar: author?.avatar ?? null,
    },
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lessonId: null as string | null,
  };
}

export function communityRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();
  const readLimiter = rateLimitRead();
  const writeLimiter = rateLimitWrite();

  // GET /api/threads?lessonId=&sort=new|top&limit=&before=
  router.get("/", readLimiter, requireAuth, async (c) => {
    const viewerId = c.get("userId") as string;
    const sort = c.req.query("sort") === "top" ? "top" : "new";
    const limit = Math.min(Math.max(Number(c.req.query("limit")) || 20, 1), 30);
    const lessonIdRaw = c.req.query("lessonId");
    const lessonId = lessonIdRaw && isId(lessonIdRaw) ? lessonIdRaw : null;
    const before = c.req.query("before") && !Number.isNaN(Date.parse(c.req.query("before")!)) ? c.req.query("before") : null;

    const conds: string[] = [];
    const binds: unknown[] = [];
    if (lessonId) {
      conds.push(`lesson_id = ?${binds.length + 1}`);
      binds.push(lessonId);
    }
    if (before) {
      conds.push(`created_at < ?${binds.length + 1}`);
      binds.push(before);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const orderSql = sort === "top" ? "votes DESC, created_at DESC" : "created_at DESC";
    const res = await cfg.db
      .prepare(`SELECT * FROM threads ${where} ORDER BY ${orderSql} LIMIT ?${binds.length + 1}`)
      .bind(...binds, limit + 1)
      .all();
    const docs = (res.results ?? []) as Row[];
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const authors = await authorMap(cfg.db, page.map((t) => t.author_id));
    const lessons = await lessonTitleMap(cfg.db, page.map((t) => t.lesson_id));
    const threads = page.map((t) => serializeThread(t, authors, lessons, viewerId));
    const nextCursor = hasMore && page.length? String(page[page.length - 1].created_at) : null;
    return c.json({ threads, nextCursor });
  });

  // POST /api/threads — ask a question
  router.post("/", writeLimiter, requireAuth, async (c) => {
    const parsed = threadBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return validationError(c, parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) as unknown as IssueLike[]);
    }
    const { title, body, lessonId } = parsed.data;
    const userId = c.get("userId") as string;

    if (lessonId && !isId(lessonId)) {
      return c.json({ message: "Validation failed.", errors: { lessonId: "Unknown lesson." } }, 400);
    }
    if (lessonId) {
      const lesson = await lessonTitleById(cfg.db, lessonId).first();
      if (!lesson) return c.json({ message: "Lesson not found." }, 404);
    }

    const id = crypto.randomUUID();
    const now = nowIso();
    await cfg.db
      .prepare(
        `INSERT INTO threads (id, lesson_id, author_id, title, body, votes, upvoted_by, reply_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, '[]', 0, ?6, ?6)`,
      )
      .bind(id, lessonId ?? null, userId, title, body, now)
      .run();

    const row = await cfg.db.prepare(`SELECT * FROM threads WHERE id = ?1`).bind(id).first();
    const authors = await authorMap(cfg.db, [row?.author_id]);
    const lessons = await lessonTitleMap(cfg.db, [row?.lesson_id]);
    return c.json({ thread: serializeThread(row as Row, authors, lessons, userId) }, 201);
  });

  // SSE stream — heartbeat + poll for new threads/replies (multi-isolate safe)
  router.get("/stream", requireAuth, async (c) => {
    const lessonIdRaw = c.req.query("lessonId");
    const lessonId = lessonIdRaw && isId(lessonIdRaw) ? lessonIdRaw : null;
    const startedAt = nowIso();
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        send("connected", { ok: true });

        let lastPoll = startedAt;
        heartbeat = setInterval(() => {
          try {
            if (!closed) controller.enqueue(enc.encode(`: heartbeat\n\n`));
          } catch {}
        }, 25000);

        const poll = async () => {
          while (!closed) {
            await new Promise((r) => setTimeout(r, 5000));
            if (closed) break;
            try {
              // New threads since last poll
              const threadsRes = await cfg.db
                .prepare(
                  `SELECT * FROM threads WHERE created_at > ?1 AND (?2 IS NULL OR lesson_id = ?2) ORDER BY created_at ASC LIMIT 20`,
                )
                .bind(lastPoll, lessonId)
                .all();
              if (!closed) {
                for (const t of (threadsRes.results ?? []) as Row[]) {
                  const authors = await authorMap(cfg.db, [t.author_id]);
                  const lessons = await lessonTitleMap(cfg.db, [t.lesson_id]);
                  send("thread", serializeThread(t, authors, lessons));
                }
              }
              // New replies to threads in scope
              const threadScope = lessonId
                ? `thread_id IN (SELECT id FROM threads WHERE lesson_id = ?2)`
                : `1=1`;
              const repliesRes = await cfg.db
                .prepare(
                  `SELECT r.* FROM replies r WHERE r.created_at > ?1 AND (${threadScope}) ORDER BY r.created_at ASC LIMIT 20`,
                )
                .bind(lastPoll, lessonId)
                .all();
              if (!closed) {
                for (const r of (repliesRes.results ?? []) as Row[]) {
                  const authors = await authorMap(cfg.db, [r.author_id]);
                  const payload = serializeReply(r, authors);
                  payload.lessonId = lessonId;
                  send("reply", payload);
                }
              }
              lastPoll = nowIso();
            } catch {}
          }
        };

        void poll();
      },
      cancel() {
        closed = true;
        if (heartbeat !== null) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });

  // GET /api/threads/:id
  router.get("/:id", readLimiter, requireAuth, async (c) => {
    const viewerId = c.get("userId") as string;
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ message: "Thread not found." }, 404);

    const doc = await cfg.db.prepare(`SELECT * FROM threads WHERE id = ?1`).bind(id).first();
    if (!doc) return c.json({ message: "Thread not found." }, 404);

    const replies = (await cfg.db.prepare(`SELECT * FROM replies WHERE thread_id = ?1`).bind(id).all().then((r) => (r.results ?? []) as Row[])).sort((a, b) => {
      const aAcc = Boolean(a.is_accepted), bAcc = Boolean(b.is_accepted);
      if (aAcc !== bAcc) return aAcc ? -1 : 1;
      const aV = Number(a.votes ?? 0), bV = Number(b.votes ?? 0);
      if (bV !== aV) return bV - aV;
      return String(a.created_at).localeCompare(String(b.created_at));
    });

    const authors = await authorMap(cfg.db, [doc.author_id, ...replies.map((r) => r.author_id)]);
    const lessons = await lessonTitleMap(cfg.db, [doc.lesson_id]);
    const thread = serializeThread(doc as Row, authors, lessons, viewerId) as Record<string, unknown>;
    thread.canAccept = String(doc.author_id) === viewerId;
    return c.json({ thread, replies: replies.map((r) => serializeReply(r, authors, viewerId)) });
  });

  // POST /api/threads/:id/replies
  router.post("/:id/replies", writeLimiter, requireAuth, async (c) => {
    const parsed = replyBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return validationError(c, parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) as unknown as IssueLike[]);
    }
    const userId = c.get("userId") as string;
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ message: "Thread not found." }, 404);

    const thread = await cfg.db.prepare(`SELECT * FROM threads WHERE id = ?1`).bind(id).first();
    if (!thread) return c.json({ message: "Thread not found." }, 404);

    const replyId = crypto.randomUUID();
    await cfg.db.batch([
      cfg.db
        .prepare(`INSERT INTO replies (id, thread_id, author_id, body, votes, upvoted_by, is_accepted, is_ai, created_at, updated_at)
                  VALUES (?1, ?2, ?3, ?4, 0, '[]', 0, 0, ?5, ?5)`)
        .bind(replyId, id, userId, parsed.data.body, nowIso()),
      cfg.db
        .prepare(`UPDATE threads SET reply_count = reply_count + 1, ai_reply_pending = NULL, updated_at = ?2 WHERE id = ?1`)
        .bind(id, nowIso()),
    ]);

    const row = await cfg.db.prepare(`SELECT * FROM replies WHERE id = ?1`).bind(replyId).first();
    const authors = await authorMap(cfg.db, [row?.author_id]);
    return c.json({ reply: serializeReply(row as Row, authors, userId) }, 201);
  });

  // POST /api/threads/:id/upvote — toggle
  router.post("/:id/upvote", writeLimiter, requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ message: "Thread not found." }, 404);

    const doc = await cfg.db.prepare(`SELECT upvoted_by, votes FROM threads WHERE id = ?1`).bind(id).first();
    if (!doc) return c.json({ message: "Thread not found." }, 404);
    const already = jsonParseSafe<string[]>(doc.upvoted_by, []).includes(userId);
    await upsertThreadVote(cfg.db, id, userId, !already, nowIso()).run();

    const after = await cfg.db.prepare(`SELECT upvoted_by, votes FROM threads WHERE id = ?1`).bind(id).first();
    const votes = Math.max(0, Number((after as Row | null)?.votes ?? 0));
    return c.json({ votes, upvoted: !already });
  });

  // POST /api/threads/:id/accept — asker-only
  router.post("/:id/accept", writeLimiter, requireAuth, async (c) => {
    const parsed = acceptBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return validationError(c, parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) as unknown as IssueLike[]);
    }
    const userId = c.get("userId") as string;
    const id = c.req.param("id");
    if (!isId(id) || !isId(parsed.data.replyId)) return c.json({ message: "Thread not found." }, 404);

    const thread = await cfg.db.prepare(`SELECT * FROM threads WHERE id = ?1`).bind(id).first();
    if (!thread) return c.json({ message: "Thread not found." }, 404);
    if (String(thread.author_id) !== userId) {
      return c.json({ message: "Only the asker can accept an answer." }, 403);
    }
    const reply = await cfg.db
      .prepare(`SELECT * FROM replies WHERE id = ?1 AND thread_id = ?2`)
      .bind(parsed.data.replyId, id)
      .first();
    if (!reply) return c.json({ message: "Reply not found." }, 404);

    await cfg.db.batch([
      cfg.db.prepare(`UPDATE replies SET is_accepted = 0, updated_at = ?2 WHERE thread_id = ?1`).bind(id, nowIso()),
      cfg.db.prepare(`UPDATE replies SET is_accepted = 1, updated_at = ?2 WHERE id = ?1`).bind(parsed.data.replyId, nowIso()),
      cfg.db.prepare(`UPDATE threads SET accepted_reply_id = ?2, updated_at = ?3 WHERE id = ?1`).bind(id, parsed.data.replyId, nowIso()),
    ]);
    return c.json({ acceptedReplyId: String(parsed.data.replyId) });
  });

  // POST /api/threads/replies/:replyId/upvote — toggle
  router.post("/replies/:replyId/upvote", writeLimiter, requireAuth, async (c) => {
    const userId = c.get("userId") as string;
    const replyId = c.req.param("replyId");
    if (!isId(replyId)) return c.json({ message: "Reply not found." }, 404);

    const doc = await cfg.db.prepare(`SELECT upvoted_by, votes FROM replies WHERE id = ?1`).bind(replyId).first();
    if (!doc) return c.json({ message: "Reply not found." }, 404);
    const already = jsonParseSafe<string[]>(doc.upvoted_by, []).includes(userId);
    await upsertReplyVote(cfg.db, replyId, userId, !already, nowIso()).run();

    const after = await cfg.db.prepare(`SELECT votes FROM replies WHERE id = ?1`).bind(replyId).first();
    const votes = Math.max(0, Number((after as Row | null)?.votes ?? 0));
    return c.json({ votes, upvoted: !already });
  });

  // POST /api/threads/reports
  router.post("/reports", writeLimiter, requireAuth, async (c) => {
    const parsed = reportBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return validationError(c, parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) as unknown as IssueLike[]);
    }
    const userId = c.get("userId") as string;
    const { targetType, targetId, reason } = parsed.data;
    if (!isId(targetId)) return c.json({ message: "Content not found." }, 404);

    const table = targetType === "thread" ? "threads" : "replies";
    const exists = await cfg.db.prepare(`SELECT 1 AS x FROM ${table} WHERE id = ?1`).bind(targetId).first();
    if (!exists) return c.json({ message: "Content not found." }, 404);

    const dupe = await cfg.db
      .prepare(`SELECT 1 AS x FROM reports WHERE target_type = ?1 AND target_id = ?2 AND reporter_id = ?3`)
      .bind(targetType, targetId, userId)
      .first();
    if (dupe) return c.json({ message: "You already reported this." }, 409);

    await cfg.db
      .prepare(`INSERT INTO reports (id, target_type, target_id, reporter_id, reason, status, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6, ?6)`)
      .bind(crypto.randomUUID(), targetType, targetId, userId, reason, nowIso())
      .run();
    return c.json({ message: "Thanks — our moderators will take a look." }, 201);
  });

  return router;
}

