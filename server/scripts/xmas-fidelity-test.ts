// Offline fidelity test (Nov 19 2026, branch fix/xmas-fidelity): does "Decorate whole room" (ROOM_DECOR) keep the furniture
// where it is, and does "Take out furniture" (TREE_REMOVE / STYLE_REMOVE) remove only the marked piece?
// Runs the production markers, prompts and leak checks. Nothing touches the live server, credits or users.
// One Gemini image per case (~$0.07).
// Usage (key from Railway, never printed):
//   cd ~/DecoHero-108/server && OUT_DIR=fidelity-v1 railway run npx tsx <worktree>/server/scripts/xmas-fidelity-test.ts [case ...]
//   REMOVE_NAMES=1 names the marked pieces first (gemini.ts nameMarkedPieces), as the server does with REMOVE_NAMES=on.
//   FRAME_FIX=1 sends the prompt of the retry after a failed frame check (frame.ts), to test that correction.
//   npx tsx scripts/xmas-fidelity-test.ts --index   rebuilds index.html from verdicts.json (no key, no generation)
// Output: ../store/<OUT_DIR>/<case>-{sent,out,pair}.jpg + index.html. Verdicts are judged by eye and kept in
// ../store/<OUT_DIR>/verdicts.json as { "<case>": { "pass": true, "note": "..." } }.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, drawRemoveMarkers, markerLeaked, removeMarkerLeaked, removeMarkerLeakedAt, type Place } from "../src/marker.js";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";
import { FRAME_MIN, frameMatch } from "../src/frame.js";
import type { MarkedPiece } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "fidelity-test");

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const KIDS = "store/rooms/before/kids-room.jpg";
const BEDROOM = "store/rooms/before/bedroom.jpg";
const DINING = "store/rooms/before/dining-room.jpg";
const OFFICE = "store/rooms/before/home-office.jpg";

type Case = { name: string; feature: "decor" | "xmas-remove" | "room-remove"; file: string; style: string; tree?: Place; remove?: Place[]; decor?: boolean; note: string };
export const CASES: Case[] = [
  // "Decorate whole room": same furniture in the same places, only decor added.
  { name: "decor-living-classic", feature: "decor", file: LIVING, style: "xmas-classic", decor: true, note: "Classic, whole room, auto spot. Sofa, armchair, glass table, TV and pine chest must stay put." },
  { name: "decor-sala-tropical", feature: "decor", file: SALA, style: "xmas-tropical", tree: { x: 0.2, y: 0.78 }, decor: true, note: "Tropical, whole room, tapped spot front left. Two sofas, TV unit and stacked chairs must stay put." },
  { name: "decor-dining-tartan", feature: "decor", file: DINING, style: "xmas-tartan", decor: true, note: "Tartan, whole room, auto spot. Table, six chairs and sideboard must stay put." },
  { name: "decor-kids-winter", feature: "decor", file: KIDS, style: "xmas-winter", decor: true, note: "Winter, whole room, auto spot. Bed, bookcase, desk and chair must stay put." },
  { name: "decor-bedroom-nordic", feature: "decor", file: BEDROOM, style: "xmas-nordic", decor: true, note: "Nordic, whole room, auto spot. Bed, nightstand and clothes rail must stay put." },
  { name: "decor-office-coquette", feature: "decor", file: OFFICE, style: "xmas-coquette", decor: true, note: "Coquette, whole room, auto spot. Desk, office chair, shelf and boxes must stay put." },
  { name: "decor-sala-classic-auto", feature: "decor", file: SALA, style: "xmas-classic", decor: true, note: "Classic, whole room, auto spot (no tap). Two sofas, TV unit and stacked chairs must stay put." },
  // "Take out furniture" in Christmas mode: only the marked piece goes.
  { name: "xremove-kids-desk", feature: "xmas-remove", file: KIDS, style: "xmas-classic", tree: { x: 0.86, y: 0.88 }, remove: [{ x: 0.86, y: 0.76 }], note: "Remove the desk, KEEP the chair that touches it." },
  { name: "xremove-kids-desk-tree-away", feature: "xmas-remove", file: KIDS, style: "xmas-nordic", tree: { x: 0.5, y: 0.8 }, remove: [{ x: 0.86, y: 0.76 }], note: "Remove the desk, tree tapped on open floor away from it: the chair must stay." },
  { name: "xremove-sala-loveseat", feature: "xmas-remove", file: SALA, style: "xmas-tropical", tree: { x: 0.68, y: 0.82 }, remove: [{ x: 0.68, y: 0.72 }], note: "Remove the front loveseat, KEEP the sofa behind it." },
  { name: "xremove-dining-chair", feature: "xmas-remove", file: DINING, style: "xmas-tartan", tree: { x: 0.72, y: 0.8 }, remove: [{ x: 0.68, y: 0.62 }], note: "Remove the right-hand chair, KEEP the table and the other five chairs." },
  { name: "xremove-living-armchair", feature: "xmas-remove", file: LIVING, style: "xmas-nordic", tree: { x: 0.79, y: 0.63 }, remove: [{ x: 0.79, y: 0.55 }], note: "Remove the armchair, KEEP sofa, glass table and radiator." },
  { name: "xremove-decor-kids-desk", feature: "xmas-remove", file: KIDS, style: "xmas-winter", tree: { x: 0.86, y: 0.88 }, remove: [{ x: 0.86, y: 0.76 }], decor: true, note: "Remove the desk AND decorate the whole room: chair, bed and bookcase stay." },
  // Room redesign with removal (STYLE_REMOVE).
  { name: "room-dining-chair-farmhouse", feature: "room-remove", file: DINING, style: "farmhouse", remove: [{ x: 0.68, y: 0.62 }], note: "Farmhouse without the right-hand chair: five chairs, an empty place, no new furniture or doors." },
];

