#!/usr/bin/env node
// Builds the static landing pages in site/ from scripts/site-src/.
//   node scripts/build-site.mjs
// One template + two string tables (EN, ES) so the languages cannot drift apart: a key missing in
// either language stops the build. The legal pages come from Markdown: PRIVACY_POLICY.md (EN, repo root),
// site-src/privacy.es.md, site-src/terms.en.md and site-src/terms.es.md.
// The generated HTML is committed, so deploys do not depend on this script having been run by hand
// (build-web.sh runs it anyway).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { sampleRooms, strings, styleNotes } from "./site-src/strings.mjs";
import { guides, roomNames, styleGuides, stylesHub } from "./site-src/guides.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(here, "site-src");
const out = join(root, "site");
const ORIGIN = "https://deco.hero-apps.com";
const LANGS = ["en", "es"];

const read = (p) => readFileSync(p, "utf8");
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 10);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- strings: both languages must have the same keys ----
const keys = (o) => Object.keys(o).sort().join("\n");
if (keys(strings.en) !== keys(strings.es)) {
  const a = new Set(Object.keys(strings.en));
  const b = new Set(Object.keys(strings.es));
  const diff = [...a].filter((k) => !b.has(k)).map((k) => `es is missing ${k}`)
    .concat([...b].filter((k) => !a.has(k)).map((k) => `en is missing ${k}`));
  throw new Error("String tables differ:\n" + diff.join("\n"));
}

