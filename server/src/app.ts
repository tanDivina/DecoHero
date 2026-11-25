import crypto from "node:crypto";
import net from "node:net";
import express from "express";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { buildDecorPrompt, buildPrompt, removeEditPrompt, removeFillPrompt, flagOn, isStyle, isTreeStyle, parseTreeSize } from "./styles.js";
import { describeError, type MarkedPiece, type RemovedPiece } from "./gemini.js";
import { DECOR_FRAME_MIN, FRAME_MIN, frameMatch, pieceGone } from "./frame.js";
import { watermark } from "./watermark.js";
import { looksLikeAmazon, shopLinks } from "./shopLinks.js";
import { PARTNER_ORIGIN, treeCatalog } from "./treeCatalog.js";
import { drawMarker, drawRemoveMarkers, paintOver, markerLeaked, parsePlace, parseRemovals, removeMarkerLeaked, removeMarkerLeakedAt, type Place } from "./marker.js";
import { firebaseVerifier, isKeyFetchFailure, type VerifiedToken, type VerifyIdToken } from "./auth.js";
import {
  addDesign, addReport, claimFreeMove, deletedAt, deleteWebAccount, failuresToday, getCredits, getOrCreateUser,
  getOrCreateWebUser, getUser, getWebUserId, grantPurchase, isWebUserId, logGeneration, MAX_FAILURES_PER_INSTALL_PER_DAY,
  ownsDesign, refundCredits, refundPurchase, releaseFreeMove, releaseGeneration, removeDesign, reserveGeneration,
  spendCredits, utcDay,
} from "./db.js";

