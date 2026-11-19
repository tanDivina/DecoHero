// Offline test for 1.0.8 (Nov 2026): "Take out furniture" on regular redesigns (STYLE_REMOVE) and
// "Decorate whole room" (ROOM_DECOR), through the production markers, prompts and leak checks.
// Nothing touches the live server, credits or users. One Gemini image per case (~$0.07).
// Usage (key from Railway, never printed):
//   cd server && railway run npx tsx scripts/test-108.ts [case ...]
// Output: ../store/test-108/<case>-{sent,out}.jpg + index.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, drawRemoveMarkers, markerLeaked, removeMarkerLeaked, removeMarkerLeakedAt, type Place } from "../src/marker.js";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";
import { generateRedesign } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", "test-108");

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const KIDS = "store/rooms/before/kids-room.jpg";

type Case = { name: string; file: string; style: string; tree?: Place; remove?: Place[]; decor?: boolean; note: string };
const CASES: Case[] = [
  { name: "style-living-armchair", file: LIVING, style: "scandinavian", remove: [{ x: 0.79, y: 0.55 }], note: "Scandinavian redesign without the armchair by the window" },
  { name: "style-sala-loveseat", file: SALA, style: "coastal", remove: [{ x: 0.68, y: 0.72 }], note: "Coastal redesign without the front loveseat" },
  { name: "style-kids-desk", file: KIDS, style: "japandi", remove: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.77 }], note: "Japandi redesign without desk and chair" },
  { name: "decor-classic", file: LIVING, style: "xmas-classic", tree: { x: 0.62, y: 0.575 }, decor: true, note: "classic, whole room" },
  { name: "decor-winter", file: SALA, style: "xmas-winter", tree: { x: 0.16, y: 0.70 }, decor: true, note: "winter, whole room" },
  { name: "decor-nordic", file: LIVING, style: "xmas-nordic", tree: { x: 0.62, y: 0.575 }, decor: true, note: "nordic, whole room" },
  { name: "decor-coquette", file: KIDS, style: "xmas-coquette", tree: { x: 0.82, y: 0.86 }, decor: true, note: "coquette, whole room (bedroom)" },
  { name: "decor-tartan-remove", file: SALA, style: "xmas-tartan", tree: { x: 0.68, y: 0.82 }, remove: [{ x: 0.68, y: 0.72 }], decor: true, note: "tartan, whole room + loveseat removed" },
  { name: "decor-tropical", file: SALA, style: "xmas-tropical", tree: { x: 0.16, y: 0.70 }, decor: true, note: "tropical, whole room" },
];

fs.mkdirSync(outDir, { recursive: true });
const size = parseTreeSize(250, 213, treeCatalog(""))!;
const only = process.argv.slice(2);
const rows: string[] = [];
for (const c of CASES.filter((c) => !only.length || only.includes(c.name))) {
  const input = await sharp(fs.readFileSync(path.join(root, c.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const isTree = !!c.tree;
  let sent = c.tree ? await drawMarker(input, c.tree) : input;
  if (c.remove) sent = await drawRemoveMarkers(sent, c.remove);
  const prompt = isTree
    ? buildPrompt(c.style, size, c.tree!, { clear: true, remove: !!c.remove, decorateRoom: !!c.decor })!
    : buildPrompt(c.style, {}, false, { remove: !!c.remove })!;
  fs.writeFileSync(path.join(outDir, `${c.name}-sent.jpg`), sent);
  try {
    const out = await generateRedesign(sent.toString("base64"), prompt);
    await sharp(out).jpeg({ quality: 85 }).toFile(path.join(outDir, `${c.name}-out.jpg`));
    const leaks = [
      c.tree && (await markerLeaked(input, out)) ? "magenta" : "",
      c.remove && (isTree ? await removeMarkerLeaked(input, out) : await removeMarkerLeakedAt(input, out, c.remove)) ? "cyan" : "",
    ].filter(Boolean);
    console.log(`${c.name}: ok${leaks.length ? ` (LEAKED: ${leaks.join(", ")}; the server would refund)` : ""}`);
  } catch (e) {
    console.log(`${c.name}: ${e}`);
  }
  rows.push(`<h2>${c.name}</h2><p>${c.note}</p><div class=row><img src="${c.name}-sent.jpg"><img src="${c.name}-out.jpg"></div>`);
}
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>1.0.8 test</title>
<style>body{font:14px system-ui;margin:16px}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}img{width:100%}</style>
<h1>1.0.8: sent (markers) / result</h1>${rows.join("")}`);
