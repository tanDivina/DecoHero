// v3 (Nov 19 2026): 10 STYLE_REMOVE cases after the layout-lock prompt. Offline test for 1.0.8 (Nov 2026): "Take out furniture" on regular redesigns (STYLE_REMOVE) and
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
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "test-108-v3");

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const KIDS = "store/rooms/before/kids-room.jpg";
const BEDROOM = "store/rooms/before/bedroom.jpg";
const DINING = "store/rooms/before/dining-room.jpg";
const OFFICE = "store/rooms/before/home-office.jpg";
const TERRACE = "store/rooms/before/terrace.jpg";

type Case = { name: string; file: string; style: string; tree?: Place; remove?: Place[]; decor?: boolean; note: string };
const CASES: Case[] = [
  { name: "living-armchair-japandi", file: LIVING, style: "japandi", remove: [{ x: 0.79, y: 0.55 }], note: "Japandi without the armchair (failed on the phone Nov 19)" },
  { name: "living-armchair-minimal", file: LIVING, style: "modern-minimal", remove: [{ x: 0.79, y: 0.55 }], note: "Modern minimal without the armchair" },
  { name: "living-table-boho", file: LIVING, style: "boho", remove: [{ x: 0.63, y: 0.66 }], note: "Boho without the glass coffee table" },
  { name: "sala-chairs-tropical", file: SALA, style: "tropical-modern", remove: [{ x: 0.45, y: 0.50 }], note: "Tropical modern without the stacked plastic chairs" },
  { name: "sala-loveseat-industrial", file: SALA, style: "industrial", remove: [{ x: 0.68, y: 0.72 }], note: "Industrial without the front loveseat" },
  { name: "bedroom-nightstand-scandi", file: BEDROOM, style: "scandinavian", remove: [{ x: 0.25, y: 0.72 }], note: "Scandinavian without the nightstand" },
  { name: "dining-chair-farmhouse", file: DINING, style: "farmhouse", remove: [{ x: 0.68, y: 0.62 }], note: "Farmhouse without the right-hand chair" },
  { name: "office-chair-box-minimal", file: OFFICE, style: "modern-minimal", remove: [{ x: 0.92, y: 0.70 }, { x: 0.42, y: 0.80 }], note: "Modern minimal without the office chair and the box" },
  { name: "terrace-table-chair-tropical", file: TERRACE, style: "tropical-modern", remove: [{ x: 0.55, y: 0.65 }, { x: 0.70, y: 0.72 }], note: "Tropical modern terrace without the plastic table and one chair" },
  { name: "kids-desk-japandi", file: KIDS, style: "japandi", remove: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.77 }], note: "Japandi without desk and chair (repeat)" },
  { name: "sala-chairs-tropical-b", file: SALA, style: "tropical-modern", remove: [{ x: 0.45, y: 0.50 }], note: "repeat" },
  { name: "sala-loveseat-industrial-b", file: SALA, style: "industrial", remove: [{ x: 0.68, y: 0.72 }], note: "repeat" },
  { name: "dining-chair-farmhouse-b", file: DINING, style: "farmhouse", remove: [{ x: 0.68, y: 0.62 }], note: "repeat" },
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
