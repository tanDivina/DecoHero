// "Tap where the tree should go" (app 1.0.5+): the spot is drawn onto a copy of the photo as a magenta
// marker the model can't miss, and the result is checked so the marker never reaches the user.
import sharp from "sharp";

/** Where the user tapped, as fractions of the photo's width and height (0,0 = top left). */
export type Place = { x: number; y: number };

const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** undefined = no spot sent; null = present but not exactly { x, y } with both numbers from 0 to 1. */
export function parsePlace(v: unknown): Place | undefined | null {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const keys = Object.keys(v);
  if (keys.length !== 2 || !Object.hasOwn(v, "x") || !Object.hasOwn(v, "y")) return null;
  const { x, y } = v as Record<string, unknown>;
  return unit(x) && unit(y) ? { x, y } : null;
}

export const MARKER_COLOR = "#FF00FF";
/** Outer diameter of the marker as a share of the image width. */
export const MARKER_WIDTH_SHARE = 0.06;

/** Ring, centre dot and a thin white halo so the marker also stands out on pink or purple floors. */
function geometry(width: number) {
  const outer = Math.max(8, (width * MARKER_WIDTH_SHARE) / 2);
  const stroke = outer * 0.3;
  return { outer, stroke, ring: outer - stroke / 2, dot: outer * 0.3 };
}

/** Magenta area of the marker as a share of the whole image (used by the leak check). */
function markerShare(width: number, height: number): number {
  const g = geometry(width);
  const ring = Math.PI * (g.outer ** 2 - (g.outer - g.stroke) ** 2);
  return (ring + Math.PI * g.dot ** 2) / (width * height);
}

