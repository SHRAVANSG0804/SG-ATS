import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt password hashing (Node built-in, no extra dependency).
// Stored format: scrypt$<N>$<salt b64>$<hash b64>
const N = 16384;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, n, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n) });
  return timingSafeEqual(actual, expected);
}

/** Password policy: at least 8 characters with a letter and a number. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain a letter and a number.";
  return null;
}

/** Readable temporary password, e.g. "Kite-4821-Moss". */
export function generateTempPassword(): string {
  const words = ["Kite", "Moss", "Reef", "Pine", "Dune", "Lark", "Fern", "Opal", "Tide", "Wren", "Sage", "Cove"];
  const b = randomBytes(4);
  const num = String(1000 + (b.readUInt16BE(0) % 9000));
  return `${words[b[2] % words.length]}-${num}-${words[b[3] % words.length]}`;
}
