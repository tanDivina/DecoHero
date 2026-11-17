// Renders the "tree goes here" marker onto a photo, exactly as the model receives it, so a human can check it.
// Usage: npx tsx scripts/marker-sample.ts [x] [y] [input.jpg] [output.jpg]
// x and y are fractions of the width and height (0 to 1, default 0.5 0.8). Without an input it uses
// test-image2.jpeg from the repo root. Prints the output path.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, parsePlace } from "../src/marker.js";

const [xArg, yArg, inArg, outArg] = process.argv.slice(2);
const place = parsePlace({ x: xArg === undefined ? 0.5 : Number(xArg), y: yArg === undefined ? 0.8 : Number(yArg) });
if (!place) {
  console.error("x and y must be numbers from 0 to 1");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const inPath = inArg || path.join(here, "..", "..", "test-image2.jpeg");
const out = outArg || path.join(os.tmpdir(), `decohero-marker-${Date.now()}.jpg`);

// Same normalisation as /api/redesign: fix rotation, cap at 1280 px, re-encode as JPEG.
const input = await sharp(fs.readFileSync(inPath))
  .rotate()
  .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();
fs.writeFileSync(out, await drawMarker(input, place));
console.log(out);
