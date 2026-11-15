// Captures the landing page "how it works" images (site/img/step-{1,2}-{en,es}.webp, 720x960) from the
// real app via the dev-only demo scenes. Needs the Expo web dev server:
//   cd mobile && npx expo start --web --port 8099
//   node tools/screenshots/capture-steps.mjs
// Step 3 (results) is left as is.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { ROOMS, ROOT } from "./fal.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP_URL = process.env.APP_URL || "http://localhost:8099";
const IMG_PORT = 8097;
const img = (p) => `http://localhost:${IMG_PORT}/${p}`;
const SCENES = {
  "step-1": { demo: "home", credits: 20 },
  "step-2": { demo: "home", credits: 20, photo: img("before/sala-panama.jpg"), styles: "tropical-modern,japandi,mediterranean" },
};

const server = http.createServer((req, res) => {
  const file = path.join(ROOMS, path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(ROOMS) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": "image/jpeg", "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(IMG_PORT, "127.0.0.1", r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  for (const lang of ["en", "es"]) {
    for (const [name, params] of Object.entries(SCENES)) {
      const page = await browser.newPage();
      await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.goto(`${APP_URL}/?${new URLSearchParams({ ...params, lang })}`, { waitUntil: "networkidle0", timeout: 180000 });
      await page.waitForFunction(() => document.body.innerText.length > 20, { timeout: 60000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      });
      await new Promise((r) => setTimeout(r, 900));
      const out = path.join(ROOT, "site/img", `${name}-${lang}.webp`);
      const png = out.replace(/\.webp$/, ".tmp.png");
      await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 360, height: 480 } }); // top of a 780 dp screen, so the style list shows
      execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2],'WEBP',quality=82,method=6)", png, out]);
      fs.rmSync(png);
      await page.close();
      console.log("wrote", path.relative(ROOT, out));
    }
  }
} finally {
  await browser.close();
  server.close();
}
