// Renders promo.html to store/promo/decohero-promo.mp4 (1080×1920, 30 fps).
//   node design/promo/render.mjs           full video
//   node design/promo/render.mjs --stills  a contact sheet of key moments, for checking
// Frames are piped straight from Chrome into ffmpeg, so nothing large is written to disk.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = import.meta.dirname;
const root = path.resolve(here, "../..");
const outDir = path.join(root, "store/promo");
fs.mkdirSync(outDir, { recursive: true });
const FPS = 30, W = 1080, H = 1920;
const stills = process.argv.includes("--stills");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "decohero-promo-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files",
  "--remote-debugging-port=0", `--user-data-dir=${tmp}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((ok, no) => {
  let log = "";
  chrome.stderr.on("data", (d) => { log += d; const m = log.match(/DevTools listening on (ws:\S+)/); if (m) ok(m[1]); });
  setTimeout(() => no(new Error("Chrome did not start")), 30_000);
});
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { ok, no } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? no(new Error(m.error.message)) : ok(m.result);
  } else if (m.method) for (const l of [...listeners]) l(m);
});
const raw = (method, params = {}, sessionId) =>
  new Promise((ok, no) => { const id = ++seq; pending.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const send = (m, p) => raw(m, p, sessionId);
const errors = [];
listeners.add((m) => { if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description); });

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise((ok) => { const l = (m) => { if (m.method === "Page.loadEventFired") { listeners.delete(l); ok(); } }; listeners.add(l); });
await send("Page.navigate", { url: `file://${path.join(here, "promo.html")}` });
await loaded;
const evaluate = (expression) => send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
await evaluate("document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode())))");
const duration = (await evaluate("DURATION")).result.value;
if (errors.length) throw new Error(errors.join("\n"));

async function grab(t, format = "jpeg") {
  await evaluate(`frame(${t})`);
  const { data } = await send("Page.captureScreenshot", { format, quality: 92, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  return Buffer.from(data, "base64");
}

if (stills) {
  const times = [0.5, 1.5, 2.8, 3.7, 5.5, 8.6, 9.7, 11.0, 13.0, 14.8, 16.0, 17.8];
  const files = [];
  for (const t of times) {
    const f = path.join(tmp, `s${t}.png`);
    fs.writeFileSync(f, await grab(t, "png"));
    files.push(f);
  }
  const sheet = path.join(outDir, "promo-stills.png");
  execFileSync("magick", ["montage", ...files, "-tile", "6x2", "-geometry", "300x533+8+8", "-background", "#999", sheet]);
  console.log("stills →", path.relative(root, sheet));
} else {
  const out = path.join(outDir, "decohero-promo.mp4");
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    const buf = await grab(f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  fs.writeFileSync(path.join(outDir, "decohero-promo-poster.jpg"), await grab(16.6));
  console.log("video →", path.relative(root, out));
}

ws.close();
const exited = new Promise((r) => chrome.once("exit", r));
chrome.kill();
await exited;
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
