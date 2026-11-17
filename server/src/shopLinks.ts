// "Shop this look" links under Christmas results (app 1.0.4+), set per theme in the SHOP_LINKS env var so they
// can change without an app release. Bad config never crashes the server: invalid entries are skipped and logged.
import { isTreeStyle } from "./styles.js";

// Three kinds (server 1.0.6): "partner" and "amazon" are affiliate links and are shown with their disclosure;
// "plain" is an ordinary link that earns us nothing and is shown without one (app 1.0.6+, older apps skip it).
// Switching a plain link to an affiliate link later is a SHOP_LINKS edit: new url, kind "amazon" or "partner".
export type ShopLinkKind = "amazon" | "partner" | "plain";
export type ShopLink = { en: string; es: string; url: string; kind: ShopLinkKind };
export type ShopLinks = Record<string, ShopLink[]>;

const MAX_LINKS_PER_THEME = 4;
const MAX_LABEL = 40;
const MAX_URL = 600;
const MAX_CONFIG = 20_000;

const AMAZON_STORES = /^(?:www\.|smile\.)?amazon\.(?:com|ca|com\.mx|com\.br|co\.uk|de|fr|es|it|nl|se|pl|com\.be|com\.tr|ae|sa|eg|in|co\.jp|com\.au|sg)$/;
const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/\.$/, "");

/** A real Amazon store or its amzn.to shortener: the only hosts a link of kind "amazon" may point to. */
export const isAmazonHost = (host: string) => AMAZON_STORES.test(host) || host === "amzn.to";
/** Wider on purpose: anything that smells of Amazon may not pass as "partner" (or as the tree store). */
export const looksLikeAmazon = (host: string) =>
  host === "a.co" || host.split(".").some((label) => label === "amazon" || label === "amzn");

/**
 * Amazon Associates only allows its links inside an app Amazon has approved. Until AMAZON_APP_APPROVED is
 * exactly "true", links of kind "amazon" are dropped here and never reach the app.
 */
export const amazonApproved = () => process.env.AMAZON_APP_APPROVED?.trim().toLowerCase() === "true";

/**
 * Query parameters that mark a link as an affiliate or referral link. A "plain" link is shown without a
 * commission disclosure, so it may not carry any of them.
 */
const AFFILIATE_PARAMS = new Set([
  "tag", "linkcode", "linkid", "ascsubtag", "camp", "creative", "creativeasin", // Amazon Associates
  "sca_ref", "ref", "aff", "affid", "aff_id", "affiliate", "affiliate_id", "partnerid",
  "irclickid", "irgwc", "clickid", "awc", "cjevent", "subid", "sharedid", "rfsn", "ranmid", "raneaid", "ransiteid",
]);
/** Shorteners hide where a link ends up and what it carries, so a "plain" link has to be written out in full. */
const SHORTENERS = new Set(["amzn.to", "a.co", "bit.ly", "tinyurl.com", "t.co", "geni.us", "rstyle.me", "shopstyle.it", "howl.me", "go.magik.ly"]);

function cleanLabel(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const label = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return label ? [...label].slice(0, MAX_LABEL).join("").trim() : null;
}

/** One checked link, or the reason it was refused. */
function parseLink(entry: unknown): ShopLink | string {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return "not an object";
  const { label_en, label_es, url: rawUrl, kind } = entry as Record<string, unknown>;
  if (kind !== "amazon" && kind !== "partner" && kind !== "plain") return 'kind must be "amazon", "partner" or "plain"';
  const en = cleanLabel(label_en);
  if (!en) return "label_en is missing";
  const es = label_es === undefined ? en : cleanLabel(label_es);
  if (!es) return "label_es is not a usable text";
  if (typeof rawUrl !== "string" || rawUrl.length > MAX_URL) return "url is missing or too long";
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return "url is not a URL";
  }
  if (url.protocol !== "https:") return "url is not https";
  if (url.username || url.password) return "url carries a login";
  const host = hostOf(url);
  if (kind === "amazon" && !isAmazonHost(host)) return "amazon link does not point to an Amazon store";
  if (kind === "partner" && looksLikeAmazon(host)) return "partner link points to Amazon";
  if (kind === "partner" && /amazon/i.test(`${en} ${es}`)) return "partner label mentions Amazon";
  if (kind === "plain") {
    if (SHORTENERS.has(host)) return "plain link uses a link shortener";
    if ([...url.searchParams.keys()].some((k) => AFFILIATE_PARAMS.has(k.toLowerCase()))) return "plain link carries an affiliate parameter";
  }
  return { en, es, url: url.toString(), kind };
}

/** Every valid link in a SHOP_LINKS value, before the Amazon gate. `warn` gets one line per ignored entry. */
export function parseShopLinks(raw: string | undefined, warn: (msg: string) => void = () => {}): ShopLinks {
  const out: ShopLinks = {};
  if (raw === undefined || !raw.trim()) return out;
  if (raw.length > MAX_CONFIG) {
    warn("SHOP_LINKS is too long; ignoring it");
    return out;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warn("SHOP_LINKS is not valid JSON; ignoring it");
    return out;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    warn("SHOP_LINKS must be a JSON object of theme id to list of links; ignoring it");
    return out;
  }
  for (const [theme, list] of Object.entries(parsed)) {
    // Never echo config text into the logs beyond a short, quoted theme id.
    const name = JSON.stringify(theme.slice(0, 30));
    if (!isTreeStyle(theme)) {
      warn(`SHOP_LINKS: unknown theme ${name} ignored`);
      continue;
    }
    if (!Array.isArray(list)) {
      warn(`SHOP_LINKS: ${name} is not a list; ignored`);
      continue;
    }
    const links: ShopLink[] = [];
    list.forEach((entry, i) => {
      const link = parseLink(entry);
      if (typeof link === "string") warn(`SHOP_LINKS: ${name} link ${i + 1} ignored (${link})`);
      else if (links.length >= MAX_LINKS_PER_THEME) warn(`SHOP_LINKS: ${name} link ${i + 1} ignored (max ${MAX_LINKS_PER_THEME} per theme)`);
      else links.push(link);
    });
    if (links.length) out[theme] = links;
  }
  return out;
}

// Parsed once per distinct value, so a bad entry is logged once and not on every /api/config call.
let cache: { raw: string | undefined; links: ShopLinks } | undefined;

/**
 * The links the app may show right now: valid entries of SHOP_LINKS, minus links of kind "amazon" (the
 * Associates links) while the gate is closed. Plain links are not part of any programme and always pass.
 */
export function shopLinks(): ShopLinks {
  const raw = process.env.SHOP_LINKS;
  if (!cache || cache.raw !== raw) cache = { raw, links: parseShopLinks(raw, (msg) => console.warn(msg)) };
  if (amazonApproved()) return cache.links;
  const out: ShopLinks = {};
  for (const [theme, links] of Object.entries(cache.links)) {
    const allowed = links.filter((l) => l.kind !== "amazon");
    if (allowed.length) out[theme] = allowed;
  }
  return out;
}
