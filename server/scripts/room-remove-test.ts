// Room-mode "Take out furniture" test set (Nov 19 2026): 10 cases, each run twice, through the production markers,
// prompts and checks. Nothing touches the live server, credits or users.
// Usage (key from Railway, never printed):
//   cd server && railway run npx tsx scripts/room-remove-test.ts [case ...]
//   GEMINI_API_KEY=none npx tsx scripts/room-remove-test.ts --index   rebuilds index.html only (no generation)
//   MODE=app runs the server's own app locally (createApp, as index.ts does) with what production runs for removals
//   (STYLE_REMOVE, STYLE_REMOVE_TWO_STEP, REMOVE_NAMES) plus STYLE_REMOVE_CHECK (CHECK=off switches it off), and posts
//   to /api/redesign like the phone. Every model image is kept as <case>-<run>-gen<n>.jpg. REPLAY=<abs sheet dir> (with
//   REPLAY_RUN=a) takes the edit and the restyle from that sheet, so only a repair is paid for.
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
import crypto from "node:crypto";
import os from "node:os";
import type { AddressInfo } from "node:net";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "room-remove-v1");
const MODE = process.env.MODE ?? "two";
const RUNS = (process.env.RUNS ?? "a,b").split(",");
// REUSE_RUN=a with RUNS=c: run c takes its step one from run a of REUSE_MID.
const REUSE_RUN = process.env.REUSE_RUN;
const NAMES = !!process.env.NAMES;

import { CASES } from "./room-remove-cases.js";

