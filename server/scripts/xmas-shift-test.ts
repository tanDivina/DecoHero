// Offline test (Nov 2026): can Gemini move ONE piece of furniture to make room for the tree without the room drifting?
// For every photo it makes two images with the production model: A = today's Christmas prompt (auto placement),
// B = the same prompt with a "you may slide one large piece" intro. Then a cheap vision judge answers
// "is anything else missing / duplicated / resized / restyled?" and writes the room-fit tip the proposal wanted,
// so both ideas can be judged on real output. Nothing touches the live server, credits or users.
//
// Usage (key from server/.env, never printed):
//   cd server && npx tsx --env-file=.env scripts/xmas-shift-test.ts [--cap N] photo1.jpg photo2.webp ...
// Output: ../store/xmas/shift-test/<name>-{before,A,B}.jpg + results.json + index.html (side-by-side sheet).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "..", "store", "xmas", "shift-test");
const STYLE = "xmas-classic";
const HARD_CAP = 44; // image generations per run: 20 photos x 2 + a little slack

const SHIFT_INTRO = `Edit this photo of a room by adding ONE Christmas tree to it. This is a careful photo edit, not a redesign.
To make the best spot for the tree you may slide or turn AT MOST ONE large piece of furniture (a sofa, armchair, table or
cabinet) a short distance along the floor, the way one person would rearrange the room before putting up a tree. If the
room already has a good free spot, move nothing. A moved piece stays the exact same piece: the same shape, size, color,
fabric, legs and cushions, drawn at the right scale for its new distance from the camera, and it still fits the room with
walkways and doors clear. Everything else stays exactly where it is. Nothing is removed, added (except the tree, its skirt
and gifts), duplicated, shrunk, restyled or recolored. The floor and wall a moved piece uncovers continue exactly like the
floor and wall around them. Keep the same walls, windows, doors, floor, ceiling, rugs, curtains, art, daylight, camera
position, lens and perspective.`;

const JUDGE_A =
  "The second image should be the first image with only a Christmas tree, its skirt and gifts added. Ignoring those, is any " +
  "furniture or object from the first image missing, moved, duplicated, resized, restyled or recolored in the second? " +
  "Answer only yes or no.";
const JUDGE_B =
  "The second image should be the first image with a Christmas tree, its skirt and gifts added, and AT MOST ONE large piece " +
  "of furniture slid or turned. Ignoring the tree and that one piece's new position, is any furniture or object from the " +
  "first image missing, duplicated, resized, restyled or recolored, or was more than one piece moved? Answer only yes or no.";
const TIP =
  "This is a photo of a room, and the second image shows where a Christmas tree was added. In one or two short sentences, " +
  "tell the owner whether moving one piece of furniture would give the tree a better spot, or say the current spot is fine.";

const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const cap = Math.min(HARD_CAP, Number(opt("--cap") ?? HARD_CAP));
const photos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--cap");
if (!photos.length) throw new Error("give one or more photo paths");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { timeout: 120_000 } });
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";
const TEXT_MODEL = process.env.DOOR_CHECK_MODEL || "gemini-3.5-flash-lite";
let made = 0;

const jpg = (b: Buffer, w = 1280) =>
  sharp(b).rotate().resize({ width: w, height: w, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
const part = (b: Buffer) => ({ inlineData: { mimeType: "image/jpeg", data: b.toString("base64") } });

async function image(input: Buffer, prompt: string): Promise<Buffer> {
  if (made >= cap) throw new Error(`cap ${cap} reached`);
  made++;
  const r = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [part(input), { text: prompt }] }],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });
  const p = r.candidates?.[0]?.content?.parts?.find((x) => x.inlineData?.data);
  if (!p?.inlineData?.data) throw new Error(`no image (${r.candidates?.[0]?.finishReason ?? "?"})`);
  return jpg(Buffer.from(p.inlineData.data, "base64"));
}
async function text(a: Buffer, b: Buffer, q: string): Promise<string> {
  const r = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [part(await jpg(a, 768)), part(await jpg(b, 768)), { text: q }] }],
  });
  return (r.text ?? "").trim();
}

fs.mkdirSync(outDir, { recursive: true });
const size = parseTreeSize(250, 213, treeCatalog(""))!;
const base = buildPrompt(STYLE, size, false, { clear: false })!;
const cut = base.indexOf("Stand the tree");
if (cut < 0) throw new Error("prompt layout changed: no 'Stand the tree'");
const shiftPrompt = `${SHIFT_INTRO}\n${base.slice(cut)}`;
console.log(`model ${IMAGE_MODEL}, judge ${TEXT_MODEL}, cap ${cap}, ${photos.length} photo(s)`);

const resultsFile = path.join(outDir, "results.json");
const results: Record<string, unknown>[] = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : [];
for (const file of photos) {
  const name = path.basename(file).replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const row: Record<string, unknown> = { name };
  try {
    const before = await jpg(fs.readFileSync(file));
    fs.writeFileSync(path.join(outDir, `${name}-before.jpg`), before);
    for (const [k, prompt, judge] of [["A", base, JUDGE_A], ["B", shiftPrompt, JUDGE_B]] as const) {
      const out = await image(before, prompt);
      fs.writeFileSync(path.join(outDir, `${name}-${k}.jpg`), out);
      row[`judge${k}`] = await text(before, out, judge).catch((e) => `error ${e}`);
      if (k === "A") row.tip = await text(before, out, TIP).catch((e) => `error ${e}`);
    }
  } catch (e) {
    row.error = String(e);
  }
  console.log(JSON.stringify(row));
  const i = results.findIndex((r) => r.name === name);
  if (i >= 0) results[i] = row; else results.push(row);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Shift test</title>
<style>body{font:14px system-ui;margin:16px;background:#f6f3ee}figure{margin:0}img{width:100%;border-radius:6px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:28px}h2{margin:8px 0}</style>
<h1>Furniture-shift test: before / A today's prompt / B shift prompt</h1>
${results.map((r) => `<h2>${esc(r.name)}</h2>${r.error ? `<p>error: ${esc(r.error)}</p>` : ""}
<p>Judge A (anything else changed?): <b>${esc(r.judgeA)}</b> | Judge B: <b>${esc(r.judgeB)}</b><br>Tip: <i>${esc(r.tip)}</i></p>
<div class=row>${["before", "A", "B"].map((k) => `<figure><img src="${esc(r.name)}-${k}.jpg"><figcaption>${k}</figcaption></figure>`).join("")}</div>`).join("")}`);
console.log(`done: ${made} image(s) made; sheet ${path.join(outDir, "index.html")}`);
