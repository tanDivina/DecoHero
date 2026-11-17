// The partner's real trees (app 1.0.5+): what the app recommends, links to and shows a price for.
// The list below is the default; TREE_CATALOG (one line of JSON) replaces it without a release.
// Bad config never crashes the server: invalid entries are skipped and logged, and with no valid entry
// left the default list is used. Keep mobile/src/treeSize.ts (FALLBACK_CATALOG and the rules) in step.

export type Species = "fraser" | "balsam" | "hybrid";
/** Heights in feet, as the store sells them. maxFt is the tallest tree that may arrive. */
export type TreeProduct = { id: string; name: string; species: Species; minFt: number; maxFt: number; price: number; url: string };

export const PARTNER_ORIGIN = "https://christmastreesinthemail.com";
const PARTNER_HOSTS = new Set(["christmastreesinthemail.com", "www.christmastreesinthemail.com"]);
const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/\.$/, "");

export const CM_PER_FT = 30.48;
/** Room for the stand and the topper: 12 in between the tallest tree that may arrive and the ceiling. */
export const CLEARANCE_CM = 12 * 2.54;

const p = (name: string, species: Species, minFt: number, maxFt: number, price: number, path: string): TreeProduct => ({
  id: path.split("/").pop()!, name, species, minFt, maxFt, price, url: PARTNER_ORIGIN + path,
});

/** Store catalogue as of Nov 13 2026. */
export const DEFAULT_TREE_CATALOG: readonly TreeProduct[] = [
  p("3 Ft Tabletop", "balsam", 3, 3, 126.95, "/products/live-real-3-foot-tabletop-christmas-tree"),
  p("4 Ft Premium", "balsam", 4, 4, 157.95, "/products/4footchristmastree"),
  p("5 Ft Premium Balsam", "balsam", 5, 6, 187.95, "/products/premium-balsam-fir-5-6-christmas-tree"),
  p("5 Ft Premium Fraser", "fraser", 5, 6, 192.95, "/products/copy-of-real-christmas-trees-delivered-6-foot-premium-fraser-fir"),
  p("6 Ft Premium Balsam", "balsam", 6, 7, 197.95, "/products/premium-balsam-fir-6-7-feet"),
  p("6 Ft Premium Fraser", "fraser", 6, 7, 208.95, "/products/copy-of-real-christmas-trees-delivered-7-foot-premium-fraser-fir"),
  p("7 Ft Premium Balsam", "balsam", 7, 7, 207.95, "/products/7foot-christmastree"),
  p("7 Ft Premium Fraser", "fraser", 7, 7, 227.95, "/products/copy-of-real-christmas-trees-delivered-7-foot-premium-balsam-fir-amazon-og"),
  p("7 Ft Balsam-Fraser Hybrid", "hybrid", 6.5, 8.5, 218.95, "/products/morin-blue-6-5-8-5-christmas-tree"),
  p("8-9 Ft Premium Fraser", "fraser", 8, 9, 358.95, "/products/9footfraserfir"),
];

const MAX_PRODUCTS = 20;
const MAX_NAME = 40;
const MAX_URL = 600;
const MAX_CONFIG = 20_000;
const FT = { min: 2, max: 12 };
const PRICE = { min: 20, max: 2000 };

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;

/** One checked product, or the reason it was refused. */
function parseProduct(entry: unknown): TreeProduct | string {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return "not an object";
  const e = entry as Record<string, unknown>;
  if (typeof e.name !== "string") return "name is missing";
  const name = [...e.name.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()].slice(0, MAX_NAME).join("").trim();
  if (!name) return "name is missing";
  if (e.species !== "fraser" && e.species !== "balsam" && e.species !== "hybrid") return 'species must be "fraser", "balsam" or "hybrid"';
  const maxFt = num(e.maxFt, FT.min, FT.max);
  if (maxFt === null) return `maxFt must be a number from ${FT.min} to ${FT.max}`;
  const minFt = e.minFt === undefined ? maxFt : num(e.minFt, FT.min, maxFt);
  if (minFt === null) return "minFt must be a number no larger than maxFt";
  const price = num(e.price, PRICE.min, PRICE.max);
  if (price === null) return `price must be a number from ${PRICE.min} to ${PRICE.max}`;
  if (typeof e.url !== "string" || e.url.length > MAX_URL) return "url is missing or too long";
  let url: URL;
  try {
    // "/products/..." is read as a path on the partner's store.
    url = new URL(e.url.trim(), PARTNER_ORIGIN);
  } catch {
    return "url is not a URL";
  }
  if (url.protocol !== "https:") return "url is not https";
  if (url.username || url.password) return "url carries a login";
  if (!PARTNER_HOSTS.has(hostOf(url)) || url.port) return "url does not point to the partner's store";
  const id = url.pathname.split("/").filter(Boolean).pop()?.slice(0, 120);
  if (!id) return "url has no product path";
  url.hash = "";
  return { id, name, species: e.species, minFt, maxFt, price: Math.round(price * 100) / 100, url: url.toString() };
}

