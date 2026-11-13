import crypto from "node:crypto";
import net from "node:net";
import express from "express";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { buildPrompt, isStyle } from "./styles.js";
import { describeError } from "./gemini.js";
import { watermark } from "./watermark.js";
import {
  addReport, failuresToday, getCredits, getOrCreateUser, getUser, grantPurchase, logGeneration,
  MAX_FAILURES_PER_INSTALL_PER_DAY, refundCredits, refundPurchase, releaseGeneration, reserveGeneration,
  spendCredits, utcDay,
} from "./db.js";

// Map your Google Play product ids (Play Console + RevenueCat) to credit amounts.
const CREDIT_PACKS: Record<string, number> = {
  credits_15: 15,
  credits_50: 50,
  credits_150: 150,
};
/** RevenueCat may send "credits_15:some-base-plan"; only the part before ":" is the product. */
const packFor = (productId: unknown) => {
  const id = String(productId ?? "").split(":")[0];
  return { id, credits: Object.hasOwn(CREDIT_PACKS, id) ? CREDIT_PACKS[id] : undefined };
};

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return process.env[name] && Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lowercased install id, or null if the value is not a UUID. */
export const normaliseInstallId = (v: unknown): string | null =>
  typeof v === "string" && UUID.test(v) ? v.toLowerCase() : null;

/**
 * Install id from the X-Install-Id header (current app), falling back to the JSON body or the
 * ?installId= query string that version 1.0.0 of the app sends. Null if missing or not a UUID.
 */
const installIdOf = (req: express.Request): string | null => {
  const header = req.get("x-install-id");
  if (header !== undefined) return normaliseInstallId(header.trim());
  const body = req.body?.installId;
  if (body !== undefined) return normaliseInstallId(body);
  return normaliseInstallId(req.query.installId);
};

