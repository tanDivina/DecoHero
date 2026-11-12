import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { buildPrompt } from "./styles.js";
import { describeError, generateRedesign, IMAGE_MODEL } from "./gemini.js";
import {
  addReport, getCredits, getOrCreateUser, grantPurchase, logGeneration, purgeOldIps,
  MAX_FREE_GENERATIONS_PER_DAY, MAX_GENERATIONS_PER_DAY, refundCredits, refundPurchase, reserveGeneration, spendCredits,
} from "./db.js";

// Map your Google Play product ids (Play Console + RevenueCat) to credit amounts.
const CREDIT_PACKS: Record<string, number> = {
  credits_15: 15,
  credits_50: 50,
  credits_150: 150,
};

const app = express();
app.disable("x-powered-by");
// Number of reverse proxies in front of the app (Railway/Render: 1). Wrong values either let clients
// spoof their IP (too high) or make every user share the proxy's IP (too low). See DEPLOY.md.
app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
// The phone sends a JPEG capped at 1280px (~1-2 MB as base64). Anything bigger is refused with 413.
app.use(express.json({ limit: "4mb" }));
// No CORS headers on purpose: the only client is the Android app, which doesn't need them,
// and leaving them out stops random websites from calling the API from a visitor's browser.

const INSTALL_ID = /^[a-f0-9-]{36}$/i;
/** Client IP; IPv6 is grouped by /64 because one connection usually owns a whole /64. */
const clientIp = (req: express.Request) => {
  const ip = (req.ip || "unknown").replace(/^::ffff:/, "");
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") + "::/64" : ip;
};

const limiter = (windowMs: number, limit: number, key: (req: express.Request) => string) =>
  rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    keyGenerator: key, message: { error: "RATE_LIMITED" },
  });
const byInstall = (req: express.Request) => {
  const id = req.body?.installId ?? req.query.installId;
  return typeof id === "string" && INSTALL_ID.test(id) ? `i:${id.toLowerCase()}` : `ip:${clientIp(req)}`;
};

app.use("/api", limiter(60_000, 30, clientIp));
// Image generation is the only route that costs money: tighter per-IP and per-install limits.
app.use("/api/redesign", limiter(10 * 60_000, 30, clientIp), limiter(10 * 60_000, 12, byInstall));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: IMAGE_MODEL });
});

app.get("/api/me", (req, res) => {
  const id = String(req.query.installId || "");
  if (!INSTALL_ID.test(id)) {
    res.status(400).json({ error: "BAD_INSTALL_ID" });
    return;
  }
  const user = getOrCreateUser(id, clientIp(req));
  res.json({ credits: user.credits, paid: !!user.paid });
});

