import crypto from "node:crypto";
import net from "node:net";
import express from "express";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { buildPrompt, flagOn, isStyle, isTreeStyle, parseTreeSize } from "./styles.js";
import { describeError } from "./gemini.js";
import { watermark } from "./watermark.js";
import { looksLikeAmazon, shopLinks } from "./shopLinks.js";
import { PARTNER_ORIGIN, treeCatalog } from "./treeCatalog.js";
import { drawMarker, markerLeaked, parsePlace } from "./marker.js";
import {
  addDesign, addReport, claimFreeMove, failuresToday, getCredits, getOrCreateUser, getUser, grantPurchase, logGeneration,
  MAX_FAILURES_PER_INSTALL_PER_DAY, ownsDesign, refundCredits, refundPurchase, releaseFreeMove, releaseGeneration,
  removeDesign, reserveGeneration, spendCredits, utcDay,
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

/** The partner store for real trees; TREE_SHOP_URL replaces it with the affiliate link once there is one. */
export const DEFAULT_TREE_SHOP_URL = PARTNER_ORIGIN;
const OFF = new Set(["", "0", "off", "false", "none"]);
const isOff = (v: string | undefined) => v !== undefined && OFF.has(v.trim().toLowerCase());

/**
 * Link behind the app's "Buy a real tree" button. Unset: the store's homepage. Empty or "off": no button.
 * Anything that is not an https URL (or that points to Amazon) is refused (the app would open it as is), and the homepage is used.
 */
function treeShopUrl(): string {
  const raw = process.env.TREE_SHOP_URL;
  if (raw === undefined) return DEFAULT_TREE_SHOP_URL;
  if (isOff(raw)) return "";
  try {
    const url = new URL(raw.trim());
    // The tree button is always shown as a partner link, so it may never point to Amazon (see shopLinks.ts).
    if (url.protocol === "https:" && !looksLikeAmazon(url.hostname.toLowerCase().replace(/\.$/, ""))) return url.toString();
  } catch {}
  console.warn("TREE_SHOP_URL is not a valid https partner URL; using the store homepage instead");
  return DEFAULT_TREE_SHOP_URL;
}

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type Generate = (imageJpegBase64: string, prompt: string) => Promise<Buffer>;
/** Two JPEGs and a yes/no question for a cheap vision model; rejects when there is no clear answer. */
export type AskYesNo = (firstJpegBase64: string, secondJpegBase64: string, question: string) => Promise<boolean>;

// Door check (DOOR_CHECK=on): the question asked about the user's photo (first) and the design (second).
const DOOR_QUESTION =
  "Is any door or doorway that is visible in the first image hidden, removed or changed in the second? Answer only yes or no.";
// The user tapped the spot, so a door partly behind the tree is their choice; a door that is gone or redrawn is not.
const DOOR_QUESTION_MARKED =
  "The second image is the first image with a Christmas tree added at a spot the user chose. Is any door or doorway that is " +
  "visible in the first image removed or changed in the second? A door that is only partly behind the tree does not count. " +
  "Answer only yes or no.";
const DOOR_CHECK_TIMEOUT_MS = 30_000;

export function createApp(generate: Generate, model: string, extras: { askYesNo?: AskYesNo } = {}) {
  const app = express();
  // Since the last restart; printed with every flagged or failed door check. No install ids, no IPs.
  const doorStats = { checked: 0, flagged: 0, retried: 0, fixed: 0, errors: 0 };
  const forCheck = (img: Buffer) =>
    sharp(img).resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  /** true = a door was hidden, removed or changed; false = doors are fine; null = the check itself failed. */
  async function doorChanged(original: Buffer, design: Buffer, marked: boolean): Promise<boolean | null> {
    doorStats.checked++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const [a, b] = await Promise.all([forCheck(original), forCheck(design)]);
      return await Promise.race([
        extras.askYesNo!(a.toString("base64"), b.toString("base64"), marked ? DOOR_QUESTION_MARKED : DOOR_QUESTION),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("door check timed out")), DOOR_CHECK_TIMEOUT_MS); }),
      ]);
    } catch (err) {
      doorStats.errors++;
      console.warn(`door check failed, design served unchecked: ${describeError(err)}; totals ${JSON.stringify(doorStats)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
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

  // Things the app reads at start so they can change without a new release. Read per request: no secrets here.
  app.get("/api/config", (_req, res) => {
    // shopLinks (app 1.0.4+): decor links per Christmas theme, both languages. Older apps ignore the field.
    // treeCatalog (app 1.0.5+): the partner's trees with prices; product links carry TREE_SHOP_URL's affiliate parameters.
    const shopUrl = treeShopUrl();
    res.json({
      christmas: !isOff(process.env.CHRISTMAS_MODE), treeShopUrl: shopUrl, shopLinks: shopLinks(), treeCatalog: treeCatalog(shopUrl),
      // treeClear (app 1.0.6+): the clearing rule is on, so the app says a plant or lamp on the spot is taken out.
      treeClear: flagOn("TREE_CLEAR"),
    });
  });

  app.post("/api/redesign", async (req, res) => {
    const installId = installIdOf(req);
    const { image, styleId, ceilingCm, treeCm, place: rawPlace, moveOf } = req.body ?? {};
    if (!installId) {
      res.status(400).json({ error: "BAD_INSTALL_ID" });
      return;
    }
    if (!isStyle(styleId)) {
      res.status(400).json({ error: "BAD_STYLE" });
      return;
    }
    // Sizes only exist for Christmas styles; interior styles (and older app versions) never look at them.
    // The species named in the prompt comes from the catalogue, never from the request.
    const tree = isTreeStyle(styleId);
    const size = tree ? parseTreeSize(ceilingCm, treeCm, treeCatalog("")) : {};
    if (!size) {
      res.status(400).json({ error: "BAD_SIZE" });
      return;
    }
    // Optional spot the user tapped for the tree (app 1.0.5+), Christmas styles only.
    const place = tree ? parsePlace(rawPlace) : undefined;
    if (place === null) {
      res.status(400).json({ error: "BAD_PLACE" });
      return;
    }
    // TREE_CLEAR=on lets the model take a plant, lamp or small table off the tree's spot; off keeps the 1.0.5 wording.
    const clear = tree && flagOn("TREE_CLEAR");
    const prompt = buildPrompt(styleId, size, place ?? false, { clear });
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
    // What the model gets: the photo itself, or a copy with the placement marker drawn on it.
    let sentToModel: Buffer;
    try {
      const raw = Buffer.from(image, "base64");
      const meta = await sharp(raw, { limitInputPixels: 40_000_000 }).metadata();
      if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new Error("format");
      input = await sharp(raw, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      sentToModel = place ? await drawMarker(input, place) : input;
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
    // "Move tree" (app 1.0.6+): `moveOf` names the design being moved. Its first move is free when the design
    // belongs to this install, has this style and the request carries a new spot. Anything else (unknown, expired
    // or foreign id, a second move, no spot, not a UUID) is simply a normal design that costs 1 credit.
    const movedId = tree && place ? normaliseInstallId(moveOf) : null;
    const movesOwnDesign = !!movedId && ownsDesign(movedId, installId, styleId);
    const freeMove = movesOwnDesign && claimFreeMove(movedId, installId, styleId);
    if (!freeMove && !spendCredits(installId, 1)) {
      res.status(402).json({ error: "NO_CREDITS", credits: getCredits(installId) });
      return;
    }

    // From here on the credit (or the free move) is given back at most once: on failure, on a refused cap, or
    // when the client disconnects before the response was fully written.
    let settled = false;
    const refundOnce = () => {
      if (settled) return false;
      settled = true;
      if (freeMove) releaseFreeMove(movedId!);
      else refundCredits(installId, 1);
      return true;
    };
    // Row written for a new Christmas design right before it is sent; removed again if it never arrives.
    let newDesignId: string | null = null;
    let gone = false;
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
      gone = true;
      if (refundOnce()) {
        if (newDesignId) removeDesign(newDesignId);
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
      let output = await generate(sentToModel.toString("base64"), prompt);
      produced = true;
      // The marker may never reach the user: an image that still shows it counts as a failed design (credit refunded).
      if (place && (await markerLeaked(input, output))) throw new Error("placement marker still visible in the result");

      // Door check (DOOR_CHECK=on, Christmas only): a cheap vision model compares the photo with the design.
      // "Yes, a door was hidden or changed" buys one silent second attempt with the problem named in the prompt.
      // The user never pays for it and never gets an error from it: a failed check or retry serves the first image.
      if (tree && extras.askYesNo && flagOn("DOOR_CHECK") && !gone && (await doorChanged(input, output, !!place))) {
        doorStats.flagged++;
        let served = "first attempt";
        // The retry is a second paid image: it takes a slot of the global daily cap, never of the free cap.
        if (gone) served = "nothing (client left)";
        else if (reserveGeneration(true, day) !== "OK") served = "first attempt (daily cap reached, no retry)";
        else {
          doorStats.retried++;
          let retryProduced = false;
          try {
            const again = await generate(sentToModel.toString("base64"), buildPrompt(styleId, size, place ?? false, { clear, doorFix: true })!);
            retryProduced = true;
            if (place && (await markerLeaked(input, again))) served = "first attempt (marker left in the retry)";
            else {
              // Fixed, or flagged again, or not checkable: the retry was made with the correction, so it is served.
              const still = await doorChanged(input, again, !!place);
              if (still === false) doorStats.fixed++;
              output = again;
              served = still === false ? "retry (doors fine)" : still ? "retry (flagged again)" : "retry (unchecked)";
            }
          } catch (err) {
            if (!retryProduced) releaseGeneration(true, day);
            served = "first attempt (retry failed)";
            console.warn(`door check retry failed (${styleId}): ${describeError(err)}`);
          }
        }
        console.log(`door check (${styleId}, ${place ? "tapped spot" : "auto spot"}): door hidden or changed, served ${served}; totals ${JSON.stringify(doorStats)}`);
      }

      if (!user.paid) output = await watermark(output);
      const jpeg = await sharp(output).jpeg({ quality: 86 }).toBuffer();

      // designId (Christmas only, read by app 1.0.6+): a new design gets an id with one free move; a move keeps
      // the id of the design it moved, so the free move cannot be chained.
      let design: { designId: string; freeMove: boolean } | undefined;
      if (tree && movesOwnDesign) design = { designId: movedId!, freeMove: false };
      else if (tree && !gone) {
        newDesignId = crypto.randomUUID();
        addDesign(newDesignId, installId, styleId);
        design = { designId: newDesignId, freeMove: true };
      }

      // Logged as ok once the response has been fully written (see the close handler above).
      sent = true;
      res.json({ image: jpeg.toString("base64"), credits: getCredits(installId), ...design });
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
