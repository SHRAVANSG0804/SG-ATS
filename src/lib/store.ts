import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DB } from "./domain";
import { buildSeed, defaultCredentials } from "./seed";

/**
 * Local development data store.
 *
 * Phase 1 persists to a JSON file in `.data/` so the app runs with zero setup.
 * The rest of the app only talks to `readDb()` / `mutate()`, so swapping this
 * module for Supabase (schema in /supabase/schema.sql) does not touch the UI.
 */

const DATA_DIR = process.env.ATS_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

// Next.js can load this module more than once (e.g. once for pages, once for server actions),
// so the cache lives on globalThis and is reloaded whenever the file changes on disk.
const g = globalThis as unknown as { __atsStore?: { db: DB; mtimeMs: number } };

function load(): DB {
  if (fs.existsSync(DATA_FILE)) {
    const mtimeMs = fs.statSync(DATA_FILE).mtimeMs;
    if (g.__atsStore && g.__atsStore.mtimeMs === mtimeMs) return g.__atsStore.db;
    const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
    if (migrate(db)) persist(db);
    else g.__atsStore = { db, mtimeMs };
    return db;
  }
  const db = buildSeed();
  persist(db);
  return db;
}

/** Upgrade data files written by older versions (e.g. before real logins existed). */
function migrate(db: DB): boolean {
  let changed = false;
  db.users.forEach((u) => {
    if (u.active === undefined) {
      u.active = true;
      changed = true;
    }
  });
  if (!db.credentials) {
    db.credentials = defaultCredentials(db.users.map((u) => u.id));
    changed = true;
  }
  if (!db.sessions) {
    db.sessions = [];
    changed = true;
  }
  return changed;
}

function persist(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
  g.__atsStore = { db, mtimeMs: fs.statSync(DATA_FILE).mtimeMs };
}

export function readDb(): DB {
  return load();
}

export function mutate<T>(fn: (db: DB) => T): T {
  const db = load();
  const result = fn(db);
  persist(db);
  return result;
}

export function resetDb() {
  persist(buildSeed());
}

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();
