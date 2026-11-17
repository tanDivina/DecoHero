// Composes the Christmas Play assets (EN + ES). Same fonts, colours, tags and footer as compose.mjs (screenshots)
// and brand.mjs (feature graphic); the photos are unedited pipeline output from store/xmas/raw (see PICKS.md).
//   node tools/screenshots/compose-xmas.mjs
// Output: store/screenshots-xmas/<lang>/02-xmas.png (1080x1920), store/feature-graphic-xmas-<lang>.png (1024x500),
//         store/xmas/review-sheet.png. Nothing is uploaded: see store/xmas/PLAY_PLAN.md.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { TREE_PRESETS } from "../../mobile/src/stylePresets.ts";
import { color } from "../../mobile/src/theme.ts";
import { ROOT } from "./fal.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BUILD = path.join(ROOT, "tools/screenshots/.build");
const RAW = path.join(ROOT, "store/xmas/raw");
const V2 = path.join(ROOT, "store/screenshots-v2");
const OUT = path.join(ROOT, "store/screenshots-xmas");
const SERIF = path.join(ROOT, "mobile/node_modules/@expo-google-fonts/instrument-serif");
const W = 1080;
const H = 1920;

const raw = (name) => {
  const f = path.join(RAW, `${name}.png`);
  if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  return `file://${f}`;
};
const styleName = (lang, id) => TREE_PRESETS.find((s) => s.id === id)[lang];

const COPY = {
  en: {
    mode: "Christmas mode",
    h: "See a Christmas tree in your own room",
    sub: "Six tree styles, sized to your ceiling.",
    yourPhoto: "Your photo",
    after: "After",
    foot: "Sample rooms. Designs are AI-generated ideas, not exact products or measurements.",
    fgTagline: "See a Christmas tree in your <em>own</em> room.",
  },
  es: {
    mode: "Modo Navidad",
    h: "Mira un árbol de Navidad<br>en tu propia sala",
    sub: "Seis estilos de árbol, a la medida de tu techo.",
    yourPhoto: "Tu foto",
    after: "Después",
    foot: "Espacios de muestra. Los diseños son ideas generadas con IA, no medidas exactas.",
    fgTagline: "Mira un árbol de Navidad en tu <em>propia</em> sala.",
  },
};