/** Returns a copy of the photo with the marker centred on `place`. The input is not changed. */
export async function drawMarker(img: Buffer, place: Place): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const g = geometry(w);
  const cx = (place.x * w).toFixed(1);
  const cy = (place.y * h).toFixed(1);
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${(g.outer + 1.5).toFixed(1)}" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy}" r="${g.ring.toFixed(1)}" fill="none" stroke="${MARKER_COLOR}" stroke-width="${g.stroke.toFixed(1)}"/>
      <circle cx="${cx}" cy="${cy}" r="${(g.dot + 1.5).toFixed(1)}" fill="white"/>
      <circle cx="${cx}" cy="${cy}" r="${g.dot.toFixed(1)}" fill="${MARKER_COLOR}"/>
    </svg>`
  );
  // Full chroma resolution keeps the thin ring pure magenta instead of smearing it into the floor colour.
  return sharp(img).composite([{ input: svg }]).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
}

const CHECK_WIDTH = 512;

/** Share of the image that is strongly magenta (red and blue high, green low). */
export async function magentaShare(img: Buffer): Promise<number> {
  const { data, info } = await sharp(img)
    .resize({ width: CHECK_WIDTH, withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels < 3) return 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r >= 185 && b >= 185 && g <= 110 && Math.abs(r - b) <= 70) n++;
  }
  return n / (info.width * info.height);
}

/**
 * True when the generated image still shows (part of) the marker: clearly more strong magenta than the
 * user's own photo had, by at least a fifth of the marker's area. A magenta sofa that was already in the
 * room does not count.
 */
export async function markerLeaked(original: Buffer, output: Buffer): Promise<boolean> {
  const meta = await sharp(original).metadata();
  const allowed = markerShare(meta.width ?? 1024, meta.height ?? 1024) * 0.2;
  const [before, after] = await Promise.all([magentaShare(original), magentaShare(output)]);
  return after - before > allowed;
}

// "Take out furniture" (app 1.0.7+, TREE_REMOVE): each piece the user lets us remove gets a cyan ring with an X,
// the same size as the tree marker, so the model can tell the two kinds apart. Checked like the magenta marker.
export const REMOVE_COLOR = "#00E5FF";
export const MAX_REMOVALS = 2;

/** undefined = none sent (or an empty list); null = not a list of 1 to MAX_REMOVALS valid spots. */
export function parseRemovals(v: unknown): Place[] | undefined | null {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.length > MAX_REMOVALS) return null;
  if (v.length === 0) return undefined;
  const spots = v.map(parsePlace);
  return spots.every((p): p is Place => !!p) ? spots : null;
}

/** Cyan area of one remove marker (ring plus X) as a share of the whole image, roughly. */
function removeShare(width: number, height: number): number {
  const g = geometry(width);
  const ring = Math.PI * (g.outer ** 2 - (g.outer - g.stroke) ** 2);
  const cross = 2 * (g.ring * 1.2) * g.stroke * 0.8;
  return (ring + cross) / (width * height);
}

/** Returns a copy of the photo with a cyan X marker on every spot. The input is not changed. */
export async function drawRemoveMarkers(img: Buffer, spots: Place[]): Promise<Buffer> {
  if (!spots.length) return img;
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const g = geometry(w);
  const d = g.ring * 0.6;
  const shapes = spots.map((p) => {
    const cx = p.x * w, cy = p.y * h;
    const x = `M${(cx - d).toFixed(1)} ${(cy - d).toFixed(1)}L${(cx + d).toFixed(1)} ${(cy + d).toFixed(1)}M${(cx + d).toFixed(1)} ${(cy - d).toFixed(1)}L${(cx - d).toFixed(1)} ${(cy + d).toFixed(1)}`;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(g.outer + 1.5).toFixed(1)}" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${g.ring.toFixed(1)}" fill="none" stroke="${REMOVE_COLOR}" stroke-width="${g.stroke.toFixed(1)}"/>
      <path d="${x}" stroke="${REMOVE_COLOR}" stroke-width="${(g.stroke * 0.8).toFixed(1)}" stroke-linecap="round"/>`;
  });
  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${shapes.join("")}</svg>`);
  return sharp(img).composite([{ input: svg }]).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
}

/** Share of the image that is strongly cyan (green and blue high, red low). */
export async function cyanShare(img: Buffer): Promise<number> {
  const { data, info } = await sharp(img)
    .resize({ width: CHECK_WIDTH, withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels < 3) return 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g >= 185 && b >= 185 && r <= 110) n++;
  }
  return n / (info.width * info.height);
}

/** True when the result still shows part of a cyan X marker (more strong cyan than the photo had, by a fifth of one marker). */
export async function removeMarkerLeaked(original: Buffer, output: Buffer): Promise<boolean> {
  const meta = await sharp(original).metadata();
  const allowed = removeShare(meta.width ?? 1024, meta.height ?? 1024) * 0.2;
  const [before, after] = await Promise.all([cyanShare(original), cyanShare(output)]);
  return after - before > allowed;
}

/** Strong-cyan pixels in a square of side 4 marker radii around `spot` (fractions), and that square's pixel count. */
async function cyanAround(img: Buffer, spot: Place): Promise<{ cyan: number; area: number }> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024, h = meta.height ?? 1024;
  const half = Math.round(geometry(w).outer * 2);
  const left = Math.max(0, Math.round(spot.x * w) - half), top = Math.max(0, Math.round(spot.y * h) - half);
  const width = Math.min(w - left, half * 2), height = Math.min(h - top, half * 2);
  if (width < 1 || height < 1) return { cyan: 0, area: 1 };
  const { data, info } = await sharp(img).extract({ left, top, width, height }).removeAlpha().toColourspace("srgb").raw()
    .toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g >= 185 && b >= 185 && r <= 110) n++;
  }
  return { cyan: n, area: info.width * info.height };
}

/**
 * Regular room redesigns (STYLE_REMOVE, server 1.0.8): the same leak test, but only in a small square around each
 * spot. A redesign may bring turquoise pillows or tiles anywhere, which the whole-image test would take for a marker.
 */
export async function removeMarkerLeakedAt(original: Buffer, output: Buffer, spots: Place[]): Promise<boolean> {
  for (const spot of spots) {
    const [before, after] = await Promise.all([cyanAround(original, spot), cyanAround(output, spot)]);
    const meta = await sharp(output).metadata();
    // Share of the square one marker's cyan covers (ring + X), roughly; a fifth of it counts as a leak.
    const allowed = removeShare(meta.width ?? 1024, meta.height ?? 1024) * ((meta.width ?? 1024) * (meta.height ?? 1024)) / after.area * 0.2;
    if (after.cyan / after.area - before.cyan / before.area > allowed) return true;
  }
  return false;
}
