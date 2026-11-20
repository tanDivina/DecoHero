// Room-mode "Take out furniture" test set (Nov 19 2026): 10 cases, each run twice, through the production markers,
// prompts and checks. Nothing touches the live server, credits or users.
// Usage (key from Railway, never printed):
//   cd server && railway run npx tsx scripts/room-remove-test.ts [case ...]
//   GEMINI_API_KEY=none npx tsx scripts/room-remove-test.ts --index   rebuilds index.html only (no generation)
// Env: MODE=one (single prompt, STYLE_REMOVE as shipped) | two (remove edit, then restyle; default)
//      RUNS=a,b   NAMES=1 (REMOVE_NAMES pre-pass)   OUT_DIR=room-remove-v1   RETRY=0 (no second edit)   STEP1_ONLY=1
//      REUSE_MID=<sheet> takes step one from that sheet (REUSE_RUN=a: from its run a), so only step two is paid again
// Output: ../store/<OUT_DIR>/<case>-<run>-{sent,mid,out}.jpg + results.json + index.html (verdicts.json is merged in if present)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawRemoveMarkers, removeMarkerLeakedAt, type Place } from "../src/marker.js";
import { buildPrompt, removeEditPrompt } from "../src/styles.js";
import { generateRedesign, nameMarkedPieces, type MarkedPiece } from "../src/gemini.js";
import { frameMatch, patchMatch, pieceGone } from "../src/frame.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "room-remove-v1");
const MODE = process.env.MODE ?? "two";
const RUNS = (process.env.RUNS ?? "a,b").split(",");
// REUSE_RUN=a with RUNS=c: run c takes its step one from run a of REUSE_MID.
const REUSE_RUN = process.env.REUSE_RUN;
const NAMES = !!process.env.NAMES;

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const KIDS = "store/rooms/before/kids-room.jpg";
const BEDROOM = "store/rooms/before/bedroom.jpg";
const DINING = "store/rooms/before/dining-room.jpg";
const OFFICE = "store/rooms/before/home-office.jpg";
const TERRACE = "store/rooms/before/terrace.jpg";

type Case = { name: string; file: string; style: string; remove: Place[]; note: string };
export const CASES: Case[] = [
  { name: "living-armchair-japandi", file: LIVING, style: "japandi", remove: [{ x: 0.79, y: 0.55 }], note: "single piece: armchair next to the sofa" },
  { name: "living-table-boho", file: LIVING, style: "boho", remove: [{ x: 0.63, y: 0.66 }], note: "single piece: glass coffee table" },
  { name: "sala-chairs-tropical", file: SALA, style: "tropical-modern", remove: [{ x: 0.45, y: 0.50 }], note: "small piece: stacked plastic chairs" },
  { name: "sala-loveseat-industrial", file: SALA, style: "industrial", remove: [{ x: 0.68, y: 0.72 }], note: "big piece: front loveseat, touching the back sofa" },
  { name: "bedroom-nightstand-scandi", file: BEDROOM, style: "scandinavian", remove: [{ x: 0.25, y: 0.72 }], note: "small piece: nightstand with lamp, touching the bed" },
  { name: "dining-chair-farmhouse", file: DINING, style: "farmhouse", remove: [{ x: 0.68, y: 0.62 }], note: "one chair of a dining set (right-hand end)" },
  { name: "kids-desk-coastal", file: KIDS, style: "coastal", remove: [{ x: 0.86, y: 0.76 }], note: "piece touching a neighbour: desk goes, its chair stays" },
  { name: "office-chair-box-minimal", file: OFFICE, style: "modern-minimal", remove: [{ x: 0.92, y: 0.70 }, { x: 0.42, y: 0.80 }], note: "two pieces: office chair and cardboard box" },
  { name: "terrace-table-chair-tropical", file: TERRACE, style: "tropical-modern", remove: [{ x: 0.55, y: 0.65 }, { x: 0.70, y: 0.72 }], note: "two pieces: plastic table and the front chair" },
  { name: "kids-desk-chair-japandi", file: KIDS, style: "japandi", remove: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.77 }], note: "two pieces: desk and its chair" },
];

