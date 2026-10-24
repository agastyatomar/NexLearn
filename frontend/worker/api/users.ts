import { Hono } from "hono";
import { z } from "zod";
import { userPrepared, updateUser } from "../db/queries";
import { nowIso, toPublicUser, toIso, jsonParseSafe } from "../db/serialize";
import type { AppConfig, IssueLike } from "./common";
import { rateLimit, validationError } from "./common";

const updateMeSchema = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters.").max(50).optional(),
  bio: z.string().trim().max(160, "Bio must be 160 characters or less.").optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  countryCode: z.string().trim().length(2).optional().nullable(),
  timezone: z.string().trim().min(1).max(60).optional(),
  avatar: z.string().trim().url("Avatar must be a valid URL.").max(500).optional().nullable(),
  isPrivate: z.boolean().optional(),
});

export function usersRouter(cfg: AppConfig, requireAuth: (c: any, next: () => Promise<void>) => Promise<Response>) {
  const router = new Hono();
  const writeLimiter = rateLimit(30, 60_000, "Too many tries, slow down a little.");

  // PATCH /api/users/me — edit own profile (username + email locked)
  router.patch("/me", writeLimiter, requireAuth, async (c) => {
    const parsed = updateMeSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const userId = c.get("userId") as string;
    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.bio !== undefined) update.bio = data.bio?.trim() ? data.bio.trim() : null;
    if (data.country !== undefined) update.country = data.country?.trim() ? data.country.trim() : null;
    if (data.countryCode !== undefined) update.country_code = data.countryCode ? data.countryCode.trim().toUpperCase() : null;
    if (data.timezone !== undefined) update.timezone = data.timezone;
    if (data.avatar !== undefined) update.avatar = data.avatar?.trim() ? data.avatar.trim() : null;
    if (data.isPrivate !== undefined) update.is_private = data.isPrivate ? 1 : 0;

    await updateUser(cfg.db, userId, update, nowIso()).run();
    const users = userPrepared(cfg.db);
    const updated = await users.byId(userId);
    if (!updated) return c.json({ message: "User not found." }, 404);
    return c.json({ message: "Profile updated.", user: toPublicUser(updated) });
  });

  // POST /api/users/me/avatar — Appwrite-based upload; 501 until configured
  router.post("/me/avatar", writeLimiter, requireAuth, async (c) => {
    if (
      !cfg.appwriteEndpoint ||
      !cfg.appwriteProjectId ||
      !cfg.appwriteBucketId ||
      !cfg.appwriteApiKey
    ) {
      return c.json({ message: "Avatar uploads are not configured yet (missing Appwrite server env)." }, 501);
    }
    const userId = c.get("userId") as string;
    try {
      const form = await c.req.formData();
      const file = form.get("avatar");
      if (!(file instanceof File)) {
        return c.json({ message: "No image attached. Send multipart field 'avatar'." }, 400);
      }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        return c.json({ message: "Only JPEG, PNG, WebP or GIF images are allowed." }, 400);
      }
      if (file.size > 2 * 1024 * 1024) {
        return c.json({ message: "File too large (max 2MB)." }, 413);
      }
      const ext = file.type === "image/jpeg" ? "jpg" : (file.type.split("/")[1] ?? "png");
      const fileId = crypto.randomUUID();
      const appwriteForm = new FormData();
      appwriteForm.append("fileId", fileId);
      appwriteForm.append("file", file, `avatar-${userId}.${ext}`);
      // Public read so <img> can load without auth
      appwriteForm.append(
        "permissions[]",
        JSON.stringify([`read("any")`]),
      );
      const created = await fetch(
        `${cfg.appwriteEndpoint}/storage/buckets/${cfg.appwriteBucketId}/files`,
        {
          method: "POST",
          headers: { "X-Appwrite-Project": cfg.appwriteProjectId, "X-Appwrite-Key": cfg.appwriteApiKey },
          body: appwriteForm,
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!created.ok) throw new Error(`Appwrite HTTP ${created.status}`);
      const createdDoc = (await created.json()) as { $id?: string };
      const storedId = createdDoc.$id ?? fileId;

      const users = userPrepared(cfg.db);
      const prev = await users.byId(userId);
      const viewUrl = `${cfg.appwriteEndpoint}/storage/buckets/${cfg.appwriteBucketId}/files/${storedId}/view?project=${cfg.appwriteProjectId}`;
      await updateUser(cfg.db, userId, { avatar: viewUrl, avatar_file_id: storedId }, nowIso()).run();
      if (prev?.avatar_file_id && prev.avatar_file_id !== storedId) {
        try {
          await fetch(
            `${cfg.appwriteEndpoint}/storage/buckets/${cfg.appwriteBucketId}/files/${String(prev.avatar_file_id)}`,
            {
              method: "DELETE",
              headers: { "X-Appwrite-Project": cfg.appwriteProjectId, "X-Appwrite-Key": cfg.appwriteApiKey },
              signal: AbortSignal.timeout(30_000),
            },
          );
        } catch {}
      }
      return c.json({ message: "Avatar updated.", avatar: viewUrl }, 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Avatar upload failed.";
      return c.json({ message }, 502);
    }
  });

  // GET /api/users/u/:username — public profile (no auth), email never exposed
  router.get("/u/:username", async (c) => {
    const username = c.req.param("username");
    const users = userPrepared(cfg.db);
    const user = await users.byUsername(username);
    if (!user) return c.json({ message: "User not found." }, 404);

    const base = {
      username: String(user.username),
      name: String(user.name),
      avatar: user.avatar != null ? String(user.avatar) : null,
      isPrivate: Boolean(user.is_private),
    };
    if (user.is_private) return c.json({ user: base });

    const completed = await cfg.db
      .prepare(`SELECT COUNT(*) AS n FROM progress WHERE user_id = ?1 AND status = 'completed'`)
      .bind(String(user.id))
      .first<{ n: number }>();
    return c.json({
      user: {
        ...base,
        bio: user.bio != null ? String(user.bio) : null,
        xp: Number(user.xp ?? 0),
        level: Number(user.level ?? 1),
        streak: { count: Number(user.streak_count ?? 0) },
        badges: jsonArr(user.badges),
        completedLessons: Number(completed?.n ?? 0),
        memberSince: toIso(user.created_at),
      },
    });
  });

  return router;
}

/** JSON array column reader (subset of jsonParseSafe). */
function jsonArr<T = string>(value: unknown, fallback: T[] = []): T[] {
  if (value == null) return fallback;
  const parsed = jsonParseSafe<T[]>(value, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

