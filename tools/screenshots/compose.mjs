// Composes the Google Play phone screenshots (1080x1920 PNG) for EN and ES.
//   node tools/screenshots/compose.mjs            all screens, both languages, plus contact sheets
//   node tools/screenshots/compose.mjs en 01 05   only these
// Inputs: store/rooms (sample rooms and real redesigns) and tools/screenshots/captures (real app screens).
// Output: store/screenshots-v2/<lang>/01..07.png and store/screenshots-v2/contact-sheet-<lang>.png
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { STYLE_PRESETS } from "../../mobile/src/stylePresets.ts";
import { color } from "../../mobile/src/theme.ts";
import { ROOMS, ROOT } from "./fal.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(ROOT, "store/screenshots-v2");
const BUILD = path.join(ROOT, "tools/screenshots/.build");
const CAPTURES = path.join(ROOT, "tools/screenshots/captures");
const W = 1080;
const H = 1920;

const before = (room) => `file://${path.join(ROOMS, "before", `${room}.jpg`)}`;
const after = (room, style) => {
  const f = path.join(ROOMS, "after", `${room}-${style}.jpg`);
  if (!fs.existsSync(f)) throw new Error(`missing redesign ${room}-${style}`);
  return `file://${f}`;
};
const capture = (lang, name) => `file://${path.join(CAPTURES, lang, `${name}.png`)}`;
const styleName = (lang, id) => STYLE_PRESETS.find((s) => s.id === id)[lang];

// ── Copy ─────────────────────────────────────────────────────────────────────
// Spanish is written for Latin America (tú) and follows the wording in mobile/src/i18n.ts.
const COPY = {
  en: {
    before: "Before",
    after: "After",
    yourPhoto: "Your photo",
    foot: "Sample rooms. Designs are AI-generated ideas, not exact products or measurements.",
    s1: { h: "See your room in a new style", sub: "Before you buy a thing." },
    s2: { h: "One photo, up to four styles", sub: "Pick them together, then swipe through the results." },
    s3: {
      h: "Snap a photo. Pick your styles.",
      steps: ["Take a photo or choose one from your gallery", "Pick up to 4 of 12 styles", "One credit makes one design"],
    },
    s4: {
      h: "Photoreal designs of your own room",
      notes: ["Hold the photo to see your original", "Save to your gallery", "Share with your partner, landlord or contractor"],
    },
    s5: { h: "Same walls, windows and floor plan", sub: "DecoHero changes furniture, colors and light. The room stays yours." },
    s6: { h: "Twelve styles to try on", sub: "From Japandi calm to art deco glamour." },
    s7: {
      h: "Start with three free designs",
      sub: "Then buy credits only when you want more.",
      pack: (n) => `${n} designs`,
      popular: "Most popular",
      prices: "Prices in USD. Local prices may vary.",
      points: [
        ["Credits never expire", "One credit makes one design."],
        ["No subscription, no ads", "Any purchase removes the DecoHero mark from new designs."],
        ["A failed design is refunded", "Your credit comes back automatically."],
        ["On your phone and in your browser", "deco.hero-apps.com/app"],
      ],
    },
  },
  es: {
    before: "Antes",
    after: "Después",
    yourPhoto: "Tu foto",
    foot: "Espacios de muestra. Los diseños son ideas generadas con IA, no medidas exactas.",
    s1: { h: "Mira tu espacio con otro estilo", sub: "Antes de comprar nada." },
    s2: { h: "Una foto, hasta cuatro estilos", sub: "Elígelos juntos y desliza entre los resultados." },
    s3: {
      h: "Toma una foto. Elige tus estilos.",
      steps: ["Toma una foto o elige una de tu galería", "Elige hasta 4 de 12 estilos", "Un crédito es un diseño"],
    },
    s4: {
      h: "Diseños fotorrealistas de tu propio espacio",
      notes: ["Mantén presionada la foto para ver el original", "Guarda en tu galería", "Comparte con tu pareja, arrendador o contratista"],
    },
    s5: { h: "Mismas paredes, ventanas y distribución", sub: "DecoHero cambia muebles, colores y luz. El espacio sigue siendo tuyo." },
    s6: { h: "Doce estilos para probar", sub: "De la calma japandi al brillo art déco." },
    s7: {
      h: "Empieza con tres diseños gratis",
      sub: "Después compra créditos solo cuando quieras más.",
      pack: (n) => `${n} diseños`,
      popular: "Más popular",
      prices: "Precios en USD. El precio local puede variar.",
      points: [
        ["Los créditos no vencen", "Un crédito es un diseño."],
        ["Sin suscripción y sin anuncios", "Cualquier compra quita la marca DecoHero de tus diseños nuevos."],
        ["Si un diseño falla, no lo pagas", "Te devolvemos el crédito automáticamente."],
        ["En tu teléfono y en tu navegador", "deco.hero-apps.com/app"],
      ],
    },
  },
};