fs.mkdirSync(outDir, { recursive: true });
const resultsFile = path.join(outDir, "results.json");
const results: Record<string, Record<string, unknown>> = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : {};
const only = process.argv.slice(2);
const f2 = (v: number | null) => (v === null ? "n/a" : v.toFixed(2));

for (const c of CASES.filter((c) => !only.length || only.includes(c.name))) {
  const input = await sharp(fs.readFileSync(path.join(root, c.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const sent = await drawRemoveMarkers(input, c.remove);
  fs.writeFileSync(path.join(outDir, `${c.name}-before.jpg`), input);
  fs.writeFileSync(path.join(outDir, `${c.name}-sent.jpg`), sent);
  for (const run of RUNS) {
    const key = `${c.name}-${run}`;
    const r: Record<string, unknown> = { mode: MODE, names: NAMES, images: 0 };
    const t0 = Date.now();
    try {
      let pieces: MarkedPiece[] | undefined;
      if (NAMES) {
        try { pieces = await nameMarkedPieces(sent.toString("base64"), c.remove.length); r.pieces = pieces; } catch (e) { r.namesError = String(e).slice(0, 120); }
      }
      let out: Buffer;
      if (MODE === "one") {
        out = await generateRedesign(sent.toString("base64"), buildPrompt(c.style, {}, false, { remove: true, pieces })!);
        r.images = 1;
        r.leak = await removeMarkerLeakedAt(input, out, c.remove);
      } else {
        // The server's flow (app.ts): edit, check it locally, one retry if a marked piece is still there or the room was redrawn.
        // REUSE_MID=<dir>: take step one from an earlier sheet (only step two is paid again).
        const reuse = process.env.REUSE_MID ? path.join(root, "store", process.env.REUSE_MID, `${c.name}-${REUSE_RUN ?? run}-mid.jpg`) : "";
        let mid = reuse ? fs.readFileSync(reuse) : await generateRedesign(sent.toString("base64"), removeEditPrompt(pieces));
        r.images = reuse ? 0 : 1;
        if (reuse) r.reusedMid = process.env.REUSE_MID;
        let frame = await frameMatch(input, mid);
        let gone = await Promise.all(c.remove.map((p) => pieceGone(input, mid, p)));
        let leak = await removeMarkerLeakedAt(input, mid, c.remove);
        r.first = { frame, gone, leak, patch: await Promise.all(c.remove.map((p) => patchMatch(input, mid, p))) };
        if (process.env.RETRY !== "0" && (leak || (frame !== null && frame < 0.4) || gone.some((g) => g === false))) {
          const again = await generateRedesign(sent.toString("base64"), removeEditPrompt(pieces));
          r.images = 2;
          const frame2 = await frameMatch(input, again);
          const gone2 = await Promise.all(c.remove.map((p) => pieceGone(input, again, p)));
          const leak2 = await removeMarkerLeakedAt(input, again, c.remove);
          r.retry = { frame: frame2, gone: gone2, leak: leak2, patch: await Promise.all(c.remove.map((p) => patchMatch(input, again, p))) };
          const score = (l: boolean, f: number | null, g: (boolean | null)[]) => (l ? -10 : 0) + (f !== null && f < 0.4 ? -5 : 0) - g.filter((x) => x === false).length;
          if (score(leak2, frame2, gone2) > score(leak, frame, gone)) { mid = again; frame = frame2; gone = gone2; leak = leak2; r.servedRetry = true; }
        }
        r.leak = leak;
        r.midMs = Date.now() - t0;
        await sharp(mid).jpeg({ quality: 88 }).toFile(path.join(outDir, `${key}-mid.jpg`));
        if (process.env.STEP1_ONLY) { r.ms = Date.now() - t0; console.log(`${key}: step 1 ${JSON.stringify(r)}`); results[key] = r; continue; }
        // Step two gets what the server would send: a 1280 px JPEG of the cleaned photo.
        const clean = await sharp(mid).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
        out = await generateRedesign(clean.toString("base64"), buildPrompt(c.style, {}, false, { keepLayout: true })!);
        r.images = (r.images as number) + 1;
      }
      await sharp(out).jpeg({ quality: 85 }).toFile(path.join(outDir, `${key}-out.jpg`));
      r.frameOut = await frameMatch(input, out);
      r.ms = Date.now() - t0;
      console.log(`${key}: ok ${JSON.stringify({ ...r, pieces: undefined })}`);
    } catch (e) {
      r.error = String(e).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 200);
      console.log(`${key}: ${r.error}`);
    }
    results[key] = r;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 1));
  }
}

