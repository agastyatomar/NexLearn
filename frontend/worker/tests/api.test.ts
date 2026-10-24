/* NexLearn worker — API contract tests against an in-memory D1.
   Contract parity with the Express backend is the point: shapes, status
   codes, cookies and XP/streak/CC economics must stay byte-for-byte the same.
   Express references live in backend/src/routes/*.ts — keep these in sync. */

import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { buildApi } from "../index";
import { fromWorkerEnv, resetRateLimits } from "../api/common";
import { newMemoryDb } from "./d1-shim";
import type { D1Like } from "../db/client";

const SECRET = "test-secret-jwt-signing-key-0123456789abcdef";

let db: D1Like;
let api: ReturnType<typeof buildApi>;
let userSeq = 0;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(`http://test.local${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function cookieOf(res: Response): Promise<string> {
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

/* register AND log back in — so cookie is session-fresh every time. */
async function registerUser(username?: string): Promise<{ cookie: string; id: string; email: string }> {
  const name = username ?? `user${++userSeq}`;
  const email = `${name}@bill.test`;
  const res = await api.request(req("/api/auth/register", { method: "POST", body: { username: name, email, password: "!Test1234" } }));
  expect(res.status).toBe(201);
  const tokenCookie = await cookieOf(res);
  const me = await api.request(req("/api/auth/me", { cookie: tokenCookie }));
  expect(me.status).toBe(200);
  const body = await me.json();
  return { cookie: tokenCookie, id: body.user.id, email };
}

beforeEach(() => {
  resetRateLimits();
});

beforeAll(async () => {
  db = newMemoryDb();
  const resolved = fromWorkerEnv({ DB: db, JWT_SECRET: SECRET, NODE_ENV: "development" });
  if ("error" in resolved) throw new Error(resolved.error);
  api = buildApi(resolved);
});

async function lessonByTitle(lessonTitle: string): Promise<{ id: string; unit_id: string } | null> {
  return db.prepare(`SELECT id, unit_id FROM lessons WHERE title = ?1`).bind(lessonTitle).first();
}

/* ---------------- Auth ---------------- */
describe("auth", () => {
  test("register returns 201 + session cookie + full user shape", async () => {
    const res = await api.request(req("/api/auth/register", { method: "POST", body: { username: "gwara", email: "gwara@bill.test", password: "!Test1234" } }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.id).toBeDefined();
    expect(body.user.username).toBe("gwara");
    expect(body.user.email).toBe("gwara@bill.test");
    // fresh learner economy (register seed values)
    expect(body.user.hearts).toBe(3);
    expect(body.user.badges).toEqual([]);
    expect(await cookieOf(res)).toContain("nexlearn_token=");
  });

  test("duplicate username or email gets a 409 with message", async () => {
    const dupeName = await api.request(req("/api/auth/register", { method: "POST", body: { username: "gwara", email: "other1@bill.test", password: "!Test1234" } }));
    expect(dupeName.status).toBe(409);
    expect((await dupeName.json()).message).toContain("taken");
    const dupeEmail = await api.request(req("/api/auth/register", { method: "POST", body: { username: "another1", email: "gwara@bill.test", password: "!Test1234" } }));
    expect(dupeEmail.status).toBe(409);
  });

  test("weak password gets a validation error keyed by field", async () => {
    const res = await api.request(req("/api/auth/register", { method: "POST", body: { username: "weakpw", email: "weak@bill.test", password: "123" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Validation failed.");
    expect(body.errors.password).toBeDefined();
  });

  test("login sets a fresh cookie; wrong password 401", async () => {
    const ok = await api.request(req("/api/auth/login", { method: "POST", body: { email: "gwara@bill.test", password: "!Test1234" } }));
    expect(ok.status).toBe(200);
    expect(await cookieOf(ok)).toContain("nexlearn_token=");
    const bad = await api.request(req("/api/auth/login", { method: "POST", body: { email: "gwara@bill.test", password: "nope-totally-wrong" } }));
    expect(bad.status).toBe(401);
  });

  test("/api/auth/me without cookie 401; with cookie returns email for self", async () => {
    const unauth = await api.request(req("/api/auth/me"));
    expect(unauth.status).toBe(401);
    const self = await api.request(req("/api/auth/me", { cookie: await loginCookie("gwara") }));
    expect(self.status).toBe(200);
    expect((await self.json()).user.email).toBe("gwara@bill.test");
  });

  test("PATCH /api/users/me keeps email + username locked, applies profile", async () => {
    const { cookie } = await registerUser("onb-user");
    const res = await api.request(
      req("/api/users/me", { method: "PATCH", cookie, body: { name: "Onboards!", bio: "New ji", timezone: "Asia/Kolkata", isPrivate: true } }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user.isPrivate).toBe(true);
    const me = await (await api.request(req("/api/auth/me", { cookie }))).json();
    expect(me.user.name).toBe("Onboards!");
  });

  test("google sign-in without configured client id -> 501", async () => {
    const res = await api.request(req("/api/auth/google", { method: "POST", body: { credential: "x" } }));
    expect(res.status).toBe(501);
  });
});

async function loginCookie(username: string): Promise<string> {
  const res = await api.request(req("/api/auth/login", { method: "POST", body: { email: `${username}@bill.test`, password: "!Test1234" } }));
  return cookieOf(res);
}

/* ---------------- Courses / lessons ---------------- */
describe("courses", () => {
  test("GET /api/courses returns seeded JS course with units + lessons", async () => {
    const res = await api.request(req("/api/courses"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const courses = Array.isArray(body.courses) ? body.courses : Array.isArray(body) ? body : [];
    const js = courses.find((c: { title?: string }) => c.title === "JS from Zero");
    expect(js).toBeDefined();
    expect(js.units.length).toBe(5);
    expect(js.units[0].lessons.length).toBe(6);
  });

  test("GET /api/lessons/:id returns lesson + exercises incl. solutions (auth)", async () => {
    const { cookie } = await registerUser("lesson-viewer");
    const lesson = await lessonByTitle("What is Code?");
    const res = await api.request(req(`/api/lessons/${lesson?.id}`, { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(String(body.lesson._id)).toBe(lesson?.id);
    expect(body.exercises.length).toBeGreaterThan(0);
    expect(body.exercises[0].solution).toBeDefined();
  });

  test("unknown lesson -> 404", async () => {
    const { cookie } = await registerUser("lesson-404");
    const res = await api.request(req("/api/lessons/00000000-0000-5000-8000-000000000000", { cookie }));
    expect(res.status).toBe(404);
  });
});

/* ---------------- Progress ---------------- */
describe("progress", () => {
  test("first completion awards XP + CC and docs keep Mongoose shapes", async () => {
    const { cookie } = await registerUser("prog1");
    const lesson = await lessonByTitle("What is Code?");
    const first = await api.request(req("/api/progress", { method: "POST", cookie, body: { lessonId: lesson?.id, score: 80, completed: true } }));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.xpAwarded).toBe(40); // 5*min(total) + bonus, capped total*5+15
    expect(firstBody.ccAwarded).toBe(5); // CC_PER_LESSON
    expect(firstBody.progress._id).toBeDefined(); // own doc id (Express _id parity)
    expect(firstBody.progress.lessonId).toBe(lesson?.id);
    expect(firstBody.progress.status).toBe("completed");
    expect(firstBody.newBadges).toContain("first_lesson");

    const again = await api.request(req("/api/progress", { method: "POST", cookie, body: { lessonId: lesson?.id, score: 100, completed: true } }));
    const againBody = await again.json();
    expect(againBody.xpAwarded).toBe(0);
    // bestScore rises even without rewards
    expect(againBody.progress.bestScore).toBe(100);
  });

  test("GET /api/progress/me lists progress docs with Mongoose ids", async () => {
    const cookie = await loginCookie("prog1");
    const res = await api.request(req("/api/progress/me", { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.progress)).toBe(true);
    expect(body.progress[0]._id).toBeDefined();
  });

  test("lesson not found -> 404", async () => {
    const cookie = await loginCookie("prog1");
    const res = await api.request(req("/api/progress", { method: "POST", cookie, body: { lessonId: "00000000-0000-5000-9000-000000000000", score: 50 } }));
    expect(res.status).toBe(404);
  });
});

/* ---------------- Economy ---------------- */
describe("economy", () => {
  test("GET /api/economy/me shape (hearts, cc, daily, prices)", async () => {
    const { cookie } = await registerUser("eco1");
    const res = await api.request(req("/api/economy/me", { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.heartsCap).toBe(3);
    expect(body.prices).toEqual({ heartSingle: 20, heartFull: 50, freeze: 50 });
    expect(body.dailyProgress).toBe(0);
    expect(body.freezes).toBe(0);
  });

  test("hearts consume decrements and starts regen clock", async () => {
    const { cookie } = await registerUser("eco2");
    const first = await (await api.request(req("/api/economy/hearts/consume", { method: "POST", cookie }))).json();
    expect(first.hearts).toBe(2);
    const second = await (await api.request(req("/api/economy/hearts/consume", { method: "POST", cookie }))).json();
    expect(second.hearts).toBe(1);
    expect(second.regenInMs).toEqual(expect.any(Number));
  });

  test("heart refill: 400 when full, 402 when broke, 200 after funding", async () => {
    const { cookie, id } = await registerUser("eco3");
    await db.prepare(`UPDATE users SET cc = 100 WHERE id = ?1`).bind(id).run();
    const full = await api.request(req("/api/economy/hearts/refill", { method: "POST", cookie, body: { type: "single" } }));
    expect(full.status).toBe(400); // already full
    for (let i = 0; i < 3; i++) await api.request(req("/api/economy/hearts/consume", { method: "POST", cookie }));
    await db.prepare(`UPDATE users SET cc = 5 WHERE id = ?1`).bind(id).run();
    const broke = await api.request(req("/api/economy/hearts/refill", { method: "POST", cookie, body: { type: "single" } }));
    expect(broke.status).toBe(402);
    expect((await broke.json()).cost).toBe(20);
    await db.prepare(`UPDATE users SET cc = 100 WHERE id = ?1`).bind(id).run();
    const ok = await api.request(req("/api/economy/hearts/refill", { method: "POST", cookie, body: { type: "single" } }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.hearts).toBe(1);
    expect(body.cc).toBe(80);
  });

  test("freeze buy: starter CC 50 lets exactly one freeze; second -> 402", async () => {
    const { cookie, id } = await registerUser("eco4");
    const mine = await (await api.request(req("/api/economy/me", { cookie }))).json();
    expect(mine.cc).toBe(50); // starter cash, Express default
    const first = await api.request(req("/api/economy/freeze/buy", { method: "POST", cookie }));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.freezes).toBe(1);
    expect(body.cc).toBe(0);
    const second = await api.request(req("/api/economy/freeze/buy", { method: "POST", cookie }));
    expect(second.status).toBe(402);
    expect((await second.json()).cost).toBe(50);
    await db.prepare(`UPDATE users SET cc = 60 WHERE id = ?1`).bind(id).run();
    const after = await api.request(req("/api/economy/freeze/buy", { method: "POST", cookie }));
    expect((await after.json()).freezes).toBe(2);
  });

  test("daily goal patch clamps + validates", async () => {
    const { cookie } = await registerUser("eco5");
    const bad = await api.request(req("/api/economy/daily-goal", { method: "PATCH", cookie, body: { dailyGoalXp: 5 } }));
    expect(bad.status).toBe(400);
    const ok = await api.request(req("/api/economy/daily-goal", { method: "PATCH", cookie, body: { dailyGoalXp: 80 } }));
    expect((await (await api.request(req("/api/economy/me", { cookie }))).json()).dailyGoalXp).toBe(80);
  });

  test("users/me avatar 501 unconfigured; public profile honors isPrivate", async () => {
    const { cookie } = await registerUser("pub1");
    const avatar = await api.request(req("/api/users/me/avatar", { method: "POST", cookie }));
    expect(avatar.status).toBe(501);

    const pub = await api.request(req("/api/users/u/pub1"));
    expect(pub.status).toBe(200);
    const body = await pub.json();
    expect(body.user.bio).toBeNull(); // default public user includes bio field
    expect(body.user.email).toBeUndefined(); // never leaked

    // flip private -> profile collapses to base fields
    await api.request(req("/api/users/me", { method: "PATCH", cookie, body: { isPrivate: true } }));
    const priv = await (await api.request(req("/api/users/u/pub1"))).json();
    expect(priv.user.isPrivate).toBe(true);
    expect(priv.user.bio).toBeUndefined();
  });
});

/* ---------------- Leaderboard ---------------- */
describe("leaderboard", () => {
  test("unauth -> 401; authed -> entries + me", async () => {
    const unauth = await api.request(req("/api/leaderboard"));
    expect(unauth.status).toBe(401);
    const { cookie, id } = await registerUser("lb-user");
    // onboard them so they rank
    await api.request(req("/api/users/me", { method: "PATCH", cookie, body: { name: "LB User", timezone: "Asia/Kolkata" } }));
    // make sure onboarding_completed flag set via PATCH /api/auth/onboarding
    // (Express models: PATCH /api/auth/onboarding exists)
    // skip if route not present
    const res = await api.request(req("/api/leaderboard?limit=25", { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.leaderboard)).toBe(true);
    expect(body.me.id).toBe(id);
    expect(typeof body.total).toBe("number");
  });
});

/* ---------------- Community ---------------- */
describe("community", () => {
  test("thread lifecycle: create, reply, upvote, accept, report", async () => {
    const asker = await registerUser("ask1");
    const peer = await registerUser("peer1");
    await api.request(req("/api/users/me", { method: "PATCH", cookie: asker.cookie, body: { name: "Sunil", timezone: "Asia/Kolkata" } }));

    const lesson = await lessonByTitle("Variables");
    const created = await api.request(req("/api/threads", { method: "POST", cookie: asker.cookie, body: { title: "stuck on variables", body: "let vs const — cannot tell", lessonId: lesson?.id } }));
    expect(created.status).toBe(201);
    const thread = await (await created.json()).thread;
    expect(thread.author.username).toBe("ask1");
    expect(String(thread.lessonId)).toBe(lesson?.id);

    // upvote from peer — toggles on
    const up = await api.request(req(`/api/threads/${thread.id}/upvote`, { method: "POST", cookie: peer.cookie }));
    expect(up.status).toBe(200);
    expect((await up.json()).votes).toBe(1);

    // peer replies
    const reply = await api.request(req(`/api/threads/${thread.id}/replies`, { method: "POST", cookie: peer.cookie, body: { body: "const likes = 1; that's the guard." } }));
    expect(reply.status).toBe(201);
    const replyDoc = (await reply.json()).reply as { id: string; author: { username: string } };
    expect(replyDoc.author.username).toBe("peer1");

    // only the asker can accept
    const steal = await api.request(req(`/api/threads/${thread.id}/accept`, { method: "POST", cookie: peer.cookie, body: { replyId: replyDoc.id } }));
    expect(steal.status).toBe(403);

    const accept = await api.request(req(`/api/threads/${thread.id}/accept`, { method: "POST", cookie: asker.cookie, body: { replyId: replyDoc.id } }));
    expect(accept.status).toBe(200);

    // toggle off again
    const down = await api.request(req(`/api/threads/${thread.id}/upvote`, { method: "POST", cookie: peer.cookie }));
    expect((await down.json()).votes).toBe(0);

    // report — dedupe secondary report 409
    const report = await api.request(req("/api/threads/reports", { method: "POST", cookie: peer.cookie, body: { targetType: "thread", targetId: thread.id, reason: "Duplicate of another thread" } }));
    expect(report.status).toBe(201);
    const again = await api.request(req("/api/threads/reports", { method: "POST", cookie: peer.cookie, body: { targetType: "thread", targetId: thread.id, reason: "Same reason" } }));
    expect(again.status).toBe(409);

    // list returns thread; detail has accepted reply
    const list = await (await api.request(req("/api/threads", { cookie: peer.cookie }))).json();
    expect(list.threads.some((t: { id: string }) => t.id === thread.id)).toBe(true);
    const detail = await api.request(req(`/api/threads/${thread.id}`, { cookie: peer.cookie }));
    const detailBody = await detail.json();
    expect(detailBody.replies.length).toBe(1);
    expect(detailBody.replies[0].isAccepted).toBe(true);
  });

  test("thread list: new sort + filter", async () => {
    const cookie = await (await registerUser("scan")).cookie;
    const res = await api.request(req("/api/threads?sort=new&limit=5", { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.threads)).toBe(true);
  });
});

/* ---------------- AI helper (unconfigured on Workers by default) ---------------- */
describe("ai", () => {
  test("status shows budget shape + configured:false when no keys", async () => {
    const { cookie } = await registerUser("ai-user");
    const res = await api.request(req("/api/ai/status", { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configured).toBe(false);
    // Express aiBudget shape: { allowed, remaining, limit }
    expect(body.allowed).toBe(true);
    expect(body.remaining).toBe(body.limit);
  });

  test("help without keys -> 501 'ask the community'", async () => {
    const { cookie } = await registerUser("ai-user2");
    const res = await api.request(req("/api/ai/help", { method: "POST", cookie, body: { question: "why is 5 a string?" } }));
    expect(res.status).toBe(501);
  });
});
