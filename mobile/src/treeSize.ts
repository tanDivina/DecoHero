// Christmas mode: turns a ceiling height into the real tree to order from the partner's catalogue.
// Rule: the tallest product whose largest possible size still leaves 12 in (30.5 cm) under the ceiling for
// the stand and the topper. Fraser fir wins over Balsam at the same height; the hybrid only when nothing
// else is as tall. Same rules as server/src/treeCatalog.ts: keep the two in step.
import { getLocales } from "expo-localization";
import type { Lang } from "./i18n";

export type Unit = "ft" | "m";
/** What the user typed, kept as text so half-typed values like "2." survive. */
export type Ceiling = { text: string; unit: Unit };

export type Species = "fraser" | "balsam" | "hybrid";
/** One tree the partner sells. Heights in feet; maxFt is the tallest tree that may arrive. */
export type TreeProduct = { id: string; name: string; species: Species; minFt: number; maxFt: number; price: number; url: string };

/**
 * "fit": a floor tree with the full clearance. "largest": the biggest tree sold, with room to spare.
 * "tabletop": only the tabletop tree leaves the clearance. "none": nothing does (product = the smallest
 * tree, to stand on a table), or the catalogue is empty (product = null).
 */
export type TreeKind = "fit" | "largest" | "tabletop" | "none";
/** picked: the user chose this size on Home instead of the recommended (tallest) one. */
export type TreePick = { kind: TreeKind; product: TreeProduct | null; picked?: boolean };
/** Sizes of one run: sent to the server and shown with the results. treeCm is missing when nothing fits. */
export type TreeFit = TreePick & { ceilingCm: number; treeCm?: number; unit: Unit };

export const CM_PER_FT = 30.48;
export const CLEARANCE_CM = 12 * 2.54;
/** Accepted ceiling heights. The server allows a little more on both ends (see server/src/styles.ts). */
export const CEILING_RANGE = { ft: { min: 6, max: 20 }, m: { min: 1.8, max: 6 } };
export const DEFAULT_CEILING = { ft: "8", m: "2.4" };

const STORE = "https://christmastreesinthemail.com";
const p = (name: string, species: Species, minFt: number, maxFt: number, price: number, path: string): TreeProduct => ({
  id: path.split("/").pop()!, name, species, minFt, maxFt, price, url: STORE + path,
});

/**
 * Store catalogue as of Nov 13 2026, used until /api/config answers (or when it can't be reached, or the
 * server is older). Links carry no affiliate parameter here: withAffiliate() adds the server's.
 */
