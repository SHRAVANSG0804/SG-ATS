import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { mutate, readDb } from "./store";
import type { User } from "./domain";

/**
 * Email + password sessions with multi-account support (like Google's account switcher).
 *
 * - `ats_sessions` cookie: up to MAX_ACCOUNTS random session tokens, one per signed-in account.
 * - `ats_active`  cookie: the userId of the account currently in use.
 * - The database stores only a SHA-256 of each token, so a leaked data file can't be used to log in.
 * Both cookies are httpOnly (no JavaScript access), SameSite=Lax, and Secure in production.
 */
export const SESSIONS_COOKIE = "ats_sessions";
export const ACTIVE_COOKIE = "ats_active";
const SESSION_DAYS = 7;
const MAX_ACCOUNTS = 5;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

const cookieOpts = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DAYS * 86_400,
};

async function readTokens(): Promise<string[]> {
  const raw = (await cookies()).get(SESSIONS_COOKIE)?.value ?? "";
  return raw.split(".").filter((t) => /^[A-Za-z0-9_-]{20,}$/.test(t)).slice(0, MAX_ACCOUNTS);
}

/** All accounts signed in on this browser whose sessions are still valid. */
export async function signedInAccounts(): Promise<{ user: User; token: string }[]> {
  const db = readDb();
  const now = new Date().toISOString();
  const out: { user: User; token: string }[] = [];
  for (const token of await readTokens()) {
    const s = db.sessions.find((x) => x.tokenHash === hashToken(token));
    if (!s || s.expiresAt < now) continue;
    const user = db.users.find((u) => u.id === s.userId && u.active);
    if (user && !out.some((o) => o.user.id === user.id)) out.push({ user, token });
  }
  return out;
}

export async function currentUserOrNull(): Promise<User | null> {
  const accounts = await signedInAccounts();
  if (!accounts.length) return null;
  const activeId = (await cookies()).get(ACTIVE_COOKIE)?.value;
  return (accounts.find((a) => a.user.id === activeId) ?? accounts[0]).user;
}

/** The signed-in user; sends the visitor to /login if nobody is signed in. */
export async function currentUser(): Promise<User> {
  const user = await currentUserOrNull();
  if (!user) redirect("/login");
  return user;
}

export function mustChangePassword(userId: string) {
  return readDb().credentials.find((c) => c.userId === userId)?.mustChangePassword ?? false;
}

export function canEdit(user: User) {
  return user.role === "head" || user.role === "recruiter";
}

export function isHead(user: User) {
  return user.role === "head";
}

// ---- cookie writers: only callable from Server Actions / Route Handlers ----

async function writeCookies(tokens: string[], activeUserId: string | null) {
  const jar = await cookies();
  if (!tokens.length) {
    jar.delete(SESSIONS_COOKIE);
    jar.delete(ACTIVE_COOKIE);
    return;
  }
  jar.set(SESSIONS_COOKIE, tokens.join("."), cookieOpts);
  if (activeUserId) jar.set(ACTIVE_COOKIE, activeUserId, cookieOpts);
}

/** Create a session for `userId`, add it to this browser's account list and make it active. */
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const current = await signedInAccounts();
  // Re-signing into an account already on this browser replaces its old session.
  const keep = current.filter((a) => a.user.id !== userId);
  const dropped = current.filter((a) => a.user.id === userId).map((a) => hashToken(a.token));
  if (keep.length >= MAX_ACCOUNTS) throw new Error(`You can be signed in to at most ${MAX_ACCOUNTS} accounts at once.`);

  mutate((d) => {
    d.sessions = d.sessions.filter((s) => !dropped.includes(s.tokenHash) && s.expiresAt > now.toISOString());
    d.sessions.push({
      tokenHash: hashToken(token),
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString(),
    });
  });
  await writeCookies([...keep.map((a) => a.token), token], userId);
}

export async function setActiveAccount(userId: string): Promise<boolean> {
  const accounts = await signedInAccounts();
  if (!accounts.some((a) => a.user.id === userId)) return false;
  await writeCookies(
    accounts.map((a) => a.token),
    userId,
  );
  return true;
}

/** Sign out one account (default: the active one). Returns the accounts still signed in. */
export async function endSession(userId?: string) {
  const accounts = await signedInAccounts();
  const target = userId ?? (await currentUserOrNull())?.id;
  const leaving = accounts.filter((a) => a.user.id === target);
  const remaining = accounts.filter((a) => a.user.id !== target);
  const hashes = leaving.map((a) => hashToken(a.token));
  mutate((d) => {
    d.sessions = d.sessions.filter((s) => !hashes.includes(s.tokenHash));
  });
  await writeCookies(
    remaining.map((a) => a.token),
    remaining[0]?.user.id ?? null,
  );
  return remaining;
}

export async function endAllSessions() {
  const hashes = (await readTokens()).map(hashToken);
  mutate((d) => {
    d.sessions = d.sessions.filter((s) => !hashes.includes(s.tokenHash));
  });
  await writeCookies([], null);
}

/** Invalidate every session of a user (password reset, deactivation), optionally keeping this browser's. */
export async function revokeUserSessions(userId: string, keepCurrent = false) {
  const keepHash = keepCurrent
    ? (await signedInAccounts()).filter((a) => a.user.id === userId).map((a) => hashToken(a.token))
    : [];
  mutate((d) => {
    d.sessions = d.sessions.filter((s) => s.userId !== userId || keepHash.includes(s.tokenHash));
  });
}
