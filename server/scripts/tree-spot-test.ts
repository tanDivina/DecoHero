// AUTO_SPOT picker on the test rooms (no image generation, a few flash-lite calls): draws the tree marker where the
// vision model would stand the tree, so the spots can be judged by eye.
// Usage (key from Railway, never printed): cd ~/DecoHero-108/server && railway run npx tsx <worktree>/server/scripts/tree-spot-test.ts
// Output: ../store/<OUT_DIR, default r3-spots>/<room>-<n>.jpg + index.html. RUNS=2 asks twice per room.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker } from "../src/marker.js";
import { proposeTreeSpot, treeSpotIsFree } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "r3-spots");
fs.mkdirSync(outDir, { recursive: true });
const B = "store/rooms/before";
const ROOMS: Record<string, string> = {
  living: "site/img/rooms/living-room-before.webp", sala: "site/img/rooms/sala-panama-before.webp", dining: `${B}/dining-room.jpg`,
  kids: `${B}/kids-room.jpg`, bedroom: `${B}/bedroom.jpg`, office: `${B}/home-office.jpg`, terrace: `${B}/terrace.jpg`,
};
const only = process.argv.slice(2);
const rows: string[] = [];
for (const [name, file] of Object.entries(ROOMS).filter(([n]) => !only.length || only.includes(n))) {
  const input = await sharp(fs.readFileSync(path.join(root, file))).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const small = await sharp(input).resize({ width: 768, height: 768, fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  for (let n = 1; n <= Number(process.env.RUNS ?? 1); n++) {
    const t0 = Date.now();
    try {
      const spot = await proposeTreeSpot(small.toString("base64"));
      const free = spot ? await treeSpotIsFree(small.toString("base64"), spot) : null;
      console.log(`${name}-${n}: ${spot ? `x=${spot.x.toFixed(2)} y=${spot.y.toFixed(2)} ${free ? "accepted" : "REJECTED by the second look"}` : "none"} (${Date.now() - t0} ms)`);
      if (spot) fs.writeFileSync(path.join(outDir, `${name}-${n}.jpg`), await sharp(await drawMarker(input, spot)).resize({ width: 800 }).jpeg({ quality: 80 }).toBuffer());
      rows.push(`<figure>${spot ? `<img src="${name}-${n}.jpg">` : ""}<figcaption>${name}-${n}: ${spot ? `${spot.x.toFixed(2)}, ${spot.y.toFixed(2)} ${free ? "accepted" : "REJECTED"}` : "no free floor"}</figcaption></figure>`);
    } catch (e) {
      console.log(`${name}-${n}: ${String(e).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 200)}`);
    }
  }
}
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Auto tree spots</title><style>body{font:14px system-ui;margin:16px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0}img{width:100%}</style><h1>Where AUTO_SPOT would stand the tree</h1><div class=g>${rows.join("")}</div>`);
