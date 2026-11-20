// Frame check (FRAME_CHECK, server 1.0.9): a Christmas design is an edit of the user's photo, so most of the picture
// must still line up with it. Sometimes the model redraws the whole room instead (zoomed, shifted or from another
// angle), and then furniture has moved everywhere. This measures that locally, with no model call.
// Measured Nov 19 2026 on 32 real results (store/fidelity-v*): redrawn rooms scored 0.00 to 0.23, every result that
// kept the photo's framing 0.58 to 0.84, tree, whole-room decor and removed furniture included.
import sharp from "sharp";

const W = 256, H = 192, BLOCK = 16;
/** A block of the photo needs this much contrast (variance of 0-255 grey levels) to say anything: bare wall does not. */
const MIN_VARIANCE = 150;
/** Fewer textured blocks than this and the photo cannot be judged (an almost empty white room). */
const MIN_BLOCKS = 12;
/** Blocks count as "still the same" from this correlation up. */
const SAME = 0.7;
/**
 * Below this share of matching blocks the design is taken for a redrawn room. 0.4 until server 1.0.10; raised after an
 * office came back reframed with its chair on the other side of the desk at 0.48 (store/decor-treelock2b). No design
 * that kept the framing has scored below 0.58 so far.
 */
export const FRAME_MIN = 0.5;
/**
 * The same for the decor step (DECOR_STEP, app.ts), which is measured against the tree image it was given: only small
 * decorations are added, so far more must stay in place. Good decor steps scored 0.86 to 0.93 (store/decor-pilot1).
 */
export const DECOR_FRAME_MIN = 0.6;

const grey = (img: Buffer) => sharp(img).resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer();

/**
 * Share (0 to 1) of the textured 16 px blocks of the photo that are still in the same place in the design, both
 * scaled to 256 x 192. null = the photo has too little texture to tell. The design may have another pixel size.
 */
export async function frameMatch(photo: Buffer, design: Buffer): Promise<number | null> {
  const [a, b] = await Promise.all([grey(photo), grey(design)]);
  const n = BLOCK * BLOCK;
  let textured = 0, same = 0;
  for (let by = 0; by < H; by += BLOCK) {
    for (let bx = 0; bx < W; bx += BLOCK) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let y = by; y < by + BLOCK; y++) {
        for (let x = bx; x < bx + BLOCK; x++) {
          const p = a[y * W + x], q = b[y * W + x];
          sa += p; sb += q; saa += p * p; sbb += q * q; sab += p * q;
        }
      }
      const va = saa / n - (sa / n) ** 2;
      if (va < MIN_VARIANCE) continue;
      textured++;
      const vb = sbb / n - (sb / n) ** 2;
      if (vb > 0 && (sab / n - (sa * sb) / (n * n)) / Math.sqrt(va * vb) > SAME) same++;
    }
  }
  return textured < MIN_BLOCKS ? null : same / textured;
}