// ---- the real style list, read from the app so the page cannot list a style the app lacks ----
// Only STYLE_PRESETS here: TREE_PRESETS (Christmas mode) is read separately below.
const presetsSrc = read(join(root, "mobile/src/stylePresets.ts"));
const stylePresetsBlock = /export const STYLE_PRESETS = \[([\s\S]*?)\] as const;/.exec(presetsSrc)?.[1] ?? "";
const presets = [...stylePresetsBlock
  .matchAll(/\{\s*id:\s*"([^"]+)",\s*en:\s*"([^"]+)",\s*es:\s*"([^"]+)"\s*\}/g)]
  .map(([, id, en, es]) => ({ id, en, es }));
if (presets.length === 0) throw new Error("No styles found in mobile/src/stylePresets.ts");
for (const p of presets) {
  for (const l of LANGS) if (!styleNotes[l][p.id]) throw new Error(`No ${l} note for style ${p.id}`);
}
// Christmas mode: the tree style names shown on the page come from TREE_PRESETS, so they match the app.
const treeBlock = /export const TREE_PRESETS = \[([\s\S]*?)\] as const;/.exec(presetsSrc)?.[1] ?? "";
const trees = [...treeBlock
  .matchAll(/\{\s*id:\s*"xmas-([^"]+)",\s*en:\s*"([^"]+)",\s*es:\s*"([^"]+)"\s*\}/g)]
  .map(([, id, en, es]) => ({ id, en, es }));
if (trees.length !== 6) throw new Error(`The Christmas copy says six tree styles, mobile/src/stylePresets.ts has ${trees.length}`);
const treeNames = (lang) => Object.fromEntries(["classic", "nordic", "tropical"].map((id) => {
  const t = trees.find((x) => x.id === id);
  if (!t) throw new Error(`No tree style xmas-${id} in mobile/src/stylePresets.ts`);
  return ["tree_" + id, esc(t[lang])];
}));
const thumb = (room, style) => `/img/rooms/thumb-${room}-${style}.webp`;
for (const l of LANGS) for (const r of sampleRooms[l]) for (const p of presets) {
  if (!existsSync(join(out, thumb(r.id, p.id)))) throw new Error(`No thumbnail ${thumb(r.id, p.id)}`);
}
const styleAlt = (lang, room, p) => strings[lang].style_alt.replace("{room}", room.alt).replace("{style}", p[lang]);
const styleList = (lang) => {
  const room = sampleRooms[lang][0];
  return presets.map((p, i) =>
    `        <li class="style reveal"><img src="${thumb(room.id, p.id)}" data-style="${p.id}" data-name="${esc(p[lang])}" width="640" height="480" loading="lazy" decoding="async" alt="${esc(styleAlt(lang, room, p))}">` +
    `<span class="style-n">${String(i + 1).padStart(2, "0")}</span>` +
    `<h3>${esc(p[lang])}</h3><p>${esc(styleNotes[lang][p.id])}</p></li>`).join("\n");
};
// Round photo of each sample room before the redesign. The script swaps the 12 thumbnails; without it
// the picker stays hidden and the first room shows.
const roomPicker = (lang) => sampleRooms[lang].map((r, i) =>
  `<button type="button" class="room-chip" data-room="${r.id}" data-alt="${esc(r.alt)}" aria-pressed="${i === 0}">` +
  `<img src="/img/rooms/chip-${r.id}.webp" width="160" height="160" alt="" loading="lazy" decoding="async"><span>${esc(r.name)}</span></button>`).join("\n            ");

// ---- tiny Markdown subset for the legal pages: h1, h2, paragraphs, - lists, tables, **bold**, _italic_ ----
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,]|$)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(https?:\/\/[^\s)<]*[^\s)<.,;:])/g, '<a href="$1">$1</a>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, '<a href="mailto:$1">$1</a>');
}
function markdown(md) {
  // Repo notes stay out of the page; TODO(Dorien) comments are kept so they can be found in site/.
  md = md.replace(/<!--([\s\S]*?)-->/g, (m, body) => (/^\s*TODO\(Dorien\)/.test(body) ? m : ""));
  const lines = md.split("\n");
  const html = [];
  let title = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("<!--")) {
      const block = [];
      while (i < lines.length && !lines[i].includes("-->")) block.push(lines[i++]);
      block.push(lines[i++]);
      html.push(block.join("\n"));
    } else if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      html.push(`<h1>${inline(title)}</h1>`);
      i++;
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inline(line.slice(3).trim())}</h2>`);
      i++;
    } else if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      html.push(`<ul>\n${items.join("\n")}\n</ul>`);
    } else if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      }
      const [head, , ...body] = rows;
      html.push(
        '<div class="table-wrap"><table>\n<thead><tr>' + head.map((c) => `<th scope="col">${inline(c)}</th>`).join("") +
        "</tr></thead>\n<tbody>\n" +
        body.map((r) => "<tr>" + r.map((c, n) => (n === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("") + "</tr>").join("\n") +
        "\n</tbody></table></div>");
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#|- |\||<!--)/.test(lines[i])) para.push(lines[i++]);
      const text = para.join(" ");
      html.push(/^_.*_$/.test(text) ? `<p class="updated">${inline(text.slice(1, -1))}</p>` : `<p>${inline(text)}</p>`);
    }
  }
  return { title, html: html.join("\n") };
}

// ---- templating ----
function fill(tpl, vars, name) {
  // Two passes, so a string may itself contain a placeholder such as {{privacy_path}}.
  let outText = tpl;
  for (let pass = 0; pass < 2; pass++) {
    outText = outText.replace(/\{\{(\w+)\}\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`${name}: no value for {{${k}}}`);
      return vars[k];
    });
  }
  return outText;
}
function write(rel, text) {
  if (text.includes(String.fromCharCode(0x2014))) throw new Error(`${rel}: contains an em dash`);
  const p = join(out, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
  console.log("wrote site/" + rel);
}

const assets = { css_v: hash(join(out, "css/site.css")), js_v: hash(join(out, "js/site.js")) };
const pathFor = (lang, page) => (lang === "en" ? "" : "/es") + (page === "index" ? "" : "/" + page) || "/";

function common(lang, page) {
  const other = lang === "en" ? "es" : "en";
  return {
    ...strings[lang],
    ...assets,
    lang,
    origin: ORIGIN,
    home: lang === "en" ? "/" : "/es",
    path: pathFor(lang, page),
    en_path: pathFor("en", page),
    es_path: pathFor("es", page),
    other_path: pathFor(other, page),
    privacy_path: pathFor(lang, "privacy"),
    terms_path: pathFor(lang, "terms"),
    en_current: lang === "en" ? ' aria-current="true"' : "",
    es_current: lang === "es" ? ' aria-current="true"' : "",
    og_locale: lang === "en" ? "en_US" : "es_419",
    og_locale_alt: lang === "en" ? "es_419" : "en_US",
  };
}

const indexTpl = read(join(src, "index.tpl.html"));
const legalTpl = read(join(src, "legal.tpl.html"));
const legalSrc = {
  privacy: { en: join(root, "PRIVACY_POLICY.md"), es: join(src, "privacy.es.md") },
  terms: { en: join(src, "terms.en.md"), es: join(src, "terms.es.md") },
};


// ---- SEO: analytics, Play links, structured data, guide pages, sitemap ----

// GA4 measurement ID for deco.hero-apps.com. Empty = no analytics tag on any page.
// TODO(Dorien): create a GA4 property with a web stream for https://deco.hero-apps.com (the weekly traffic
// report finds it by that URL), paste the G-... ID here, add analytics to the privacy policy, rebuild.
const GA4_ID = "";
const LASTMOD = "2026-11-19";
const PLAY_ID = "com.heroapps.decohero";

// Play Store link that tells Play Console (Acquisition > store listing visitors, by utm_source / utm_campaign)
// and the Install Referrer which page sent the visitor.
function playUrl(campaign) {
  const utm = `utm_source=deco.hero-apps.com&utm_medium=web&utm_campaign=${campaign}`;
  return `https://play.google.com/store/apps/details?id=${PLAY_ID}&${utm}&referrer=${encodeURIComponent(utm)}`.replace(/&/g, "&amp;");
}

