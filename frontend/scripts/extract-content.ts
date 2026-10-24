/* Extracts course content from backend/src/seed/seed.ts (js-from-zero,
   code-with-ai hand-written inline) plus python-from-zero spec module, and
   dumps all three as JSON for the D1 seed.

   Usage:  bun scripts/extract-content.ts   (run from frontend/)

   Why: seed.ts evaluates the inline courses against Mongoose look-alike
   helpers and seed.ts pulls mongoose at module scope (the phone cannot run
   it). Reusing the source of truth keeps Mongo and D1 content identical. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const backendSeedPath = join(import.meta.dir, "..", "..", "backend", "src", "seed", "seed.ts");
const outDir = join(import.meta.dir, "worker", "d1", "content");

type Extracted = {
  slug: string;
  course: { title: string; language: string; description: string; order: number };
  units: { title: string; description: string }[];
  lessons: { unit: number; title: string; description: string; order: number; xp: number; exercises: ExerciseLike[] }[];
};

type ExerciseLike = { type: string; prompt: string; content: Record<string, unknown>; solution: Record<string, unknown>; explanation: string; hints: string[] };

const COURSE_META: Record<string, { title: string; language: string; description: string }> = {
  "js-from-zero": {
    title: "JS from Zero",
    language: "javascript",
    description:
      "From zero to advanced — no prior code needed. Learn JavaScript from scratch with bite-sized lessons.",
  },
  "code-with-ai": {
    title: "Code with AI",
    language: "javascript",
    description:
      "Use AI the smart way — write better prompts, spot hallucinations, and use ChatGPT/Claude as your coding helper without losing your own skills.",
  },
};

async function extractInlineCourse(source: string, startMarker: string, endMarker: string, order: number): Promise<Extracted> {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
  const body = source.slice(start + startMarker.length, end);
  const slugMatch = body.match(/slug:\s*"([^"]+)"/);
  if (!slugMatch) throw new Error("Slug not found in course body");
  const slug = slugMatch[1];

  /* Drop the trailing `return {...};` + closing brace of the function. */
  const returnIdx = body.lastIndexOf("  return {");
  if (returnIdx === -1) throw new Error("Return block not found inside course body");
  let evalBody = body.slice(0, returnIdx);

  /* The body redefines `mk` with TS parameter annotations and routes into
     upsertExercise — remove that override so the stub's capturing `mk` wins.
     (Audit: this is the only TS annotation inside both course bodies.) */
  const mkOverride = /const mk = async \(lessonId: Types\.ObjectId, order: number, doc: unknown\) => \{\s*exTotal\+\+;\s*return upsertExercise\(lessonId, order, doc\);\s*\};/m;
  if (!mkOverride.test(evalBody)) throw new Error(`${slug}: mk override pattern drifted — update extractor`);
  evalBody = evalBody.replace(mkOverride, "");

  /* The inline code references `lessons[i]._id` only, and `mk(id, order, ex)`
     captures every exercise. We hand it 64 stub lessons — enough for both
     courses — so exercises land on the same lesson index as in seed.ts. */
  const stub = `
const lessons = Array.from({ length: 64 }, (_, i) => ({ _id: String(i) }));
const captured = SINK;
async function mk(id, order, ex) {
  if (!ex || typeof ex !== "object") throw new Error("Exercise must be an object: lesson " + id + " #" + order);
  captured.push({ lesson: Number(id), order, exercise: ex });
}
const courseObj = { _id: "C", title: "", language: "", description: "", order: 0 };
async function upsertCourse(attrs) { Object.assign(courseObj, attrs); return courseObj; }
const unitObjs = Array.from({ length: 32 }, (_, i) => ({ _id: "U" + i }));
let unitCursor = 0;
async function upsertUnit(attrs) { const u = unitObjs[unitCursor++]; Object.assign(u, attrs); return u; }
const unitById = new Map();
let lessonCursor = 0;
async function upsertLesson(attrs) {
  const l = lessons[lessonCursor++];
  if (!l) throw new Error("Too many lessons for stub pool");
  Object.assign(l, attrs);
  return l;
}
`;
  /* Code with AI names its locals aiUnitsData/aiLessonsData; the evaluator
     returns whichever pair this course body defines. */
  const evaluator = new Function(
    "SINK",
    `${stub}\nreturn (async () => {\n${evalBody}\nreturn { unitsData: typeof unitsData !== "undefined" ? unitsData : aiUnitsData, lessonsData: typeof lessonsData !== "undefined" ? lessonsData : aiLessonsData };\n})();`,
  ) as unknown as (
    sink: { lesson: number; order: number; exercise: ExerciseLike }[],
  ) => Promise<{
    unitsData: { title: string; description: string; order: number }[];
    lessonsData: { unit: number; title: string; description: string; order: number; xp: number }[];
  }>;

  const capturedByLesson: { lesson: number; order: number; exercise: ExerciseLike }[] = [];
  let parsed: Awaited<ReturnType<typeof evaluator>>;
  try {
    parsed = await evaluator(capturedByLesson);
  } catch (e) {
    throw new Error(`${slug}: evaluation failed — ${(e as Error).message}`);
  }

  /* Exercises must densely cover 0..n-1 per lesson (positional orders). */
  const byLesson = new Map<number, { order: number; exercise: ExerciseLike }[]>();
  for (const cap of capturedByLesson) {
    const list = byLesson.get(cap.lesson) ?? [];
    list.push({ order: cap.order, exercise: cap.exercise });
    byLesson.set(cap.lesson, list);
  }
  for (const [li, list] of byLesson) {
    const orders = list.map((e) => e.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) throw new Error(`${slug} lesson ${li}: exercise at position ${i} missing (codes are positional)`);
    }
  }

  const unitsData = parsed.unitsData;
  const lessonsData = parsed.lessonsData;
  const units = unitsData.map((u) => ({ title: u.title, description: u.description ?? "" }));
  const meta = COURSE_META[slug];
  if (!meta) throw new Error(`No course meta for slug ${slug}`);

  const lessons: Extracted["lessons"] = lessonsData.map((ld, li2) => {
    const list = (byLesson.get(li2) ?? []).sort((a, b) => a.order - b.order);
    return {
      unit: ld.unit,
      title: ld.title,
      description: ld.description ?? "",
      order: ld.order,
      xp: ld.xp,
      exercises: list.map((e) => e.exercise),
    };
  });

  return { slug, course: { ...meta, order }, units, lessons };
}

