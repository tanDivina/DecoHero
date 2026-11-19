// Offline placement test (Nov 19 2026): does the tree land on the tapped spot, front-of-room spots above all?
// Runs the production marker, prompt, leak check, locator and the one place-check retry, and measures how far the
// tree's base (as the locator sees it) is from the spot. Nothing touches the live server, credits or users.
// Usage (key from Railway, never printed):
//   cd server && railway run npx tsx scripts/xmas-place-test.ts --label <name> [--no-retry] [case ...]
// Output: ../store/xmas-place/<label>-<case>-{sent,first,retry}.jpg + results.json + index.html (all labels side by side).
// Every image generation is counted in store/xmas-place/spent.json; the run stops at BUDGET.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, markerLeaked, type Place } from "../src/marker.js";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";
import { generateRedesign, locateTree } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", "xmas-place");
const BUDGET = 30;
const TOL_X = 0.12, TOL_Y = 0.2; // as in app.ts

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const BEDROOM = "store/rooms/before/bedroom.jpg";

type Case = { name: string; file: string; spot: Place; kind: "front" | "side" | "back" };
const CASES: Case[] = [
  { name: "living-front-centre", file: LIVING, spot: { x: 0.42, y: 0.9 }, kind: "front" },
  { name: "living-front-right", file: LIVING, spot: { x: 0.8, y: 0.88 }, kind: "front" },
  { name: "sala-front-left", file: SALA, spot: { x: 0.25, y: 0.88 }, kind: "front" },
  { name: "bedroom-front-left", file: BEDROOM, spot: { x: 0.35, y: 0.92 }, kind: "front" },
  { name: "sala-side-left", file: SALA, spot: { x: 0.1, y: 0.72 }, kind: "side" },
  { name: "living-side-right", file: LIVING, spot: { x: 0.9, y: 0.7 }, kind: "side" },
  { name: "sala-back", file: SALA, spot: { x: 0.42, y: 0.65 }, kind: "back" },
];

const args = process.argv.slice(2);
const li = args.indexOf("--label");
const label = li >= 0 ? args[li + 1] : "run";
const retry = !args.includes("--no-retry");
// --retry-from <label>: skip the first image, reuse that label's first attempt and only make the correction image.
const ri = args.indexOf("--retry-from");
const retryFrom = ri >= 0 ? args[ri + 1] : undefined;
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--label" && args[i - 1] !== "--retry-from");

fs.mkdirSync(outDir, { recursive: true });
const spentFile = path.join(outDir, "spent.json");
const spent = (): number => (fs.existsSync(spentFile) ? JSON.parse(fs.readFileSync(spentFile, "utf8")).images : 0);
const spend = () => {
  const n = spent();
  if (n >= BUDGET) throw new Error(`budget of ${BUDGET} images used up`);
  fs.writeFileSync(spentFile, JSON.stringify({ images: n + 1 }));
};

const miss = (at: Place, spot: Place) => Math.max(Math.abs(at.x - spot.x) / TOL_X, Math.abs(at.y - spot.y) / TOL_Y);
const dist = (at: Place, spot: Place) => Math.hypot(at.x - spot.x, at.y - spot.y);
const size = parseTreeSize(250, 213, treeCatalog(""))!;

type Row = { label: string; name: string; kind: string; spot: Place; first?: Place | null; retry?: Place | null; served?: string; error?: string; leaked?: boolean };

const resultsFile = path.join(outDir, "results.json");
const previous: Row[] = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : [];

async function locate(img: Buffer): Promise<Place | null> {
  const small = await sharp(img).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return locateTree(small.toString("base64"));
}

async function run(c: Case): Promise<Row> {
  const row: Row = { label, name: c.name, kind: c.kind, spot: c.spot };
  const f = (k: string) => path.join(outDir, `${label}-${c.name}-${k}.jpg`);
  try {
    const input = await sharp(fs.readFileSync(path.join(root, c.file)))
      .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const sent = await drawMarker(input, c.spot);
    fs.writeFileSync(f("sent"), sent);
    const old = retryFrom ? previous.find((r) => r.label === retryFrom && r.name === c.name) : undefined;
    if (old?.first) {
      fs.copyFileSync(path.join(outDir, `${retryFrom}-${c.name}-first.jpg`), f("first"));
      row.first = old.first;
    } else {
      spend();
      const out = await generateRedesign(sent.toString("base64"), buildPrompt("xmas-classic", size, c.spot, { clear: true })!);
      await sharp(out).jpeg({ quality: 85 }).toFile(f("first"));
      row.leaked = await markerLeaked(input, out);
      row.first = await locate(out);
    }
    row.served = "first";
    if (retry && row.first && miss(row.first, c.spot) > 1) {
      spend();
      const again = await generateRedesign(sent.toString("base64"), buildPrompt("xmas-classic", size, c.spot, { clear: true, placeFix: row.first })!);
      await sharp(again).jpeg({ quality: 85 }).toFile(f("retry"));
      row.retry = await locate(again);
      if (await markerLeaked(input, again)) row.served = "first (marker left in the retry)";
      else if (row.retry && miss(row.retry, c.spot) < miss(row.first, c.spot)) row.served = "retry";
    }
  } catch (e) {
    row.error = String(e).slice(0, 200);
  }
  console.log(JSON.stringify(row));
  return row;
}

