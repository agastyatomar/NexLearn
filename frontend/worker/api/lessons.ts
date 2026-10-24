import { Hono } from "hono";
import { lessonById, exercisesByLesson } from "../db/queries";
import { lessonDoc, exerciseDoc } from "../db/serialize";
import type { AppConfig } from "./common";

export function lessonsRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();

  // GET /api/lessons/:id (auth required; solution included — same contract as Express today)
  router.get("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    const lesson = await lessonById(cfg.db, id).first();
    if (!lesson) return c.json({ message: "Lesson not found." }, 404);
    const exercises = await exercisesByLesson(cfg.db, id);
    return c.json({
      lesson: lessonDoc(lesson),
      exercises: ((exercises.results ?? []) as Record<string, unknown>[]).map(exerciseDoc),
    });
  });

  return router;
}
