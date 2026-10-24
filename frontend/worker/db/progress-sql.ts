import type { D1Like } from "./client";
import { nowIso } from "./serialize";

/* Progress + XP event statements (SQLite dialect). */

export function upsertProgress(
  db: D1Like,
  input: {
    userId: string;
    lessonId: string;
    status: string;
    score: number;
    bestScore: number;
    attempts: number;
    firstTry: boolean;
    completedAt: string | null;
    now: string;
  },
) {
  return db
    .prepare(
      `INSERT INTO progress (id, user_id, lesson_id, status, score, best_score, attempts,
          first_try, completed_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         status = excluded.status,
         score = excluded.score,
         best_score = excluded.best_score,
         attempts = excluded.attempts,
         completed_at = excluded.completed_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      /* progress doc id — stable random UUID (Express _id parity) */
      crypto.randomUUID(),
      input.userId,
      input.lessonId,
      input.status,
      input.score,
      input.bestScore,
      input.attempts,
      input.firstTry ? 1 : 0,
      input.completedAt,
      input.now,
    );
}

export function insertXpEvent(
  db: D1Like,
  id: string,
  userId: string,
  lessonId: string | null,
  source: string,
  amount: number,
  now: string,
) {
  return db
    .prepare(
      `INSERT INTO xp_events (id, user_id, lesson_id, source, amount, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(id, userId, lessonId, source, amount, now);
}

export function upsertThreadVote(db: D1Like, threadId: string, userId: string, add: boolean, now: string) {
  return add
    ? db
        .prepare(
          `UPDATE threads SET
             upvoted_by = json_insert(COALESCE(upvoted_by, '[]'), '$[#]', ?2),
             votes = MAX(0, votes + 1),
             updated_at = ?3
           WHERE id = ?1 AND NOT EXISTS (
             SELECT 1 WHERE EXISTS (SELECT 1 FROM json_each(COALESCE(threads.upvoted_by, '[]')) WHERE value = ?2)
           )`,
        )
        .bind(threadId, userId, now)
    : db
        .prepare(
          `UPDATE threads SET
             upvoted_by = (SELECT COALESCE(json_group_array(value), '[]') FROM json_each(COALESCE(threads.upvoted_by, '[]')) WHERE value != ?2),
             votes = MAX(0, votes - 1),
             updated_at = ?3
           WHERE id = ?1`,
        )
        .bind(threadId, userId, now);
}

export function upsertReplyVote(db: D1Like, replyId: string, userId: string, add: boolean, now: string) {
  return add
    ? db
        .prepare(
          `UPDATE replies SET
             upvoted_by = json_insert(COALESCE(upvoted_by, '[]'), '$[#]', ?2),
             votes = MAX(0, votes + 1),
             updated_at = ?3
           WHERE id = ?1 AND NOT EXISTS (
             SELECT 1 WHERE EXISTS (SELECT 1 FROM json_each(COALESCE(replies.upvoted_by, '[]')) WHERE value = ?2)
           )`,
        )
        .bind(replyId, userId, now)
    : db
        .prepare(
          `UPDATE replies SET
             upvoted_by = (SELECT COALESCE(json_group_array(value), '[]') FROM json_each(COALESCE(replies.upvoted_by, '[]')) WHERE value != ?2),
             votes = MAX(0, votes - 1),
             updated_at = ?3
           WHERE id = ?1`,
        )
        .bind(replyId, userId, now);
}

export function normalizeVotes(db: D1Like, when = nowIso()) {
  void db;
  void when;
}
