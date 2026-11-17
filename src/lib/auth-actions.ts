"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mutate, newId, nowIso, readDb } from "./store";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "./password";
import {
  currentUser,
  endAllSessions,
  endSession,
  isHead,
  revokeUserSessions,
  setActiveAccount,
  startSession,
} from "./session";
import type { Role } from "./domain";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Only allow redirects to paths inside this app (blocks "//evil.com" open redirects). */
const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/dashboard");

// ---- Brute-force protection: 5 failed attempts per email locks it for 15 minutes ----
const failures = new Map<string, { count: number; until: number }>();
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60_000;
// Verifying against a dummy hash when the email is unknown keeps response times uniform.
const DUMMY_HASH = hashPassword("dummy-password-for-timing");

export type AuthState = { error?: string; ok?: string; tempPassword?: string } | undefined;

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(str(formData, "next"));
  if (!email || !password) return { error: "Enter your email and password." };

  const f = failures.get(email);
  if (f && f.count >= LOCK_AFTER && f.until > Date.now()) {
    const mins = Math.ceil((f.until - Date.now()) / 60_000);
    return { error: `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? "s" : ""}.` };
  }

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  const cred = user && db.credentials.find((c) => c.userId === user.id);
  const valid = verifyPassword(password, cred?.passwordHash ?? DUMMY_HASH) && !!cred;

  if (!valid || !user) {
    const prev = f && f.until > Date.now() ? f.count : 0;
    failures.set(email, { count: prev + 1, until: Date.now() + LOCK_MS });
    return { error: "Incorrect email or password." };
  }
  if (!user.active) return { error: "This account has been deactivated. Contact your Head of TA." };

  failures.delete(email);
  try {
    await startSession(user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(next);
}

export async function switchAccount(formData: FormData) {
  await setActiveAccount(str(formData, "userId"));
  redirect("/dashboard");
}

export async function signOut() {
  const remaining = await endSession();
  redirect(remaining.length ? "/dashboard" : "/login");
}

export async function signOutAll() {
  await endAllSessions();
  redirect("/login");
}

export async function changePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = await currentUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const cred = readDb().credentials.find((c) => c.userId === user.id);
  if (!cred || !verifyPassword(current, cred.passwordHash)) return { error: "Current password is incorrect." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "New passwords don't match." };
  if (next === current) return { error: "New password must be different from the current one." };

  mutate((db) => {
    const c = db.credentials.find((x) => x.userId === user.id)!;
    c.passwordHash = hashPassword(next);
    c.mustChangePassword = false;
    c.updatedAt = nowIso();
  });
  // Sign the account out everywhere else (other browsers/devices), keep this browser signed in.
  await revokeUserSessions(user.id, true);
  revalidatePath("/", "layout");
  return { ok: "Password updated. Other devices using this account have been signed out." };
}

// ---------------- Team management (Head of TA only) ----------------

async function requireHead() {
  const user = await currentUser();
  if (!isHead(user)) throw new Error("Only the Head of TA can manage the team.");
  return user;
}

const ROLES: Role[] = ["head", "recruiter", "hiring_manager"];

export async function createUser(_: AuthState, formData: FormData): Promise<AuthState> {
  await requireHead();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") as Role;
  const typed = String(formData.get("password") ?? "");
  if (!name) return { error: "Name is required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { error: "Pick a role." };
  if (readDb().users.some((u) => u.email.toLowerCase() === email)) return { error: "A user with this email already exists." };
  const password = typed || generateTempPassword();
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  mutate((db) => {
    const id = newId();
    db.users.push({ id, name, email, role, active: true });
    db.credentials.push({ userId: id, passwordHash: hashPassword(password), mustChangePassword: true, updatedAt: nowIso() });
  });
  revalidatePath("/team");
  return {
    ok: `${name} can now sign in with ${email}. Share this temporary password privately; they'll be asked to change it.`,
    tempPassword: password,
  };
}

export async function resetUserPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const head = await requireHead();
  const userId = str(formData, "userId");
  const user = readDb().users.find((u) => u.id === userId);
  if (!user) return { error: "User not found." };
  const password = generateTempPassword();
  mutate((db) => {
    const c = db.credentials.find((x) => x.userId === userId);
    if (c) {
      c.passwordHash = hashPassword(password);
      c.mustChangePassword = true;
      c.updatedAt = nowIso();
    }
  });
  await revokeUserSessions(userId, userId === head.id);
  return { ok: `New temporary password for ${user.name}:`, tempPassword: password };
}

export async function setUserActive(formData: FormData) {
  const head = await requireHead();
  const userId = str(formData, "userId");
  const active = str(formData, "active") === "true";
  if (userId === head.id) throw new Error("You can't deactivate your own account.");
  mutate((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (u) u.active = active;
  });
  if (!active) await revokeUserSessions(userId);
  revalidatePath("/team");
}

export async function setUserRole(formData: FormData) {
  const head = await requireHead();
  const userId = str(formData, "userId");
  const role = str(formData, "role") as Role;
  if (!ROLES.includes(role)) return;
  if (userId === head.id && role !== "head") {
    const otherHeads = readDb().users.filter((u) => u.role === "head" && u.active && u.id !== head.id);
    if (!otherHeads.length) throw new Error("There must be at least one active Head of TA.");
  }
  mutate((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (u) u.role = role;
  });
  revalidatePath("/", "layout");
}