const extraJs = { ga_v: hash(join(out, "js/ga.js")), calc_v: hash(join(out, "js/tree-calc.js")) };
const analytics = GA4_ID
  ? `  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>\n  <script src="/js/ga.js?v=${extraJs.ga_v}" data-ga="${GA4_ID}" defer></script>`
  : "  <!-- analytics: off until GA4_ID is set in scripts/build-site.mjs -->";

const stripTags = (html) => html.replace(/<\/(p|li)>\s*<(p|li)>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const ld = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const faqLd = (pairs) => (pairs.length ? {
  "@type": "FAQPage",
  mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: stripTags(q), acceptedAnswer: { "@type": "Answer", text: stripTags(a) } })),
} : null);
const appLd = (lang) => ({
  "@type": "SoftwareApplication",
  "@id": `${ORIGIN}/#app`,
  name: "DecoHero",
  alternateName: "DecoHero: Room Redesign AI",
  url: `${ORIGIN}/`,
  applicationCategory: "DesignApplication",
  operatingSystem: "Android, Web",
  inLanguage: ["en", "es"],
  image: `${ORIGIN}/img/icon-192.png`,
  description: stripTags(strings[lang].description),
  installUrl: `https://play.google.com/store/apps/details?id=${PLAY_ID}`,
  offers: [
    { "@type": "Offer", name: "1 free design", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "15 designs", price: "3.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "50 designs", price: "9.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "150 designs", price: "24.99", priceCurrency: "USD" },
  ],
  publisher: { "@type": "Organization", name: "Divina Endeavors LLC" },
});