// Map your Google Play product ids (Play Console + RevenueCat) to credit amounts.
const CREDIT_PACKS: Record<string, number> = {
  credits_15: 15,
  credits_50: 50,
  credits_150: 150,
  // Web Billing products recreated Nov 2026 at $3.99 / $9.99 / $24.99 (RevenueCat can't reprice in place).
  credits_15_w2: 15,
  credits_50_w2: 50,
  credits_150_w2: 150,
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

/**
 * Who is calling, resolved once per /api request before the per-user limiters. Android: the install id.
 * Web: the user id mapped to the signed-in Firebase uid. Both are UUIDs that key the same users table.
 */
type Identity = { userId: string | null; firebaseUid?: string };
const identities = new WeakMap<express.Request, Identity>();
const userIdOf = (req: express.Request): string | null => identities.get(req)?.userId ?? null;

/** Origins allowed to call /api from a browser: WEB_ORIGINS, plus the Expo dev servers outside production. */
const webOrigins = () => {
  const list = (process.env.WEB_ORIGINS || "https://deco.hero-apps.com")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:8081", "http://localhost:19006");
  return new Set(list);
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
  const id = userIdOf(req);
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

/**
 * Finds the tree's base in a generated design (JPEG): fractions of the image, or null when there is no tree or the
 * model is not sure. Rejects when the call fails.
 */
export type LocateTree = (designJpegBase64: string) => Promise<Place | null>;

// Place check (PLACE_CHECK=on): how far the tree's base may be from the tapped spot before one free retry.
const PLACE_CHECK_TIMEOUT_MS = 30_000;
const PLACE_TOLERANCE_X = 0.12;
/** Up and down the picture is depth in the room, which the locator reads less precisely, so only a clear miss counts. */
const PLACE_TOLERANCE_Y = 0.2;
/** PLACE_CHECK_TOLERANCE: horizontal tolerance as a fraction of the image width; anything outside 0-1 is ignored. */
const placeTolerance = () => {
  const n = Number(process.env.PLACE_CHECK_TOLERANCE);
  return process.env.PLACE_CHECK_TOLERANCE?.trim() && Number.isFinite(n) && n > 0 && n <= 1 ? n : PLACE_TOLERANCE_X;
};
/** How far `at` is from `spot`, in tolerances: above 1 is off the spot, and the lower of two results is the closer one. */
const placeMiss = (at: Place, spot: Place, tolerance: number) =>
  Math.max(Math.abs(at.x - spot.x) / tolerance, Math.abs(at.y - spot.y) / PLACE_TOLERANCE_Y);
const at = (p: Place) => `x=${p.x.toFixed(2)},y=${p.y.toFixed(2)}`;

/** Names the furniture under the `count` cyan X markers of the photo sent to the model. Rejects when the call fails. */
export type NameMarkedPieces = (sentJpegBase64: string, count: number) => Promise<MarkedPiece[]>;
// Naming (REMOVE_NAMES=on) runs before the image call, so it gets less time than the checks that run after it.
const REMOVE_NAMES_TIMEOUT_MS = 12_000;

/**
 * Compares the photo that carried the `count` cyan X markers with a later image of the room: per marker the type of the
 * piece, how many of that type there were and are, and the box of one that stands on the marked place again. Rejects when the call fails.
 */
export type CheckRemovedPieces = (sentJpegBase64: string, designJpegBase64: string, count: number) => Promise<RemovedPiece[]>;
// Removal check (STYLE_REMOVE_CHECK=on): runs after the restyle, so it gets the time of the other checks that do.
const REMOVE_CHECK_TIMEOUT_MS = 20_000;
/** A piece counts as "back on the marked place" only when the centre of its box is this close to the X (fraction of the image, both directions). */
const REMOVE_CHECK_REACH = 0.2;
/** A box larger than this share of the image is not painted over: that is no single piece of furniture, or a wrong answer. */
const REMOVE_CHECK_MAX_BOX = 0.25;
const centre = (b: { x0: number; y0: number; x1: number; y1: number }): Place => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

/** Chooses a free floor spot for the tree in the user's photo (JPEG), null when it finds none. Rejects when the call fails. */
export type PickTreeSpot = (photoJpegBase64: string) => Promise<Place | null>;
// Auto spot (AUTO_SPOT=on) runs before the image call, like the naming, so it gets as little time.
const AUTO_SPOT_TIMEOUT_MS = 12_000;
/** A chosen spot higher in the picture than this is a wall, a window or the far end of a long room: not used. */
const AUTO_SPOT_MIN_Y = 0.4;
const AUTO_SPOT_EDGE = 0.06;

export type AppOptions = {
  /** Vision model that chooses the tree's spot when the user tapped none (AUTO_SPOT=on). */
  pickTreeSpot?: PickTreeSpot;
  /** Vision model that looks for a marked piece put back by the restyle of a two-step removal (STYLE_REMOVE_CHECK=on). */
  checkRemovedPieces?: CheckRemovedPieces;
  /** Vision model that names the marked furniture and its neighbours before a removal (REMOVE_NAMES=on). */
  nameMarkedPieces?: NameMarkedPieces;
  /** Yes/no vision check used by the door check (DOOR_CHECK=on). */
  askYesNo?: AskYesNo;
  /** Tree locator used by the place check (PLACE_CHECK=on). */
  locateTree?: LocateTree;
  /** Firebase ID token check for the web app. Defaults to firebase-admin when FIREBASE_PROJECT_ID is set. */
  verifyIdToken?: VerifyIdToken;
};

export function createApp(generate: Generate, model: string, options: AppOptions = {}) {
  const extras = options;
  const verifyIdToken = options.verifyIdToken ?? firebaseVerifier();
  const allowedOrigins = webOrigins();
  // Salt for the short-lived uid hash kept after an account delete (web_tombstones).
  const tombstoneSalt =
    process.env.TOMBSTONE_SALT?.trim() ||
    crypto.createHash("sha256").update(`decohero-tombstone:${process.env.FIREBASE_PROJECT_ID?.trim() ?? ""}`).digest("hex");
  const uidHashOf = (uid: string) => crypto.createHash("sha256").update(`${uid}:${tombstoneSalt}`).digest("hex");
  const allowedOrigin = (req: express.Request) => {
    const origin = req.get("origin");
    return origin !== undefined && allowedOrigins.has(origin) ? origin : null;
  };

  const app = express();
  // Since the last restart; printed with every flagged or failed door check. No install ids, no IPs.
  const doorStats = { checked: 0, flagged: 0, retried: 0, fixed: 0, errors: 0 };
  // Since the last restart; printed with every redrawn room (FRAME_CHECK). No install ids, no IPs.
  // checked = designs measured, redrawn = first attempt off the photo's framing, fixed = retry back on it.
  const frameStats = { checked: 0, redrawn: 0, retried: 0, fixed: 0, errors: 0 };
  /** Share of the photo that is still in place in the design, null when the photo cannot be judged or the measuring failed. */
  const framed = async (photo: Buffer, design: Buffer): Promise<number | null> => {
    try {
      return await frameMatch(photo, design);
    } catch (err) {
      frameStats.errors++;
      console.warn(`frame check failed, design served unchecked: ${describeError(err)}; totals ${JSON.stringify(frameStats)}`);
      return null;
    }
  };
  // Since the last restart; printed whenever the decor step (DECOR_STEP) needed its retry or served the tree alone.
  // asked = whole-room designs, done = served with decor, redrawn = decor attempts off the tree image's framing.
  const decorStats = { asked: 0, done: 0, redrawn: 0, retried: 0, fixed: 0, errors: 0 };
  // Since the last restart; printed whenever the two-step removal (STYLE_REMOVE_TWO_STEP) needed a retry or gave up.
  // asked = removals on room redesigns, edited = cleaned photo made, retried = second edit made, kept = retry served,
  // fellBack = design made with the single prompt instead. No install ids, no IPs.
  const twoStepStats = { asked: 0, edited: 0, retried: 0, kept: 0, fellBack: 0 };
  /**
   * What is wrong with a step-one edit, as a score (0 = fine): the cyan marker is still in it (10), the room was redrawn
   * instead of edited (5), a marked piece still stands where it stood (1 each). All measured locally, no model call.
   */
  const editProblems = async (photo: Buffer, edit: Buffer, spots: Place[]): Promise<number> => {
    try {
      const [leak, frame, ...gone] = await Promise.all([
        removeMarkerLeakedAt(photo, edit, spots),
        frameMatch(photo, edit),
        ...spots.map((s) => pieceGone(photo, edit, s)),
      ]);
      return (leak ? 10 : 0) + (frame !== null && frame < FRAME_MIN ? 5 : 0) + gone.filter((g) => g === false).length;
    } catch (err) {
      console.warn(`two-step removal: edit not measured: ${describeError(err)}`);
      return 0;
    }
  };
  // Since the last restart; printed whenever the removal check (STYLE_REMOVE_CHECK) found a piece back or failed.
  // checked = restyles looked at, back = a marked piece stood there again, retried = second repair edits, repaired = served with it edited out,
  // kept = restyle served as it was although a piece was back (cap reached, edit failed or unusable). No install ids, no IPs.
  const removeCheckStats = { checked: 0, back: 0, retried: 0, repaired: 0, kept: 0, errors: 0 };
  /** The removal check on one image, null when the check itself failed or timed out. */
  const removedIn = async (sent: Buffer, image: Buffer, count: number): Promise<RemovedPiece[] | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const [a, b] = await Promise.all([forCheck(sent), forCheck(image)]);
      return await Promise.race([
        extras.checkRemovedPieces!(a.toString("base64"), b.toString("base64"), count),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("removal check timed out")), REMOVE_CHECK_TIMEOUT_MS); }),
      ]);
    } catch (err) {
      removeCheckStats.errors++;
      console.warn(`removal check failed, design served unchecked: ${describeError(err)}; totals ${JSON.stringify(removeCheckStats)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  /**
   * The marks of a removal check whose piece is back: the image shows more pieces of that type than the photo had
   * unmarked ones, and one of them stands on (close to) a marked place.
   */
  const piecesBack = (marks: RemovedPiece[], spots: Place[]): (RemovedPiece & { box: NonNullable<RemovedPiece["box"]> })[] =>
    marks.filter((m): m is RemovedPiece & { box: NonNullable<RemovedPiece["box"]> } => {
      const sameKind = marks.filter((o) => o.kind.toLowerCase() === m.kind.toLowerCase()).length;
      if (m.after <= m.before - sameKind || !m.box) return false;
      const c = centre(m.box);
      const area = (m.box.x1 - m.box.x0) * (m.box.y1 - m.box.y0);
      return area > 0.0005 && area <= REMOVE_CHECK_MAX_BOX &&
        spots.some((s) => Math.abs(s.x - c.x) <= REMOVE_CHECK_REACH && Math.abs(s.y - c.y) <= REMOVE_CHECK_REACH);
    });
  // Since the last restart; printed whenever the auto spot (AUTO_SPOT) found no spot or failed. No install ids, no IPs.
  const autoSpotStats = { asked: 0, placed: 0, none: 0, errors: 0 };
  // Since the last restart; printed with every failed naming (REMOVE_NAMES). No install ids, no IPs.
  const nameStats = { asked: 0, named: 0, errors: 0 };
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
  // Since the last restart; printed with every missed spot and failed place check. No install ids, no IPs.
  // checked = placed designs looked at, off = first attempt away from the spot, fixed = retry on the spot.
  const placeStats = { checked: 0, off: 0, retried: 0, fixed: 0, errors: 0 };
  /** Where the tree stands in a design, null when the model sees none or is not sure, "error" when the check itself failed. */
  async function treeBase(design: Buffer): Promise<Place | null | "error"> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const img = await forCheck(design);
      const found = await Promise.race([
        extras.locateTree!(img.toString("base64")),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("place check timed out")), PLACE_CHECK_TIMEOUT_MS); }),
      ]);
      // A locator that answers with anything but a point inside the image is treated as a failed check.
      if (found !== null && parsePlace(found) == null) throw new Error("place check gave a point outside the image");
      return found;
    } catch (err) {
      placeStats.errors++;
      console.warn(`place check failed, design served unchecked: ${describeError(err)}; totals ${JSON.stringify(placeStats)}`);
      return "error";
    } finally {
      clearTimeout(timer);
    }
  }
  app.disable("x-powered-by");
  // Number of reverse proxies in front of the app (Railway/Render: 1). Wrong values either let clients
  // spoof their IP (too high) or make every user share the proxy's IP (too low). See DEPLOY.md.
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

  // CORS for the web app only: /api, and only for the origins in WEB_ORIGINS. Every other origin (and the
  // Android app, which sends no Origin) gets no CORS headers at all, so random websites cannot call the API
  // from a visitor's browser. /webhooks never gets them. Runs first so error replies carry the headers too,
  // and so preflights are answered before the rate limiters.
  app.use("/api", (req, res, next) => {
    const origin = allowedOrigin(req);
    if (!origin) {
      next();
      return;
    }
    res.set("Access-Control-Allow-Origin", origin);
    res.vary("Origin");
    res.set("Access-Control-Expose-Headers", "Retry-After");
    if (req.method !== "OPTIONS") {
      next();
      return;
    }
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Max-Age", "600");
    res.status(204).end();
  });

  // The client sends a JPEG capped at 1280px (~1-2 MB as base64). Anything bigger is refused with 413.
  app.use(express.json({ limit: "4mb" }));

  // Per-IP limits are generous because carrier-grade NAT puts many phones behind one IP.
  // This one needs no identity and runs before token checks, so it also bounds bad-token floods.
  app.use("/api", limiter(60_000, API_PER_IP_PER_MIN, clientIp));

  // Identity, resolved before the per-user limiters and the routes.
  // Web: "Authorization: Bearer <Firebase ID token>"; any X-Install-Id is ignored. Android: the install id.
  app.use("/api", async (req, res, next) => {
    try {
      const authorization = req.get("authorization");
      if (authorization === undefined) {
        // A browser on the web app's origin must sign in; it cannot fall back to an anonymous install id.
        if (allowedOrigin(req)) {
          res.status(401).json({ error: "AUTH_REQUIRED" });
          return;
        }
        const installId = installIdOf(req);
        // A web account's user id is not an install id: its credits are only reachable with a sign-in.
        if (installId && isWebUserId(installId)) {
          res.status(401).json({ error: "AUTH_REQUIRED" });
          return;
        }
        identities.set(req, { userId: installId });
        next();
        return;
      }
      if (!verifyIdToken) {
        res.status(503).json({ error: "WEB_DISABLED" });
        return;
      }
      const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
      let decoded: VerifiedToken | null = null;
      if (token) {
        try {
          decoded = await verifyIdToken(token);
        } catch (err) {
          // Google's signing keys could not be fetched: our problem, not the token's. The client should
          // retry instead of signing the user out.
          if (isKeyFetchFailure(err)) {
            console.error(`token check unavailable: ${describeError(err)}`);
            res.status(503).json({ error: "AUTH_UNAVAILABLE" });
            return;
          }
        }
      }
      const firebaseUid = typeof decoded?.uid === "string" && decoded.uid ? decoded.uid : null;
      // Google sign-in only, whatever else gets switched on in the Firebase project.
      if (!firebaseUid || decoded?.firebase?.sign_in_provider !== "google.com") {
        res.status(401).json({ error: "AUTH_INVALID" });
        return;
      }
      const userId = getWebUserId(firebaseUid);
      if (!userId) {
        // Deleted in the last 2 hours: only a sign-in made after the delete may start a new account.
        const deleted = deletedAt(uidHashOf(firebaseUid));
        const authTimeMs = typeof decoded?.auth_time === "number" ? decoded.auth_time * 1000 : 0;
        if (deleted !== null && authTimeMs <= deleted) {
          res.status(401).json({ error: "AUTH_INVALID" });
          return;
        }
        // Accounts are created by GET /api/me only.
        if (!(req.method === "GET" && req.path === "/me")) {
          res.status(401).json({ error: "ACCOUNT_NOT_FOUND" });
          return;
        }
      }
      identities.set(req, { userId, firebaseUid });
      next();
    } catch (err) {
      next(err);
    }
  });

  // Image generation is the only route that costs money: tighter per-IP and per-install limits.
  // Paying installs get a higher per-install limit.
  app.use(
    "/api/redesign",
    limiter(10 * 60_000, REDESIGN_PER_IP, clientIp),
    limiter(10 * 60_000, (req) => {
      const id = userIdOf(req);
      return id && getUser(id)?.paid ? REDESIGN_PER_INSTALL_PAID : REDESIGN_PER_INSTALL_FREE;
    }, byInstall)
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, model });
  });

  app.get("/api/me", (req, res) => {
    const firebaseUid = identities.get(req)?.firebaseUid;
    const id = firebaseUid ? getOrCreateWebUser(firebaseUid, clientIp(req)) : userIdOf(req);
    if (!id) {
      res.status(400).json({ error: "BAD_INSTALL_ID" });
      return;
    }
    const user = getOrCreateUser(id, clientIp(req));
    // userId is what the web app logs in to RevenueCat with, so the webhook below credits it.
    res.json({ userId: user.id, credits: user.credits, paid: !!user.paid, freeDenied: !!user.free_denied && !user.paid });
  });

  // Web accounts only: deletes the signed-in account and its records. See deleteWebAccount for what goes.
  app.post("/api/account/delete", (req, res) => {
    const firebaseUid = identities.get(req)?.firebaseUid;
    if (!firebaseUid) {
      res.status(401).json({ error: "AUTH_REQUIRED" });
      return;
    }
    deleteWebAccount(firebaseUid, uidHashOf(firebaseUid));
    res.json({ ok: true });
  });

  // Things the app reads at start so they can change without a new release. Read per request: no secrets here.
  app.get("/api/config", (req, res) => {
    // shopLinks (app 1.0.4+): decor links per Christmas theme, both languages. Older apps ignore the field.
    // treeCatalog (app 1.0.5+): the partner's trees with prices; product links carry TREE_SHOP_URL's affiliate parameters.
    const shopUrl = treeShopUrl();
    // The web app calls cross-origin, so the browser sends Origin; the Android app sends none.
    const web = allowedOrigin(req) !== null;
    res.json({
      christmas: !isOff(process.env.CHRISTMAS_MODE), treeShopUrl: shopUrl, shopLinks: shopLinks({ web }), treeCatalog: treeCatalog(shopUrl),
      // treeClear (app 1.0.6+): the clearing rule is on, so the app says a plant or lamp on the spot is taken out.
      treeClear: flagOn("TREE_CLEAR"),
      // treeRemove (app 1.0.7+): the "Take out furniture" option is offered (TREE_REMOVE=on).
      treeRemove: flagOn("TREE_REMOVE"),
      // styleRemove (app 1.0.8+): "Take out furniture" on regular room redesigns too (STYLE_REMOVE=on).
      styleRemove: flagOn("STYLE_REMOVE"),
      // roomDecor (app 1.0.8+): the "Decorate whole room" checkbox in Christmas mode (ROOM_DECOR=on).
      roomDecor: flagOn("ROOM_DECOR"),
    });
  });

  app.post("/api/redesign", async (req, res) => {
    const installId = userIdOf(req);
    const { image, styleId, ceilingCm, treeCm, place: rawPlace, moveOf, remove: rawRemove, decorateRoom: rawDecor } = req.body ?? {};
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
    // "Take out furniture": up to two pieces the user lets us remove. Christmas (app 1.0.7+, TREE_REMOVE=on) needs a
    // tapped tree spot; regular styles (app 1.0.8+, STYLE_REMOVE=on) need no spot. Anything else is refused before a
    // credit is touched, so the user never pays for a room that was silently left as it was. With STYLE_REMOVE off,
    // regular styles ignore a malformed field as before 1.0.8 (no released client sends one there).
    let removals: ReturnType<typeof parseRemovals>;
    if (tree) {
      removals = parseRemovals(rawRemove);
      if (removals === null || (removals && (!place || !flagOn("TREE_REMOVE")))) {
        res.status(400).json({ error: "BAD_REMOVE" });
        return;
      }
    } else {
      const parsed = parseRemovals(rawRemove);
      const styleRemove = flagOn("STYLE_REMOVE");
      if ((styleRemove && parsed === null) || (!styleRemove && parsed)) {
        res.status(400).json({ error: "BAD_REMOVE" });
        return;
      }
      removals = styleRemove ? parsed ?? undefined : undefined;
    }
    // "Decorate whole room" (app 1.0.8+, ROOM_DECOR=on): Christmas styles only, default off; regular styles ignore it.
    if (tree && rawDecor !== undefined && rawDecor !== null && typeof rawDecor !== "boolean") {
      res.status(400).json({ error: "BAD_DECOR" });
      return;
    }
    const decorateRoom = tree && rawDecor === true;
    if (decorateRoom && !flagOn("ROOM_DECOR")) {
      res.status(400).json({ error: "BAD_DECOR" });
      return;
    }
    const remove = !!removals;
    // TREE_CLEAR=on lets the model take a plant, lamp or small table off the tree's spot; off keeps the 1.0.5 wording.
    const clear = tree && flagOn("TREE_CLEAR");
    // DECOR_STEP=on (server 1.0.10): the room decor is a second, small edit of the finished tree image (see below), so the
    // tree itself is made with the plain tree prompt. Off: tree and decor in one prompt, as in 1.0.8.
    const decorStep = decorateRoom && flagOn("DECOR_STEP");
    const decorInPrompt = decorateRoom && !decorStep;
    const prompt = buildPrompt(styleId, size, place ?? false, { clear, remove, decorateRoom: decorInPrompt, decorTree: decorStep });
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
      if (removals) sentToModel = await drawRemoveMarkers(sentToModel, removals);
    } catch {
      res.status(400).json({ error: "BAD_IMAGE" });
      return;
    }

    // A web account deleted while the photo was being prepared must not come back as a new user.
    const isWeb = !!identities.get(req)?.firebaseUid;
    const user = isWeb ? getUser(installId) : getOrCreateUser(installId, clientIp(req));
    if (!user) {
      res.status(401).json({ error: "ACCOUNT_NOT_FOUND" });
      return;
    }
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

    // Where the tree goes: the tapped spot, or the one AUTO_SPOT chooses further down.
    let spot = place;
    // A design that still shows the magenta tree marker or a cyan remove marker is never served.
    const leaked = async (img: Buffer) =>
      (!!spot && (await markerLeaked(input, img))) ||
      (remove && (tree ? await removeMarkerLeaked(input, img) : await removeMarkerLeakedAt(input, img, removals!)));

    // REMOVE_NAMES=on (server 1.0.9): a cheap vision model names the piece under each cyan X and the unmarked pieces
    // touching it, and the prompt repeats the removal rule in those words (styles.ts namedPieces). The user never
    // waits long for it or gets an error from it: a failed or slow naming sends the prompt without names.
    let pieces: MarkedPiece[] | undefined;
    if (removals && extras.nameMarkedPieces && flagOn("REMOVE_NAMES") && !gone) {
      nameStats.asked++;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        pieces = await Promise.race([
          extras.nameMarkedPieces(sentToModel.toString("base64"), removals.length),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("remove names timed out")), REMOVE_NAMES_TIMEOUT_MS); }),
        ]);
        nameStats.named++;
      } catch (err) {
        nameStats.errors++;
        console.warn(`remove names failed, prompt sent without names: ${describeError(err)}; totals ${JSON.stringify(nameStats)}`);
      } finally {
        clearTimeout(timer);
      }
    }
    // AUTO_SPOT=on (server 1.0.11, Christmas designs without a tapped spot): a vision model chooses a free floor spot in
    // the photo and the design is then made exactly like one with a tapped spot (marker, wording, place check). Left to
    // choose its own spot in a full room, the image model stood the tree on or in front of furniture. The user never
    // waits long for it or gets an error from it: no spot, a failed or a slow call makes the design as before.
    if (tree && !place && extras.pickTreeSpot && flagOn("AUTO_SPOT") && !gone) {
      autoSpotStats.asked++;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const photo = await forCheck(input);
        const found = await Promise.race([
          extras.pickTreeSpot(photo.toString("base64")),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("auto spot timed out")), AUTO_SPOT_TIMEOUT_MS); }),
        ]);
        const usable = found !== null && parsePlace(found) != null && found.y >= AUTO_SPOT_MIN_Y && found.x >= AUTO_SPOT_EDGE && found.x <= 1 - AUTO_SPOT_EDGE;
        if (usable) {
          const marked = await drawMarker(input, found);
          spot = found;
          sentToModel = marked;
          autoSpotStats.placed++;
        } else {
          autoSpotStats.none++;
          console.log(`auto spot (${styleId}): ${found ? `spot ${at(found)} not usable` : "no free floor found"}, spot left to the image model; totals ${JSON.stringify(autoSpotStats)}`);
        }
      } catch (err) {
        autoSpotStats.errors++;
        console.warn(`auto spot failed, spot left to the image model: ${describeError(err)}; totals ${JSON.stringify(autoSpotStats)}`);
      } finally {
        clearTimeout(timer);
      }
    }
    const firstPrompt = pieces || spot !== place ? buildPrompt(styleId, size, spot ?? false, { clear, remove, decorateRoom: decorInPrompt, decorTree: decorStep, pieces })! : prompt;

    let produced = false;
    try {
      // Two-step removal (STYLE_REMOVE_TWO_STEP=on, room redesigns with "Take out furniture"): first a plain photo edit
      // that only takes the marked pieces out, then a restyle of that cleaned photo with the layout locked. One prompt
      // for both kept drawing the complete set (a marked dining chair came back every time) and redrew rooms.
      // Costs one extra image per such design (two when the edit has to be retried); each extra image takes a slot of
      // the global daily cap, never of the free cap. Whenever a step cannot be done (cap reached, edit failed, marker
      // left in the edit) the design is made with the single prompt as before: never an error from this path.
      let cleaned: Buffer | null = null;
      if (!tree && removals && flagOn("STYLE_REMOVE_TWO_STEP") && !gone) {
        twoStepStats.asked++;
        let why = "";
        if (reserveGeneration(true, day) !== "OK") why = "daily cap reached";
        else {
          let edit: Buffer | null = null;
          try {
            edit = await generate(sentToModel.toString("base64"), removeEditPrompt(pieces));
          } catch (err) {
            releaseGeneration(true, day);
            why = `edit failed: ${describeError(err)}`;
          }
          if (edit) {
            twoStepStats.edited++;
            let problems = await editProblems(input, edit, removals);
            // A marked piece that is still there, a redrawn room or a left-over marker buys one more edit; the better one is used.
            if (problems > 0 && !gone && reserveGeneration(true, day) === "OK") {
              twoStepStats.retried++;
              try {
                const again = await generate(sentToModel.toString("base64"), removeEditPrompt(pieces));
                const second = await editProblems(input, again, removals);
                if (second < problems) {
                  edit = again;
                  twoStepStats.kept++;
                }
                console.log(`two-step removal (${styleId}): edit retried (problems ${problems} then ${second}); totals ${JSON.stringify(twoStepStats)}`);
                problems = Math.min(problems, second);
              } catch (err) {
                releaseGeneration(true, day);
                console.warn(`two-step removal (${styleId}): retry of the edit failed: ${describeError(err)}`);
              }
            }
            // A cleaned photo that still shows the marker or is another picture of the room is not built on.
            if (problems >= 5) why = "edit unusable";
            else cleaned = await sharp(edit).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
          }
        }
        if (!cleaned) {
          twoStepStats.fellBack++;
          console.warn(`two-step removal (${styleId}): single prompt used instead (${why}); totals ${JSON.stringify(twoStepStats)}`);
        }
      }
      // Removal check (STYLE_REMOVE_CHECK=on, server 1.0.11): the restyle of the cleaned photo likes to complete a set again
      // (a chair back at the empty end of a dining table, 7 times out of 7 on Nov 19 2026). A vision model compares the
      // marked photo with the restyle; the same look at the cleaned photo runs while the restyle is being made, so that
      // only a piece the restyle itself put back counts. Such a piece is painted over in the restyle and the image model
      // fills the hole in (two attempts at most). The user never pays for it and never gets an error from it: whenever
      // something cannot be done or the repair does not hold up, the restyle is served as it was.
      const checkRemoval = !!cleaned && !!removals && !!extras.checkRemovedPieces && flagOn("STYLE_REMOVE_CHECK");
      const cleanedMarks = checkRemoval ? removedIn(sentToModel, cleaned!, removals!.length) : null;
      let output = cleaned
        ? await generate(cleaned.toString("base64"), buildPrompt(styleId, size, false, { keepLayout: true })!)
        : await generate(sentToModel.toString("base64"), firstPrompt);
      produced = true;
      if (checkRemoval && !gone) {
        removeCheckStats.checked++;
        const [inCleaned, inDesign] = await Promise.all([cleanedMarks, removedIn(sentToModel, output, removals!.length)]);
        // Without a clean bill for the cleaned photo nothing is repaired: the X could sit on a piece that belongs there.
        const back = inCleaned && inDesign && !piecesBack(inCleaned, removals!).length ? piecesBack(inDesign, removals!) : [];
        if (back.length) {
          removeCheckStats.back++;
          let served = "restyle as it was";
          if (gone) served = "nothing (client left)";
          else if (reserveGeneration(true, day) !== "OK") served = "restyle as it was (daily cap reached)";
          else {
            let reserved = true;
            try {
              const boxes = back.map((b) => b.box);
              const spots = boxes.map(centre);
              const design = await sharp(output).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
              const painted = await paintOver(design, boxes);
              for (const second of [false, true]) {
                if (second) {
                  if (gone || reserveGeneration(true, day) !== "OK") break;
                  reserved = true;
                  removeCheckStats.retried++;
                }
                const repaired = await generate(painted.toString("base64"), removeFillPrompt(second));
                reserved = false;
                // The repair is a small edit of the restyle: no cyan left, the room still lines up, the spot changed,
                // and the vision model no longer sees the piece.
                const [leak, kept, changed] = await Promise.all([
                  removeMarkerLeaked(design, repaired),
                  framed(design, repaired),
                  Promise.all(spots.map((s) => pieceGone(design, repaired, s))),
                ]);
                if (leak) served = "restyle as it was (cyan left in the repair)";
                else if (kept !== null && kept < DECOR_FRAME_MIN) served = `restyle as it was (repair redrew the room, ${kept.toFixed(2)})`;
                else if (changed.some((c) => c === false)) served = "restyle as it was (repair left the piece)";
                else {
                  const after = gone ? null : await removedIn(sentToModel, repaired, removals!.length);
                  if (after && piecesBack(after, removals!).length) served = "restyle as it was (piece still there after the repair)";
                  else {
                    output = repaired;
                    removeCheckStats.repaired++;
                    served = second ? "repair (second attempt)" : "repair";
                    break;
                  }
                }
              }
            } catch (err) {
              if (reserved) releaseGeneration(true, day);
              served = "restyle as it was (repair failed)";
              console.warn(`removal check repair failed (${styleId}): ${describeError(err)}`);
            }
          }
          if (!served.startsWith("repair")) removeCheckStats.kept++;
          console.log(`removal check (${styleId}): ${back.map((b) => `${b.kind} back (${b.before} before, ${b.after} after) at ${at(centre(b.box))}`).join("; ")}, served ${served}; totals ${JSON.stringify(removeCheckStats)}`);
        }
      }
      // The marker may never reach the user: an image that still shows it counts as a failed design (credit refunded).
      // (The cleaned photo of the two-step removal carries no marker, so its restyle is not checked for one.)
      if (!cleaned && (await leaked(output))) throw new Error("placement marker still visible in the result");

      // Frame check (FRAME_CHECK=on, Christmas only): a Christmas design is an edit, so the photo must still line up with
      // it. A room that was redrawn from another distance or angle (frame.ts measures it locally, no model call) buys
      // one silent second attempt with the problem named; the one closer to the photo is served. The user never pays
      // for it and never gets an error from it.
      let frameFixed = false;
      if (tree && flagOn("FRAME_CHECK") && !gone) {
        const first = await framed(input, output);
        if (first !== null) frameStats.checked++;
        if (first !== null && first < FRAME_MIN) {
          frameStats.redrawn++;
          let served = "first attempt";
          // The retry is a second paid image: it takes a slot of the global daily cap, never of the free cap.
          if (gone) served = "nothing (client left)";
          else if (reserveGeneration(true, day) !== "OK") served = "first attempt (daily cap reached, no retry)";
          else {
            frameStats.retried++;
            let retryProduced = false;
            try {
              const again = await generate(sentToModel.toString("base64"), buildPrompt(styleId, size, spot ?? false, { clear, remove, decorateRoom: decorInPrompt, decorTree: decorStep, pieces, frameFix: true })!);
              retryProduced = true;
              if (await leaked(again)) served = "first attempt (marker left in the retry)";
              else {
                const second = await framed(input, again);
                if (second !== null && second >= FRAME_MIN) frameStats.fixed++;
                if (second !== null && second > first) {
                  output = again;
                  frameFixed = true;
                }
                served = `${frameFixed ? "retry" : "first attempt"} (retry ${second === null ? "not measured" : second.toFixed(2)})`;
              }
            } catch (err) {
              if (!retryProduced) releaseGeneration(true, day);
              served = "first attempt (retry failed)";
              console.warn(`frame check retry failed (${styleId}): ${describeError(err)}`);
            }
          }
          console.log(`frame check (${styleId}${decorateRoom ? ", whole room" : ""}): room redrawn (${first.toFixed(2)}), served ${served}; totals ${JSON.stringify(frameStats)}`);
        }
      }

      // The served image was made with the door correction, so a place retry keeps that correction.
      let doorFixed = false;
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
            const again = await generate(sentToModel.toString("base64"), buildPrompt(styleId, size, spot ?? false, { clear, remove, decorateRoom: decorInPrompt, decorTree: decorStep, pieces, frameFix: frameFixed, doorFix: true })!);
            retryProduced = true;
            if (await leaked(again)) served = "first attempt (marker left in the retry)";
            else {
              // Fixed, or flagged again, or not checkable: the retry was made with the correction, so it is served.
              const still = await doorChanged(input, again, !!place);
              if (still === false) doorStats.fixed++;
              output = again;
              doorFixed = true;
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

      // Place check (PLACE_CHECK=on, Christmas with a tapped spot): a cheap vision model says where the tree's base is.
      // Off the spot buys one silent second attempt that names where the tree came out and where it has to go; the
      // closer of the two is served. The user never pays for it and never gets an error from it: a failed check
      // serves the design unchecked.
      // A spot chosen by AUTO_SPOT is checked like a tapped one.
      if (tree && spot && extras.locateTree && flagOn("PLACE_CHECK") && !gone) {
        placeStats.checked++;
        const tolerance = placeTolerance();
        const first = await treeBase(output);
        if (first === null) {
          console.log(`place check (${styleId}): no tree base found, design served unchecked; totals ${JSON.stringify(placeStats)}`);
        } else if (first !== "error" && placeMiss(first, spot, tolerance) > 1) {
          placeStats.off++;
          let served = "first attempt";
          // The retry is a second paid image: it takes a slot of the global daily cap, never of the free cap.
          if (gone) served = "nothing (client left)";
          else if (reserveGeneration(true, day) !== "OK") served = "first attempt (daily cap reached, no retry)";
          else {
            placeStats.retried++;
            let retryProduced = false;
            try {
              const again = await generate(
                sentToModel.toString("base64"),
                buildPrompt(styleId, size, spot, { clear, remove, decorateRoom: decorInPrompt, decorTree: decorStep, pieces, frameFix: frameFixed, doorFix: doorFixed, placeFix: first })!
              );
              retryProduced = true;
              if (await leaked(again)) served = "first attempt (marker left in the retry)";
              else {
                const second = await treeBase(again);
                if (second === "error") {
                  // Not checkable: the first attempt is known to be off and the retry was made with the correction.
                  output = again;
                  served = "retry (unchecked)";
                } else if (second === null) served = "first attempt (no tree base found in the retry)";
                else {
                  const closer = placeMiss(second, spot, tolerance) < placeMiss(first, spot, tolerance);
                  const onSpot = placeMiss(second, spot, tolerance) <= 1;
                  if (onSpot) placeStats.fixed++;
                  if (closer) output = again;
                  served = `${closer ? "retry" : "first attempt"} (retry ${onSpot ? "on the spot" : "still off"} at ${at(second)})`;
                }
              }
            } catch (err) {
              if (!retryProduced) releaseGeneration(true, day);
              served = "first attempt (retry failed)";
              console.warn(`place check retry failed (${styleId}): ${describeError(err)}`);
            }
          }
          if (gone) served = "nothing (client left)";
          console.log(`place check (${styleId}): ${place ? "" : "auto "}spot ${at(spot)}, tree at ${at(first)}, served ${served}; totals ${JSON.stringify(placeStats)}`);
        }
      }

      // Decor step (DECOR_STEP=on, "Decorate whole room"): the finished tree image goes back to the model with a short
      // prompt that only adds the room decor. Its result must still line up with the tree image (frame.ts, local, no
      // model call); a redrawn room buys one retry with the problem named, and if that is redrawn too the tree image is
      // served without room decor. The user never pays for it and never gets an error from it.
      if (decorStep && !gone) {
        decorStats.asked++;
        const treeOnly = output;
        let served = "tree only";
        try {
          const treeJpeg = (await sharp(treeOnly).jpeg({ quality: 92 }).toBuffer()).toString("base64");
          for (const fix of [false, true]) {
            // A second (or third) paid image: it takes a slot of the global daily cap, never of the free cap.
            if (gone) { served = "nothing (client left)"; break; }
            if (reserveGeneration(true, day) !== "OK") { served = "tree only (daily cap reached)"; break; }
            let decorated: Buffer;
            try {
              decorated = await generate(treeJpeg, buildDecorPrompt(styleId, fix)!);
            } catch (err) {
              releaseGeneration(true, day);
              throw err;
            }
            if (fix) decorStats.retried++;
            const kept = await framed(treeOnly, decorated);
            if (kept === null || kept >= DECOR_FRAME_MIN) {
              output = decorated;
              decorStats.done++;
              if (fix) decorStats.fixed++;
              served = `decorated${fix ? " (retry)" : ""}${kept === null ? ", not measured" : ` ${kept.toFixed(2)}`}`;
              break;
            }
            decorStats.redrawn++;
            served = `tree only (decor step redrew the room${fix ? " twice" : ""}, ${kept.toFixed(2)})`;
          }
        } catch (err) {
          decorStats.errors++;
          served = "tree only (decor step failed)";
          console.warn(`decor step failed (${styleId}): ${describeError(err)}`);
        }
        if (output === treeOnly || served.includes("retry")) console.log(`decor step (${styleId}): served ${served}; totals ${JSON.stringify(decorStats)}`);
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
    const installId = userIdOf(req);
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
      const result = grantPurchase(event.id, userId, pack.id, pack.credits, transactionIds[0] ?? null);
      if (result === "account_deleted") {
        // Answered 200: a retry cannot fix it. Refund it by hand in RevenueCat if the buyer asks.
        console.error(`purchase ${event.id}: ${pack.id} NOT CREDITED (account deleted), ${event.environment ?? "?"}`);
      } else {
        console.log(`purchase ${event.id}: ${pack.id} -> ${userId} (granted=${result === "granted"}, ${event.environment ?? "?"})`);
      }
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
