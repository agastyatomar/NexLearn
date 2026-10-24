/* Builds deterministic SQL seed data for D1 from worker/d1/content/*.json
   (produced by scripts/extract-content.ts) and, with credentials, applies it
   via the D1 REST API — which works fine from this Android phone where the
   wrangler CLI cannot run (workerd has no android/arm64 build).

   Usage:
     bun scripts/seed-d1.ts                 # writes worker/d1/content-seed.sql
     bun scripts/seed-d1.ts --dry-run       # prints row counts only
     bun scripts/seed-d1.ts --apply         # posts SQL to the Cloudflare D1 API

   Env for --apply:
     CLOUDFLARE_API_TOKEN   (create with D1 Edit permission)
     CLOUDFLARE_ACCOUNT_ID
     D1_DATABASE_ID         (from `wrangler d1 create nexlearn`)

   Deterministic ids: every course/unit/lesson/exercise gets a v5-style UUID
   hashed from its course slug + titles, so reseeding UPDATEs the same rows —
   learner Progress keeps pointing at the same lesson ids forever. */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const contentDir = join(import.meta.dir, "..", "worker", "d1", "content");
const OUT_SQL = join(import.meta.dir, "..", "worker", "d1", "content-seed.sql");
const NOW = new Date().toISOString();

/* ---------- uuid v5-style deterministic ids ---------- */