// ---- image helper: width and height straight from the WebP header ----
const dimCache = new Map();
function webpSize(rel) {
  if (dimCache.has(rel)) return dimCache.get(rel);
  const b = readFileSync(join(out, rel));
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") throw new Error(`${rel} is not a WebP file`);
  const chunk = b.toString("ascii", 12, 16);
  let w, h;
  if (chunk === "VP8 ") { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
  else if (chunk === "VP8L") { const n = b.readUInt32LE(21); w = (n & 0x3fff) + 1; h = ((n >> 14) & 0x3fff) + 1; }
  else if (chunk === "VP8X") { w = b.readUIntLE(24, 3) + 1; h = b.readUIntLE(27, 3) + 1; }
  else throw new Error(`${rel}: unknown WebP chunk ${chunk}`);
  dimCache.set(rel, { w, h });
  return { w, h };
}

// ---- guide pages ----
const allGuides = [...guides, stylesHub];
const presetName = Object.fromEntries(presets.map((p) => [p.id, p.en]));
const styleSlug = (id) => `styles/${id}`;
const roomOrder = Object.keys(roomNames);
const roomsFor = (id) => roomOrder.filter((r) => existsSync(join(out, `img/g/${r}-${id}.webp`)));

for (const id of Object.keys(styleGuides)) if (!presetName[id]) throw new Error(`styleGuides has ${id}, the app does not`);
for (const p of presets) {
  const g = styleGuides[p.id];
  if (!g) throw new Error(`No style page copy for ${p.id} in guides.mjs`);
  const name = p.en;
  const rooms = roomsFor(p.id);
  if (!rooms.includes("living-room")) throw new Error(`No /img/g/living-room-${p.id}.webp`);
  allGuides.push({
    key: "style-" + p.id,
    lang: "en",
    slug: styleSlug(p.id),
    pair: null,
    campaign: "style_" + p.id.replace(/-/g, "_"),
    parent: "styles",
    title: `${g.kw}, shown on real rooms`,
    desc: `${name} style on real sample rooms: before and after pictures of a living room and a bedroom, what makes a room ${name.toLowerCase()}, and four changes to start with.`,
    eyebrow: `${name} style`,
    h1: g.kw,
    lede: g.intro,
    og: `/img/g/living-room-${p.id}.webp`,
    body: (h) => `
${h.pair("/img/g/living-room-before.webp", `/img/g/living-room-${p.id}.webp`, "Sample apartment living room before: beige sofa, brown armchair, glass coffee table and a TV on a pine chest", `The same living room redesigned in ${name} style, with the same window and walls`, `After, ${name}`)}
<div class="gallery">
${rooms.filter((r) => r !== "living-room").map((r) => h.fig(`/img/g/${r}-${p.id}.webp`, `Sample ${roomNames[r].toLowerCase()} redesigned in ${name} style`, roomNames[r])).join("\n")}
</div>
<p class="sample-note">Sample rooms, all AI-generated: no photo shows a real person's home. Designs are ideas, not exact products or measurements.</p>
<section class="prose">
  <h2 id="look">What makes a room ${esc(name.toLowerCase())}</h2>
  <ul>
${g.look.map((x) => `    <li>${x}</li>`).join("\n")}
  </ul>
  <h2 id="start">Four changes to start with</h2>
  <ol class="num">
${g.start.map((x) => `    <li>${x}</li>`).join("\n")}
  </ol>
  <h2 id="fit">Where it works</h2>
  <p>${g.fit}</p>
  <h2 id="your-room">See ${esc(name.toLowerCase())} on your own room</h2>
  <p>Upload a photo to DecoHero and pick ${esc(name)} together with up to three other styles. The app keeps your walls, windows and floor plan and changes the furniture, colours, materials and lighting.</p>
</section>`,
    faq: [],
    cta_h: `Your room in ${name} style`,
    cta_p: "Add a photo, pick up to four styles and compare them on your own room. Your first design is free.",
    related: [...g.related.map((r) => "style-" + r), "styles", "room-design"],
  });
}

const byKey = Object.fromEntries(allGuides.map((g) => [g.key, g]));
const guidePath = (g) => (g.lang === "es" ? "/es/" : "/") + g.slug;
for (const g of allGuides) {
  if (g.pair && (!byKey[g.pair] || byKey[g.pair].pair !== g.key)) throw new Error(`Guide ${g.key}: pair ${g.pair} does not point back`);
  for (const r of g.related) if (!byKey[r]) throw new Error(`Guide ${g.key}: related ${r} does not exist`);
}

const helpers = (g) => ({
  fig(src, alt, caption) {
    const { w, h } = webpSize(src);
    return `<figure class="fig"><img src="${src}" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(alt)}">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  },
  pair(before, after, bAlt, aAlt, afterLabel, caption) {
    const b = webpSize(before), a = webpSize(after);
    const beforeLabel = g.lang === "es" ? "Antes" : "Before";
    return `<figure class="pair">
    <div class="pair-in">
      <div class="pair-pane"><img src="${before}" width="${b.w}" height="${b.h}" loading="lazy" decoding="async" alt="${esc(bAlt)}"><span class="ba-tag">${beforeLabel}</span></div>
      <div class="pair-pane"><img src="${after}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async" alt="${esc(aAlt)}"><span class="ba-tag ba-tag-after">${afterLabel}</span></div>
    </div>${caption ? `\n    <figcaption>${caption}</figcaption>` : ""}
  </figure>`;
  },
  url: (key) => guidePath(byKey[key]),
  calc: () => calcHtml(g.lang),
  sizeTable: () => sizeTable(g.lang),
  styleCards(ids) {
    const list = ids || presets.map((p) => p.id);
    return `<ul class="styles style-cards">\n${list.map((id) => {
      const t = `/img/rooms/thumb-living-room-${id}.webp`;
      return `  <li class="style"><a href="/${styleSlug(id)}"><img src="${t}" width="640" height="480" loading="lazy" decoding="async" alt="Sample apartment living room in ${esc(presetName[id])} style"><h3>${esc(presetName[id])}</h3></a><p>${esc(styleNotes.en[id])}</p></li>`;
    }).join("\n")}\n</ul>`;
  },
});

// ---- ceiling calculator: same rule as the app (mobile/src/treeSize.ts): tree = ceiling minus 12 in / 30 cm ----
const SOLD_FT = [2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];
const fmtNum = (n, lang, d = 2) => {
  const s = String(Number(n.toFixed(d)));
  return lang === "es" ? s.replace(".", ",") : s;
};
const ftIn = (ft) => { const inch = Math.round(ft * 12); const f = Math.floor(inch / 12), i = inch % 12; return i ? `${f} ft ${i} in` : `${f} ft`; };
function sizeTable(lang) {
  if (lang === "en") {
    const rows = [7, 7.5, 8, 8.5, 9, 10, 11, 12].map((c) => {
      const t = c - 1;
      return `<tr><th scope="row">${c} ft (${fmtNum(c * 0.3048, lang)} m)</th><td>${t} ft (${fmtNum(t * 0.3048, lang)} m)</td><td>about ${ftIn(t * 2 / 3)}</td></tr>`;
    }).join("\n");
    return `<div class="table-wrap size-table"><table>\n<thead><tr><th scope="col">Ceiling</th><th scope="col">Tallest tree</th><th scope="col">Floor circle, full fir</th></tr></thead>\n<tbody>\n${rows}\n</tbody></table></div>`;
  }
  const rows = [2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3, 3.5].map((c) => {
    const t = c - 0.3;
    const ft = [...SOLD_FT].reverse().find((s) => s * 0.3048 <= t + 1e-9);
    return `<tr><th scope="row">${fmtNum(c, lang)} m</th><td>${fmtNum(t, lang)} m</td><td>${fmtNum(ft, lang, 1)} pies (${fmtNum(ft * 0.3048, lang)} m)</td><td>unos ${fmtNum(Math.round(t * 2 / 3 * 20) / 20, lang)} m</td></tr>`;
  }).join("\n");
  return `<div class="table-wrap size-table"><table>\n<thead><tr><th scope="col">Techo</th><th scope="col">Árbol más alto</th><th scope="col">Si se vende en pies</th><th scope="col">Ancho, abeto frondoso</th></tr></thead>\n<tbody>\n${rows}\n</tbody></table></div>`;
}
function calcHtml(lang) {
  const en = lang === "en";
  const t = en
    ? { h: "Tree size calculator", label: "Ceiling height", ft: "feet", m: "metres", unit: "Unit", noscript: "The calculator needs JavaScript. The chart below gives the same answers." }
    : { h: "Calculadora de tamaño", label: "Altura del techo", ft: "pies", m: "metros", unit: "Unidad", noscript: "La calculadora necesita JavaScript. La tabla de abajo da las mismas respuestas." };
  const unit = en ? "ft" : "m";
  const value = en ? "8" : "2.4";
  return `<section class="calc" aria-labelledby="calc-h" data-lang="${lang}">
  <h2 id="calc-h">${t.h}</h2>
  <form class="calc-form" action="#" novalidate>
    <label for="ceiling">${t.label}</label>
    <div class="calc-row">
      <input id="ceiling" name="ceiling" type="number" inputmode="decimal" min="${en ? 6 : 1.8}" max="${en ? 20 : 6}" step="${en ? 0.5 : 0.05}" value="${value}">
      <fieldset class="calc-units"><legend class="sr-only">${t.unit}</legend>
        <label><input type="radio" name="unit" value="ft"${unit === "ft" ? " checked" : ""}><span>${t.ft}</span></label>
        <label><input type="radio" name="unit" value="m"${unit === "m" ? " checked" : ""}><span>${t.m}</span></label>
      </fieldset>
    </div>
    <output class="calc-out" for="ceiling" aria-live="polite"><noscript>${t.noscript}</noscript></output>
  </form>
</section>`;
}

const guideNav = (lang) => (lang === "en"
  ? [["tree-size", "Tree size"], ["tree-placement", "Tree placement"], ["tree-themes", "Tree themes"], ["styles", "Styles"]]
  : [["tree-size-es", "Tamaño del árbol"], ["tree-placement-es", "Dónde ponerlo"], ["room-design-es", "Diseño con IA"]])
  .map(([k, label]) => `        <a href="${guidePath(byKey[k])}">${label}</a>`).join("\n");
const footerGuides = (lang) => (lang === "en"
  ? [["tree-size", "Christmas tree size calculator"], ["tree-placement", "Where to put a Christmas tree"], ["tree-themes", "Christmas tree themes"], ["room-design", "AI room design from a photo"], ["styles", "Interior styles"]]
  : [["tree-size-es", "Calculadora del árbol de Navidad"], ["tree-placement-es", "Dónde poner el árbol"], ["room-design-es", "Diseño de interiores con IA"]])
  .map(([k, label]) => `        <a href="${guidePath(byKey[k])}">${label}</a>`).join("\n");

const pages = []; // for the sitemap: { path, alternates: {en, es} | null }

function renderGuide(g) {
  const s = strings[g.lang];
  const path = guidePath(g);
  const pair = g.pair ? byKey[g.pair] : null;
  const enPath = g.lang === "en" ? path : pair ? guidePath(pair) : "/";
  const esPath = g.lang === "es" ? path : pair ? guidePath(pair) : "/es";
  const hreflang = pair
    ? [`  <link rel="alternate" hreflang="en" href="${ORIGIN}${enPath}">`, `  <link rel="alternate" hreflang="es" href="${ORIGIN}${esPath}">`, `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}${enPath}">`].join("\n")
    : `  <link rel="alternate" hreflang="${g.lang}" href="${ORIGIN}${path}">`;
  const h = helpers(g);
  const body = g.body(h);
  if (/\{\{/.test(body)) throw new Error(`${g.key}: body contains {{`);
  const parent = g.parent ? byKey[g.parent] : null;
  const crumbList = [[g.lang === "en" ? "Home" : "Inicio", g.lang === "en" ? "/" : "/es"], ...(parent ? [[parent.eyebrow, guidePath(parent)]] : []), [g.eyebrow, path]];
  const crumbs = crumbList.map(([n, u], i) => (i === crumbList.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`)).join(' <span aria-hidden="true">/</span> ');
  const faq = g.faq.length
    ? `    <section class="section section-plaster" id="faq">
      <div class="wrap faq-in">
        <div><p class="eyebrow">${s.faq_title}</p><h2>${g.lang === "en" ? "Common questions" : "Preguntas frecuentes"}</h2></div>
        <div class="faq">
${g.faq.map(([q, a]) => `          <details><summary>${q}</summary><div class="answer"><p>${a}</p></div></details>`).join("\n")}
        </div>
      </div>
    </section>`
    : "";
  const related = `    <section class="section related">
      <div class="wrap">
        <p class="eyebrow">${s.related_title}</p>
        <ul class="related-list">
${g.related.map((k) => `          <li><a href="${guidePath(byKey[k])}"><span class="related-eyebrow">${esc(byKey[k].eyebrow)}</span><span class="related-title">${esc(byKey[k].h1)}</span></a></li>`).join("\n")}
        </ul>
      </div>
    </section>`;
  const graph = [
    {
      "@type": "Article",
      headline: stripTags(g.h1),
      description: g.desc,
      inLanguage: g.lang,
      url: ORIGIN + path,
      image: ORIGIN + g.og,
      dateModified: LASTMOD,
      author: { "@type": "Organization", name: "DecoHero" },
      publisher: { "@type": "Organization", name: "Divina Endeavors LLC" },
      about: { "@id": `${ORIGIN}/#app` },
    },
    { "@type": "BreadcrumbList", itemListElement: crumbList.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: ORIGIN + u })) },
    appLd(g.lang),
    faqLd(g.faq),
  ].filter(Boolean);
  const scripts = (g.scripts || []).map((n) => {
    if (n !== "tree-calc") throw new Error(`Unknown script ${n}`);
    return `  <script src="/js/tree-calc.js?v=${extraJs.calc_v}" defer></script>`;
  }).join("\n");
  const html = fill(read(join(src, "guide.tpl.html")), {
    ...common(g.lang, "index"),
    path,
    hreflang,
    analytics,
    jsonld: ld({ "@context": "https://schema.org", "@graph": graph }),
    guide_nav: guideNav(g.lang),
    footer_guides: footerGuides(g.lang),
    g_en_link: enPath,
    g_es_link: esPath,
    crumbs,
    g_title: esc(g.title),
    g_desc: esc(g.desc),
    g_og_image: g.og,
    g_eyebrow: esc(g.eyebrow),
    g_h1: g.h1,
    g_lede: g.lede,
    g_body: body,
    g_cta_h: g.cta_h,
    g_cta_p: g.cta_p,
    g_faq: faq,
    g_related: related,
    g_scripts: scripts,
    play_url: playUrl(g.campaign),
  }, g.key);
  write(path.slice(1) + ".html", html);
  pages.push({ path, alternates: pair ? { en: enPath, es: esPath } : null });
}

// ---- home and legal pages ----
for (const lang of LANGS) {
  const dir = lang === "en" ? "" : "es/";
  const homeFaq = Object.keys(strings[lang]).filter((k) => /^faq\d+_q$/.test(k)).sort()
    .map((k) => [strings[lang][k], strings[lang][k.replace("_q", "_a")].replace(/\{\{play_url\}\}/g, "")]);
  const homeLd = { "@context": "https://schema.org", "@graph": [appLd(lang), faqLd(homeFaq)] };
  write(dir + "index.html", fill(indexTpl, {
    ...common(lang, "index"), style_list: styleList(lang), room_picker: roomPicker(lang), ...treeNames(lang),
    style_alt_tpl: esc(strings[lang].style_alt), style_count: String(presets.length),
    analytics, jsonld: ld(homeLd), footer_guides: footerGuides(lang), play_url: playUrl(lang === "en" ? "home" : "home_es"),
  }, "index"));
  pages.push({ path: pathFor(lang, "index"), alternates: { en: "/", es: "/es" } });
  for (const page of ["privacy", "terms"]) {
    const { title, html } = markdown(read(legalSrc[page][lang]));
    write(dir + page + ".html", fill(legalTpl, {
      ...common(lang, page),
      legal_title: esc(title),
      legal_desc: strings[lang][page + "_desc"],
      legal_body: html,
      analytics,
      footer_guides: footerGuides(lang),
      play_url: playUrl(page),
    }, page));
    pages.push({ path: pathFor(lang, page), alternates: { en: pathFor("en", page), es: pathFor("es", page) }, low: true });
  }
}
for (const g of allGuides) renderGuide(g);

// ---- sitemap.xml and robots.txt ----
const urlEntry = (p) => {
  const alt = p.alternates
    ? ["en", "es"].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${p.alternates[l]}"/>`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${p.alternates.en}"/>`).join("\n") + "\n"
    : "";
  return `  <url>\n    <loc>${ORIGIN}${p.path}</loc>\n${alt}    <lastmod>${LASTMOD}</lastmod>\n  </url>`;
};
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(urlEntry).join("\n")}
</urlset>
`);
console.log(`wrote site/sitemap.xml (${pages.length} URLs)`);
writeFileSync(join(out, "robots.txt"), `User-agent: *
Allow: /
Disallow: /__/

Sitemap: ${ORIGIN}/sitemap.xml
`);
console.log("wrote site/robots.txt");
