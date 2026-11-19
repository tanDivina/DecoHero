// Makes Christmas before/after examples for the site and the Play listing with the production pipeline:
// the same normalisation, marker, prompt, door check and place check as /api/redesign (src/app.ts), called
// directly so no credits or sign-in are needed. No watermark (as for a paid user).
//
// Usage (the key comes from Railway and is never printed):
//   cd server && railway run npx tsx scripts/xmas-examples.ts [--dry] [--cap N] [--tag t] room:style[:x,y] ...
// room = living-room | sala-panama, style = an xmas-* id. --cap N: stop making images once the counter in
// store/xmas/raw/.generations (all runs added up) reaches N. --dry: print flags, write the marked photo, no API call.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, markerLeaked, parsePlace, type Place } from "../src/marker.js";
import { buildPrompt, flagOn, isTreeStyle, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", "xmas", "raw");
const tryDir = path.join(outDir, "attempts");
const counterFile = path.join(outDir, ".generations");
const HARD_CAP = 16;

// The tap: open floor in a corner, as fractions of the photo.
const ROOMS: Record<string, { file: string; place: Place }> = {
  "living-room": { file: "living-room-before.webp", place: { x: 0.62, y: 0.575 } },
  "sala-panama": { file: "sala-panama-before.webp", place: { x: 0.16, y: 0.7 } },
};
const CEILING_CM = 250;
// 7 ft, the tree the app recommends (and preselects) for a 250 cm ceiling.
const TREE_CM = 213;

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const cap = Math.min(HARD_CAP, Number(opt("--cap") ?? HARD_CAP));
const tag = opt("--tag") ?? "";
const jobs = args.filter((a) => a.includes(":"));

fs.mkdirSync(tryDir, { recursive: true });
const used = () => (fs.existsSync(counterFile) ? Number(fs.readFileSync(counterFile, "utf8")) || 0 : 0);
let reserved = 0; // first images of jobs not started yet in this run
/** Takes one generation from the budget; false when the cap is reached. `retry` may not eat the pending first images. */
function take(retry: boolean): boolean {
  const n = used();
  if (n + (retry ? reserved : 0) >= cap) return false;
  fs.writeFileSync(counterFile, String(n + 1));
  return true;
}

const TOL_X = 0.12, TOL_Y = 0.2;
const miss = (a: Place, s: Place) => Math.max(Math.abs(a.x - s.x) / TOL_X, Math.abs(a.y - s.y) / TOL_Y);
const at = (p: Place) => `x=${p.x.toFixed(2)},y=${p.y.toFixed(2)}`;
const forCheck = (img: Buffer) =>
  sharp(img).resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
const DOOR_QUESTION_MARKED =
  "The second image is the first image with a Christmas tree added at a spot the user chose. Is any door or doorway that is " +
  "visible in the first image removed or changed in the second? A door that is only partly behind the tree does not count. " +
  "Answer only yes or no.";

console.log(`flags: TREE_CLEAR ${flagOn("TREE_CLEAR") ? "on" : "off"}, DOOR_CHECK ${flagOn("DOOR_CHECK") ? "on" : "off"}, PLACE_CHECK ${flagOn("PLACE_CHECK") ? "on" : "off"}; ` +
  `IMAGE_MODEL ${process.env.IMAGE_MODEL ? "set: " + process.env.IMAGE_MODEL : "default"}; used ${used()}/${cap}`);

async function run(job: string) {
  // Optional third part "x,y": another tap than the room's default.
  const [room, styleId, xy] = job.split(":");
  const r = ROOMS[room];
  if (!r || !isTreeStyle(styleId)) throw new Error(`bad job ${job}`);
  const place = parsePlace(xy ? { x: Number(xy.split(",")[0]), y: Number(xy.split(",")[1]) } : r.place);
  if (!place) throw new Error(`bad spot in ${job}`);
  const size = parseTreeSize(CEILING_CM, TREE_CM, treeCatalog(""))!;
  const clear = flagOn("TREE_CLEAR");
  const input = await sharp(fs.readFileSync(path.join(root, "site", "img", "rooms", r.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const sent = await drawMarker(input, place);
  await sharp(input).png().toFile(path.join(outDir, `${room}-before.png`));
  if (dry) {
    fs.writeFileSync(path.join(tryDir, `${room}-marked.jpg`), sent);
    console.log(`${job}: species ${size.species}, prompt ${buildPrompt(styleId, size, place, { clear })!.length} chars`);
    reserved--;
    return;
  }
  const g = await import("../src/gemini.js");
  let n = 0;
  const save = async (img: Buffer) => {
    const f = path.join(tryDir, `${room}-${styleId}${tag ? "." + tag : ""}.a${++n}.png`);
    await sharp(img).png().toFile(f);
    return f;
  };
  const log = (m: string) => console.log(`${job}: ${m}`);
  try {
    reserved--;
    if (!take(false)) return log("SKIPPED, cap reached");
    let output = await g.generateRedesign(sent.toString("base64"), buildPrompt(styleId, size, place, { clear })!);
    await save(output);
    if (await markerLeaked(input, output)) return log("FAILED: marker still visible (attempt kept in attempts/)");
    let doorFixed = false;
    if (flagOn("DOOR_CHECK")) {
      let changed: boolean | null = null;
      try {
        const [a, b] = await Promise.all([forCheck(input), forCheck(output)]);
        changed = await g.askYesNo(a.toString("base64"), b.toString("base64"), DOOR_QUESTION_MARKED);
      } catch (e) { log(`door check failed: ${g.describeError(e)}`); }
      if (changed) {
        if (!take(true)) log("door flagged, no retry (budget)");
        else {
          const again = await g.generateRedesign(sent.toString("base64"), buildPrompt(styleId, size, place, { clear, doorFix: true })!);
          await save(again);
          if (await markerLeaked(input, again)) log("door flagged, retry leaked marker, first kept");
          else { output = again; doorFixed = true; log("door flagged, retry served"); }
        }
      } else log(`door check: ${changed === false ? "fine" : "unchecked"}`);
    }
    if (flagOn("PLACE_CHECK")) {
      let first: Place | null | "error";
      try { first = await g.locateTree((await forCheck(output)).toString("base64")); } catch (e) { first = "error"; log(`place check failed: ${g.describeError(e)}`); }
      if (first === null) log("place check: no tree base found");
      else if (first !== "error") {
        log(`place check: spot ${at(place)}, tree at ${at(first)}, miss ${miss(first, place).toFixed(2)} (>1 = off)`);
        if (miss(first, place) > 1) {
          if (!take(true)) log("off the spot, no retry (budget)");
          else {
            const again = await g.generateRedesign(sent.toString("base64"), buildPrompt(styleId, size, place, { clear, doorFix: doorFixed, placeFix: first })!);
            await save(again);
            if (await markerLeaked(input, again)) log("place retry leaked marker, first kept");
            else {
              let second: Place | null | "error";
              try { second = await g.locateTree((await forCheck(again)).toString("base64")); } catch { second = "error"; }
              if (second === "error") { output = again; log("place retry served (unchecked)"); }
              else if (second === null) log("place retry: no tree base found, first kept");
              else {
                const closer = miss(second, place) < miss(first, place);
                if (closer) output = again;
                log(`place retry at ${at(second)}, miss ${miss(second, place).toFixed(2)}, served ${closer ? "retry" : "first"}`);
              }
            }
          }
        }
      }
    }
    const final = path.join(outDir, `${room}-${styleId}${tag ? "." + tag : ""}.png`);
    await sharp(output).png().toFile(final);
    const m = await sharp(output).metadata();
    log(`saved ${path.basename(final)} ${m.width}x${m.height}, ${n} image(s) made`);
  } catch (e) {
    log(`FAILED: ${g.describeError(e)}`);
  }
}

reserved = jobs.length;
// Three at a time.
const queue = [...jobs];
await Promise.all([0, 1, 2].map(async () => { for (let j = queue.shift(); j; j = queue.shift()) await run(j); }));
console.log(`generations used so far: ${used()}/${HARD_CAP}`);
