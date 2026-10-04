import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { buildPrompt } from "./styles.js";
import { generateRedesign, IMAGE_MODEL } from "./gemini.js";
import {
  addReport, getCredits, getOrCreateUser, grantPurchase,
  logGeneration, refundCredits, spendCredits,
} from "./db.js";

// Map your Google Play product ids (Play Console + RevenueCat) to credit amounts.
const CREDIT_PACKS: Record<string, number> = {
  credits_15: 15,
  credits_50: 50,
  credits_150: 150,
};

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "8mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const INSTALL_ID = /^[a-f0-9-]{36}$/i;
const clientIp = (req: express.Request) => req.ip || "unknown";

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

  const user = getOrCreateUser(installId, clientIp(req));
  if (!spendCredits(installId, 1)) {
    res.status(402).json({ error: "NO_CREDITS", credits: getCredits(installId) });
    return;
  }

  try {
    // Normalise whatever the phone sent: fix rotation, cap size, re-encode as JPEG.
    const input = await sharp(Buffer.from(image, "base64"))
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    let output = await generateRedesign(input.toString("base64"), prompt);
    if (!user.paid) output = await watermark(output);
    const jpeg = await sharp(output).jpeg({ quality: 86 }).toBuffer();

    logGeneration(installId, styleId, true);
    res.json({ image: jpeg.toString("base64"), credits: getCredits(installId) });
  } catch (err) {
    console.error("redesign failed", err);
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
  if (!secret || req.get("authorization") !== `Bearer ${secret}`) {
    res.status(401).end();
    return;
  }
  const event = req.body?.event;
  if (!event) {
    res.status(400).end();
    return;
  }
  const credits = CREDIT_PACKS[event.product_id];
  const purchaseTypes = ["NON_RENEWING_PURCHASE", "INITIAL_PURCHASE"];
  if (credits && purchaseTypes.includes(event.type) && typeof event.app_user_id === "string") {
    const granted = grantPurchase(event.id, event.app_user_id, event.product_id, credits);
    console.log(`purchase ${event.id}: ${event.product_id} -> ${event.app_user_id} (granted=${granted})`);
  }
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`DecoHero API on :${port} using ${IMAGE_MODEL}`));
