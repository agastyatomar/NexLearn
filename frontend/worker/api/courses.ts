import { Hono } from "hono";
import { listAllContent, unitsByCourse, lessonsByUnit } from "../db/queries";
import { courseDoc, unitDoc, lessonDoc } from "../db/serialize";
import type { AppConfig } from "./common";

export function coursesRouter(cfg: AppConfig) {
  const router = new Hono();

  // GET /api/courses — list with units and lessons (3 total queries, joined in JS)
  router.get("/", async (c) => {
    const { courses, units, lessons } = await listAllContent(cfg.db);
    const lessonsByUnitId = new Map<string, unknown[]>();
    for (const row of (lessons.results ?? []) as Record<string, unknown>[]) {
      const key = String(row.unit_id);
      if (!lessonsByUnitId.has(key)) lessonsByUnitId.set(key, []);
      lessonsByUnitId.get(key)!.push(lessonDoc(row));
    }
    const unitsByCourseId = new Map<string, unknown[]>();
    for (const row of (units.results ?? []) as Record<string, unknown>[]) {
      const key = String(row.course_id);
      if (!unitsByCourseId.has(key)) unitsByCourseId.set(key, []);
      unitsByCourseId.get(key)!.push(unitDoc(row, lessonsByUnitId.get(String(row.id)) ?? []));
    }
    const result = ((courses.results ?? []) as Record<string, unknown>[]).map((row) =>
      courseDoc(row, unitsByCourseId.get(String(row.id)) ?? []),
    );
    return c.json({ courses: result });
  });

  // GET /api/courses/:courseId/units
  router.get("/:courseId/units", async (c) => {
    const courseId = c.req.param("courseId");
    const units = await unitsByCourse(cfg.db, courseId);
    const withLessons = [];
    for (const row of (units.results ?? []) as Record<string, unknown>[]) {
      const lessons = await lessonsByUnit(cfg.db, String(row.id));
      withLessons.push(unitDoc(row, ((lessons.results ?? []) as Record<string, unknown>[]).map(lessonDoc)));
    }
    return c.json({ units: withLessons });
  });

  return router;
}
