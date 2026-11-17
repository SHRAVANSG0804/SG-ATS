import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DB } from "./domain";
import { buildSeed } from "./seed";

/**
 * Local development data store.
 *
 * Phase 1 persists to a JSON file in `.data/` so the app runs with zero setup.
 * The rest of the app only talks to `readDb()` / `mutate()`, so swapping this
 * module for Supabase (schema in /supabase/schema.sql) does not touch the UI.
 */

const DATA_DIR = process.env.ATS_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;

function load(): DB {
  if (cache) return cache;
  if (fs.existsSync(DATA_FILE)) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
  } else {
    cache = buildSeed();
    persist(cache);
  }
  return cache;
}

function persist(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
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
  cache = buildSeed();
  persist(cache);
}

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();