async function main() {
  const source = readFileSync(backendSeedPath, "utf8");
  const js = await extractInlineCourse(
    source,
    "async function seedJsFromZero(): Promise<SeedResult> {",
    "/* ---------------- Course 2: Code with AI ---------------- */",
    0,
  );
  const ai = await extractInlineCourse(
    source,
    "async function seedCodeWithAi(): Promise<SeedResult> {",
    "/* ---------------- Data-driven courses ---------------- */",
    1,
  );

  /* python-from-zero is a pure data module — importing it directly is safe
     (type-only imports, no mongoose). */
  const specModule = await import(
    join(import.meta.dir, "..", "..", "backend", "src", "seed", "courses", "pythonFromZero.ts")
  );
  const py = specModule.pythonFromZero as {
    slug: string;
    course: { title: string; language: string; description: string; order: number };
    units: {
      title: string;
      description: string;
      lessons: { title: string; description: string; xpReward: number; exercises: ExerciseLike[] }[];
    }[];
  };
  const python: Extracted = {
    slug: py.slug,
    course: py.course,
    units: py.units.map((u) => ({ title: u.title, description: u.description })),
    lessons: py.units.flatMap((u, ui) =>
      u.lessons.map((l) => ({
        unit: ui,
        title: l.title,
        description: l.description,
        order: 0, // assigned positionally below
        xp: l.xpReward,
        exercises: l.exercises,
      })),
    ),
  };
  python.lessons.forEach((l, i) => {
    l.order = i;
  });

  let lastOrder = -1;
  for (const l of python.lessons) {
    if (l.order !== lastOrder + 1) throw new Error("python lesson order drift");
    lastOrder = l.order;
  }

  console.error("DEBUG", JSON.stringify({ jsKeys: Object.keys(js), aiKeys: Object.keys(ai), pyKeys: py ? Object.keys(py) : null }));

  /* Sanity checks before dumping. */
  for (const dumped of [js, ai, python]) {
    if (!dumped.units.length || !dumped.lessons.length) throw new Error(`${dumped.slug}: empty extraction`);
    const unitTitles = new Set(dumped.units.map((u) => u.title));
    let count = 0;
    for (const l of dumped.lessons) {
      if (!unitTitles.has(dumped.units[l.unit].title)) {
        throw new Error(`${dumped.slug}: lesson "${l.title}" points at unknown unit ${l.unit}`);
      }
      l.exercises.forEach((e, idx) => {
        if (!e.type || !e.prompt) throw new Error(`${dumped.slug} lesson "${l.title}" exercise ${idx}: missing type/prompt`);
      });
      count += l.exercises.length;
    }
    console.log(`${dumped.slug}: ${dumped.units.length} units, ${dumped.lessons.length} lessons, ${count} exercises`);
  }

  mkdirSync(outDir, { recursive: true });
  for (const dumped of [js, ai, python]) {
    writeFileSync(join(outDir, `${dumped.slug}.json`), JSON.stringify(dumped, null, 2) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
