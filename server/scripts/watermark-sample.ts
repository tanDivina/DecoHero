// Renders the free-design watermark onto a sample image so a human can check the text is visible.
// Usage: npx tsx scripts/watermark-sample.ts [input.jpg] [output.jpg]
// Without an input it uses a generated 1024x768 gradient. Prints the output path.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { watermark } from "../src/watermark.js";

const [inPath, outArg] = process.argv.slice(2);
const out = outArg || path.join(os.tmpdir(), `decohero-watermark-${Date.now()}.jpg`);

async function sample(): Promise<Buffer> {
  if (inPath) return fs.readFileSync(inPath);
  const w = 1024, h = 768;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8dcc8"/><stop offset="1" stop-color="#6b5a48"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

const marked = await watermark(await sample());
await sharp(marked).jpeg({ quality: 86 }).toFile(out);
console.log(out);
