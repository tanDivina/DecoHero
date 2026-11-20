// A/B of the Christmas removal rule (REMOVE in styles.ts), Nov 19 2026: the wording of release/1.0.9 ("old") against the
// wording in this branch ("new"), on the three removal cases of store/fidelity-v0-baseline. Everything else in the
// prompt is this branch's. One Gemini image per case and arm (~$0.07). Nothing touches the live server.
// Usage (key from Railway, never printed):
//   cd ~/DecoHero-108/server && railway run npx tsx <worktree>/server/scripts/xmas-remove-ab.ts [case ...]
// Output: ../store/<OUT_DIR, default xmas-remove-ab>/<case>-{sent,old,new}.jpg + index.html (verdicts.json merged in).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawMarker, drawRemoveMarkers, type Place } from "../src/marker.js";
import { buildPrompt, parseTreeSize } from "../src/styles.js";
import { treeCatalog } from "../src/treeCatalog.js";
import { frameMatch } from "../src/frame.js";
import { generateRedesign } from "../src/gemini.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const outDir = path.join(root, "store", process.env.OUT_DIR ?? "xmas-remove-ab");
const OLD_REF = process.env.OLD_REF ?? "release/1.0.9";

const ruleIn = (source: string) => {
  const m = source.match(/^const REMOVE = `([\s\S]*?)`;/m);
  if (!m) throw new Error("REMOVE not found");
  return m[1];
};
const newRule = ruleIn(fs.readFileSync(path.join(here, "..", "src", "styles.ts"), "utf8"));
const oldRule = ruleIn(execFileSync("git", ["-C", root, "show", `${OLD_REF}:server/src/styles.ts`], { encoding: "utf8" }));

const CASES: { name: string; file: string; style: string; tree: Place; remove: Place[]; note: string }[] = [
  { name: "xremove-kids-desk", file: "store/rooms/before/kids-room.jpg", style: "xmas-classic", tree: { x: 0.86, y: 0.88 }, remove: [{ x: 0.86, y: 0.76 }], note: "Remove the desk, KEEP the chair that touches it." },
  { name: "xremove-sala-loveseat", file: "site/img/rooms/sala-panama-before.webp", style: "xmas-tropical", tree: { x: 0.68, y: 0.82 }, remove: [{ x: 0.68, y: 0.72 }], note: "Remove the front loveseat, KEEP the sofa behind it." },
  { name: "xremove-dining-chair", file: "store/rooms/before/dining-room.jpg", style: "xmas-tartan", tree: { x: 0.72, y: 0.8 }, remove: [{ x: 0.68, y: 0.62 }], note: "Remove the right-hand chair, KEEP the table and the other five chairs." },
];

fs.mkdirSync(outDir, { recursive: true });
const size = parseTreeSize(250, 213, treeCatalog(""))!;
const only = process.argv.slice(2);
for (const c of CASES.filter((c) => !only.length || only.includes(c.name))) {
  const input = await sharp(fs.readFileSync(path.join(root, c.file)))
    .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const sent = await drawRemoveMarkers(await drawMarker(input, c.tree), c.remove);
  fs.writeFileSync(path.join(outDir, `${c.name}-sent.jpg`), sent);
  const prompt = buildPrompt(c.style, size, c.tree, { clear: true, remove: true })!;
  if (!prompt.includes(newRule)) throw new Error("the prompt does not contain the removal rule");
  for (const arm of (process.env.ARMS ?? "old,new").split(",")) {
    try {
      const out = await generateRedesign(sent.toString("base64"), arm === "old" ? prompt.replace(newRule, oldRule) : prompt);
      await sharp(out).jpeg({ quality: 85 }).toFile(path.join(outDir, `${c.name}-${arm}.jpg`));
      const frame = await frameMatch(input, out);
      console.log(`${c.name} ${arm}: ok, frame ${frame === null ? "n/a" : frame.toFixed(2)}`);
    } catch (e) {
      console.log(`${c.name} ${arm}: ${String(e).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 200)}`);
    }
  }
}

const verdictsFile = path.join(outDir, "verdicts.json");
const verdicts: Record<string, { pass: boolean; note: string }> = fs.existsSync(verdictsFile) ? JSON.parse(fs.readFileSync(verdictsFile, "utf8")) : {};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cell = (c: string, arm: string) => {
  const v = verdicts[`${c}-${arm}`];
  return `<figure><img src="${c}-${arm}.jpg"><figcaption>${arm === "old" ? `old rule (${esc(OLD_REF)})` : "new rule (this branch)"}${v ? `: <b class=${v.pass ? "ok" : "bad"}>${v.pass ? "PASS" : "FAIL"}</b> ${esc(v.note)}` : ""}</figcaption></figure>`;
};
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset=utf-8><title>Christmas removal A/B</title>
<style>body{font:14px system-ui;margin:16px}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0}img{width:100%}.ok{color:#0a7a2f}.bad{color:#b00020}</style>
<h1>Christmas "Take out furniture": old against new removal rule</h1>
${CASES.filter((c) => fs.existsSync(path.join(outDir, `${c.name}-sent.jpg`))).map((c) => `<h2>${c.name}</h2><p>${esc(c.note)}</p><div class=row><figure><img src="${c.name}-sent.jpg"><figcaption>marked</figcaption></figure>${cell(c.name, "old")}${cell(c.name, "new")}</div>`).join("")}`);