async function sha1Hex(text: string): Promise<string> {
  // SHA-1 is fine here: ids only need stability, not cryptographic strength.
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uuid5FromSha1(hex: string): string {
  const bytes = Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  const timeLow = bytes.slice(0, 4);
  const timeMid = bytes.slice(4, 6);
  const timeHi = bytes.slice(6, 8);
  timeHi[0] = (timeHi[0] & 0x0f) | 0x50; // version 5
  const clockseq = bytes.slice(8, 10);
  clockseq[0] = (clockseq[0] & 0x3f) | 0x80; // RFC 4122 variant
  const hexStr = (arr: number[]) => [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hexStr([...timeLow])}-${hexStr([...timeMid])}-${hexStr([...timeHi])}-${hexStr([...clockseq])}-${hexStr([...bytes.slice(10, 16)])}`;
}

async function contentId(...parts: string[]): Promise<string> {
  return uuid5FromSha1(await sha1Hex(parts.join(" ")));
}

/* ---------- SQL escaping ---------- */

function sqlText(value: unknown): string {
  if (value == null) return "''";
  const text = String(value);
  return `'${text.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

function sqlJson(value: unknown): string {
  return sqlText(JSON.stringify(value ?? {}));
}

/* ---------- content shape ---------- */

type Exercise = {
  type: string;
  prompt: string;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: string;
  hints: string[];
};
type LoadedContent = {
  slug: string;
  course: { title: string; language: string; description: string; order: number };
  units: { title: string; description: string }[];
  lessons: { unit: number; title: string; description: string; order: number; xp: number; exercises: Exercise[] }[];
};

type Statements = string[];

function pushCourse(st: Statements, c: LoadedContent): string {
  const courseId = courseReview(c.slug);
  void courseId;
  return courseId;
}
function courseReview(slug: string) {
  // placeholder, replaced below
  return slug;
}
void pushCourse;
void courseReview;

async function emit() {
  const files = ["js-from-zero.json", "code-with-ai.json", "python-from-zero.json"].map((f) => join(contentDir, f));
  const courses: LoadedContent[] = files
    .filter((f) => existsSync(f))
    .map((f) => JSON.parse(readFileSync(f, "utf8") as string) as LoadedContent);
  if (!courses.length) {
    console.error("No content JSON found — run: bun scripts/extract-content.ts");
    process.exit(1);
  }

  const timestamps = { createdAt: NOW, updatedAt: NOW };
  void timestamps;

  const st: Statements = [];
  const dryRunRows: string[] = [];

  for (const c of courses) {
    const courseId = await contentId("course", c.slug);
    st.push(
      `INSERT OR REPLACE INTO courses (id, title, language, description, sort_order, created_at, updated_at)
       VALUES (${sqlText(courseId)}, ${sqlText(c.course.title)}, ${sqlText(c.course.language)}, ${sqlText(c.course.description)}, ${c.course.order}, ${sqlText(NOW)}, ${sqlText(NOW)});`,
    );
    dryRunRows.push(`course ${c.slug}: ${c.units.length} units`);

    for (const [ui, unit] of c.units.entries()) {
      const unitId = await contentId("unit", c.slug, unit.title);
      st.push(
        `INSERT OR REPLACE INTO units (id, course_id, title, description, sort_order, created_at, updated_at)
         VALUES (${sqlText(unitId)}, ${sqlText(courseId)}, ${sqlText(unit.title)}, ${sqlText(unit.description ?? "")}, ${ui}, ${sqlText(NOW)}, ${sqlText(NOW)});`,
      );

      // Lessons of this unit, in stored lessons array order
      const unitLessons = c.lessons.filter((l) => l.unit === ui);
      for (const [li, lesson] of unitLessons.entries()) {
        const lessonId = await contentId("lesson", c.slug, unit.title, lesson.title);
        st.push(
          `INSERT OR REPLACE INTO lessons (id, unit_id, title, description, sort_order, xp_reward, created_at, updated_at)
           VALUES (${sqlText(lessonId)}, ${sqlText(unitId)}, ${sqlText(lesson.title)}, ${sqlText(lesson.description ?? "")}, ${li}, ${Math.max(10, lesson.xp)}, ${sqlText(NOW)}, ${sqlText(NOW)});`,
        );
        for (const [ei, ex] of lesson.exercises.entries()) {
          const exerciseId = await contentId("exercise", c.slug, unit.title, lesson.title, String(ei));
          void exerciseId;
          st.push(
            `INSERT OR REPLACE INTO exercises (id, lesson_id, type, prompt, content, solution, explanation, hints, sort_order, created_at, updated_at)
             VALUES (${sqlText(await contentId("exercise", c.slug, unit.title, lesson.title, String(ei)))}, ${sqlText(lessonId)}, ${sqlText(ex.type)}, ${sqlText(ex.prompt)}, ${sqlJson(ex.content)}, ${sqlJson(ex.solution)}, ${sqlText(ex.explanation ?? "")}, ${sqlJson(ex.hints ?? [])}, ${ei}, ${sqlText(NOW)}, ${sqlText(NOW)});`,
          );
        }
      }
    }
  }

  const counts = {
    courses: courses.length,
    units: courses.reduce((n, c) => n + c.units.length, 0),
    lessons: courses.reduce((n, c) => n + c.lessons.length, 0),
    exercises: courses.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.exercises.length, 0), 0),
  };

  if (process.argv.includes("--dry-run")) {
    console.log(dryRunRows.join("\n"));
    console.log(JSON.stringify(counts));
    return;
  }

  const sql = `-- NexLearn D1 content seed (generated by scripts/seed-d1.ts — do not edit by hand; re-run the generator instead)
-- Deterministic ids: safe to re-run; syncs titles/descriptions but never re-rolls
-- ids, so learner progress rows stay valid.
BEGIN;
${st.join("\n")}
COMMIT;
`;
  writeFileSync(OUT_SQL, sql + "\n");
  console.log(`wrote ${OUT_SQL} — ${st.length} statements:`, JSON.stringify(counts));

  if (process.argv.includes("--apply")) {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const dbId = process.env.D1_DATABASE_ID;
    if (!token || !accountId || !dbId) {
      console.error(
        "--apply needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and D1_DATABASE_ID exported. See DEPLOY-CLOUDFLARE.md.",
      );
      process.exit(1);
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/import`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: sql.replace(/^--.*$\n/m, "") }),
    });
    const apiResponse = (await res.json()) as {
      success?: boolean;
      errors?: { code: number; message: string }[];
      messages?: unknown[];
      result?: { total_queries?: number };
      meta?: unknown;
    };
    if (!apiResponse.success) {
      console.error(`D1 import failed (HTTP ${res.status}):`, JSON.stringify(apiResponse.errors ?? apiResponse, null, 2));
      process.exit(1);
    }
    console.log(`D1 import ok — executed ${apiResponse.result?.total_queries ?? st.length} statement groups.`);
  }
}

emit().catch((e) => {
  console.error(e);
  process.exit(1);
});
