import sharp from "sharp";

// The runtime image (Dockerfile) installs fonts-dejavu-core + fontconfig; node:22-slim has no fonts at all,
// so without them librsvg draws the text blank. The generic fallback only matters for local runs.
export const WATERMARK_FONT = "DejaVu Sans, sans-serif";

/** Adds a small "DecoHero" mark to the bottom-right corner of designs made with free credits. */
export async function watermark(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const size = Math.max(14, Math.round(w * 0.032));
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <text x="${w - size}" y="${h - size}" text-anchor="end" font-family="${WATERMARK_FONT}"
        font-size="${size}" font-weight="bold" fill="white" fill-opacity="0.85"
        stroke="black" stroke-opacity="0.25" stroke-width="1">DecoHero</text>
    </svg>`
  );
  return sharp(img).composite([{ input: svg }]).toBuffer();
}