// ── Screenshot (CSS copied from compose.mjs BASE_CSS) ────────────────────────
const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:'Inter',system-ui,sans-serif;color:${color.ink};background:${color.brassWash};-webkit-font-smoothing:antialiased}
.serif{font-family:'Instrument Serif',serif;font-weight:400}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:132px;line-height:.96;letter-spacing:-2px;color:${color.ink};text-wrap:balance}
.sub{font-size:36px;line-height:1.3;color:${color.stone};font-weight:400;text-wrap:balance}
.pad{position:absolute;left:60px;right:60px}
.brand{font-family:'Instrument Serif',serif;font-size:46px;color:${color.ink};letter-spacing:-.3px}
.photo{border-radius:10px;overflow:hidden;background:${color.line};position:relative}
.photo img{display:block;position:absolute;max-width:none}
.tag{position:absolute;padding:12px 24px;border-radius:999px;background:rgba(246,247,244,.94);color:${color.ink};font-size:27px;font-weight:600;letter-spacing:.2px;box-shadow:0 2px 10px rgba(28,35,33,.12)}
.tag.on{background:${color.olive};color:#fff}
.foot{position:absolute;left:60px;right:60px;bottom:34px;text-align:center;font-size:21px;line-height:1.3;color:${color.stone}}
.shadow{box-shadow:0 30px 70px rgba(44,62,47,.18),0 8px 22px rgba(28,35,33,.10)}
`;

/** The 896x1200 room photo, scaled to `iw` wide, placed so the point (fx, fy) sits in the middle of a w x h box. */
function crop(src, w, h, iw, fx, fy) {
  const ih = (iw * 1200) / 896;
  const clamp = (v, lo) => Math.round(Math.min(0, Math.max(lo, v)));
  const left = clamp(w / 2 - fx * iw, w - iw);
  const top = clamp(h / 2 - fy * ih, h - ih);
  return `<img src="${src}" style="width:${iw}px;height:${ih}px;left:${left}px;top:${top}px">`;
}

function screenshot(lang) {
  const c = COPY[lang];
  const IW = 960, IH = 850, TOP = 520;
  // Before and after get the same crop, so the room lines up.
  const main = (name) => crop(raw(name), IW, IH, IW, 0.5, 0.5);
  const cw = 304, ch = 330, gap = 24, stripTop = TOP + IH + 34;
  const strip = [["xmas-nordic", 0.6, 0.45], ["xmas-tropical", 0.555, 0.46], ["xmas-coquette", 0.61, 0.47]].map(([id, fx, fy], i) => `
    <div style="position:absolute;left:${60 + i * (cw + gap)}px;top:${stripTop}px;width:${cw}px">
      <div class="photo" style="height:${ch}px;border-radius:8px">${crop(raw(`living-room-${id}`), cw, ch, 470, fx, fy)}</div>
      <div class="serif" style="font-size:42px;line-height:1;letter-spacing:-.3px;white-space:nowrap;margin-top:12px">${styleName(lang, id)}</div>
    </div>`).join("");
  const PW = 286, PH = Math.round((286 * IH) / IW);
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}h1{font-size:${lang === "es" ? 106 : 126}px}</style></head><body>
    <div class="pad" style="top:64px"><div class="brand">DecoHero <span style="color:${color.brass}">· ${c.mode}</span></div></div>
    <div class="pad" style="top:150px"><h1>${c.h}</h1><p class="sub" style="margin-top:22px">${c.sub}</p></div>
    <div class="photo shadow" style="position:absolute;left:60px;top:${TOP}px;width:${IW}px;height:${IH}px">
      ${main("living-room-xmas-classic")}
      <div class="tag on" style="right:26px;top:26px">${c.after} · ${styleName(lang, "xmas-classic")}</div>
    </div>
    <div class="shadow" style="position:absolute;left:84px;top:${TOP + IH - PH - 86}px;width:${PW + 24}px;background:#fff;border-radius:12px;padding:12px 12px 0;transform:rotate(-2.5deg)">
      <div class="photo" style="height:${PH}px;border-radius:6px">${crop(raw("living-room-before"), PW, PH, PW, 0.5, 0.5)}</div>
      <div style="text-align:center;font-size:25px;font-weight:600;color:${color.brass};padding:11px 0 13px">${c.yourPhoto}</div>
    </div>
    ${strip}
    <div class="foot" style="bottom:26px">${c.foot}</div>
</body></html>`;
}

// ── Feature graphic (layout and type from brand.mjs; the icon tile becomes a real tree result) ───────────────
const C = { olive: "#3E5641", limewash: "#E8EBE6", brass: "#C2923F", ink: "#1C2321" };
function feature(lang) {
  const c = COPY[lang];
  const T = 300; // photo tile
  const iw = 420, ih = (iw * 1200) / 896;
  return `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: "Instrument Serif"; src: url("file://${SERIF}/400Regular/InstrumentSerif_400Regular.ttf"); }
  @font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${SERIF}/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1024px; height: 500px; display: flex; background: ${C.limewash}; color: ${C.ink}; overflow: hidden; -webkit-font-smoothing: antialiased; }
  .text { flex: 1; padding: 0 30px 0 96px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: ${C.brass}; font-size: 17px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 14px; }
  h1, p { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; }
  h1 { font-size: 112px; line-height: .95; letter-spacing: -.01em; }
  p { font-size: 34px; line-height: 1.15; margin-top: 22px; max-width: 440px; color: #3a423f; text-wrap: balance; }
  em { color: ${C.olive}; }
  .panel { width: 430px; background: ${C.olive}; border-top-left-radius: 200px; margin-top: 44px; display: flex; align-items: center; justify-content: center; }
  .tile { width: ${T}px; height: ${T}px; border-radius: 40px; overflow: hidden; margin-top: -30px; position: relative;
          box-shadow: 0 18px 40px rgba(0,0,0,.28), 0 4px 10px rgba(0,0,0,.18); }
  .tile img { position: absolute; width: ${iw}px; height: ${ih}px; left: ${Math.round(T / 2 - 0.525 * iw)}px; top: ${Math.round(T / 2 - 0.5 * ih)}px; }
</style><body>
  <div class="text"><div class="kicker">${c.mode}</div><h1>DecoHero</h1><p>${c.fgTagline}</p></div>
  <div class="panel"><div class="tile"><img src="${raw("living-room-xmas-classic")}"></div></div>
</body>`;
}