// The sheet lists every run on disk, with my verdicts (verdicts.json: {"<case>-<run>": {pass, note}}) when present.
const verdictsFile = path.join(outDir, "verdicts.json");
const verdicts: Record<string, { pass: boolean; note: string }> = fs.existsSync(verdictsFile) ? JSON.parse(fs.readFileSync(verdictsFile, "utf8")) : {};
// baseline.json: {"<case>": [{img, pass, note}]}, results of the single prompt from earlier sheets, judged the same way.
const baselineFile = path.join(outDir, "baseline.json");
const baseline: Record<string, { img: string; pass: boolean; note: string }[]> = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, "utf8")) : {};
const basePass = Object.values(baseline).flat().filter((b) => b.pass).length;
const baseAll = Object.values(baseline).flat().length;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rows: string[] = [];
let pass = 0, judged = 0;
for (const c of CASES) {
  const keys = Object.keys(results).filter((k) => k.startsWith(`${c.name}-`)).sort();
  if (!keys.length) continue;
  rows.push(`<h2>${c.name}</h2><p>${esc(c.note)} (${c.style})</p>`);
  for (const [i, b] of (baseline[c.name] ?? []).entries()) {
    rows.push(`<h3>before this work, run ${i + 1} <span class=${b.pass ? "ok" : "bad"}>${b.pass ? "PASS" : "FAIL"}</span></h3><p>${esc(b.note)} <small>single prompt (STYLE_REMOVE as shipped), 1 image call</small></p>
<div class=row><figure><img src="${c.name}-before.jpg"><figcaption>before</figcaption></figure><figure><img src="${c.name}-sent.jpg"><figcaption>marked</figcaption></figure><figure><img src="${b.img}"><figcaption>after (single prompt)</figcaption></figure></div>`);
  }
  for (const key of keys) {
    const r = results[key] as { images?: number; ms?: number; first?: { frame: number | null; gone: (boolean | null)[] }; servedRetry?: boolean; error?: string };
    const v = verdicts[key];
    if (v) { judged++; if (v.pass) pass++; }
    const hasMid = fs.existsSync(path.join(outDir, `${key}-mid.jpg`));
    rows.push(`<h3>${key} ${v ? `<span class=${v.pass ? "ok" : "bad"}>${v.pass ? "PASS" : "FAIL"}</span>` : ""}</h3>
<p>${v ? esc(v.note) : ""} <small>${r.images ?? "?"} image call(s), ${r.ms ? Math.round(r.ms / 1000) : "?"} s${r.first ? `, edit frame ${f2(r.first.frame)}, marked piece gone: ${r.first.gone.join("/")}` : ""}${r.servedRetry ? ", retry served" : ""}${r.error ? `, ERROR ${esc(r.error)}` : ""}</small></p>
<div class=row><figure><img src="${c.name}-before.jpg"><figcaption>before</figcaption></figure><figure><img src="${c.name}-sent.jpg"><figcaption>marked</figcaption></figure>${hasMid ? `<figure><img src="${key}-mid.jpg"><figcaption>step 1: taken out</figcaption></figure>` : ""}<figure><img src="${key}-out.jpg"><figcaption>after</figcaption></figure></div>`);
  }
}
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Room removal test</title>
<style>body{font:14px system-ui;margin:16px}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%}.ok{color:#0a7a2f}.bad{color:#b00020}h2{margin-top:32px;border-top:1px solid #ccc;padding-top:12px}</style>
<h1>Take out furniture on room redesigns (${esc(process.env.OUT_DIR ?? "room-remove-v1")})</h1>
<p>${judged ? `${pass} of ${judged} runs pass.` : "Not judged yet."}${baseAll ? ` Before this work (single prompt): ${basePass} of ${baseAll}.` : ""} Pass = marked pieces gone, no unmarked piece lost, nothing new invented, layout and camera unchanged, style applied.</p>${rows.join("")}`);