/** Every valid product of a TREE_CATALOG value, or null when the default list has to be used. */
export function parseTreeCatalog(raw: string | undefined, warn: (msg: string) => void = () => {}): TreeProduct[] | null {
  if (raw === undefined || !raw.trim()) return null;
  if (raw.length > MAX_CONFIG) {
    warn("TREE_CATALOG is too long; using the built-in catalogue");
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warn("TREE_CATALOG is not valid JSON; using the built-in catalogue");
    return null;
  }
  if (!Array.isArray(parsed)) {
    warn("TREE_CATALOG must be a JSON list of products; using the built-in catalogue");
    return null;
  }
  const out: TreeProduct[] = [];
  parsed.forEach((entry, i) => {
    // Never echo config text into the logs: only the position and a fixed reason.
    const product = parseProduct(entry);
    if (typeof product === "string") warn(`TREE_CATALOG: product ${i + 1} ignored (${product})`);
    else if (out.some((o) => o.id === product.id)) warn(`TREE_CATALOG: product ${i + 1} ignored (same product page as an earlier entry)`);
    else if (out.length >= MAX_PRODUCTS) warn(`TREE_CATALOG: product ${i + 1} ignored (max ${MAX_PRODUCTS} products)`);
    else out.push(product);
  });
  if (!out.length) {
    warn("TREE_CATALOG has no valid product; using the built-in catalogue");
    return null;
  }
  return out;
}

// Parsed once per distinct value, so a bad entry is logged once and not on every request.
let cache: { raw: string | undefined; products: readonly TreeProduct[] } | undefined;

function baseCatalog(): readonly TreeProduct[] {
  const raw = process.env.TREE_CATALOG;
  if (!cache || cache.raw !== raw) cache = { raw, products: parseTreeCatalog(raw, (msg) => console.warn(msg)) ?? DEFAULT_TREE_CATALOG };
  return cache.products;
}

/**
 * The catalogue the app gets. The affiliate parameters live only in TREE_SHOP_URL: its query string is
 * carried onto every product link, as long as that link points to the partner's store too.
 */
export function treeCatalog(shopUrl: string): TreeProduct[] {
  let affiliate: [string, string][] = [];
  try {
    const shop = new URL(shopUrl);
    if (shop.protocol === "https:" && PARTNER_HOSTS.has(hostOf(shop))) affiliate = [...shop.searchParams.entries()];
  } catch {}
  return baseCatalog().map((product) => {
    if (!affiliate.length) return { ...product };
    const url = new URL(product.url);
    for (const [k, v] of affiliate) url.searchParams.set(k, v);
    return { ...product, url: url.toString() };
  });
}

const SPECIES_RANK: Record<Species, number> = { fraser: 0, balsam: 1, hybrid: 2 };
/**
 * Best first: tallest, then Fraser before Balsam before the hybrid, then the product whose listed size is
 * closest to that height (a "7 Ft" before a "6 Ft" that may reach 7).
 */
const byPreference = (a: TreeProduct, b: TreeProduct) =>
  b.maxFt - a.maxFt || SPECIES_RANK[a.species] - SPECIES_RANK[b.species] || b.minFt - a.minFt || b.price - a.price;

/** Tallest product that still leaves the clearance under this ceiling, or null when none does. */
export function recommendTree(ceilingCm: number, products: readonly TreeProduct[]): TreeProduct | null {
  const fits = products.filter((t) => t.maxFt * CM_PER_FT + CLEARANCE_CM <= ceilingCm + 0.01);
  return fits.sort(byPreference)[0] ?? null;
}

/** The product a tree height (cm) stands for: the preferred one whose tallest size is that height, give or take 1 cm. */
export function productForHeight(treeCm: number, products: readonly TreeProduct[]): TreeProduct | null {
  return products.filter((t) => Math.abs(t.maxFt * CM_PER_FT - treeCm) <= 1).sort(byPreference)[0] ?? null;
}

/** Species as written in the prompt. Fixed texts only: nothing from config or a client ends up here. */
export const SPECIES_PROMPT: Record<Species, string> = {
  fraser: "Fraser fir",
  balsam: "Balsam fir",
  hybrid: "Balsam-Fraser hybrid fir",
};
