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
import { strings, styleNotes } from "./site-src/strings.mjs";

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
const presets = [...read(join(root, "mobile/src/stylePresets.ts"))
  .matchAll(/\{\s*id:\s*"([^"]+)",\s*en:\s*"([^"]+)",\s*es:\s*"([^"]+)"\s*\}/g)]
  .map(([, id, en, es]) => ({ id, en, es }));
if (presets.length === 0) throw new Error("No styles found in mobile/src/stylePresets.ts");
for (const p of presets) {
  for (const l of LANGS) if (!styleNotes[l][p.id]) throw new Error(`No ${l} note for style ${p.id}`);
}
const styleList = (lang) => presets.map((p, i) =>
  `        <li class="style reveal"><span class="style-n">${String(i + 1).padStart(2, "0")}</span>` +
  `<h3>${esc(p[lang])}</h3><p>${esc(styleNotes[lang][p.id])}</p></li>`).join("\n");

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

for (const lang of LANGS) {
  const dir = lang === "en" ? "" : "es/";
  write(dir + "index.html", fill(indexTpl, { ...common(lang, "index"), style_list: styleList(lang), style_count: String(presets.length) }, "index"));
  for (const page of ["privacy", "terms"]) {
    const { title, html } = markdown(read(legalSrc[page][lang]));
    write(dir + page + ".html", fill(legalTpl, {
      ...common(lang, page),
      legal_title: esc(title),
      legal_desc: strings[lang][page + "_desc"],
      legal_body: html,
    }, page));
  }
}
