// Captures real app screens (EN + ES) from the Expo web DEV server using the dev-only demo scenes
// in mobile/src/demo. Start the dev server first:
//   cd mobile && npx expo start --web --port 8099
//   node tools/screenshots/capture.mjs            (APP_URL=http://localhost:8099 by default)
// Output: tools/screenshots/captures/<lang>/<scene>.png at 448x920 dp, 2.5x (1120x2300 px).
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { ROOMS, ROOT } from "./fal.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP_URL = process.env.APP_URL || "http://localhost:8099";
const IMG_PORT = 8097;
// A large-phone viewport (448x920 dp at 2.5x = 1120x2300 px): at 412 dp the browser build cuts off the
// longest Spanish style names ("Tropical moderno", "Rústico moderno"); on Android they shrink to fit.
const VIEW = { w: 448, h: 920, dpr: 2.5 };
const OUT = path.join(ROOT, "tools/screenshots/captures");
const img = (p) => `http://localhost:${IMG_PORT}/${p}`;
const after = (room, style) => `${style}|${img(`after/${room}-${style}.jpg`)}`;

const SCENES = {
  "home-sala": { h: 840, demo: "home", photo: img("before/sala-panama.jpg"), styles: "tropical-modern,coastal,boho", credits: 12 },
  "results-terrace": { demo: "results", photo: img("before/terrace.jpg"), results: ["mediterranean", "tropical-modern", "boho"].map((s) => after("terrace", s)).join(",") },
};

// Serves store/rooms to the app on localhost only.
const server = http.createServer((req, res) => {
  const file = path.join(ROOMS, path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(ROOMS) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": "image/jpeg", "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(IMG_PORT, "127.0.0.1", r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const only = process.argv.slice(2);
try {
  for (const lang of ["en", "es"]) {
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    for (const [name, params] of Object.entries(SCENES)) {
      if (only.length && !only.includes(name)) continue;
      const page = await browser.newPage();
      const { h = VIEW.h, ...query } = params; // a scene may ask for a shorter screen
      await page.setViewport({ width: VIEW.w, height: h, deviceScaleFactor: VIEW.dpr, isMobile: true, hasTouch: true });
      const q = new URLSearchParams({ ...query, lang });
      await page.goto(`${APP_URL}/?${q}`, { waitUntil: "networkidle0", timeout: 180000 });
      // Wait until the screen is there and every image has loaded and the display font is in.
      await page.waitForFunction(() => document.body.innerText.length > 20, { timeout: 60000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      });
      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({ path: path.join(OUT, lang, `${name}.png`) });
      await page.close();
      console.log("captured", lang, name);
    }
  }
} finally {
  await browser.close();
  server.close();
}