/** Expands an IPv6 address (including "::" and an embedded IPv4 tail) to 8 hextets. */
function ipv6Hextets(ip: string): string[] | null {
  let addr = ip.split("%")[0].toLowerCase();
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    if (!net.isIPv4(v4[1])) return null;
    const [a, b, c, d] = v4[1].split(".").map(Number);
    addr = addr.slice(0, -v4[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  return all.map((h) => parseInt(h || "0", 16).toString(16));
}

/** Client IP; IPv6 is grouped by /64 because one connection usually owns a whole /64. */
export const clientIp = (req: express.Request) => {
  const ip = (req.ip || "unknown").replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  if (!ip.includes(":")) return ip;
  const hextets = ipv6Hextets(ip);
  return hextets ? hextets.slice(0, 4).join(":") + "::/64" : ip.toLowerCase();
};

const limiter = (
  windowMs: number,
  limit: number | ((req: express.Request) => number),
  key: (req: express.Request) => string
) =>
  rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false, keyGenerator: key,
    // Retry-After is set by express-rate-limit; the body carries the same value for the app.
    handler: (req, res) => {
      const reset = (req as express.Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
      const retryAfterSec = Math.max(1, reset ? Math.ceil((reset.getTime() - Date.now()) / 1000) : Math.ceil(windowMs / 1000));
      res.status(429).json({ error: "RATE_LIMITED", retryAfterSec });
    },
  });
const byInstall = (req: express.Request) => {
  const id = installIdOf(req);
  return id ? `i:${id}` : `ip:${clientIp(req)}`;
};

const API_PER_IP_PER_MIN = envInt("API_LIMIT_PER_IP_PER_MIN", 120);
const REDESIGN_PER_IP = envInt("REDESIGN_LIMIT_PER_IP_PER_10MIN", 60);
const REDESIGN_PER_INSTALL_FREE = envInt("REDESIGN_LIMIT_PER_INSTALL_PER_10MIN", 12);
const REDESIGN_PER_INSTALL_PAID = envInt("REDESIGN_LIMIT_PER_PAID_INSTALL_PER_10MIN", 40);

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type Generate = (imageJpegBase64: string, prompt: string) => Promise<Buffer>;

export function createApp(generate: Generate, model: string) {
  const app = express();
  app.disable("x-powered-by");
  // Number of reverse proxies in front of the app (Railway/Render: 1). Wrong values either let clients
  // spoof their IP (too high) or make every user share the proxy's IP (too low). See DEPLOY.md.
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
  // The phone sends a JPEG capped at 1280px (~1-2 MB as base64). Anything bigger is refused with 413.
  app.use(express.json({ limit: "4mb" }));
  // No CORS headers on purpose: the only client is the Android app, which doesn't need them,
  // and leaving them out stops random websites from calling the API from a visitor's browser.

  // Per-IP limits are generous because carrier-grade NAT puts many phones behind one IP.
  app.use("/api", limiter(60_000, API_PER_IP_PER_MIN, clientIp));
  // Image generation is the only route that costs money: tighter per-IP and per-install limits.
  // Paying installs get a higher per-install limit.
  app.use(
    "/api/redesign",
    limiter(10 * 60_000, REDESIGN_PER_IP, clientIp),
    limiter(10 * 60_000, (req) => {
      const id = installIdOf(req);
      return id && getUser(id)?.paid ? REDESIGN_PER_INSTALL_PAID : REDESIGN_PER_INSTALL_FREE;
    }, byInstall)
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, model });
  });

  app.get("/api/me", (req, res) => {
    const id = installIdOf(req);
    if (!id) {
      res.status(400).json({ error: "BAD_INSTALL_ID" });
      return;
    }
    const user = getOrCreateUser(id, clientIp(req));
    res.json({ credits: user.credits, paid: !!user.paid, freeDenied: !!user.free_denied && !user.paid });
  });

  app.post("/api/redesign", async (req, res) => {
    const installId = installIdOf(req);
    const { image, styleId } = req.body ?? {};
    if (!installId) {
      res.status(400).json({ error: "BAD_INSTALL_ID" });
      return;
    }
    const prompt = isStyle(styleId) ? buildPrompt(styleId) : null;
    if (!prompt) {
      res.status(400).json({ error: "BAD_STYLE" });
      return;
    }
    if (typeof image !== "string" || image.length < 1000) {
      res.status(400).json({ error: "BAD_IMAGE" });
      return;
    }

    // Normalise whatever the phone sent before touching credits: check the type, fix rotation, cap size,
    // re-encode as JPEG.
    let input: Buffer;
    try {
      const raw = Buffer.from(image, "base64");
      const meta = await sharp(raw, { limitInputPixels: 40_000_000 }).metadata();
      if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new Error("format");
      input = await sharp(raw, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      res.status(400).json({ error: "BAD_IMAGE" });
      return;
    }

    const user = getOrCreateUser(installId, clientIp(req));
    // Stops one install from burning daily slots and our money through endless failures or dropped connections.
    if (failuresToday(installId) >= MAX_FAILURES_PER_INSTALL_PER_DAY) {
      res.status(429).json({ error: "TOO_MANY_FAILURES", credits: getCredits(installId) });
      return;
    }
    if (!spendCredits(installId, 1)) {
      res.status(402).json({ error: "NO_CREDITS", credits: getCredits(installId) });
      return;
    }

    // From here on the credit is refunded at most once: on failure, on a refused cap, or when the client
    // disconnects before the response was fully written.
    let settled = false;
    const refundOnce = () => {
      if (settled) return false;
      settled = true;
      refundCredits(installId, 1);
      return true;
    };
    let logged = false;
    const logOnce = (ok: boolean) => {
      if (logged) return;
      logged = true;
      logGeneration(installId, styleId, ok);
    };
    let sent = false;
    res.on("close", () => {
      if (res.writableFinished) {
        if (sent) logOnce(true);
        return;
      }
      if (refundOnce()) {
        // Logged as not ok, so it counts toward the per-install daily failure cap.
        logOnce(false);
        console.warn(`redesign (${styleId}): client disconnected before the response finished, credit refunded`);
      }
    });

    // Hard daily spend cap, checked after the credit so users without credits can't use up the cap.
    const day = utcDay();
    const cap = reserveGeneration(!!user.paid, day);
    if (cap !== "OK") {
      refundOnce();
      console.warn(`generation refused: ${cap}`);
      res.status(503).json({ error: cap, credits: getCredits(installId) });
      return;
    }

    let produced = false;
    try {
      let output = await generate(input.toString("base64"), prompt);
      produced = true;
      if (!user.paid) output = await watermark(output);
      const jpeg = await sharp(output).jpeg({ quality: 86 }).toBuffer();

      // Logged as ok once the response has been fully written (see the close handler above).
      sent = true;
      res.json({ image: jpeg.toString("base64"), credits: getCredits(installId) });
    } catch (err) {
      console.error(`redesign failed (${styleId}): ${describeError(err)}`);
      refundOnce();
      // No image came back (refusal, API error, timeout): the call cost us next to nothing, so the
      // daily slot goes back too. If an image was produced and a later step failed, the slot stays used.
      if (!produced) releaseGeneration(!!user.paid, day);
      logOnce(false);
      if (!res.headersSent) res.status(502).json({ error: "GENERATION_FAILED", credits: getCredits(installId) });
    }
  });

  // Google Play's AI-generated content policy requires a way for users to flag outputs.
  app.post("/api/report", (req, res) => {
    const installId = installIdOf(req);
    const { styleId } = req.body ?? {};
    if (!installId) {
      res.status(400).json({ error: "BAD_INSTALL_ID" });
      return;
    }
    if (!isStyle(styleId)) {
      res.status(400).json({ error: "BAD_STYLE" });
      return;
    }
    if (!getUser(installId)) {
      res.status(404).json({ error: "UNKNOWN_INSTALL" });
      return;
    }
    // The reason is fixed: the app has no free-text field, and nothing a client sends is stored here.
    addReport(installId, styleId, "user_flag");
    res.json({ ok: true });
  });

  // RevenueCat > Integrations > Webhooks. Credits are granted here, never by the app itself.
  app.post("/webhooks/revenuecat", (req, res) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const expected = Buffer.from(`Bearer ${secret}`);
    const given = Buffer.from(req.get("authorization") ?? "");
    if (!secret || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      res.status(401).end();
      return;
    }
    const event = req.body?.event;
    if (!event || typeof event.id !== "string") {
      res.status(400).end();
      return;
    }
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    const transactionIds = [str(event.transaction_id), str(event.original_transaction_id)].filter((v): v is string => !!v);

    if (event.type === "NON_RENEWING_PURCHASE" || event.type === "INITIAL_PURCHASE") {
      const pack = packFor(event.product_id);
      // The app logs in to RevenueCat with its install id. If the event carries an anonymous RevenueCat id,
      // fall back to an install id among its aliases so the credits land on an account the app can read.
      const candidates = [event.app_user_id, event.original_app_user_id, ...(Array.isArray(event.aliases) ? event.aliases : [])];
      const userId = candidates.map(normaliseInstallId).find((c): c is string => !!c);
      // A purchase we cannot credit answers 5xx so RevenueCat retries it; fix the pack table or the data, and
      // the retry goes through.
      if (pack.credits === undefined) {
        console.error(`purchase ${event.id}: NOT CREDITED, unknown product ${pack.id.slice(0, 100)} (RevenueCat will retry)`);
        res.status(500).json({ error: "UNKNOWN_PRODUCT" });
        return;
      }
      if (!userId) {
        console.error(`purchase ${event.id}: NOT CREDITED, no install id in app_user_id/aliases (RevenueCat will retry)`);
        res.status(500).json({ error: "NO_INSTALL_ID" });
        return;
      }
      const granted = grantPurchase(event.id, userId, pack.id, pack.credits, transactionIds[0] ?? null);
      console.log(`purchase ${event.id}: ${pack.id} -> ${userId} (granted=${granted}, ${event.environment ?? "?"})`);
    } else if (event.type === "CANCELLATION" && transactionIds.length) {
      // For one-time purchases RevenueCat sends CANCELLATION when Google refunds the order.
      const removed = refundPurchase(transactionIds);
      console.log(`refund ${event.id}: ${packFor(event.product_id).id} (${event.cancel_reason ?? "?"}) removed=${removed ?? "no matching purchase"}`);
    }
    res.status(200).json({ ok: true });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND" });
  });

  // Last-resort handler: bad JSON, oversized bodies, unexpected throws. Never send stack traces.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err?.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(`unhandled: ${describeError(err)}`);
    res.status(status).json({ error: status === 413 ? "TOO_LARGE" : status === 500 ? "SERVER_ERROR" : "BAD_REQUEST" });
  });

  return app;
}