/** One design through the real app: returns what each model image was and saves them next to the served design. */
async function viaApp(c: (typeof CASES)[number], key: string, input: Buffer): Promise<Record<string, unknown>> {
  process.env.DB_PATH ??= path.join(fs.mkdtempSync(path.join(os.tmpdir(), "decohero-remove-")), "test.db");
  process.env.REVENUECAT_WEBHOOK_SECRET = "local-test-secret";
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.WEB_ORIGINS;
  Object.assign(process.env, { STYLE_REMOVE: "on", STYLE_REMOVE_TWO_STEP: "on", REMOVE_NAMES: "on", STYLE_REMOVE_CHECK: process.env.CHECK ?? "on" });
  const { createApp } = await import("../src/app.js");
  const { askYesNo, checkRemovedPieces, IMAGE_MODEL, locateTree, pickTreeSpot } = await import("../src/gemini.js");
  const steps: string[] = [];
  const replay = process.env.REPLAY ? [`${c.name}-${REUSE_RUN ?? key.slice(c.name.length + 1)}-mid.jpg`, `${c.name}-${REUSE_RUN ?? key.slice(c.name.length + 1)}-${process.env.REPLAY_OUT ?? "out"}.jpg`].map((f) => path.join(process.env.REPLAY!, f)) : [];
  let paid = 0;
  const generate = async (img: string, prompt: string) => {
    const step = prompt.includes("careful photo repair") ? "repair (fill)" : prompt.startsWith("Edit this photo of a room") ? "edit" : prompt.startsWith("Restyle the room") ? "restyle" : "single prompt";
    // Replay only stands in for the first edit and the restyle.
    const from = steps.length < 2 && step !== "single prompt" ? replay[steps.length] : undefined;
    const out = from ? fs.readFileSync(from) : await generateRedesign(img, prompt);
    if (!from) paid++;
    steps.push(`${step}${from ? " (replayed)" : ""}`);
    fs.writeFileSync(path.join(outDir, `${key}-gen${steps.length}.jpg`), await sharp(out).jpeg({ quality: 88 }).toBuffer());
    if (step.startsWith("repair")) fs.writeFileSync(path.join(outDir, `${key}-repair-sent.jpg`), Buffer.from(img, "base64"));
    return out;
  };
  const checks: unknown[] = [];
  const check: typeof checkRemovedPieces = async (a, b, n) => { const m = await checkRemovedPieces(a, b, n); checks.push(m); return m; };
  const server = createApp(generate, IMAGE_MODEL, { askYesNo, locateTree, nameMarkedPieces, pickTreeSpot, checkRemovedPieces: check }).listen(0);
  await new Promise((res) => server.once("listening", res));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const id = crypto.randomUUID();
  const post = (p: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  try {
    await post("/webhooks/revenuecat", { event: { id: crypto.randomUUID(), type: "NON_RENEWING_PURCHASE", product_id: "credits_15", app_user_id: id, transaction_id: `GPA.${key}.${Date.now()}` } }, { authorization: "Bearer local-test-secret" });
    const res = await post("/api/redesign", { image: input.toString("base64"), styleId: c.style, remove: c.remove }, { "x-install-id": id });
    const json: any = await res.json().catch(() => null);
    if (res.status !== 200 || !json?.image) throw new Error(`HTTP ${res.status} ${json?.error ?? ""}`);
    fs.writeFileSync(path.join(outDir, `${key}-out.jpg`), Buffer.from(json.image, "base64"));
    const mid = steps.findIndex((x) => x.startsWith("edit"));
    // The last edit before the restyle is not always the one that was used; the sheet shows the first.
    if (mid >= 0) fs.copyFileSync(path.join(outDir, `${key}-gen${mid + 1}.jpg`), path.join(outDir, `${key}-mid.jpg`));
    return { mode: "app", images: paid, steps, checks };
  } finally {
    server.close();
  }
}

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
      if (MODE === "app") {
        Object.assign(r, await viaApp(c, key, input));
        r.frameOut = await frameMatch(input, fs.readFileSync(path.join(outDir, `${key}-out.jpg`)));
        r.ms = Date.now() - t0;
        console.log(`${key}: ok ${JSON.stringify(r)}`);
        results[key] = r;
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 1));
        continue;
      }
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
    const r = results[key] as { steps?: string[]; checks?: { kind: string; before: number; after: number; box?: unknown }[][]; images?: number; ms?: number; first?: { frame: number | null; gone: (boolean | null)[] }; servedRetry?: boolean; error?: string };
    const v = verdicts[key];
    if (v) { judged++; if (v.pass) pass++; }
    const hasMid = fs.existsSync(path.join(outDir, `${key}-mid.jpg`));
    rows.push(`<h3>${key} ${v ? `<span class=${v.pass ? "ok" : "bad"}>${v.pass ? "PASS" : "FAIL"}</span>` : ""}</h3>
<p>${v ? esc(v.note) : ""} <small>${r.images ?? "?"} image call(s), ${r.ms ? Math.round(r.ms / 1000) : "?"} s${r.first ? `, edit frame ${f2(r.first.frame)}, marked piece gone: ${r.first.gone.join("/")}` : ""}${r.servedRetry ? ", retry served" : ""}${r.error ? `, ERROR ${esc(r.error)}` : ""}</small></p>
<div class=row><figure><img src="${c.name}-before.jpg"><figcaption>before</figcaption></figure><figure><img src="${c.name}-sent.jpg"><figcaption>marked</figcaption></figure>${hasMid ? `<figure><img src="${key}-mid.jpg"><figcaption>step 1: taken out</figcaption></figure>` : ""}<figure><img src="${key}-out.jpg"><figcaption>after${r.steps?.some((x) => x.startsWith("repair")) ? " (served: the repair)" : ""}</figcaption></figure></div>${r.steps ? `<details><summary>Every model image: ${esc(r.steps.join(", "))}. Removal check (cleaned photo, then restyle): ${esc((r.checks ?? []).map((m) => m.map((x) => `${x.kind} ${x.before} to ${x.after}${x.box ? ", one on the marked place" : ""}`).join("; ")).join(" | "))}</summary><div class=row>${r.steps.map((x, i) => `<figure><img src="${key}-gen${i + 1}.jpg"><figcaption>${i + 1}: ${esc(x)}</figcaption></figure>`).join("")}</div></details>` : ""}`);
  }
}
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Room removal test</title>
<style>body{font:14px system-ui;margin:16px}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%}.ok{color:#0a7a2f}.bad{color:#b00020}h2{margin-top:32px;border-top:1px solid #ccc;padding-top:12px}</style>
<h1>Take out furniture on room redesigns (${esc(process.env.OUT_DIR ?? "room-remove-v1")})</h1>
<p>${judged ? `${pass} of ${judged} runs pass.` : "Not judged yet."}${baseAll ? ` Before this work (single prompt): ${basePass} of ${baseAll}.` : ""} Pass = marked pieces gone, no unmarked piece lost, nothing new invented, layout and camera unchanged, style applied.</p>${rows.join("")}`);