// ── Shared pieces ────────────────────────────────────────────────────────────
const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:'Inter',system-ui,sans-serif;color:${color.ink};background:${color.plaster};-webkit-font-smoothing:antialiased}
.serif{font-family:'Instrument Serif',serif;font-weight:400}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:132px;line-height:.96;letter-spacing:-2px;color:${color.ink};text-wrap:balance}
h1 em{font-style:italic;color:${color.olive}}
.sub{font-size:36px;line-height:1.3;color:${color.stone};font-weight:400;text-wrap:balance}
.pad{position:absolute;left:60px;right:60px}
.brand{font-family:'Instrument Serif',serif;font-size:46px;color:${color.ink};letter-spacing:-.3px}
.rule{width:72px;height:3px;background:${color.brass};border-radius:2px}
.photo{border-radius:10px;overflow:hidden;background:${color.line};position:relative}
.photo img{width:100%;height:100%;object-fit:cover;display:block}
.tag{position:absolute;padding:12px 24px;border-radius:999px;background:rgba(246,247,244,.94);color:${color.ink};font-size:27px;font-weight:600;letter-spacing:.2px;box-shadow:0 2px 10px rgba(28,35,33,.12)}
.tag.on{background:${color.olive};color:#fff}
.foot{position:absolute;left:60px;right:60px;bottom:34px;text-align:center;font-size:21px;line-height:1.3;color:${color.stone}}
.shadow{box-shadow:0 30px 70px rgba(44,62,47,.18),0 8px 22px rgba(28,35,33,.10)}
.phone{position:absolute;background:${color.ink};border-radius:64px;padding:13px;box-shadow:0 44px 100px rgba(44,62,47,.26),0 12px 30px rgba(28,35,33,.16)}
.phone .screen{border-radius:52px;overflow:hidden;background:${color.limewash};position:relative}
.phone .status{display:flex;justify-content:space-between;align-items:center;background:${color.limewash};color:${color.ink};font-weight:600}
.phone .cam{position:absolute;left:50%;transform:translateX(-50%);background:${color.ink};border-radius:50%}
.phone img{display:block;width:100%}
`;

/** A plain phone frame around a real app capture (448x960 dp, see capture.mjs), so the screen keeps a real
 * phone's 448:997 shape. `w` = screen width in px. */
function phone({ src, w, left, top, crop = 1, dp = 960 }) {
  const bar = Math.round(w * 0.082);
  const h = Math.round(((w * dp) / 448) * crop);
  const k = w / 448;
  const signal = `<svg width="${46 * k}" height="${17 * k}" viewBox="0 0 46 17" fill="${color.ink}"><rect x="0" y="10" width="4" height="6" rx="1"/><rect x="6" y="7" width="4" height="9" rx="1"/><rect x="12" y="4" width="4" height="12" rx="1"/><rect x="18" y="1" width="4" height="15" rx="1"/><rect x="29" y="3" width="15" height="12" rx="3" fill="none" stroke="${color.ink}" stroke-width="1.6"/><rect x="31.2" y="5.2" width="9" height="7.6" rx="1.4"/></svg>`;
  return `<div class="phone" style="left:${left}px;top:${top}px">
    <div class="screen" style="width:${w}px">
      <div class="status" style="height:${bar}px;padding:${6 * k}px ${26 * k}px 0;font-size:${15 * k}px"><span>9:41</span>${signal}</div>
      <div class="cam" style="top:${11 * k}px;width:${13 * k}px;height:${13 * k}px"></div>
      <div style="height:${h}px;overflow:hidden"><img src="${src}"></div>
    </div>
  </div>`;
}

const page = (bg, body, css = "") => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}body{background:${bg}}${css}</style></head><body>${body}</body></html>`;

// ── 01 Hero: before / after split ────────────────────────────────────────────
function s1(lang) {
  const c = COPY[lang];
  const IW = 960, IH = 1280, split = 47;
  return page(color.plaster, `
    <div class="pad" style="top:64px"><div class="brand">DecoHero</div></div>
    <div class="pad" style="top:150px"><h1>${c.s1.h}</h1><p class="sub" style="margin-top:22px">${c.s1.sub}</p></div>
    <div class="photo shadow" style="position:absolute;left:60px;top:586px;width:${IW}px;height:${IH}px;transform:translateY(0)">
      <img src="${after("living-room", "japandi")}">
      <div style="position:absolute;inset:0;width:${split}%;overflow:hidden"><img src="${before("living-room")}" style="width:${IW}px;height:${IH}px;max-width:none"></div>
      <div style="position:absolute;top:0;bottom:0;left:${split}%;width:6px;margin-left:-3px;background:#fff;box-shadow:0 0 14px rgba(28,35,33,.35)"></div>
      <div style="position:absolute;top:50%;left:${split}%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:#fff;box-shadow:0 6px 20px rgba(28,35,33,.3);display:flex;align-items:center;justify-content:center">
        <svg width="46" height="30" viewBox="0 0 46 30" fill="none" stroke="${color.olive}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5 4 15l10 10"/><path d="M32 5l10 10-10 10"/></svg>
      </div>
      <div class="tag" style="left:26px;top:26px">${c.before}</div>
      <div class="tag on" style="right:26px;top:26px">${c.after} · ${styleName(lang, "japandi")}</div>
    </div>
    <div class="foot" style="bottom:14px;font-size:19px">${c.foot}</div>`,
    `h1{font-size:${lang === "es" ? 138 : 150}px}`);
}

// ── 02 One photo, four styles ────────────────────────────────────────────────
function s2(lang) {
  const c = COPY[lang];
  const styles = ["japandi", "mid-century", "boho", "scandinavian"];
  const cw = 468, ch = 640, gap = 24;
  const cells = styles.map((s, i) => `
    <div class="photo" style="position:absolute;left:${(i % 2) * (cw + gap)}px;top:${Math.floor(i / 2) * (ch + gap)}px;width:${cw}px;height:${ch}px">
      <img src="${after("living-room", s)}">
      <div class="tag serif" style="${i % 2 ? "right" : "left"}:18px;${i < 2 ? "top" : "bottom"}:18px;font-size:42px;font-weight:400;padding:8px 26px 12px">${styleName(lang, s)}</div>
    </div>`).join("");
  return page(color.limewash, `
    <div class="pad" style="top:84px"><h1>${c.s2.h}</h1><p class="sub" style="margin-top:22px">${c.s2.sub}</p></div>
    <div style="position:absolute;left:60px;top:510px;width:${cw * 2 + gap}px;height:${ch * 2 + gap}px">
      ${cells}
      <div class="shadow" style="position:absolute;left:50%;top:50%;width:236px;margin:-178px 0 0 -118px;background:#fff;border-radius:12px;padding:10px 10px 0">
        <div class="photo" style="height:288px;border-radius:6px"><img src="${before("living-room")}"></div>
        <div style="text-align:center;font-size:25px;font-weight:600;color:${color.brass};padding:11px 0 13px">${c.yourPhoto}</div>
      </div>
    </div>
    <div class="foot">${c.foot}</div>`);
}

// ── 03 The real app: photo + styles ──────────────────────────────────────────
function s3(lang) {
  const c = COPY[lang];
  const steps = c.s3.steps.map((t, i) => `
    <div style="flex:1;display:flex;gap:16px;align-items:flex-start">
      <div class="serif" style="font-size:84px;line-height:.78;color:${color.brass}">${i + 1}</div>
      <div style="font-size:29px;line-height:1.26;color:${color.ink};font-weight:500">${t}</div>
    </div>`).join("");
  return page(color.brassWash, `
    <div class="pad" style="top:84px"><h1>${c.s3.h}</h1></div>
    <div class="pad" style="top:384px;display:flex;gap:26px">${steps}</div>
    ${phone({ src: capture(lang, "home-sala"), w: 560, left: 247, top: 584 })}
  `, `h1{font-size:126px}`);
}

// ── 04 Results in the app ────────────────────────────────────────────────────
function s4(lang) {
  const c = COPY[lang];
  const notes = c.s4.notes.map((t) => `
    <div style="display:flex;gap:18px;align-items:flex-start;margin-top:30px">
      <div style="flex:none;width:12px;height:12px;border-radius:50%;background:${color.brass};margin-top:13px"></div>
      <div style="font-size:32px;line-height:1.27;font-weight:500">${t}</div>
    </div>`).join("");
  return page(color.plaster, `
    <div class="pad" style="top:84px"><h1>${c.s4.h}</h1></div>
    <div style="position:absolute;left:56px;top:520px;width:322px">
      <div class="shadow" style="background:#fff;border-radius:12px;padding:12px 12px 0;transform:rotate(-2.5deg)">
        <div class="photo" style="height:224px;border-radius:6px"><img src="${before("terrace")}"></div>
        <div style="text-align:center;font-size:25px;font-weight:600;color:${color.brass};padding:12px 0 14px">${c.yourPhoto}</div>
      </div>
      <div style="margin-top:64px"><div class="rule"></div>${notes}</div>
    </div>
    ${phone({ src: capture(lang, "results-terrace"), w: 570, left: 434, top: 440 })}
    <div class="foot">${c.foot}</div>
  `, `h1{font-size:${lang === "es" ? 112 : 126}px}`);
}

// ── 05 The architecture stays ────────────────────────────────────────────────
function s5(lang) {
  const c = COPY[lang];
  const IW = 960, IH = 655;
  // Both photos get the same crop (a little ceiling off the top), so they line up exactly.
  const img = (src) => `<img src="${src}" style="object-position:50% 78%">`;
  return page(color.limewash, `
    <div class="pad" style="top:84px"><h1>${c.s5.h}</h1><p class="sub" style="margin-top:22px">${c.s5.sub}</p></div>
    <div class="photo" style="position:absolute;left:60px;top:${H - 80 - IH * 2 - 20}px;width:${IW}px;height:${IH}px">
      ${img(before("sala-panama"))}<div class="tag" style="left:22px;top:22px">${c.before}</div>
    </div>
    <div class="photo shadow" style="position:absolute;left:60px;top:${H - 80 - IH}px;width:${IW}px;height:${IH}px">
      ${img(after("sala-panama", "coastal"))}<div class="tag on" style="left:22px;top:22px">${c.after} · ${styleName(lang, "coastal")}</div>
    </div>
    <div class="foot" style="bottom:22px">${c.foot}</div>
  `, `h1{font-size:${lang === "es" ? 112 : 120}px}.sub{font-size:33px}`);
}

// ── 06 Twelve styles ─────────────────────────────────────────────────────────
const INDEX = {
  "tropical-modern": "sala-panama", "modern-minimal": "kitchen", "japandi": "bedroom", "scandinavian": "kids-room",
  "mid-century": "living-room", "boho": "terrace", "coastal": "kids-room", "mediterranean": "terrace",
  "industrial": "home-office", "luxury-classic": "dining-room", "farmhouse": "dining-room", "art-deco": "dining-room",
};
function s6(lang) {
  const c = COPY[lang];
  const cw = 304, gap = 24;
  // English fits on one headline line, so its grid is taller.
  const [top, ih, rowH] = lang === "en" ? [446, 264, 350] : [496, 250, 339];
  const cells = STYLE_PRESETS.map((s, i) => `
    <div style="position:absolute;left:${(i % 3) * (cw + gap)}px;top:${Math.floor(i / 3) * rowH}px;width:${cw}px">
      <div class="photo" style="height:${ih}px;border-radius:8px"><img src="${after(INDEX[s.id], s.id)}"></div>
      <div style="display:flex;align-items:baseline;gap:12px;margin-top:10px">
        <span style="font-size:19px;font-weight:600;color:${color.brass};letter-spacing:1px">${String(i + 1).padStart(2, "0")}</span>
        <span class="serif" style="font-size:42px;line-height:1;letter-spacing:-.3px;white-space:nowrap">${s[lang]}</span>
      </div>
    </div>`).join("");
  return page(color.plaster, `
    <div class="pad" style="top:84px"><h1>${c.s6.h}</h1><p class="sub" style="margin-top:20px">${c.s6.sub}</p></div>
    <div style="position:absolute;left:60px;top:${top}px;width:960px;height:${rowH * 4}px">${cells}</div>
    <div class="foot">${c.foot}</div>`);
}

// ── 07 Free designs, packs, trust ────────────────────────────────────────────
function s7(lang) {
  const c = COPY[lang];
  const packs = [[15, "$2.99"], [50, "$7.99"], [150, "$19.99"]];
  const cards = packs.map(([n, price], i) => `
    <div style="flex:1;position:relative;background:${color.plaster};border:2.5px solid ${i === 1 ? color.brass : color.line};border-radius:14px;padding:34px 20px 30px;text-align:center">
      ${i === 1 ? `<div style="position:absolute;top:-21px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${color.brass};color:#fff;font-size:21px;font-weight:600;padding:7px 18px;border-radius:999px">${c.s7.popular}</div>` : ""}
      <div class="serif" style="font-size:92px;line-height:.9">${n}</div>
      <div style="font-size:25px;color:${color.stone};margin-top:6px">${c.s7.pack(n).replace(/^\d+\s*/, "")}</div>
      <div style="font-size:34px;font-weight:700;color:${color.olive};margin-top:18px">${price}</div>
    </div>`).join("");
  const points = c.s7.points.map(([t, d]) => `
    <div style="display:flex;gap:24px;align-items:flex-start;padding:25px 0;border-top:2px solid ${color.line}">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="flex:none;margin-top:4px"><circle cx="20" cy="20" r="18.5" stroke="${color.olive}" stroke-width="2.6"/><path d="M11.5 20.5l5.8 5.8L28.8 14" stroke="${color.olive}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div><div class="serif" style="font-size:50px;line-height:1.02;letter-spacing:-.4px">${t}</div>
      <div style="font-size:27px;line-height:1.3;color:${color.stone};margin-top:7px">${d}</div></div>
    </div>`).join("");
  const strip = [["sala-panama", "tropical-modern"], ["bedroom", "boho"], ["dining-room", "farmhouse"]].map(([r, s]) =>
    `<div class="photo" style="flex:1;height:236px;border-radius:8px"><img src="${after(r, s)}"></div>`).join("");
  return page(color.brassWash, `
    <div class="pad" style="top:64px"><div class="brand">DecoHero</div></div>
    <div class="pad" style="top:150px"><h1>${c.s7.h}</h1><p class="sub" style="margin-top:22px">${c.s7.sub}</p></div>
    <div class="pad" style="top:596px;display:flex;gap:20px">${strip}</div>
    <div class="pad" style="top:878px;display:flex;gap:20px">${cards}</div>
    <div class="pad" style="top:1160px;text-align:center;font-size:21px;color:${color.stone}">${c.s7.prices}</div>
    <div class="pad" style="top:1216px">${points}</div>
    <div class="foot">${c.foot}</div>
  `, `h1{font-size:${lang === "es" ? 126 : 132}px}`);
}

const SCREENS = { "01": s1, "02": s2, "03": s3, "04": s4, "05": s5, "06": s6, "07": s7 };

// ── Render ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const langs = ["en", "es"].filter((l) => !args.some((a) => a === "en" || a === "es") || args.includes(l));
const ids = Object.keys(SCREENS).filter((id) => !args.some((a) => /^\d\d$/.test(a)) || args.includes(id));

fs.mkdirSync(BUILD, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });

