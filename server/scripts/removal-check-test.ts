// STYLE_REMOVE_CHECK on the room removals of earlier sheets (no image generation, one cheap vision call per design):
// runs the "is a marked piece back?" check for every <case>-<run>-out.jpg of a sheet and prints the answer next to
// the verdict given by eye.
// Usage (key from Railway, never printed):
//   cd ~/DecoHero-108/server && SHEETS=/abs/path/to/store/room-remove-final,/abs/other railway run npx tsx <worktree>/server/scripts/removal-check-test.ts [case ...]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { checkRemovedPieces } from "../src/gemini.js";
import { CASES } from "./room-remove-cases.js";

const small = (img: Buffer) => sharp(img).resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
const only = process.argv.slice(2);
for (const dir of (process.env.SHEETS ?? "").split(",").filter(Boolean)) {
  const verdicts: Record<string, { pass: boolean; note: string }> = fs.existsSync(path.join(dir, "verdicts.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "verdicts.json"), "utf8")) : {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("-out.jpg")).sort()) {
    const key = f.replace(/-out\.jpg$/, "");
    const c = CASES.find((x) => key.startsWith(`${x.name}-`));
    if (!c || (only.length && !only.includes(c.name))) continue;
    const t0 = Date.now();
    let answer: string;
    try {
      const [a, b] = await Promise.all([fs.readFileSync(path.join(dir, `${c.name}-sent.jpg`)), fs.readFileSync(path.join(dir, f))].map(small));
      const marks = await checkRemovedPieces(a.toString("base64"), b.toString("base64"), c.remove.length);
      answer = marks.map((m) => `${m.kind} ${m.before}->${m.after}${m.box ? ` there, box x ${m.box.x0.toFixed(2)}-${m.box.x1.toFixed(2)} y ${m.box.y0.toFixed(2)}-${m.box.y1.toFixed(2)}` : ""}`).join("; ");
    } catch (e) {
      answer = `error ${String(e).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 80)}`;
    }
    const v = verdicts[key];
    console.log(`${path.basename(dir)}/${key}: ${answer} (${Date.now() - t0} ms) | by eye: ${v ? `${v.pass ? "PASS" : "FAIL"} ${v.note}` : "not judged"}`);
  }
}