const rows = await Promise.all(CASES.filter((c) => !only.length || only.includes(c.name)).map(run));
const all: Row[] = previous;
for (const r of rows) {
  const i = all.findIndex((a) => a.label === r.label && a.name === r.name);
  if (i >= 0) all[i] = r; else all.push(r);
}
fs.writeFileSync(resultsFile, JSON.stringify(all, null, 2));

const pc = (v: number) => (v * 100).toFixed(1);
const fig = (r: Row, k: "sent" | "first" | "retry", at?: Place | null) => {
  if (!fs.existsSync(path.join(outDir, `${r.label}-${r.name}-${k}.jpg`))) return "<figure></figure>";
  const dot = (p: Place, cls: string) => `<i class="${cls}" style="left:${pc(p.x)}%;top:${pc(p.y)}%"></i>`;
  const cap = k === "sent" ? `sent: spot ${r.spot.x.toFixed(2)}, ${r.spot.y.toFixed(2)}`
    : at ? `${k}: tree at ${at.x.toFixed(2)}, ${at.y.toFixed(2)} | dx ${(at.x - r.spot.x).toFixed(2)}, dy ${(at.y - r.spot.y).toFixed(2)}, distance ${dist(at, r.spot).toFixed(2)}${miss(at, r.spot) > 1 ? " (MISS)" : " (on the spot)"}`
    : `${k}: no tree base found`;
  return `<figure><div class=pic><img src="${r.label}-${r.name}-${k}.jpg">${k === "sent" ? "" : dot(r.spot, "t")}${at ? dot(at, "m") : ""}</div><figcaption>${cap}</figcaption></figure>`;
};
const served = (r: Row) => (r.served === "retry" ? r.retry : r.first);
const labels = [...new Set(all.map((r) => r.label))];
const names = CASES.map((c) => c.name).filter((n) => all.some((r) => r.name === n));
const cell = (r?: Row) => {
  const p = r && served(r);
  return r ? (p ? `${dist(p, r.spot).toFixed(2)}${miss(p, r.spot) > 1 ? " miss" : ""}${r.served === "retry" ? " (retry)" : ""}` : r.error ? "error" : "no tree") : "";
};
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Tree placement test</title>
<style>body{font:14px system-ui;margin:16px;background:#f6f3ee}figure{margin:0}img{width:100%;display:block;border-radius:6px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}.pic{position:relative}
.pic i{position:absolute;width:14px;height:14px;margin:-9px;border-radius:50%;border:2px solid #fff}.t{background:#f0f}.m{background:#0c3}
table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}</style>
<h1>Tree placement: tapped spot vs where the tree landed</h1>
<p>Magenta dot = tapped spot, green dot = tree base as the locator measured it. Distance is a fraction of the image
(0.10 = a tenth of the picture). Miss = outside the server's tolerance (0.12 sideways, 0.20 in depth).</p>
<table><tr><th>case</th>${labels.map((l) => `<th>${l}</th>`).join("")}</tr>
${names.map((n) => `<tr><td>${n}</td>${labels.map((l) => `<td>${cell(all.find((r) => r.label === l && r.name === n))}</td>`).join("")}</tr>`).join("")}</table>
${all.map((r) => `<h2>${r.label}: ${r.name} (${r.kind})</h2><p>served: ${r.served ?? "nothing"}${r.leaked ? " | marker leaked in the first image" : ""}${r.error ? ` | error: ${r.error}` : ""}</p>
<div class=row>${fig(r, "sent")}${fig(r, "first", r.first)}${fig(r, "retry", r.retry)}</div>`).join("")}`);
console.log(`spent ${spent()}/${BUDGET} images; sheet ${path.join(outDir, "index.html")}`);
