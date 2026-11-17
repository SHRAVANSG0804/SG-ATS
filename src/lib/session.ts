import "server-only";
import { cookies } from "next/headers";
import { readDb } from "./store";
import type { User } from "./domain";

/**
 * Phase 1 auth: a demo user switcher stored in a cookie, so every role can be tested
 * without accounts. Phase 2 replaces this with Clerk (`auth()` → map Clerk userId to User).
 */
export const SESSION_COOKIE = "ats_user";

export async function currentUser(): Promise<User> {
  const db = readDb();
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return db.users.find((u) => u.id === id) ?? db.users.find((u) => u.role === "head")!;
}

export function canEdit(user: User) {
  return user.role === "head" || user.role === "recruiter";
}
