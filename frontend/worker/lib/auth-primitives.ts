/* Auth primitives for the Cloudflare worker: PBKDF2-SHA256 password hashing
   (WebCrypto — no native bcrypt on Workers) and HS256 session JWTs (jose). */

import { SignJWT, jwtVerify, JWTPayload } from "jose";

export const COOKIE_NAME = "nexlearn_token";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type SessionClaims = {
  sub: string;
  username: string;
  email: string;
};

const encoder = new TextEncoder();

/* ---------- Cookies ---------- */

export function sessionCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export function clearSessionCookieOptions(isProd: boolean) {
  return { httpOnly: true, secure: isProd, sameSite: "Lax" as const, path: "/" };
}

/* ---------- JWT ---------- */

function keyOf(secret: string): Uint8Array {
  return encoder.encode(secret);
}

export async function signSession(claims: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({ username: claims.username, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(keyOf(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, keyOf(secret), { algorithms: ["HS256"] });
    const p = payload as JWTPayload & { username?: string; email?: string };
    if (!p.sub || typeof p.username !== "string" || typeof p.email !== "string") return null;
    return { sub: p.sub, username: p.username, email: p.email };
  } catch {
    return null;
  }
}

/* ---------- Password hashing (PBKDF2-SHA256) ---------- */

export const PASSWORD_ITERATIONS = 100_000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Format: pbkdf2$<iterations>$<saltB64>$<hashB64> */
export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  try {
    const expected = b64decode(parts[3]);
    const actual = await pbkdf2(password, b64decode(parts[2]), iterations);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Timing-safe comparison for hex strings (ai cache keys etc.). */
export function hexEqual(a: string, b: string): boolean {
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}
