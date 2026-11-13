import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/decohero.db";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    credits INTEGER NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS purchases (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    style_id TEXT NOT NULL,
    ok INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    style_id TEXT,
    reason TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS daily_usage (
    day TEXT PRIMARY KEY,
    total INTEGER NOT NULL DEFAULT 0,
    free INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS users_ip_created ON users (ip, created_at);
  -- Web app sign-ins: Firebase uid -> the random user id that owns the credits. No email or name is stored.
  CREATE TABLE IF NOT EXISTS web_accounts (
    firebase_uid TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Migrations for existing databases on the /data volume. Only additive: never drop or rewrite data.
const columns = (table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
const purchaseCols = columns("purchases");
if (!purchaseCols.includes("transaction_id")) db.exec("ALTER TABLE purchases ADD COLUMN transaction_id TEXT");
if (!purchaseCols.includes("refunded_at")) db.exec("ALTER TABLE purchases ADD COLUMN refunded_at INTEGER");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS purchases_transaction ON purchases (transaction_id) WHERE transaction_id IS NOT NULL");
// free_denied = 1 when the install was created with 0 credits because of the per-IP new-install limit.
if (!columns("users").includes("free_denied")) db.exec("ALTER TABLE users ADD COLUMN free_denied INTEGER NOT NULL DEFAULT 0");
db.exec(`
  CREATE INDEX IF NOT EXISTS purchases_user ON purchases (user_id);
  CREATE INDEX IF NOT EXISTS generations_user_created ON generations (user_id, created_at);
  CREATE INDEX IF NOT EXISTS reports_user_style ON reports (user_id, style_id);
`);
// Install ids are now always stored lowercase. Lowercase older rows unless that would collide with an existing row.
try {
  db.transaction(() => {
    db.exec("UPDATE users SET id = lower(id) WHERE id <> lower(id) AND lower(id) NOT IN (SELECT id FROM users)");
    for (const t of ["purchases", "generations", "reports"]) {
      db.exec(`UPDATE ${t} SET user_id = lower(user_id) WHERE user_id <> lower(user_id)`);
    }
  })();
} catch (err) {
  // Two rows that differ only in case: leave them as they are rather than fail to start.
  console.error(`install id lowercase migration skipped: ${err instanceof Error ? err.message : String(err)}`);
}

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};
const FREE_CREDITS = envInt("FREE_CREDITS", 3);
// Shared Wi-Fi and carrier-grade NAT put many real users behind one IP, so this is deliberately generous.
const MAX_NEW_PER_IP = envInt("MAX_NEW_INSTALLS_PER_IP_PER_DAY", 15);

// Hard spend caps (UTC day). Every Gemini call costs money, so these are counted before the call.
// The slot is only given back when the call failed before an image was produced. 0 disables generation entirely.
export const MAX_GENERATIONS_PER_DAY = envInt("MAX_GENERATIONS_PER_DAY", 300);
export const MAX_FREE_GENERATIONS_PER_DAY = envInt("MAX_FREE_GENERATIONS_PER_DAY", 100);
// Failed or undelivered generations per install per UTC day before redesign returns TOO_MANY_FAILURES.
export const MAX_FAILURES_PER_INSTALL_PER_DAY = envInt("MAX_FAILURES_PER_INSTALL_PER_DAY", 10);

export type User = { id: string; credits: number; paid: number; free_denied: number };

export const utcDay = () => new Date().toISOString().slice(0, 10);

export function getUser(id: string): User | undefined {
  return db.prepare("SELECT id, credits, paid, free_denied FROM users WHERE id = ?").get(id) as User | undefined;
}

export const getOrCreateUser = db.transaction((id: string, ip: string): User => {
  const existing = getUser(id);
  if (existing) return existing;

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE ip = ? AND created_at > ?")
    .get(ip, dayAgo) as { n: number };
  const denied = n >= MAX_NEW_PER_IP;
  const starting = denied ? 0 : FREE_CREDITS;

  db.prepare("INSERT INTO users (id, credits, paid, ip, created_at, free_denied) VALUES (?, ?, 0, ?, ?, ?)").run(
    id, starting, ip, Date.now(), denied ? 1 : 0
  );
  return { id, credits: starting, paid: 0, free_denied: denied ? 1 : 0 };
});

/**
 * Web app: the user id behind a Firebase uid. The first time a uid is seen it gets a fresh random user id,
 * created through getOrCreateUser so the free credits and the per-IP new-user limit apply as for an install.
 */
export const getOrCreateWebUser = db.transaction((firebaseUid: string, ip: string): string => {
  const row = db.prepare("SELECT user_id FROM web_accounts WHERE firebase_uid = ?").get(firebaseUid) as
    | { user_id: string }
    | undefined;
  if (row) return row.user_id;
  const id = crypto.randomUUID();
  getOrCreateUser(id, ip);
  db.prepare("INSERT INTO web_accounts (firebase_uid, user_id, created_at) VALUES (?, ?, ?)").run(firebaseUid, id, Date.now());
  return id;
});

/** purchases.user_id of a deleted web account. Not a UUID, so it can never match a user again. */
export const DELETED_USER = "deleted";

/**
 * Deletes a web account: the sign-in link, the user row (credits, paid flag, IP), its generation log and its
 * reports. Purchase rows stay for accounting and so a retried webhook or a refund cannot credit twice, but
 * they are cut loose from the user id. Returns false if the uid has no account.
 */
export const deleteWebAccount = db.transaction((firebaseUid: string): boolean => {
  const row = db.prepare("SELECT user_id FROM web_accounts WHERE firebase_uid = ?").get(firebaseUid) as
    | { user_id: string }
    | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM generations WHERE user_id = ?").run(row.user_id);
  db.prepare("DELETE FROM reports WHERE user_id = ?").run(row.user_id);
  db.prepare("UPDATE purchases SET user_id = ? WHERE user_id = ?").run(DELETED_USER, row.user_id);
  db.prepare("DELETE FROM users WHERE id = ?").run(row.user_id);
  db.prepare("DELETE FROM web_accounts WHERE firebase_uid = ?").run(firebaseUid);
  return true;
});

/** Atomically takes credits. Returns false if the balance is too low. */
export function spendCredits(id: string, amount: number): boolean {
  const r = db.prepare("UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?").run(amount, id, amount);
  return r.changes === 1;
}

export function refundCredits(id: string, amount: number) {
  db.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").run(amount, id);
}

export function getCredits(id: string): number {
  const row = db.prepare("SELECT credits FROM users WHERE id = ?").get(id) as { credits: number } | undefined;
  return row?.credits ?? 0;
}

/**
 * Idempotent: RevenueCat retries webhooks, so both the event id and the store transaction id
 * guard against double-crediting the same purchase.
 */
export const grantPurchase = db.transaction(
  (eventId: string, userId: string, productId: string, credits: number, transactionId: string | null): boolean => {
    const seen = db
      .prepare("SELECT 1 FROM purchases WHERE event_id = ? OR (? IS NOT NULL AND transaction_id = ?)")
      .get(eventId, transactionId, transactionId);
    if (seen) return false;
    db.prepare(
      "INSERT INTO purchases (event_id, user_id, product_id, credits, transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(eventId, userId, productId, credits, transactionId, Date.now());
    db.prepare(
      `INSERT INTO users (id, credits, paid, ip, created_at) VALUES (?, ?, 1, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET credits = credits + excluded.credits, paid = 1, free_denied = 0`
    ).run(userId, credits, Date.now());
    return true;
  }
);

/**
 * Refund (RevenueCat CANCELLATION of a one-time purchase): takes the pack's credits back, never below 0,
 * and recomputes `paid` from the purchases that are not refunded. Idempotent through refunded_at.
 * Returns the number of credits removed, or null if nothing matched.
 */
export const refundPurchase = db.transaction((transactionIds: string[]): number | null => {
  for (const tx of transactionIds) {
    const p = db
      .prepare("SELECT user_id, credits FROM purchases WHERE transaction_id = ? AND refunded_at IS NULL")
      .get(tx) as { user_id: string; credits: number } | undefined;
    if (!p) continue;
    db.prepare("UPDATE purchases SET refunded_at = ? WHERE transaction_id = ?").run(Date.now(), tx);
    const before = getCredits(p.user_id);
    db.prepare(
      `UPDATE users SET credits = MAX(0, credits - ?),
         paid = EXISTS (SELECT 1 FROM purchases WHERE user_id = ? AND refunded_at IS NULL)
       WHERE id = ?`
    ).run(p.credits, p.user_id, p.user_id);
    return before - getCredits(p.user_id);
  }
  return null;
});

export function logGeneration(userId: string, styleId: string, ok: boolean) {
  db.prepare("INSERT INTO generations (user_id, style_id, ok, created_at) VALUES (?, ?, ?, ?)").run(
    userId, styleId.slice(0, 64), ok ? 1 : 0, Date.now()
  );
}

/** Failed (or undelivered) generations for this install since 00:00 UTC. */
export function failuresToday(userId: string): number {
  const since = Date.parse(`${utcDay()}T00:00:00Z`);
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM generations WHERE user_id = ? AND ok = 0 AND created_at >= ?")
    .get(userId, since) as { n: number };
  return n;
}

/** One report per install and style. Returns false if this install already reported this style. */
export const addReport = db.transaction((userId: string, styleId: string, reason: string): boolean => {
  if (db.prepare("SELECT 1 FROM reports WHERE user_id = ? AND style_id = ?").get(userId, styleId)) return false;
  db.prepare("INSERT INTO reports (user_id, style_id, reason, created_at) VALUES (?, ?, ?, ?)").run(
    userId.slice(0, 64), styleId.slice(0, 64), reason.slice(0, 32), Date.now()
  );
  return true;
});

export type CapResult = "OK" | "DAILY_LIMIT" | "FREE_DAILY_LIMIT";

/** Atomically books one generation against the day's global (and, for free users, free) cap. */
export const reserveGeneration = db.transaction((paid: boolean, day: string): CapResult => {
  db.prepare("INSERT OR IGNORE INTO daily_usage (day, total, free) VALUES (?, 0, 0)").run(day);
  const row = db.prepare("SELECT total, free FROM daily_usage WHERE day = ?").get(day) as { total: number; free: number };
  if (row.total >= MAX_GENERATIONS_PER_DAY) return "DAILY_LIMIT";
  if (!paid && row.free >= MAX_FREE_GENERATIONS_PER_DAY) return "FREE_DAILY_LIMIT";
  db.prepare("UPDATE daily_usage SET total = total + 1, free = free + ? WHERE day = ?").run(paid ? 0 : 1, day);
  return "OK";
});

/** Gives back a slot booked by reserveGeneration (same day and paid flag) when the call cost us nothing. */
export function releaseGeneration(paid: boolean, day: string) {
  db.prepare("UPDATE daily_usage SET total = MAX(0, total - 1), free = MAX(0, free - ?) WHERE day = ?").run(paid ? 0 : 1, day);
}

/**
 * Privacy retention: the IP is only needed for the free-credit check, which looks back 24 hours.
 * Blank it once the install is 48 hours old. Returns the number of rows cleared.
 */
export function purgeOldIps(): number {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  return db.prepare("UPDATE users SET ip = NULL WHERE ip IS NOT NULL AND created_at < ?").run(cutoff).changes;
}
