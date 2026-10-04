// Regenerates every DecoHero icon and Play Store graphic.
//   node design/build.mjs
// Needs rsvg-convert (brew install librsvg) and Google Chrome.
// Real screenshots: drop device captures into store/raw/01.png … 05.png and re-run.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, markSvg, monoSvg } from "./mark.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "mobile/assets");
const store = path.join(root, "store");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "decohero-"));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONT = path.join(root, "mobile/node_modules/@expo-google-fonts/instrument-serif");

fs.mkdirSync(path.join(store, "screenshots"), { recursive: true });

function svgToPng(svg, out, width) {
  const src = path.join(tmp, "in.svg");
  fs.writeFileSync(src, svg);
  execFileSync("rsvg-convert", ["-w", String(width), src, "-o", out]);
  console.log("✓", path.relative(root, out));
}

// One headless Chrome for every render, driven over the DevTools protocol. Launching Chrome
// once per image is unreliable on macOS (it fails or hangs on exit after a few runs).
let browser;
async function chrome() {
  if (browser) return browser;
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${path.join(tmp, "chrome")}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let log = "";
    proc.stderr.on("data", (d) => {
      log += d;
      const m = log.match(/DevTools listening on (ws:\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on("exit", () => reject(new Error(`Chrome exited:\n${log}`)));
    setTimeout(() => reject(new Error("Chrome did not start within 30s")), 30_000);
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    } else if (m.method) {
      for (const l of [...listeners]) l(m);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  browser = {
    send: (method, params) => send(method, params, sessionId),
    once: (method) => new Promise((resolve) => {
      const l = (m) => { if (m.method === method) { listeners.delete(l); resolve(m); } };
      listeners.add(l);
    }),
    close: () => { ws.close(); proc.kill(); },
  };
  return browser;
}

async function htmlToPng(html, out, w, h) {
  const src = path.join(tmp, "page.html");
  fs.writeFileSync(src, html);
  const b = await chrome();
  await b.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const loaded = b.once("Page.loadEventFired");
  await b.send("Page.navigate", { url: `file://${src}?${Date.now()}` });
  await loaded;
  await b.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
  const { data } = await b.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  console.log("✓", path.relative(root, out));
}

// ── App icons (Expo reads these from app.json) ───────────────────────────────
svgToPng(markSvg({ scale: 1.35 }), path.join(assets, "icon.png"), 1024);
svgToPng(markSvg({ bg: null }), path.join(assets, "android-icon-foreground.png"), 1024);
svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${C.olive}"/></svg>`,
  path.join(assets, "android-icon-background.png"), 1024);
svgToPng(monoSvg(), path.join(assets, "android-icon-monochrome.png"), 1024);
svgToPng(markSvg({ bg: C.olive, rounded: 230, scale: 1.35 }), path.join(assets, "splash-icon.png"), 1024);
svgToPng(markSvg({ scale: 1.35, rounded: 200 }), path.join(assets, "favicon.png"), 48);

// ── Play Store ───────────────────────────────────────────────────────────────
// Play applies its own corner mask to the hi-res icon, so this one is full-bleed.
svgToPng(markSvg({ scale: 1.35 }), path.join(store, "play-icon-512.png"), 512);

const fonts = `
  @font-face { font-family: "Instrument Serif"; src: url("file://${FONT}/400Regular/InstrumentSerif_400Regular.ttf"); }
  @font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${FONT}/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"); }
  * { margin: 0; box-sizing: border-box; }
  body { background: ${C.limewash}; color: ${C.ink}; -webkit-font-smoothing: antialiased; overflow: hidden; }
  .serif { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; }
  .sans { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }`;

const copy = {
  en: {
    tagline: "See your room in a new style <em>before</em> you buy a thing.",
    kicker: "AI interior redesign",
    shots: [
      ["Snap your room", "Home screen, empty"],
      ["Pick up to <em>four</em> styles", "Home screen with photo and styles selected"],
      ["Watch it come to life", "Results, a finished design"],
      ["Hold to see the <em>before</em>", "Results, holding the photo (original showing)"],
      ["Save it. Share it.", "Results on a different style, Save/Share visible"],
    ],
  },
  es: {
    tagline: "Mira tu espacio con otro estilo <em>antes</em> de comprar nada.",
    kicker: "Rediseño de interiores con IA",
    shots: [
      ["Fotografía tu espacio", "Pantalla inicial, vacía"],
      ["Elige hasta <em>cuatro</em> estilos", "Inicio con foto y estilos elegidos"],
      ["Mira cómo cobra vida", "Resultados, un diseño terminado"],
      ["Mantén para ver el <em>antes</em>", "Resultados, manteniendo la foto (se ve el original)"],
      ["Guárdalo. Compártelo.", "Resultados en otro estilo, con Guardar/Compartir"],
    ],
  },
};

const inlineMark = markSvg({ bg: null }).replace(/width="1024" height="1024"/, 'width="100%" height="100%"');

for (const [lang, t] of Object.entries(copy)) {
  // Feature graphic 1024×500. Key content stays clear of the outer ~10% Play may crop.
  await htmlToPng(`<!doctype html><meta charset="utf-8"><style>${fonts}
    body { width: 1024px; height: 500px; display: flex; }
    .text { flex: 1; padding: 0 40px 0 96px; display: flex; flex-direction: column; justify-content: center; }
    .kicker { color: ${C.brass}; font-size: 17px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 14px; }
    h1 { font-size: 112px; line-height: .95; letter-spacing: -.01em; }
    p { font-size: 34px; line-height: 1.15; margin-top: 22px; max-width: 480px; color: #3a423f; }
    em { color: ${C.olive}; }
    .panel { width: 400px; background: ${C.olive}; border-top-left-radius: 200px; margin-top: 44px; position: relative; overflow: hidden; }
    .panel .mark { position: absolute; left: 50%; top: 50%; width: 620px; height: 620px; transform: translate(-50%, -46%); }
  </style><body>
    <div class="text"><div class="kicker sans">${t.kicker}</div><h1 class="serif">DecoHero</h1><p class="serif">${t.tagline}</p></div>
    <div class="panel"><div class="mark">${inlineMark}</div></div>
  </body>`, path.join(store, `feature-graphic-${lang}.png`), 1024, 500);

  // Phone screenshots 1080×1920 (9:16): caption on top, real capture in a phone frame below.
  for (const [i, [caption, wanted]] of t.shots.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const raw = path.join(store, "raw", lang, `${n}.png`);
    const rawShared = path.join(store, "raw", `${n}.png`);
    const capture = [raw, rawShared].find((f) => fs.existsSync(f));
    const screen = capture
      ? `<img src="file://${capture}">`
      : `<div class="todo sans"><b>Screenshot ${n}</b>${wanted}<small>store/raw/${n}.png</small></div>`;
    await htmlToPng(`<!doctype html><meta charset="utf-8"><style>${fonts}
      body { width: 1080px; height: 1920px; position: relative; }
      .cap { position: absolute; top: 150px; left: 90px; right: 90px; text-align: center; font-size: 104px; line-height: 1; }
      em { color: ${C.olive}; }
      .num { position: absolute; top: 96px; width: 100%; text-align: center; color: ${C.brass}; font-size: 22px; font-weight: 700; letter-spacing: .2em; }
      .phone { position: absolute; top: 470px; left: 50%; width: 760px; height: 1640px; transform: translateX(-50%);
               background: ${C.ink}; border-radius: 88px; padding: 22px; box-shadow: 0 40px 80px rgba(28,35,33,.18); }
      .phone > * { width: 100%; height: 100%; border-radius: 68px; object-fit: cover; object-position: top; display: block; }
      .todo { background: ${C.limewash}; border: 4px dashed #b9c0b7; display: flex; flex-direction: column; justify-content: center;
              align-items: center; gap: 18px; color: #6E746C; font-size: 34px; text-align: center; padding: 60px; }
      .todo b { color: ${C.ink}; font-size: 44px; } .todo small { font-size: 26px; font-family: Menlo, monospace; }
    </style><body>
      <div class="num sans">${n}</div><div class="cap serif">${caption}</div>
      <div class="phone">${screen}</div>
    </body>`, path.join(store, "screenshots", `${lang}-${n}.png`), 1080, 1920);
  }
}

browser?.close();

fs.rmSync(tmp, { recursive: true, force: true });
