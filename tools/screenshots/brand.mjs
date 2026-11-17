// Builds the Play feature graphics (1024x500) and the site share images (1200x630, og:image) around the
// current app icon (mobile/assets/icon.png, the diorama room). Replaces those outputs of design/build.mjs,
// which still draws the old arch mark.
//   node tools/screenshots/brand.mjs
// Output: store/feature-graphic-{en,es}.png, site/img/og-{en,es}.jpg
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { ROOT } from "./fal.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONT = path.join(ROOT, "mobile/node_modules/@expo-google-fonts/instrument-serif");
const ICON = `file://${path.join(ROOT, "mobile/assets/icon.png")}`;
const C = { olive: "#3E5641", limewash: "#E8EBE6", brass: "#C2923F", ink: "#1C2321" };

const COPY = {
  en: { kicker: "AI interior redesign", tagline: "See your room in a new style <em>before</em> you buy a thing." },
  es: { kicker: "Rediseño de interiores con IA", tagline: "Mira tu espacio con otro estilo <em>antes</em> de comprar nada." },
};

// One layout, scaled: text left, olive panel right with the icon as a rounded tile.
const page = (t, W, H) => {
  const k = H / 500;
  return `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: "Instrument Serif"; src: url("file://${FONT}/400Regular/InstrumentSerif_400Regular.ttf"); }
  @font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${FONT}/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"); }
  * { margin: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; display: flex; background: ${C.limewash}; color: ${C.ink}; overflow: hidden; -webkit-font-smoothing: antialiased; }
  .text { flex: 1; padding: 0 ${40 * k}px 0 ${96 * k}px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: ${C.brass}; font-size: ${17 * k}px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: ${14 * k}px; }
  h1, p { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; }
  h1 { font-size: ${112 * k}px; line-height: .95; letter-spacing: -.01em; }
  p { font-size: ${34 * k}px; line-height: 1.15; margin-top: ${22 * k}px; max-width: ${480 * k}px; color: #3a423f; }
  em { color: ${C.olive}; }
  .panel { width: ${(W / H) * 500 > 2.2 * 500 ? 430 * k : 400 * k}px; background: ${C.olive}; border-top-left-radius: ${200 * k}px; margin-top: ${44 * k}px;
           display: flex; align-items: center; justify-content: center; }
  .tile { width: ${270 * k}px; height: ${270 * k}px; border-radius: ${62 * k}px; overflow: hidden; margin-top: ${-30 * k}px;
          box-shadow: 0 ${18 * k}px ${40 * k}px rgba(0,0,0,.28), 0 ${4 * k}px ${10 * k}px rgba(0,0,0,.18); }
  .tile img { width: 100%; height: 100%; display: block; }
</style><body>
  <div class="text"><div class="kicker">${t.kicker}</div><h1>DecoHero</h1><p>${t.tagline}</p></div>
  <div class="panel"><div class="tile"><img src="${ICON}"></div></div>
</body>`;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });
try {
  for (const [lang, t] of Object.entries(COPY)) {
    for (const [W, H, out, type] of [
      [1024, 500, path.join(ROOT, `store/feature-graphic-${lang}.png`), "png"],
      [1200, 630, path.join(ROOT, `site/img/og-${lang}.jpg`), "jpeg"],
    ]) {
      const p = await browser.newPage();
      await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      const tmp = path.join(os.tmpdir(), `decohero-brand-${lang}-${W}.html`);
      fs.writeFileSync(tmp, page(t, W, H));
      await p.goto(`file://${tmp}`, { waitUntil: "load" });
      await p.evaluate(async () => { await document.fonts.ready; });
      const broken = await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length);
      if (broken) throw new Error(`${out}: icon did not load`);
      fs.rmSync(tmp);
      await p.screenshot({ path: out, type, ...(type === "jpeg" ? { quality: 90 } : {}), clip: { x: 0, y: 0, width: W, height: H } });
      await p.close();
      console.log("wrote", path.relative(ROOT, out));
    }
  }
} finally {
  await browser.close();
}
