import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  clearSessionCookieOptions,
  signSession,
  verifySession,
  hashPassword,
  verifyPassword,
  PASSWORD_ITERATIONS,
} from "../lib/auth-primitives";
import {
  HEART_CAP,
  HEART_REGEN_MS,
} from "../lib/game";
import { toDayStr, calcHeartsState } from "../lib/game";
import { toIso } from "../db/serialize";
import {
  userPrepared,
  insertUser,
  updateUser,
  selectUserStmt,
} from "../db/queries";
import { nowIso, toPublicUser } from "../db/serialize";
import type { AppConfig, IssueLike } from "./common";
import { validationError, rateLimit } from "./common";

export const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
export const TEMP_USERNAME_PREFIX = "google_user_";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters.")
  .max(30, "At most 30 characters.")
  .regex(USERNAME_RE, "Letters, numbers, _ . - only.")
  .refine((u) => !u.startsWith(TEMP_USERNAME_PREFIX), {
    message: "That username is reserved. Pick another one.",
  });

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(6, "At least 6 characters.").max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(50, "At most 50 characters."),
  age: z.coerce.number().int().min(13, "You must be at least 13.").max(80, "At most 80."),
  country: z.string().trim().min(2, "Country is required.").max(100),
  countryCode: z.string().trim().length(2).toUpperCase().optional().or(z.literal("")),
  language: z.enum(["javascript", "python"], { errorMap: () => ({ message: "Pick JavaScript or Python — more coming soon." }) }),
  avatar: z.string().trim().url("Invalid avatar URL.").optional().or(z.literal("")).or(z.undefined()),
  username: usernameSchema.optional(),
});

const googleCredentialSchema = z.object({
  credential: z.string().trim().min(1, "Google credential is required.").max(8192),
});

export type UserRow = Record<string, unknown>;

function newId(): string {
  return crypto.randomUUID();
}

