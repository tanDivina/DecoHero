// Offline test (Nov 2026, production prompt + markers since 1.0.7): the user taps the furniture they allow us to take out (cyan X markers) and the tree spot
// (the usual magenta marker). Does Gemini remove exactly the marked pieces and nothing else?
// Usage (key from Railway, never printed):
//   cd server && railway run npx tsx scripts/xmas-remove-test.ts
// Output: ../store/xmas/remove-test/<case>-{sent,out}.jpg + index.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, drawRemoveMarkers, removeMarkerLeaked, type Place } from "../src/marker.js";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";
import { generateRedesign } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", "xmas", process.env.OUT ?? "remove-test");
const STYLE = "xmas-classic";

type Case = { name: string; file: string; tree: Place; remove: Place[]; note: string };
const CASES: Case[] = [
  { name: "sala-loveseat", file: "site/img/rooms/sala-panama-before.webp", tree: { x: 0.68, y: 0.82 }, remove: [{ x: 0.68, y: 0.72 }], note: "remove the front loveseat, tree where it stood" },
  { name: "sala-chairs", file: "site/img/rooms/sala-panama-before.webp", tree: { x: 0.46, y: 0.58 }, remove: [{ x: 0.46, y: 0.49 }], note: "remove the stacked plastic chairs only" },
  { name: "kids-desk-chair", file: "store/rooms/before/kids-room.jpg", tree: { x: 0.82, y: 0.86 }, remove: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.77 }], note: "remove desk AND chair" },
  { name: "kids-desk-only", file: "store/rooms/before/kids-room.jpg", tree: { x: 0.86, y: 0.88 }, remove: [{ x: 0.86, y: 0.76 }], note: "remove the desk, KEEP the chair" },
  { name: "living-armchair", file: "site/img/rooms/living-room-before.webp", tree: { x: 0.79, y: 0.63 }, remove: [{ x: 0.79, y: 0.55 }], note: "remove the armchair by the window" },
  { name: "living-table", file: "site/img/rooms/living-room-before.webp", tree: { x: 0.64, y: 0.72 }, remove: [{ x: 0.64, y: 0.66 }], note: "remove the glass coffee table" },
];

fs.mkdirSync(outDir, { recursive: true });
const size = parseTreeSize(250, 213, treeCatalog(""))!;
const only = process.argv.slice(2);
const rows: string[] = [];
for (const c of CASES.filter((c) => !only.length || only.includes(c.name))) {
  const input = await sharp(fs.readFileSync(path.join(root, c.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  // The production path: the same markers and prompt the server builds for a request with `remove` (TREE_REMOVE=on).
  const sent = await drawRemoveMarkers(await drawMarker(input, c.tree), c.remove);
  const prompt = buildPrompt(STYLE, size, c.tree, { clear: true, remove: true })!;
  fs.writeFileSync(path.join(outDir, `${c.name}-sent.jpg`), sent);
  try {
    const out = await generateRedesign(sent.toString("base64"), prompt);
    await sharp(out).jpeg({ quality: 85 }).toFile(path.join(outDir, `${c.name}-out.jpg`));
    console.log(`${c.name}: ok${(await removeMarkerLeaked(input, out)) ? " (cyan marker LEAKED: the server would refund)" : ""}`);
  } catch (e) {
    console.log(`${c.name}: ${e}`);
  }
  rows.push(`<h2>${c.name}</h2><p>${c.note}</p><div class=row><img src="${c.name}-sent.jpg"><img src="${c.name}-out.jpg"></div>`);
}
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Remove test</title>
<style>body{font:14px system-ui;margin:16px}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}img{width:100%}</style>
<h1>User-chosen removal: sent (markers) / result</h1>${rows.join("")}`);
