// Local end-to-end checks against a temp SQLite DB with a fake Gemini. No network, no real keys.
// Usage: npm test   (or: npx tsx test/smoke.ts)
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import sharp from "sharp";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "decohero-test-"));
process.env.DB_PATH = path.join(dir, "test.db");
process.env.GEMINI_API_KEY = "test-not-a-real-key";
process.env.REVENUECAT_WEBHOOK_SECRET = "test-secret";
process.env.MAX_NEW_INSTALLS_PER_IP_PER_DAY = "2";
process.env.MAX_FAILURES_PER_INSTALL_PER_DAY = "4";
process.env.TRUST_PROXY = "1";

// Pre-create a v1-style database (no free_denied column, an uppercase id) to exercise the migrations.
{
  const Database = (await import("better-sqlite3")).default;
  const old = new Database(process.env.DB_PATH);
  old.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, credits INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, ip TEXT, created_at INTEGER NOT NULL);
            CREATE TABLE purchases (event_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, credits INTEGER NOT NULL, created_at INTEGER NOT NULL);`);
  old.prepare("INSERT INTO users VALUES (?, 7, 0, NULL, ?)").run("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE", Date.now());
  old.close();
}

const { createApp } = await import("../src/app.js");
const Database = (await import("better-sqlite3")).default;
const peek = new Database(process.env.DB_PATH, { readonly: true });

type Mode = "ok" | "fail" | "slow";
let mode: Mode = "ok";
let calls = 0;
const fakeGenerate = async (_img: string, _prompt: string): Promise<Buffer> => {
  calls++;
  if (mode === "fail") throw new Error("Gemini returned no image (SAFETY)");
  if (mode === "slow") await new Promise((r) => setTimeout(r, 400));
  return sharp({ create: { width: 640, height: 480, channels: 3, background: "#a08060" } }).png().toBuffer();
};

const server = createApp(fakeGenerate, "fake-model").listen(0);
await new Promise((r) => server.once("listening", r));
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

let ipCounter = 10;
const freshIp = () => `203.0.113.${ipCounter++}`;
const uuid = () => crypto.randomUUID();

async function req(method: string, p: string, opts: { body?: unknown; headers?: Record<string, string>; ip?: string } = {}) {
  const r = await fetch(base + p, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": opts.ip ?? "198.51.100.1",
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, headers: r.headers };
}
const webhook = (event: Record<string, unknown>, auth = "Bearer test-secret") =>
  req("POST", "/webhooks/revenuecat", { body: { event }, headers: { authorization: auth } });

const jpeg = (await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ccbbaa" } }).jpeg().toBuffer()).toString("base64");
const gif = (await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ccbbaa" } }).gif().toBuffer()).toString("base64");
const tiff = (await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ccbbaa" } }).tiff().toBuffer()).toString("base64");

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

await test("migration: free_denied column added, uppercase id lowercased, old balance kept", async () => {
  const cols = (peek.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  assert.ok(cols.includes("free_denied"));
  const r = await req("GET", "/api/me", { headers: { "x-install-id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" } });
  assert.deepEqual(r.json, { credits: 7, paid: false, freeDenied: false });
});

await test("install id: header, v1 query, case-insensitive, bad shapes rejected", async () => {
  const id = uuid();
  const ip = freshIp();
  const a = await req("GET", "/api/me", { headers: { "x-install-id": id.toUpperCase() }, ip });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { credits: 3, paid: false, freeDenied: false });
  const b = await req("GET", `/api/me?installId=${id}`, { ip }); // v1 client
  assert.deepEqual(b.json, a.json);
  assert.equal((peek.prepare("SELECT COUNT(*) n FROM users WHERE lower(id) = ?").get(id) as any).n, 1);
  for (const bad of ["------------------------------------", "a".repeat(36), "constructor", ""]) {
    const r = await req("GET", "/api/me", { headers: { "x-install-id": bad } });
    assert.equal(r.status, 400, bad);
  }
  assert.equal((await req("GET", "/api/me")).status, 400);
});

await test("new-install cap per IP sets freeDenied", async () => {
  const ip = freshIp();
  const r1 = await req("GET", "/api/me", { headers: { "x-install-id": uuid() }, ip });
  const r2 = await req("GET", "/api/me", { headers: { "x-install-id": uuid() }, ip });
  const deniedId = uuid();
  const r3 = await req("GET", "/api/me", { headers: { "x-install-id": deniedId }, ip });
  assert.equal(r1.json.credits, 3);
  assert.equal(r2.json.credits, 3);
  assert.deepEqual(r3.json, { credits: 0, paid: false, freeDenied: true });
  // Buying credits clears freeDenied.
  const w = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: deniedId, transaction_id: "GPA.deny-1" });
  assert.equal(w.status, 200);
  const r4 = await req("GET", "/api/me", { headers: { "x-install-id": deniedId }, ip });
  assert.deepEqual(r4.json, { credits: 15, paid: true, freeDenied: false });
});

await test("webhook: auth, purchase, duplicate event, duplicate transaction, suffixed product id", async () => {
  const id = uuid();
  assert.equal((await webhook({ id: "e0", type: "NON_RENEWING_PURCHASE" }, "Bearer wrong-secret")).status, 401);
  const evt = { id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_50", app_user_id: id.toUpperCase(), transaction_id: "GPA.1" };
  assert.equal((await webhook(evt)).status, 200);
  assert.equal((await webhook(evt)).status, 200); // RevenueCat retry: same event id
  assert.equal((await webhook({ ...evt, id: uuid() })).status, 200); // same transaction, new event id
  let me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.deepEqual(me.json, { credits: 50, paid: true, freeDenied: false });
  // product id with a ":base-plan" suffix, credited to an install id found among the aliases
  const w = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15:pack", app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", id], transaction_id: "GPA.2" });
  assert.equal(w.status, 200);
  me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.equal(me.json.credits, 65);
  assert.equal((peek.prepare("SELECT product_id FROM purchases WHERE transaction_id = 'GPA.2'").get() as any).product_id, "credits_15");
});

await test("webhook: uncreditable purchases answer 5xx so RevenueCat retries", async () => {
  const unknown = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "constructor", app_user_id: uuid(), transaction_id: "GPA.x1" });
  assert.equal(unknown.status, 500);
  const noUser = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: "$RCAnonymousID:zzz", transaction_id: "GPA.x2" });
  assert.equal(noUser.status, 500);
  assert.equal((await webhook({ id: uuid(), type: "TEST" })).status, 200);
});

await test("webhook: refund removes credits once, never below 0, and recomputes paid", async () => {
  const id = uuid();
  await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: id, transaction_id: "GPA.r1" });
  await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_50", app_user_id: id, transaction_id: "GPA.r2" });
  assert.equal((await req("GET", "/api/me", { headers: { "x-install-id": id } })).json.credits, 65);
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_15", transaction_id: "GPA.r1" });
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_15", transaction_id: "GPA.r1" }); // duplicate
  let me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.deepEqual(me.json, { credits: 50, paid: true, freeDenied: false });
  // Spend most of the balance, then refund the 50 pack: balance floors at 0 and the install is unpaid again.
  peek.close();
  const rw = new Database(process.env.DB_PATH!);
  rw.prepare("UPDATE users SET credits = 10 WHERE id = ?").run(id);
  rw.close();
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_50:x", transaction_id: "GPA.r2" });
  me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.deepEqual(me.json, { credits: 0, paid: false, freeDenied: false });
});

const peek2 = new Database(process.env.DB_PATH, { readonly: true });
const credits = async (id: string) => (await req("GET", "/api/me", { headers: { "x-install-id": id } })).json.credits;
const today = () => peek2.prepare("SELECT total, free FROM daily_usage WHERE day = ?").get(new Date().toISOString().slice(0, 10)) as { total: number; free: number } | undefined;

await test("redesign: success (header and v1 body), styles and image types validated", async () => {
  const id = uuid();
  const ip = freshIp();
  await req("GET", "/api/me", { headers: { "x-install-id": id }, ip });
  mode = "ok";
  const r = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: jpeg, styleId: "japandi", requestId: uuid() }, ip });
  assert.equal(r.status, 200);
  assert.equal(r.json.credits, 2);
  assert.ok(r.json.image.length > 1000);
  const v1 = await req("POST", "/api/redesign", { body: { installId: id, image: jpeg, styleId: "boho" }, ip });
  assert.equal(v1.status, 200);
  assert.equal(v1.json.credits, 1);
  for (const styleId of ["constructor", "__proto__", "toString", "nope"]) {
    assert.equal((await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: jpeg, styleId }, ip })).json.error, "BAD_STYLE");
  }
  for (const image of [gif, tiff, "x".repeat(2000)]) {
    assert.equal((await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image, styleId: "boho" }, ip })).json.error, "BAD_IMAGE");
  }
  assert.equal(await credits(id), 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((peek2.prepare("SELECT COUNT(*) n FROM generations WHERE user_id = ? AND ok = 1").get(id) as any).n, 2);
});

await test("redesign: failure refunds the credit and gives the daily slot back; failure cap", async () => {
  const id = uuid();
  const ip = freshIp();
  await req("GET", "/api/me", { headers: { "x-install-id": id }, ip });
  const before = today()?.total ?? 0;
  mode = "fail";
  for (let i = 0; i < 4; i++) {
    const r = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: jpeg, styleId: "boho" }, ip });
    assert.equal(r.status, 502);
    assert.deepEqual(r.json, { error: "GENERATION_FAILED", credits: 3 });
  }
  assert.equal(today()?.total ?? 0, before);
  const capped = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: jpeg, styleId: "boho" }, ip });
  assert.equal(capped.status, 429);
  assert.equal(capped.json.error, "TOO_MANY_FAILURES");
  assert.equal(await credits(id), 3);
  mode = "ok";
});

await test("redesign: client disconnect refunds once; finished response keeps the credit", async () => {
  const id = uuid();
  const ip = freshIp();
  await req("GET", "/api/me", { headers: { "x-install-id": id }, ip });
  mode = "slow";
  const body = JSON.stringify({ image: jpeg, styleId: "coastal" });
  await new Promise<void>((resolve) => {
    const r = http.request(`${base}/api/redesign`, {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), "x-install-id": id, "x-forwarded-for": ip },
    });
    r.on("error", () => resolve());
    r.end(body);
    setTimeout(() => { r.destroy(); resolve(); }, 150);
  });
  await new Promise((r) => setTimeout(r, 700)); // let the fake generation finish and try to respond
  assert.equal(await credits(id), 3, "credit refunded after disconnect");
  const rows = peek2.prepare("SELECT ok FROM generations WHERE user_id = ?").all(id) as { ok: number }[];
  assert.deepEqual(rows.map((x) => x.ok), [0], "logged once, as not delivered");
  mode = "ok";
  const r = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: jpeg, styleId: "coastal" }, ip });
  assert.equal(r.status, 200);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(await credits(id), 2, "no refund when the response finished");
});

await test("report: validated, needs an existing install, deduped, reason fixed", async () => {
  const id = uuid();
  assert.equal((await req("POST", "/api/report", { headers: { "x-install-id": id }, body: { styleId: "boho" } })).json.error, "UNKNOWN_INSTALL");
  await req("GET", "/api/me", { headers: { "x-install-id": id }, ip: freshIp() });
  assert.equal((await req("POST", "/api/report", { headers: { "x-install-id": id }, body: { styleId: "__proto__" } })).json.error, "BAD_STYLE");
  assert.equal((await req("POST", "/api/report", { headers: { "x-install-id": id }, body: { styleId: "x".repeat(5000) } })).json.error, "BAD_STYLE");
  for (let i = 0; i < 3; i++) {
    const r = await req("POST", "/api/report", { body: { installId: id, styleId: "boho", reason: "z".repeat(10000) } });
    assert.deepEqual(r.json, { ok: true });
  }
  const rows = peek2.prepare("SELECT style_id, reason FROM reports WHERE user_id = ?").all(id);
  assert.deepEqual(rows, [{ style_id: "boho", reason: "user_flag" }]);
});

await test("rate limit: unpaid install gets 429 with retryAfterSec and Retry-After", async () => {
  const id = uuid();
  const ip = freshIp();
  let last: Awaited<ReturnType<typeof req>> | null = null;
  for (let i = 0; i < 13; i++) {
    last = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: "short", styleId: "boho" }, ip });
  }
  assert.equal(last!.status, 429);
  assert.equal(last!.json.error, "RATE_LIMITED");
  assert.ok(Number.isInteger(last!.json.retryAfterSec) && last!.json.retryAfterSec > 0);
  assert.ok(Number(last!.headers.get("retry-after")) > 0);
});

await test("rate limit: paid install is allowed more than 12 per 10 min", async () => {
  const id = uuid();
  const ip = freshIp();
  await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: id, transaction_id: "GPA.rl" });
  for (let i = 0; i < 20; i++) {
    const r = await req("POST", "/api/redesign", { headers: { "x-install-id": id }, body: { image: "short", styleId: "boho" }, ip });
    assert.equal(r.status, 400, `request ${i + 1}`);
  }
});

await test("IPv6 /64 grouping expands compressed addresses", async () => {
  const { clientIp } = await import("../src/app.js");
  const g = (ip: string) => clientIp({ ip } as any);
  assert.equal(g("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(g("2001:db8:0:0:5:6:7:8"), "2001:db8:0:0::/64");
  assert.equal(g("2001:DB8:0000:0000::abcd"), "2001:db8:0:0::/64");
  assert.equal(g("2001:db8:1:2:3:4:5:6"), "2001:db8:1:2::/64");
  assert.equal(g("::1"), "0:0:0:0::/64");
  assert.equal(g("::ffff:203.0.113.5"), "203.0.113.5");
  assert.equal(g("64:ff9b::203.0.113.5"), "64:ff9b:0:0::/64");
  assert.equal(g("198.51.100.7"), "198.51.100.7");
});

server.close();
peek2.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed} checks passed (fake Gemini called ${calls} times)`);
process.exit(0);
