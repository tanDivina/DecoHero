import sharp from "sharp";

// The runtime image (Dockerfile) installs fonts-dejavu-core + fontconfig; node:22-slim has no fonts at all,
// so without them librsvg draws the text blank. The generic fallback only matters for local runs.
export const WATERMARK_FONT = "DejaVu Sans, sans-serif";

/** Adds a small, discreet "DecoHero" mark to the bottom-right corner of designs made with free credits. */
export async function watermark(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  // About 70% of the 1.0.3 size (3.2% of the width), so it covers less of what stands in that corner.
  const size = Math.max(12, Math.round(w * 0.0224));
  // Inset unchanged from 1.0.3 (about 5% of the width): rounded corners or a slightly cropped preview never
  // cut into the text.
  const margin = Math.round(w * 0.051);
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <text x="${w - margin}" y="${h - margin}" text-anchor="end" font-family="${WATERMARK_FONT}"
        font-size="${size}" font-weight="bold" fill="white" fill-opacity="0.7"
        stroke="black" stroke-opacity="0.2" stroke-width="0.75">DecoHero</text>
    </svg>`
  );
  return sharp(img).composite([{ input: svg }]).toBuffer();
}