export const FALLBACK_CATALOG: TreeProduct[] = [
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
const num = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Well-formed products from /api/config. An older server, or nothing usable, gives the built-in list. */
export function parseTreeCatalog(raw: unknown): TreeProduct[] {
  if (!Array.isArray(raw)) return FALLBACK_CATALOG;
  const out: TreeProduct[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const { id, name, species, minFt, maxFt, price, url } = t as Record<string, unknown>;
    if (typeof id !== "string" || !id || typeof name !== "string" || !name) continue;
    if (species !== "fraser" && species !== "balsam" && species !== "hybrid") continue;
    if (!num(maxFt, 2, 12) || !num(minFt, 2, maxFt) || !num(price, 1, 5000)) continue;
    if (typeof url !== "string" || !url.startsWith("https://")) continue;
    out.push({ id, name: name.slice(0, 60), species, minFt, maxFt, price, url });
    if (out.length >= MAX_PRODUCTS) break;
  }
  return out.length ? out : FALLBACK_CATALOG;
}

/**
 * Carries the affiliate parameters of the shop link (its query string, set on the server) onto a product
 * link of the same store. Parameters the product link already has are left alone, so links that come from
 * the server (which adds them itself) pass through unchanged.
 */
export function withAffiliate(productUrl: string, shopUrl: string): string {
  const host = (u: string) => u.replace(/^https:\/\/(www\.)?/i, "").split(/[/?#]/)[0].toLowerCase();
  const query = shopUrl.split("#")[0].split("?")[1];
  if (!query || !shopUrl.startsWith("https://") || host(shopUrl) !== host(productUrl)) return productUrl;
  const [base, hash] = productUrl.split("#");
  const have = new Set((base.split("?")[1] ?? "").split("&").map((kv) => kv.split("=")[0]));
  const extra = query.split("&").filter((kv) => kv && !have.has(kv.split("=")[0]));
  if (!extra.length) return productUrl;
  return `${base}${base.includes("?") ? "&" : "?"}${extra.join("&")}${hash === undefined ? "" : `#${hash}`}`;
}

/** Feet where the phone is set to US units, metres elsewhere; the app language decides when the phone doesn't say. */
export function defaultUnit(lang: Lang): Unit {
  const system = getLocales()[0]?.measurementSystem;
  if (system) return system === "us" ? "ft" : "m";
  return lang === "es" ? "m" : "ft";
}

/** Ceiling height in cm, or null when the text is not a number in range. Accepts "2.4" and "2,4". */
export function ceilingCm({ text, unit }: Ceiling): number | null {
  const cleaned = text.trim().replace(",", ".");
  if (!/^\d+(\.\d*)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  const { min, max } = CEILING_RANGE[unit];
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return unit === "ft" ? n * CM_PER_FT : n * 100;
}

const SPECIES_RANK: Record<Species, number> = { fraser: 0, balsam: 1, hybrid: 2 };
/** Best first: tallest, Fraser before Balsam before the hybrid, then the listed size closest to that height. */
const byPreference = (a: TreeProduct, b: TreeProduct) =>
  b.maxFt - a.maxFt || SPECIES_RANK[a.species] - SPECIES_RANK[b.species] || b.minFt - a.minFt || b.price - a.price;

/** Trees meant for a table: under 4 ft. */
const isTabletop = (t: TreeProduct) => t.maxFt < 4;
/** "With room to spare": this much more than the clearance above the biggest tree. */
const SPARE_CM = 15;

/** The product to order for a ceiling (cm). */
export function recommendTree(ceiling: number, catalog: TreeProduct[]): TreePick {
  const sorted = [...catalog].sort(byPreference);
  const best = sorted.find((t) => t.maxFt * CM_PER_FT + CLEARANCE_CM <= ceiling + 0.01);
  if (!best) return { kind: "none", product: sorted[sorted.length - 1] ?? null };
  if (isTabletop(best)) return { kind: "tabletop", product: best };
  const spare = ceiling - CLEARANCE_CM - best.maxFt * CM_PER_FT;
  return { kind: best.id === sorted[0].id && spare > SPARE_CM ? "largest" : "fit", product: best };
}

const fits = (t: TreeProduct, ceiling: number) => t.maxFt * CM_PER_FT + CLEARANCE_CM <= ceiling + 0.01;

/**
 * The floor-tree sizes the user can choose from under a ceiling (cm): one product per size the store lists
 * (Fraser before Balsam, as in the recommendation), smallest first. The last one is the recommended tree.
 */
export function treeOptions(ceiling: number, catalog: TreeProduct[]): TreeProduct[] {
  const seen = new Set<string>();
  return [...catalog]
    .sort(byPreference)
    .filter((t) => {
      const size = `${t.minFt}-${t.maxFt}`;
      if (isTabletop(t) || !fits(t, ceiling) || seen.has(size)) return false;
      seen.add(size);
      return true;
    })
    .reverse();
}

/**
 * Everything a run needs to know about the tree. The size sent to the server is the tallest tree that may arrive.
 * `choiceId`: the size the user picked on Home; ignored when it is the recommended tree or no longer fits.
 */
export function treeFit(ceiling: number, unit: Unit, catalog: TreeProduct[], choiceId?: string | null): TreeFit {
  const best = recommendTree(ceiling, catalog);
  const chosen = choiceId && choiceId !== best.product?.id ? treeOptions(ceiling, catalog).find((t) => t.id === choiceId) : undefined;
  const pick: TreePick = chosen ? { kind: "fit", product: chosen, picked: true } : best;
  const cm = pick.product ? pick.product.maxFt * CM_PER_FT : undefined;
  // "none" with a tree as tall as the room: let the server size the tree from the ceiling alone.
  return { ...pick, ceilingCm: ceiling, treeCm: cm !== undefined && cm < ceiling ? cm : undefined, unit };
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));

export function formatLength(cm: number, unit: Unit): string {
  return unit === "ft" ? `${trim(cm / CM_PER_FT, 1)} ft` : `${trim(cm / 100, 2)} m`;
}

/** "$227.95": the store sells in US dollars only. */
export const formatPrice = (usd: number) => `$${usd.toFixed(2)}`;

/** Same height in the other unit, or that unit's default when the text was not a valid height. */
export function switchUnit(ceiling: Ceiling, unit: Unit): Ceiling {
  if (unit === ceiling.unit) return ceiling;
  const cm = ceilingCm(ceiling);
  if (cm === null) return { unit, text: DEFAULT_CEILING[unit] };
  return { unit, text: unit === "ft" ? trim(cm / CM_PER_FT, 1) : trim(cm / 100, 2) };
}