export function authRouter(cfg: AppConfig) {
  const router = new Hono();
  const authLimiter = rateLimit(20, 15 * 60 * 1000, "Too many attempts, try again later.");
  const users = userPrepared(cfg.db);

  const requireAuth: (c: any, next: () => Promise<void>) => Promise<Response> = async (c, next) => {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) return c.json({ message: "Not authenticated." }, 401);
    const claims = await verifySession(token, cfg.jwtSecret);
    if (!claims) return c.json({ message: "Invalid or expired token." }, 401);
    const row = await users.byId(claims.sub);
    if (!row) return c.json({ message: "User not found." }, 401);
    c.set("userRow", row);
    c.set("userId", String(row.id));
    await next();
  };

  // POST /register
  router.post("/register", authLimiter, async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const { username, email, password } = parsed.data;

    const existingUsername = await users.byUsername(username);
    if (existingUsername) {
      return c.json({ message: "Username already taken.", errors: { username: "Username already taken." } }, 409);
    }
    const existingEmail = await users.byEmail(email);
    if (existingEmail) {
      return c.json({ message: "Email already registered.", errors: { email: "Email already registered." } }, 409);
    }

    const hashed = await hashPassword(password, PASSWORD_ITERATIONS);
    const id = newId();
    const now = nowIso();
    await insertUser(cfg.db, {
      id,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashed,
      googleId: null,
      name: username.trim(),
    }, now).run();

    const token = await signSession({ sub: id, username: username.trim(), email: email.trim().toLowerCase() }, cfg.jwtSecret);
    setCookie(c, COOKIE_NAME, token, sessionCookieOptions(cfg.isProd));

    const row = await users.byId(id);
    return c.json({ message: "Account created.", user: toPublicUser(row!) }, 201);
  });

  // POST /login
  router.post("/login", authLimiter, async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const { email, password } = parsed.data;
    const user = await users.byEmail(email);
    if (!user) {
      return c.json({ message: "Invalid email or password.", errors: { email: "Invalid email or password." } }, 401);
    }
    if (!user.password_hash) {
      return c.json({
        message: "This account uses Google sign-in. Continue with Google below.",
        errors: { email: "This account uses Google sign-in." },
      }, 401);
    }
    const ok = await verifyPassword(password, String(user.password_hash));
    if (!ok) {
      return c.json({ message: "Invalid email or password.", errors: { password: "Invalid email or password." } }, 401);
    }

    const token = await signSession(
      { sub: String(user.id), username: String(user.username), email: String(user.email) },
      cfg.jwtSecret,
    );
    setCookie(c, COOKIE_NAME, token, sessionCookieOptions(cfg.isProd));
    const fresh = await users.byId(String(user.id));
    if (!fresh) return c.json({ message: "User not found after login." }, 500);
    return c.json({ message: "Logged in.", user: toPublicUser(fresh) });
  });

  // POST /logout
  router.post("/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, clearSessionCookieOptions(cfg.isProd));
    return c.json({ message: "Logged out." });
  });

  // GET /me — passive hearts regen + daily XP view reset
  router.get("/me", requireAuth, async (c) => {
    const row = c.get("userRow") as UserRow;
    const userId = c.get("userId") as string;
    const heartsState = calcHeartsState(row, new Date());
    let heartsChanged = false;
    if (heartsState.needsSave || !row.hearts_updated_at) {
      await updateUser(
        cfg.db,
        userId,
        { hearts: heartsState.hearts, hearts_updated_at: heartsState.heartsUpdatedAt },
        nowIso(),
      ).run();
      row.hearts = heartsState.hearts;
      row.hearts_updated_at = heartsState.heartsUpdatedAt;
      heartsChanged = true;
    }

    const tz = String(row.timezone ?? "Asia/Kolkata");
    const todayStr = toDayStr(new Date(), tz);
    if (heartsChanged) row.hearts_updated_at = heartsState.heartsUpdatedAt;
    const publicUser = toPublicUser(row);
    const isStale = publicUser.dailyXpDate !== todayStr;
    if (isStale) publicUser.dailyXp = 0;
    void toIso; // (dates already strings)
    return c.json({ user: publicUser });
  });

  // PATCH /onboarding
  router.patch("/onboarding", requireAuth, async (c) => {
    const parsed = onboardingSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error.issues as unknown as IssueLike[]);
    const userId = c.get("userId") as string;
    const { name, age, country, countryCode, language, avatar, username } = parsed.data;

    const update: Record<string, unknown> = {
      name: name.trim(),
      age,
      country: country.trim(),
      country_code: countryCode ? String(countryCode).trim().toUpperCase() : null,
      language: String(language).toLowerCase(),
      onboarding_completed: 1,
    };
    if (username !== undefined) {
      const clean = username.trim();
      const taken = await users.byUsername(clean);
      if (taken && String(taken.id) !== userId) {
        return c.json({ message: "Username already taken.", errors: { username: "Username already taken." } }, 409);
      }
      update.username = clean;
    }
    if (typeof avatar === "string" && avatar.trim()) {
      update.avatar = avatar.trim();
    }

    await updateUser(cfg.db, userId, update, nowIso()).run();
    const updated = await users.byId(userId);
    if (!updated) return c.json({ message: "User not found." }, 404);
    return c.json({ message: "Onboarding completed.", user: toPublicUser(updated) });
  });

  // POST /google — Google Identity Services credential flow (501 until configured)
  router.post("/google", authLimiter, async (c) => {
    const parsed = googleCredentialSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ message: "Google sign-in failed. Try again.", errors: { form: "Missing Google credential." } }, 400);
    }
    if (!cfg.googleClientId) {
      return c.json({ message: "Google sign-in is not configured yet. Use email/password for now." }, 501);
    }

    let sub: string;
    let email: string;
    let emailVerified: boolean;
    let name: string | undefined;
    let picture: string | undefined;
    try {
      // Use Google's public tokeninfo endpoint (Workers-compatible, no SDK).
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.credential)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error("tokeninfo");
      const info = (await res.json()) as {
        sub?: string; email?: string; email_verified?: string | boolean;
        aud?: string; exp?: string; name?: string; picture?: string;
      };
      if (!info.sub || !info.email) throw new Error("payload");
      if (info.aud !== cfg.googleClientId) throw new Error("audience");
      if (Number(info.exp) * 1000 < Date.now()) throw new Error("expired");
      sub = info.sub;
      email = info.email.toLowerCase();
      emailVerified = info.email_verified === "true" || info.email_verified === true;
      name = info.name;
      picture = info.picture;
    } catch {
      return c.json({ message: "Google sign-in failed. Try again." }, 401);
    }
    if (!emailVerified) {
      return c.json({ message: "Your Google email is not verified. Verify it with Google first." }, 401);
    }

    let row = await users.byGoogleId(sub);
    let isNewUser = false;

    if (!row) {
      const existing = await users.byEmail(email);
      if (existing) {
        const update: Record<string, unknown> = { google_id: sub };
        if (!existing.name && name) update.name = name.trim();
        if (!existing.avatar && picture) update.avatar = picture;
        await updateUser(cfg.db, String(existing.id), update, nowIso()).run();
        row = await users.byId(String(existing.id));
      } else {
        const tempUsername = `${TEMP_USERNAME_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
        const id = newId();
        await insertUser(cfg.db, {
          id,
          username: tempUsername,
          email,
          passwordHash: null,
          googleId: sub,
          name: (name ?? email.split("@")[0]).trim().slice(0, 50) || email.split("@")[0],
          avatar: picture ?? null,
          onboardingCompleted: false,
        }, nowIso()).run();
        row = await users.byId(id);
        isNewUser = true;
      }
    }
    if (!row) return c.json({ message: "Google sign-in failed. Try again." }, 401);

    const token = await signSession(
      { sub: String(row.id), username: String(row.username), email: String(row.email) },
      cfg.jwtSecret,
    );
    setCookie(c, COOKIE_NAME, token, sessionCookieOptions(cfg.isProd));

    const status = isNewUser ? 201 : 200;
    return c.json({
      message: isNewUser ? "Account created with Google." : "Logged in with Google.",
      user: toPublicUser(row),
      isNewUser,
    }, status);
  });

  return { router, requireAuth };
}