// ── Review sheet: the new files, then the proposed order per language ────────────────────────────────────────
const ORDER = (lang) => [
  [path.join(V2, lang, "01.png"), "01"],
  [path.join(OUT, lang, "02-xmas.png"), "02-xmas (new)"],
  ...["02", "03", "04", "05", "06", "07"].map((n) => [path.join(V2, lang, `${n}.png`), n]),
];
function sheet() {
  const label = (t) => `<div style="font:600 22px 'Helvetica Neue',Arial,sans-serif;color:#1C2321;margin:0 0 12px">${t}</div>`;
  const big = ["en", "es"].map((l) => `<div>${label(`store/screenshots-xmas/${l}/02-xmas.png`)}<img src="file://${path.join(OUT, l, "02-xmas.png")}" style="width:594px;height:1056px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.18);display:block"></div>`).join("");
  const fgs = ["en", "es"].map((l) => `<div style="margin-bottom:26px">${label(`store/feature-graphic-xmas-${l}.png`)}<img src="file://${path.join(ROOT, `store/feature-graphic-xmas-${l}.png`)}" style="width:1024px;height:500px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.18);display:block"></div>`).join("");
  const rows = ["en", "es"].map((l) => `<div style="margin-top:34px">${label(`Proposed order, ${l.toUpperCase()} (8 of 8)`)}<div style="display:flex;gap:18px">${ORDER(l)
    .map(([f, n], i) => `<div style="text-align:center;font:500 17px 'Helvetica Neue',Arial,sans-serif;color:#1C2321"><img src="file://${f}" style="width:261px;height:464px;border-radius:8px;display:block;margin-bottom:8px;${i === 1 ? "outline:5px solid #8A6220;" : ""}box-shadow:0 4px 12px rgba(0,0,0,.16)">${i + 1}. ${n}</div>`).join("")}</div></div>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#D9DDD6;padding:36px;width:2286px">
    <div style="display:flex;gap:36px">${big}<div>${fgs}</div></div>${rows}</body></html>`;
}

// ── Render ───────────────────────────────────────────────────────────────────
fs.mkdirSync(BUILD, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });

async function shot(html, file, width, height, { fonts = false, full = false } = {}) {
  const tmp = path.join(BUILD, `xmas-${path.basename(file, ".png")}-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 1 });
  await p.goto(`file://${tmp}`, { waitUntil: fonts ? "networkidle0" : "load", timeout: 60000 });
  const ok = await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return {
      serif: document.fonts.check("40px 'Instrument Serif'"),
      inter: document.fonts.check("600 20px 'Inter'"),
      broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
    };
  });
  if (fonts && !(ok.serif && ok.inter)) throw new Error("Fonts did not load (Instrument Serif / Inter from Google Fonts)");
  if (ok.broken.length) throw new Error(`Images did not load: ${ok.broken.join(", ")}`);
  await p.screenshot(full ? { path: file, fullPage: true } : { path: file, clip: { x: 0, y: 0, width, height } });
  await p.close();
  fs.unlinkSync(tmp);
  console.log(path.relative(ROOT, file), `${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}

try {
  for (const lang of ["en", "es"]) {
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    await shot(screenshot(lang), path.join(OUT, lang, "02-xmas.png"), W, H, { fonts: true });
    await shot(feature(lang), path.join(ROOT, `store/feature-graphic-xmas-${lang}.png`), 1024, 500);
  }
  await shot(sheet(), path.join(ROOT, "store/xmas/review-sheet.png"), 2358, 1200, { full: true });
} finally {
  await browser.close();
}
