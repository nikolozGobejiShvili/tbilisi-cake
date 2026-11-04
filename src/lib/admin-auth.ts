import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { RateLimiter } from "./ratelimit";

const COOKIE = "tc_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);

/** The panel does not exist at all until a password is configured. */
export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(expires: string): string {
  return createHmac("sha256", `tc-session:${process.env.ADMIN_PASSWORD ?? ""}`).update(expires).digest("base64url");
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function passwordMatches(attempt: string): boolean {
  if (!adminEnabled()) return false;
  return timingSafeEqual(digest(attempt), digest(process.env.ADMIN_PASSWORD ?? ""));
}

export function loginAllowed(key: string): boolean {
  return loginLimiter.allow(key);
}

export function loginSucceeded(key: string): void {
  loginLimiter.reset(key);
}

export async function startSession(): Promise<void> {
  const expires = String(Date.now() + SESSION_MS);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_HTTP_ADMIN !== "1",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** For panel pages and actions: 404 when the panel is off, login page when not signed in. */
export async function requireAdmin(): Promise<void> {
  if (!adminEnabled()) notFound();
  if (!(await isAdmin())) redirect("/admin/login");
}
