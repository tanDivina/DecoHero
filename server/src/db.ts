import Database from "better-sqlite3";
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
`);

// Migrations for databases created before refunds were handled.
const purchaseCols = (db.prepare("PRAGMA table_info(purchases)").all() as { name: string }[]).map((c) => c.name);
if (!purchaseCols.includes("transaction_id")) db.exec("ALTER TABLE purchases ADD COLUMN transaction_id TEXT");
if (!purchaseCols.includes("refunded_at")) db.exec("ALTER TABLE purchases ADD COLUMN refunded_at INTEGER");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS purchases_transaction ON purchases (transaction_id) WHERE transaction_id IS NOT NULL");

const FREE_CREDITS = Number(process.env.FREE_CREDITS ?? 3);
const MAX_NEW_PER_IP = Number(process.env.MAX_NEW_INSTALLS_PER_IP_PER_DAY ?? 3);

// Hard spend caps (UTC day). Every Gemini call costs money, so these are counted before the call
// and never given back, even if the call fails. 0 disables generation entirely.
const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};
export const MAX_GENERATIONS_PER_DAY = envInt("MAX_GENERATIONS_PER_DAY", 300);
export const MAX_FREE_GENERATIONS_PER_DAY = envInt("MAX_FREE_GENERATIONS_PER_DAY", 100);

export type User = { id: string; credits: number; paid: number };

export function getOrCreateUser(id: string, ip: string): User {
  const existing = db.prepare("SELECT id, credits, paid FROM users WHERE id = ?").get(id) as User | undefined;
  if (existing) return existing;

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE ip = ? AND created_at > ?")
    .get(ip, dayAgo) as { n: number };
  const starting = n < MAX_NEW_PER_IP ? FREE_CREDITS : 0;

  db.prepare("INSERT INTO users (id, credits, paid, ip, created_at) VALUES (?, ?, 0, ?, ?)").run(
    id, starting, ip, Date.now()
  );
  return { id, credits: starting, paid: 0 };
}

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
       ON CONFLICT(id) DO UPDATE SET credits = credits + excluded.credits, paid = 1`
    ).run(userId, credits, Date.now());
    return true;
  }
);

/**
 * Refund (RevenueCat CANCELLATION of a one-time purchase): takes the pack's credits back, never below 0.
 * Idempotent through refunded_at. Returns the number of credits removed, or null if nothing matched.
 */
export const refundPurchase = db.transaction((transactionIds: string[]): number | null => {
  for (const tx of transactionIds) {
    const p = db
      .prepare("SELECT user_id, credits FROM purchases WHERE transaction_id = ? AND refunded_at IS NULL")
      .get(tx) as { user_id: string; credits: number } | undefined;
    if (!p) continue;
    db.prepare("UPDATE purchases SET refunded_at = ? WHERE transaction_id = ?").run(Date.now(), tx);
    const before = getCredits(p.user_id);
    db.prepare("UPDATE users SET credits = MAX(0, credits - ?) WHERE id = ?").run(p.credits, p.user_id);
    return before - getCredits(p.user_id);
  }
  return null;
});

export function logGeneration(userId: string, styleId: string, ok: boolean) {
  db.prepare("INSERT INTO generations (user_id, style_id, ok, created_at) VALUES (?, ?, ?, ?)").run(
    userId, styleId, ok ? 1 : 0, Date.now()
  );
}

export function addReport(userId: string, styleId: string | null, reason: string) {
  db.prepare("INSERT INTO reports (user_id, style_id, reason, created_at) VALUES (?, ?, ?, ?)").run(
    userId, styleId, reason.slice(0, 500), Date.now()
  );
}

export type CapResult = "OK" | "DAILY_LIMIT" | "FREE_DAILY_LIMIT";

/** Atomically books one generation against today's global (and, for free users, free) cap. */
export const reserveGeneration = db.transaction((paid: boolean): CapResult => {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare("INSERT OR IGNORE INTO daily_usage (day, total, free) VALUES (?, 0, 0)").run(day);
  const row = db.prepare("SELECT total, free FROM daily_usage WHERE day = ?").get(day) as { total: number; free: number };
  if (row.total >= MAX_GENERATIONS_PER_DAY) return "DAILY_LIMIT";
  if (!paid && row.free >= MAX_FREE_GENERATIONS_PER_DAY) return "FREE_DAILY_LIMIT";
  db.prepare("UPDATE daily_usage SET total = total + 1, free = free + ? WHERE day = ?").run(paid ? 0 : 1, day);
  return "OK";
});

/**
 * Privacy retention: the IP is only needed for the free-credit check, which looks back 24 hours.
 * Blank it once the install is 48 hours old. Returns the number of rows cleared.
 */
export function purgeOldIps(): number {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  return db.prepare("UPDATE users SET ip = NULL WHERE ip IS NOT NULL AND created_at < ?").run(cutoff).changes;
}