async function shot(html, file, width, height) {
  const tmp = path.join(BUILD, `${path.basename(file, ".png")}-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 1 });
  await p.goto(`file://${tmp}`, { waitUntil: "networkidle0", timeout: 60000 });
  const ok = await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    const broken = [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src);
    return { fonts: document.fonts.check("40px 'Instrument Serif'") && document.fonts.check("600 20px 'Inter'"), broken };
  });
  if (!ok.fonts) throw new Error("Fonts did not load (Instrument Serif / Inter from Google Fonts)");
  if (ok.broken.length) throw new Error(`Images did not load: ${ok.broken.join(", ")}`);
  await p.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
  await p.close();
  fs.unlinkSync(tmp);
}

try {
  for (const lang of langs) {
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    for (const id of ids) {
      const file = path.join(OUT, lang, `${id}.png`);
      await shot(SCREENS[id](lang), file, W, H);
      const mb = fs.statSync(file).size / 1e6;
      if (mb > 8) throw new Error(`${file} is ${mb.toFixed(1)} MB (Play limit is 8 MB)`);
      console.log(`${lang}/${id}.png  ${mb.toFixed(2)} MB`);
    }
    // Contact sheet: every screen side by side.
    const all = Object.keys(SCREENS).filter((id) => fs.existsSync(path.join(OUT, lang, `${id}.png`)));
    const tw = 432, th = 768, g = 28;
    const sheet = `<!doctype html><html><body style="margin:0;background:#D9DDD6;padding:${g}px;display:flex;gap:${g}px">${all
      .map((id) => `<img src="file://${path.join(OUT, lang, `${id}.png`)}" style="width:${tw}px;height:${th}px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.18)">`)
      .join("")}</body></html>`;
    await shot0(sheet, path.join(OUT, `contact-sheet-${lang}.png`), g + all.length * (tw + g), th + g * 2);
    console.log(`contact-sheet-${lang}.png`);
  }
} finally {
  await browser.close();
}

async function shot0(html, file, width, height) {
  const tmp = path.join(BUILD, `sheet-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 1 });
  await p.goto(`file://${tmp}`, { waitUntil: "load" });
  await p.screenshot({ path: file });
  await p.close();
  fs.unlinkSync(tmp);
}