async function watermark(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const size = Math.round(w * 0.032);
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <text x="${w - size}" y="${h - size}" text-anchor="end" font-family="sans-serif"
        font-size="${size}" font-weight="600" fill="white" fill-opacity="0.85"
        stroke="black" stroke-opacity="0.25" stroke-width="1">DecoHero</text>
    </svg>`
  );
  return sharp(img).composite([{ input: svg }]).toBuffer();
}

app.post("/api/redesign", async (req, res) => {
  const { installId, image, styleId } = req.body ?? {};
  if (typeof installId !== "string" || !INSTALL_ID.test(installId)) {
    res.status(400).json({ error: "BAD_INSTALL_ID" });
    return;
  }
  const prompt = typeof styleId === "string" ? buildPrompt(styleId) : null;
  if (!prompt) {
    res.status(400).json({ error: "BAD_STYLE" });
    return;
  }
  if (typeof image !== "string" || image.length < 1000) {
    res.status(400).json({ error: "BAD_IMAGE" });
    return;
  }

  // Normalise whatever the phone sent before touching credits: fix rotation, cap size, re-encode as JPEG.
  let input: Buffer;
  try {
    input = await sharp(Buffer.from(image, "base64"), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    res.status(400).json({ error: "BAD_IMAGE" });
    return;
  }

  const user = getOrCreateUser(installId, clientIp(req));
  if (!spendCredits(installId, 1)) {
    res.status(402).json({ error: "NO_CREDITS", credits: getCredits(installId) });
    return;
  }
  // Hard daily spend cap, checked after the credit so users without credits can't use up the cap.
  const cap = reserveGeneration(!!user.paid);
  if (cap !== "OK") {
    refundCredits(installId, 1);
    console.warn(`generation refused: ${cap}`);
    res.status(503).json({ error: cap, credits: getCredits(installId) });
    return;
  }

  try {
    let output = await generateRedesign(input.toString("base64"), prompt);
    if (!user.paid) output = await watermark(output);
    const jpeg = await sharp(output).jpeg({ quality: 86 }).toBuffer();

    logGeneration(installId, styleId, true);
    res.json({ image: jpeg.toString("base64"), credits: getCredits(installId) });
  } catch (err) {
    console.error(`redesign failed (${styleId}): ${describeError(err)}`);
    refundCredits(installId, 1);
    logGeneration(installId, styleId, false);
    res.status(502).json({ error: "GENERATION_FAILED", credits: getCredits(installId) });
  }
});

// Google Play's AI-generated content policy requires a way for users to flag outputs.
app.post("/api/report", (req, res) => {
  const { installId, styleId, reason } = req.body ?? {};
  if (typeof installId !== "string" || !INSTALL_ID.test(installId)) {
    res.status(400).json({ error: "BAD_INSTALL_ID" });
    return;
  }
  addReport(installId, typeof styleId === "string" ? styleId : null, String(reason ?? "user_flag"));
  res.json({ ok: true });
});

// RevenueCat → Integrations → Webhooks. Credits are granted here, never by the app itself.
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
    const credits = CREDIT_PACKS[event.product_id];
    // The app logs in to RevenueCat with its install id. If the event carries an anonymous RevenueCat id,
    // fall back to an install id among its aliases so the credits land on an account the app can read.
    const candidates = [event.app_user_id, event.original_app_user_id, ...(Array.isArray(event.aliases) ? event.aliases : [])];
    const userId = candidates.find((c): c is string => typeof c === "string" && INSTALL_ID.test(c));
    if (!credits) {
      console.warn(`purchase ${event.id}: unknown product ${String(event.product_id)}, ignored`);
    } else if (!userId) {
      console.warn(`purchase ${event.id}: no install id in app_user_id/aliases (${String(event.app_user_id)}), not credited`);
    } else {
      const granted = grantPurchase(event.id, userId, event.product_id, credits, transactionIds[0] ?? null);
      console.log(`purchase ${event.id}: ${event.product_id} -> ${userId} (granted=${granted}, ${event.environment ?? "?"})`);
    }
  } else if (event.type === "CANCELLATION" && transactionIds.length) {
    // For one-time purchases RevenueCat sends CANCELLATION when Google refunds the order.
    const removed = refundPurchase(transactionIds);
    console.log(`refund ${event.id}: ${event.product_id} (${event.cancel_reason ?? "?"}) removed=${removed ?? "no matching purchase"}`);
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

// Retention: blank stored IPs older than 48 h, at startup and then hourly.
const runIpPurge = () => {
  try {
    const n = purgeOldIps();
    if (n) console.log(`retention: cleared ip on ${n} users older than 48h`);
  } catch (err) {
    console.error(`retention purge failed: ${describeError(err)}`);
  }
};
runIpPurge();
setInterval(runIpPurge, 60 * 60 * 1000).unref();

if (!process.env.REVENUECAT_WEBHOOK_SECRET) console.warn("REVENUECAT_WEBHOOK_SECRET is not set: purchases will be rejected");
const port = Number(process.env.PORT || 8080);
app.listen(port, () =>
  console.log(
    `DecoHero API on :${port} using ${IMAGE_MODEL}; daily caps ${MAX_GENERATIONS_PER_DAY} total / ${MAX_FREE_GENERATIONS_PER_DAY} free`
  )
);
