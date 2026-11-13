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
// Web sign-in is tested with an injected verifier; no Firebase project, no network.
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.WEB_ORIGINS;
delete process.env.NODE_ENV;

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

// Stand-in for firebase-admin: "good:<uid>" is a valid token for that uid, anything else is rejected.
const fakeVerify = async (token: string) => {
  if (!token.startsWith("good:")) throw new Error("bad token");
  return { uid: token.slice(5) };
};
const server = createApp(fakeGenerate, "fake-model", { verifyIdToken: fakeVerify }).listen(0);
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
  assert.deepEqual(r.json, { userId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", credits: 7, paid: false, freeDenied: false });
});

await test("install id: header, v1 query, case-insensitive, bad shapes rejected", async () => {
  const id = uuid();
  const ip = freshIp();
  const a = await req("GET", "/api/me", { headers: { "x-install-id": id.toUpperCase() }, ip });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { userId: id, credits: 3, paid: false, freeDenied: false });
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
  assert.deepEqual(r3.json, { userId: deniedId, credits: 0, paid: false, freeDenied: true });
  // Buying credits clears freeDenied.
  const w = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: deniedId, transaction_id: "GPA.deny-1" });
  assert.equal(w.status, 200);
  const r4 = await req("GET", "/api/me", { headers: { "x-install-id": deniedId }, ip });
  assert.deepEqual(r4.json, { userId: deniedId, credits: 15, paid: true, freeDenied: false });
});