type Verdict = { pass: boolean; note: string };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function writeIndex() {
  const file = path.join(outDir, "verdicts.json");
  const verdicts: Record<string, Verdict> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const done = CASES.filter((c) => fs.existsSync(path.join(outDir, `${c.name}-out.jpg`)));
  const tally = (f: string) => {
    const mine = done.filter((c) => c.feature === f && verdicts[c.name]);
    return mine.length ? `${f}: ${mine.filter((c) => verdicts[c.name].pass).length}/${mine.length}` : "";
  };
  const rows = done.map((c) => {
    const v = verdicts[c.name];
    const badge = v ? `<span class="${v.pass ? "pass" : "fail"}">${v.pass ? "PASS" : "FAIL"}</span> ${esc(v.note)}` : "<span>not judged</span>";
    return `<h2>${c.name}</h2><p>${esc(c.note)}</p><p>${badge}</p><div class=row><figure><img src="${c.name}-sent.jpg"><figcaption>Before (as sent, with markers)</figcaption></figure><figure><img src="${c.name}-out.jpg"><figcaption>After</figcaption></figure></div>`;
  });
  fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Fidelity test ${esc(path.basename(outDir))}</title>
<style>body{font:14px system-ui;margin:16px;max-width:1500px}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}img{width:100%}
.pass,.fail{font-weight:700;padding:2px 8px;border-radius:4px;color:#fff}.pass{background:#1a7f37}.fail{background:#c62828}</style>
<h1>Fidelity test: ${esc(path.basename(outDir))}</h1><p>${["decor", "xmas-remove", "room-remove"].map(tally).filter(Boolean).join(" | ")}</p>${rows.join("")}`);
}

fs.mkdirSync(outDir, { recursive: true });
const args = process.argv.slice(2);
if (args.includes("--index")) {
  writeIndex();
  process.exit(0);
}

// Imported here so --index works without a key.
const { generateRedesign, nameMarkedPieces } = await import("../src/gemini.js");
const size = parseTreeSize(250, 213, treeCatalog(""))!;

async function run(c: Case) {
  const input = await sharp(fs.readFileSync(path.join(root, c.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const isTree = c.feature !== "room-remove";
  let sent = c.tree ? await drawMarker(input, c.tree) : input;
  if (c.remove) sent = await drawRemoveMarkers(sent, c.remove);
  // REMOVE_NAMES=1: the server's optional pre-pass that names the marked pieces and their neighbours.
  let pieces: MarkedPiece[] | undefined;
  if (c.remove && process.env.REMOVE_NAMES) {
    try {
      pieces = await nameMarkedPieces(sent.toString("base64"), c.remove.length);
      console.log(`${c.name}: named ${JSON.stringify(pieces)}`);
    } catch (e) {
      console.log(`${c.name}: no names (${e instanceof Error ? e.message.slice(0, 80) : e})`);
    }
  }
  const prompt = isTree
    ? buildPrompt(c.style, size, c.tree ?? false, { clear: true, remove: !!c.remove, decorateRoom: !!c.decor, pieces, frameFix: !!process.env.FRAME_FIX })!
    : buildPrompt(c.style, {}, false, { remove: !!c.remove, pieces })!;
  fs.writeFileSync(path.join(outDir, `${c.name}-sent.jpg`), sent);
  try {
    const out = await sharp(await generateRedesign(sent.toString("base64"), prompt)).jpeg({ quality: 85 }).toBuffer();
    fs.writeFileSync(path.join(outDir, `${c.name}-out.jpg`), out);
    // Side by side at the same height, for judging by eye.
    const H = 720;
    const [a, b] = await Promise.all([sent, out].map((x) => sharp(x).resize({ height: H }).toBuffer({ resolveWithObject: true })));
    await sharp({ create: { width: a.info.width + b.info.width + 8, height: H, channels: 3, background: "#fff" } })
      .composite([{ input: a.data, left: 0, top: 0 }, { input: b.data, left: a.info.width + 8, top: 0 }])
      .jpeg({ quality: 82 }).toFile(path.join(outDir, `${c.name}-pair.jpg`));
    // The server's frame check (FRAME_CHECK=on): how much of the photo is still in place. Below FRAME_MIN = room redrawn.
    const frame = isTree ? await frameMatch(input, out) : null;
    const framed = frame === null ? "" : ` | frame ${frame.toFixed(2)}${frame < FRAME_MIN ? " REDRAWN (the server would retry once)" : ""}`;
    const leaks = [
      c.tree && (await markerLeaked(input, out)) ? "magenta" : "",
      c.remove && (isTree ? await removeMarkerLeaked(input, out) : await removeMarkerLeakedAt(input, out, c.remove)) ? "cyan" : "",
    ].filter(Boolean);
    console.log(`${c.name}: ok${leaks.length ? ` (LEAKED: ${leaks.join(", ")}; the server would refund)` : ""}${framed}`);
  } catch (e) {
    console.log(`${c.name}: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

const todo = CASES.filter((c) => args.includes(c.name));
if (!todo.length) {
  console.log(`Name the cases to run: ${CASES.map((c) => c.name).join(" ")}`);
  process.exit(1);
}
// Three at a time.
for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(run));
writeIndex();
