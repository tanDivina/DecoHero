// "Decorate whole room" through the real production path (Nov 19 2026, branch fix/room-decor).
// Starts the server's own app (createApp, as index.ts does) on a local port with a temp database and the real Gemini
// calls, and posts to /api/redesign like the phone: marker, prompts, frame check, place check, decor step and all
// retries are the server's code. Nothing touches the live server, its database, credits or users.
// Each design costs 1 to 4 Gemini images (~$0.07 each); the sheet says how many each one took.
// Usage (key from Railway, never printed):
//   cd ~/DecoHero-108/server && OUT_DIR=decor-v1 RUNS=2 railway run npx tsx <worktree>/server/scripts/xmas-decor-test.ts [case ...]
//   DECOR_STEP=off tests the one-prompt path. Flags are otherwise set here to what production runs (see FLAGS).
//   npx tsx scripts/xmas-decor-test.ts --index   rebuilds index.html from results.json + verdicts.json (no key)
// Output: ../store/<OUT_DIR>/<case>-r<run>-{sent,out,pair}.jpg, every model image as <case>-r<run>-gen<n>.jpg,
// results.json and index.html. Verdicts are judged by eye and kept in verdicts.json as
// { "<case>-r<run>": { "pass": true, "note": "..." } }.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "decor-test");

type Place = { x: number; y: number };
type Case = { name: string; file: string; style: string; tree?: Place; note: string };
const BEFORE = "store/rooms/before";
export const CASES: Case[] = [
  { name: "living-classic", file: "site/img/rooms/living-room-before.webp", style: "xmas-classic", note: "Classic, auto spot. Sofa, armchair, glass table, TV and pine chest stay put." },
  { name: "sala-tropical", file: "site/img/rooms/sala-panama-before.webp", style: "xmas-tropical", tree: { x: 0.2, y: 0.78 }, note: "Tropical, tapped front left. Two sofas, TV unit and stacked chairs stay put; tree on the tap." },
  { name: "dining-tartan", file: `${BEFORE}/dining-room.jpg`, style: "xmas-tartan", note: "Tartan, auto spot. Table, six chairs and sideboard stay put." },
  { name: "kids-winter", file: `${BEFORE}/kids-room.jpg`, style: "xmas-winter", note: "Winter, auto spot. Bed, bookcase, desk and chair stay put." },
  { name: "bedroom-nordic", file: `${BEFORE}/bedroom.jpg`, style: "xmas-nordic", note: "Nordic, auto spot. Bed, nightstand and clothes rail stay put." },
  { name: "office-coquette", file: `${BEFORE}/home-office.jpg`, style: "xmas-coquette", note: "Coquette, auto spot. Desk, office chair, shelf and boxes stay put." },
  { name: "terrace-classic", file: `${BEFORE}/terrace.jpg`, style: "xmas-classic", tree: { x: 0.3, y: 0.8 }, note: "Classic, tapped front left on the open concrete. Two chairs, stool, plants, hose and door stay put; tree on the tap." },
];

type Result = { key: string; name: string; run: number; status: number; images: number; frame: number | null; seconds: number; steps: string[] };
type Verdict = { pass: boolean; note: string };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const readJson = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);

