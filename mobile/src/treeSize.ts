// Christmas mode: turns a ceiling height into the tree size to order.
// Rule: the tree is the tallest commonly sold size that still leaves 6 in (about 15 cm) between its tip and
// the ceiling, which is the room a topper needs. An 8 ft ceiling gives a 7.5 ft tree.
import { getLocales } from "expo-localization";
import type { Lang } from "./i18n";

export type Unit = "ft" | "m";
/** What the user typed, kept as text so half-typed values like "2." survive. */
export type Ceiling = { text: string; unit: Unit };
/** Sizes of one run, sent to the server and shown with the results. */
export type TreeFit = { ceilingCm: number; treeCm: number; unit: Unit };

const CM_PER_FT = 30.48;
const CLEARANCE_CM = 6 * 2.54;
/** Heights real trees are commonly sold in, in feet. */
export const TREE_SIZES_FT = [5, 6, 6.5, 7, 7.5, 8, 9, 10, 12];
/** Accepted ceiling heights. The server allows a little more on both ends (see server/src/styles.ts). */
export const CEILING_RANGE = { ft: { min: 6, max: 20 }, m: { min: 1.8, max: 6 } };
export const DEFAULT_CEILING = { ft: "8", m: "2.4" };

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

/** Tallest sold size that leaves the clearance; the smallest size always fits the lowest accepted ceiling. */
export function recommendTreeCm(ceiling: number): number {
  const fits = TREE_SIZES_FT.filter((ft) => ft * CM_PER_FT <= ceiling - CLEARANCE_CM + 0.01);
  return (fits.length ? fits[fits.length - 1] : TREE_SIZES_FT[0]) * CM_PER_FT;
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));

export function formatLength(cm: number, unit: Unit): string {
  return unit === "ft" ? `${trim(cm / CM_PER_FT, 1)} ft` : `${trim(cm / 100, 2)} m`;
}

/** Trees are sold by the foot, so metric users see both: "2.29 m (7.5 ft)". */
export function formatTree(cm: number, unit: Unit): string {
  return unit === "ft" ? formatLength(cm, "ft") : `${formatLength(cm, "m")} (${formatLength(cm, "ft")})`;
}

/** Same height in the other unit, or that unit's default when the text was not a valid height. */
export function switchUnit(ceiling: Ceiling, unit: Unit): Ceiling {
  if (unit === ceiling.unit) return ceiling;
  const cm = ceilingCm(ceiling);
  if (cm === null) return { unit, text: DEFAULT_CEILING[unit] };
  return { unit, text: unit === "ft" ? trim(cm / CM_PER_FT, 1) : trim(cm / 100, 2) };
}