await test("webhook: auth, purchase, duplicate event, duplicate transaction, suffixed product id", async () => {
  const id = uuid();
  assert.equal((await webhook({ id: "e0", type: "NON_RENEWING_PURCHASE" }, "Bearer wrong-secret")).status, 401);
  const evt = { id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_50", app_user_id: id.toUpperCase(), transaction_id: "GPA.1" };
  assert.equal((await webhook(evt)).status, 200);
  assert.equal((await webhook(evt)).status, 200); // RevenueCat retry: same event id
  assert.equal((await webhook({ ...evt, id: uuid() })).status, 200); // same transaction, new event id
  let me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.deepEqual(me.json, { userId: id, credits: 50, paid: true, freeDenied: false });
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
  assert.deepEqual(me.json, { userId: id, credits: 50, paid: true, freeDenied: false });
  // Spend most of the balance, then refund the 50 pack: balance floors at 0 and the install is unpaid again.
  peek.close();
  const rw = new Database(process.env.DB_PATH!);
  rw.prepare("UPDATE users SET credits = 10 WHERE id = ?").run(id);
  rw.close();
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_50:x", transaction_id: "GPA.r2" });
  me = await req("GET", "/api/me", { headers: { "x-install-id": id } });
  assert.deepEqual(me.json, { userId: id, credits: 0, paid: false, freeDenied: false });
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

const WEB = "https://deco.hero-apps.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const web = (uid: string, extra: Record<string, string> = {}) => ({ origin: WEB, authorization: `Bearer good:${uid}`, ...extra });
const corsHeaders = (h: Headers) => [...h.keys()].filter((k) => k.startsWith("access-control-"));

await test("web: valid token creates a user with free credits and returns userId; same uid, same user", async () => {
  const ip = freshIp();
  const a = await req("GET", "/api/me", { headers: web("uid-alice"), ip });
  assert.equal(a.status, 200);
  assert.match(a.json.userId, UUID_RE);
  assert.deepEqual(a.json, { userId: a.json.userId, credits: 3, paid: false, freeDenied: false });
  assert.equal(a.headers.get("access-control-allow-origin"), WEB);
  assert.match(a.headers.get("vary") ?? "", /origin/i);
  // Same uid from another IP and without an Origin header (not a browser): still the same user.
  const b = await req("GET", "/api/me", { headers: { authorization: "Bearer good:uid-alice" }, ip: freshIp() });
  assert.equal(b.json.userId, a.json.userId);
  assert.equal(b.headers.get("access-control-allow-origin"), null);
  const other = await req("GET", "/api/me", { headers: web("uid-bob"), ip: freshIp() });
  assert.notEqual(other.json.userId, a.json.userId);
  assert.deepEqual(peek2.prepare("SELECT firebase_uid, user_id FROM web_accounts WHERE firebase_uid = 'uid-alice'").all(), [
    { firebase_uid: "uid-alice", user_id: a.json.userId },
  ]);
  const cols = (peek2.prepare("PRAGMA table_info(web_accounts)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cols, ["firebase_uid", "user_id", "created_at"], "no email or name column");
});

await test("web: X-Install-Id and body installId are ignored on Bearer requests", async () => {
  const installId = uuid();
  const ip = freshIp();
  const me = await req("GET", `/api/me?installId=${installId}`, { headers: web("uid-carol", { "x-install-id": installId }), ip });
  assert.notEqual(me.json.userId, installId);
  assert.equal(peek2.prepare("SELECT 1 FROM users WHERE id = ?").get(installId), undefined);
  const r = await req("POST", "/api/redesign", { headers: web("uid-carol", { "x-install-id": installId }), body: { installId, image: jpeg, styleId: "boho" }, ip });
  assert.equal(r.status, 200);
  assert.equal(r.json.credits, 2);
  assert.equal((await req("GET", "/api/me", { headers: web("uid-carol") })).json.credits, 2);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((peek2.prepare("SELECT COUNT(*) n FROM generations WHERE user_id = ? AND ok = 1").get(me.json.userId) as any).n, 1);
  assert.deepEqual((await req("POST", "/api/report", { headers: web("uid-carol"), body: { styleId: "boho" } })).json, { ok: true });
});

await test("web: bad, malformed and empty tokens get 401 AUTH_INVALID and create nothing", async () => {
  const before = (peek2.prepare("SELECT COUNT(*) n FROM users").get() as any).n;
  for (const authorization of ["Bearer nope", "Bearer ", "Bearer", "Basic good:uid-x", "good:uid-x", "Bearer good:uid-x extra"]) {
    const r = await req("GET", "/api/me", { headers: { origin: WEB, authorization, "x-install-id": uuid() } });
    assert.equal(r.status, 401, authorization);
    assert.deepEqual(r.json, { error: "AUTH_INVALID" }, authorization);
    assert.equal(r.headers.get("access-control-allow-origin"), WEB, "the browser can read the error");
  }
  const post = await req("POST", "/api/redesign", { headers: { authorization: "Bearer nope" }, body: { image: jpeg, styleId: "boho" } });
  assert.deepEqual([post.status, post.json], [401, { error: "AUTH_INVALID" }]);
  assert.equal((peek2.prepare("SELECT COUNT(*) n FROM users").get() as any).n, before);
});

await test("web: allowed origin without a token gets 401 AUTH_REQUIRED, also with an install id", async () => {
  const id = uuid();
  for (const origin of [WEB, "http://localhost:8081", "http://localhost:19006"]) {
    const r = await req("GET", "/api/me", { headers: { origin, "x-install-id": id } });
    assert.deepEqual([r.status, r.json], [401, { error: "AUTH_REQUIRED" }], origin);
    assert.equal(r.headers.get("access-control-allow-origin"), origin);
  }
  const post = await req("POST", "/api/redesign", { headers: { origin: WEB }, body: { installId: id, image: jpeg, styleId: "boho" } });
  assert.deepEqual([post.status, post.json], [401, { error: "AUTH_REQUIRED" }]);
  assert.equal(peek2.prepare("SELECT 1 FROM users WHERE id = ?").get(id), undefined);
});

await test("CORS: preflight from an allowed origin gets 204 and the headers, before the rate limiters", async () => {
  for (const p of ["/api/me", "/api/redesign", "/api/account/delete"]) {
    const r = await req("OPTIONS", p, { headers: { origin: WEB, "access-control-request-method": "POST", "access-control-request-headers": "authorization,content-type" } });
    assert.equal(r.status, 204, p);
    assert.equal(r.headers.get("access-control-allow-origin"), WEB);
    assert.equal(r.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
    assert.equal(r.headers.get("access-control-allow-headers"), "Authorization, Content-Type");
    assert.match(r.headers.get("vary") ?? "", /origin/i);
    assert.equal(r.headers.get("ratelimit-limit"), null, "not counted by a rate limiter");
  }
});

await test("CORS: no headers for other origins, for no origin, or on /webhooks", async () => {
  for (const origin of ["https://evil.example", "https://deco.hero-apps.com.evil.example", "http://deco.hero-apps.com", "null"]) {
    const pre = await req("OPTIONS", "/api/redesign", { headers: { origin, "access-control-request-method": "POST" } });
    assert.deepEqual(corsHeaders(pre.headers), [], `preflight ${origin}`);
    assert.notEqual(pre.status, 204);
    const get = await req("GET", "/api/me", { headers: { origin, "x-install-id": uuid() }, ip: freshIp() });
    assert.deepEqual(corsHeaders(get.headers), [], `GET ${origin}`);
  }
  const android = await req("GET", "/api/me", { headers: { "x-install-id": uuid() }, ip: freshIp() });
  assert.deepEqual(corsHeaders(android.headers), []);
  assert.equal(android.headers.get("vary"), null);
  const pre = await req("OPTIONS", "/webhooks/revenuecat", { headers: { origin: WEB, "access-control-request-method": "POST" } });
  assert.deepEqual(corsHeaders(pre.headers), []);
  const hook = await req("POST", "/webhooks/revenuecat", { body: { event: { id: uuid(), type: "TEST" } }, headers: { origin: WEB, authorization: "Bearer test-secret" } });
  assert.equal(hook.status, 200);
  assert.deepEqual(corsHeaders(hook.headers), []);
  assert.deepEqual(corsHeaders((await req("GET", "/health", { headers: { origin: WEB } })).headers), []);
});

await test("web: the RevenueCat webhook credits a web userId unchanged, and refunds it", async () => {
  const { userId } = (await req("GET", "/api/me", { headers: web("uid-dave"), ip: freshIp() })).json;
  const w = await webhook({ id: uuid(), type: "NON_RENEWING_PURCHASE", product_id: "credits_50", app_user_id: userId, transaction_id: "rcb.web-1", store: "RC_BILLING" });
  assert.equal(w.status, 200);
  assert.deepEqual((await req("GET", "/api/me", { headers: web("uid-dave") })).json, { userId, credits: 53, paid: true, freeDenied: false });
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_50", transaction_id: "rcb.web-1" });
  assert.deepEqual((await req("GET", "/api/me", { headers: web("uid-dave") })).json, { userId, credits: 3, paid: false, freeDenied: false });
});

await test("web: new accounts count toward the per-IP new-user limit", async () => {
  const ip = freshIp();
  assert.equal((await req("GET", "/api/me", { headers: web("uid-ip-1"), ip })).json.credits, 3);
  assert.equal((await req("GET", "/api/me", { headers: { "x-install-id": uuid() }, ip })).json.credits, 3);
  const third = await req("GET", "/api/me", { headers: web("uid-ip-3"), ip });
  assert.deepEqual([third.json.credits, third.json.freeDenied], [0, true]);
});

await test("web: rate limit is keyed on the resolved user, not on the IP or a sent install id", async () => {
  const ip = freshIp();
  let last: Awaited<ReturnType<typeof req>> | null = null;
  for (let i = 0; i < 13; i++) {
    // A different X-Install-Id every time must not dodge the per-user limit.
    last = await req("POST", "/api/redesign", { headers: web("uid-erin", { "x-install-id": uuid() }), body: { image: "short", styleId: "boho" }, ip });
  }
  assert.deepEqual([last!.status, last!.json.error], [429, "RATE_LIMITED"]);
  assert.equal(last!.headers.get("access-control-expose-headers"), "Retry-After");
  const other = await req("POST", "/api/redesign", { headers: web("uid-frank"), body: { image: "short", styleId: "boho" }, ip });
  assert.equal(other.status, 400, "another user on the same IP is not limited");
});

await test("web: account delete removes the account and its records, keeps purchases unlinked", async () => {
  const ip = freshIp();
  const { userId } = (await req("GET", "/api/me", { headers: web("uid-gone"), ip })).json;
  await webhook({ id: "evt-gone", type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: userId, transaction_id: "rcb.gone-1" });
  assert.equal((await req("POST", "/api/redesign", { headers: web("uid-gone"), body: { image: jpeg, styleId: "boho" }, ip })).status, 200);
  await req("POST", "/api/report", { headers: web("uid-gone"), body: { styleId: "boho" } });
  await new Promise((r) => setTimeout(r, 50));

  // Bearer only: an install id (Android) or no token cannot delete anything.
  const android = await req("POST", "/api/account/delete", { headers: { "x-install-id": userId } });
  assert.deepEqual([android.status, android.json], [401, { error: "AUTH_REQUIRED" }]);
  assert.equal((await req("POST", "/api/account/delete", { headers: { origin: WEB } })).json.error, "AUTH_REQUIRED");
  assert.equal((await req("POST", "/api/account/delete", { headers: { authorization: "Bearer nope" } })).json.error, "AUTH_INVALID");
  assert.equal((await req("GET", "/api/me", { headers: web("uid-gone") })).json.credits, 17);

  const del = await req("POST", "/api/account/delete", { headers: web("uid-gone") });
  assert.deepEqual([del.status, del.json], [200, { ok: true }]);
  const count = (sql: string, ...args: string[]) => (peek2.prepare(sql).get(...args) as { n: number }).n;
  assert.equal(count("SELECT COUNT(*) n FROM web_accounts WHERE firebase_uid = 'uid-gone' OR user_id = ?", userId), 0);
  assert.equal(count("SELECT COUNT(*) n FROM users WHERE id = ?", userId), 0);
  assert.equal(count("SELECT COUNT(*) n FROM generations WHERE user_id = ?", userId), 0);
  assert.equal(count("SELECT COUNT(*) n FROM reports WHERE user_id = ?", userId), 0);
  assert.equal(count("SELECT COUNT(*) n FROM purchases WHERE user_id = ?", userId), 0);
  assert.deepEqual(peek2.prepare("SELECT user_id, credits FROM purchases WHERE transaction_id = 'rcb.gone-1'").get(), { user_id: "deleted", credits: 15 });

  // A webhook retry or a refund for the old purchase does not bring the user back.
  await webhook({ id: "evt-gone", type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: userId, transaction_id: "rcb.gone-1" });
  await webhook({ id: uuid(), type: "CANCELLATION", product_id: "credits_15", transaction_id: "rcb.gone-1" });
  assert.equal(count("SELECT COUNT(*) n FROM users WHERE id = ? OR id = 'deleted'", userId), 0);

  // Signing in again starts a new, empty account; a second delete on it is fine too.
  const again = await req("GET", "/api/me", { headers: web("uid-gone"), ip });
  assert.notEqual(again.json.userId, userId);
  assert.deepEqual([again.json.credits, again.json.paid], [3, false]);
  assert.equal((await req("POST", "/api/account/delete", { headers: web("uid-gone") })).status, 200);
  assert.equal((await req("POST", "/api/account/delete", { headers: web("uid-gone") })).status, 200);
});

await test("web disabled: without FIREBASE_PROJECT_ID Bearer requests get 503 WEB_DISABLED; Android still works", async () => {
  const s = createApp(fakeGenerate, "fake-model").listen(0);
  await new Promise((r) => s.once("listening", r));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  const r = await fetch(`${b}/api/me`, { headers: { origin: WEB, authorization: "Bearer good:uid-alice" } });
  assert.deepEqual([r.status, await r.json()], [503, { error: "WEB_DISABLED" }]);
  const id = uuid();
  const a = await fetch(`${b}/api/me`, { headers: { "x-install-id": id, "x-forwarded-for": freshIp() } });
  assert.deepEqual([a.status, await a.json()], [200, { userId: id, credits: 3, paid: false, freeDenied: false }]);
  s.close();
});

await test("WEB_ORIGINS replaces the default list; localhost origins are off in production", async () => {
  process.env.WEB_ORIGINS = "https://one.example, https://two.example/";
  process.env.NODE_ENV = "production";
  const s = createApp(fakeGenerate, "fake-model", { verifyIdToken: fakeVerify }).listen(0);
  delete process.env.WEB_ORIGINS;
  delete process.env.NODE_ENV;
  await new Promise((r) => s.once("listening", r));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  const pre = (origin: string) => fetch(`${b}/api/me`, { method: "OPTIONS", headers: { origin, "access-control-request-method": "GET" } });
  for (const origin of ["https://one.example", "https://two.example"]) {
    const r = await pre(origin);
    assert.deepEqual([r.status, r.headers.get("access-control-allow-origin")], [204, origin]);
  }
  for (const origin of [WEB, "http://localhost:8081", "http://localhost:19006"]) {
    const r = await pre(origin);
    assert.deepEqual(corsHeaders(r.headers), [], origin);
  }
  s.close();
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
