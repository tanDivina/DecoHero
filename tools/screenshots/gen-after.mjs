// Redesigns the sample rooms exactly the way the app does: the server's own prompt
// (server/src/styles.ts buildPrompt) on the photo, with Gemini 3.1 Flash Image ("Nano Banana 2")
// through fal's edit endpoint. Outputs are saved untouched to store/rooms/after/<room>-<style>.jpg.
//   node tools/screenshots/gen-after.mjs                 every pair in PLAN that is missing
//   node tools/screenshots/gen-after.mjs room:style ...  (re)make just these
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPrompt } from "../../server/src/styles.ts";
import { ROOMS, download, falRun } from "./fal.mjs";

// fal's id for Google's Gemini 3.1 Flash Image edit endpoint (server IMAGE_MODEL=gemini-3.1-flash-image).
export const AFTER_MODEL = "fal-ai/nano-banana-2/edit";
const MAX_EDGE = 1280; // the app downsizes photos to this before upload (mobile/src/photo.ts)

const PLAN = {
  "living-room": ["japandi", "mid-century", "scandinavian", "art-deco"],
  "sala-panama": ["tropical-modern", "coastal", "mediterranean", "boho"],
  "bedroom": ["japandi", "boho", "luxury-classic"],
  "kitchen": ["farmhouse", "modern-minimal", "mediterranean"],
  "home-office": ["industrial", "mid-century", "modern-minimal"],
  "dining-room": ["luxury-classic", "farmhouse", "art-deco"],
  "kids-room": ["scandinavian", "coastal"],
  "terrace": ["tropical-modern", "boho", "mediterranean"],
};

const manifestFile = path.join(ROOMS, "after/manifest.json");
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : [];

/** The photo as the app would upload it: longest edge 1280, JPEG quality 80, as a data URI. */
function uploadVersion(room) {
  const tmp = path.join(os.tmpdir(), `decohero-up-${room}-${process.pid}.jpg`);
  execFileSync("sips", ["-Z", String(MAX_EDGE), "-s", "format", "jpeg", "-s", "formatOptions", "80",
    path.join(ROOMS, "before", `${room}.jpg`), "--out", tmp], { stdio: "ignore" });
  const b64 = fs.readFileSync(tmp).toString("base64");
  fs.unlinkSync(tmp);
  return `data:image/jpeg;base64,${b64}`;
}

async function one(room, style) {
  const prompt = buildPrompt(style);
  if (!prompt) throw new Error(`unknown style ${style}`);
  const file = path.join(ROOMS, "after", `${room}-${style}.jpg`);
  // Server defaults: no aspect ratio or size is set, so the model follows the photo at 1K.
  const out = await falRun(AFTER_MODEL, {
    prompt, image_urls: [uploadVersion(room)], num_images: 1, output_format: "jpeg",
  }, `after ${room} ${style}`);
  await download(out.images[0].url, file);
  const entry = {
    file: `${room}-${style}.jpg`, room, style, model: AFTER_MODEL,
    promptSha256: crypto.createHash("sha256").update(prompt).digest("hex"),
    createdAt: new Date().toISOString(),
  };
  const i = manifest.findIndex((m) => m.file === entry.file);
  if (i >= 0) manifest[i] = { ...manifest[i], ...entry }; else manifest.push(entry);
  console.log("saved", entry.file);
}

const args = process.argv.slice(2);
const jobs = args.length
  ? args.map((a) => a.split(":"))
  : Object.entries(PLAN).flatMap(([room, styles]) => styles.map((s) => [room, s]))
      .filter(([room, s]) => !fs.existsSync(path.join(ROOMS, "after", `${room}-${s}.jpg`)));

// A few at a time, so one failure doesn't take the rest down.
for (let i = 0; i < jobs.length; i += 5) {
  const res = await Promise.allSettled(jobs.slice(i, i + 5).map(([r, s]) => one(r, s)));
  res.forEach((r, k) => r.status === "rejected" && console.error("FAILED", jobs[i + k].join(":"), r.reason.message));
}
manifest.sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