function writeIndex() {
  const results = readJson<Result[]>(path.join(outDir, "results.json"), []);
  const verdicts = readJson<Record<string, Verdict>>(path.join(outDir, "verdicts.json"), {});
  const judged = results.filter((r) => verdicts[r.key]);
  const images = results.reduce((n, r) => n + r.images, 0);
  const rows = results.map((r) => {
    const c = CASES.find((x) => x.name === r.name)!;
    const v = verdicts[r.key];
    const badge = v ? `<span class="${v.pass ? "pass" : "fail"}">${v.pass ? "PASS" : "FAIL"}</span> ${esc(v.note)}` : "<span>not judged</span>";
    const gens = r.steps.map((s, i) => `<figure><img src="${r.key}-gen${i + 1}.jpg"><figcaption>Model image ${i + 1}: ${esc(s)}</figcaption></figure>`).join("");
    return `<h2>${r.key}</h2><p>${esc(c.note)}</p><p>${badge}</p>
<p>frameMatch of the served image against the photo: <b>${r.frame === null ? "n/a" : r.frame.toFixed(2)}</b> | model images: <b>${r.images}</b> | ${r.seconds} s | HTTP ${r.status}</p>
<div class=row><figure><img src="${r.key}-sent.jpg"><figcaption>Photo (with the tapped spot, if any)</figcaption></figure><figure><img src="${r.key}-out.jpg"><figcaption>Served</figcaption></figure></div>
<details><summary>Every model image of this design</summary><div class=row>${gens}</div></details>`;
  });
  fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Whole-room decor ${esc(path.basename(outDir))}</title>
<style>body{font:14px system-ui;margin:16px;max-width:1500px}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}img{width:100%}
.pass,.fail{font-weight:700;padding:2px 8px;border-radius:4px;color:#fff}.pass{background:#1a7f37}.fail{background:#c62828}</style>
<h1>Whole-room decor: ${esc(path.basename(outDir))}</h1>
<p>${judged.filter((r) => verdicts[r.key].pass).length}/${judged.length} pass | ${results.length} designs, ${images} model images (${results.length ? (images / results.length).toFixed(2) : "0"} per design)</p>${rows.join("")}`);
}

fs.mkdirSync(outDir, { recursive: true });
const args = process.argv.slice(2);
if (args.includes("--index")) {
  writeIndex();
  process.exit(0);
}

// The local app must never see the production database, webhook secret or web sign-in.
process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "decohero-decor-")), "test.db");
process.env.REVENUECAT_WEBHOOK_SECRET = "local-test-secret";
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.WEB_ORIGINS;
// What production runs (Railway, Nov 19 2026) plus the flags under test.
const FLAGS: Record<string, string> = { ROOM_DECOR: "on", TREE_CLEAR: "on", PLACE_CHECK: "on", FRAME_CHECK: "on", DECOR_STEP: process.env.DECOR_STEP ?? "on" };
for (const k of ["DOOR_CHECK", "REMOVE_NAMES", "TREE_REMOVE", "STYLE_REMOVE"]) delete process.env[k];
Object.assign(process.env, FLAGS);

const { createApp } = await import("../src/app.js");
const { askYesNo, generateRedesign, IMAGE_MODEL, locateTree, nameMarkedPieces } = await import("../src/gemini.js");
const { frameMatch } = await import("../src/frame.js");
const { drawMarker } = await import("../src/marker.js");

async function run(c: Case, n: number): Promise<Result> {
  const key = `${c.name}-r${n}`;
  const steps: string[] = [];
  // One app per design, so every model image can be filed under the design it belongs to.
  const generate = async (img: string, prompt: string) => {
    const out = await generateRedesign(img, prompt);
    steps.push(
      prompt.startsWith("Edit this photo: add a few small Christmas decorations")
        ? `decor step${prompt.includes("Correction:") ? " (retry)" : ""}`
        : `tree${prompt.includes("Room decoration rule") ? " + room decor in one prompt" : ""}${prompt.includes("redrew the whole room") ? " (frame retry)" : ""}${prompt.includes("put the tree in the wrong place") ? " (place retry)" : ""}`
    );
    fs.writeFileSync(path.join(outDir, `${key}-gen${steps.length}.jpg`), await sharp(out).jpeg({ quality: 85 }).toBuffer());
    return out;
  };
  const server = createApp(generate, IMAGE_MODEL, { askYesNo, locateTree, nameMarkedPieces }).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const id = crypto.randomUUID();
  const post = (p: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  try {
    // A paid account, so the served image carries no watermark.
    await post("/webhooks/revenuecat", { event: { id: crypto.randomUUID(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: id, transaction_id: `GPA.${key}.${Date.now()}` } }, { authorization: "Bearer local-test-secret" });
    const photo = fs.readFileSync(path.join(root, c.file));
    // What the server makes of the upload, for the sheet and the score.
    const input = await sharp(photo).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const sent = c.tree ? await drawMarker(input, c.tree) : input;
    fs.writeFileSync(path.join(outDir, `${key}-sent.jpg`), sent);
    const t0 = Date.now();
    const res = await post("/api/redesign", { image: photo.toString("base64"), styleId: c.style, ceilingCm: 250, treeCm: 213, place: c.tree, decorateRoom: true }, { "x-install-id": id });
    const json: any = await res.json().catch(() => null);
    const seconds = Math.round((Date.now() - t0) / 1000);
    let frame: number | null = null;
    if (res.status === 200 && json?.image) {
      const out = Buffer.from(json.image, "base64");
      fs.writeFileSync(path.join(outDir, `${key}-out.jpg`), out);
      frame = await frameMatch(input, out);
      const H = 720;
      const [a, b] = await Promise.all([sent, out].map((x) => sharp(x).resize({ height: H }).toBuffer({ resolveWithObject: true })));
      await sharp({ create: { width: a.info.width + b.info.width + 8, height: H, channels: 3, background: "#fff" } })
        .composite([{ input: a.data, left: 0, top: 0 }, { input: b.data, left: a.info.width + 8, top: 0 }])
        .jpeg({ quality: 82 }).toFile(path.join(outDir, `${key}-pair.jpg`));
    }
    console.log(`${key}: HTTP ${res.status}${json?.error ? ` ${json.error}` : ""} | ${steps.length} images (${steps.join(", ")}) | frame ${frame === null ? "n/a" : frame.toFixed(2)} | ${seconds} s`);
    return { key, name: c.name, run: n, status: res.status, images: steps.length, frame, seconds, steps };
  } finally {
    server.close();
  }
}

const names = args.filter((a) => !a.startsWith("--"));
const todo = names.length ? CASES.filter((c) => names.includes(c.name)) : [];
if (!todo.length) {
  console.log(`Name the cases to run (or "all"): ${CASES.map((c) => c.name).join(" ")}`);
  if (!names.includes("all")) process.exit(1);
}
const first = Number(process.env.FIRST_RUN ?? 1);
const runs = Number(process.env.RUNS ?? 1);
const jobs = (names.includes("all") ? CASES : todo).flatMap((c) => Array.from({ length: runs }, (_, i) => ({ c, n: first + i })));
console.log(`flags ${JSON.stringify(FLAGS)}, model ${IMAGE_MODEL}, ${jobs.length} designs`);
const file = path.join(outDir, "results.json");
// Three at a time; results of earlier runs in the same folder are kept.
for (let i = 0; i < jobs.length; i += 3) {
  const done = await Promise.all(jobs.slice(i, i + 3).map((j) => run(j.c, j.n)));
  const all = readJson<Result[]>(file, []).filter((r) => !done.some((d) => d.key === r.key)).concat(done);
  all.sort((a, b) => CASES.findIndex((c) => c.name === a.name) - CASES.findIndex((c) => c.name === b.name) || a.run - b.run);
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
}
writeIndex();
process.exit(0);
