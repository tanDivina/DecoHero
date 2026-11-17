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
