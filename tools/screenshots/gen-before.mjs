// Generates the sample "before" rooms (AI-generated, nobody's real home) into store/rooms/before/.
//   node tools/screenshots/gen-before.mjs [room ...]     (existing files are kept unless named)
import fs from "node:fs";
import path from "node:path";
import { ROOMS, download, falRun } from "./fal.mjs";

export const BEFORE_MODEL = "fal-ai/nano-banana-pro";

const LOOK = `Casual, unstaged snapshot taken by the resident with an ordinary mid-range smartphone, standing in a corner of the room, slightly wide lens at eye level, camera held level. Plain daylight from the window, no flash, no styling, no colour grading, a little flat and slightly underwhelming like a real listing photo taken by a tenant. Everything in focus. No people, no pets, no text, no watermark, no logos.`;

export const BEFORE = {
  "living-room": {
    aspect: "3:4",
    prompt: `A dated, ordinary living room in a modest apartment. Sagging beige fabric sofa from the 2000s, a mismatched brown armchair, an orange-toned pine TV stand with an older flat TV, a cheap glass coffee table with a remote on it, worn laminate floor, plain off-white walls with one small framed print hung slightly too high, beige curtains pushed aside on a wide window, a ceiling lamp with a frosted glass shade. Tired but tidy.`,
  },
  "bedroom": {
    aspect: "4:3",
    prompt: `A bare bedroom in a rental apartment. A double mattress on a plain metal bed frame with a grey duvet and two flat pillows, one small white flat-pack bedside table with a cheap lamp, a clothes rail with a few hangers, bare white walls with a couple of old nail holes, a single window with a white roller blind half down, grey-beige laminate floor, a bare bulb in a simple ceiling fitting. Empty and impersonal.`,
  },
  "kitchen": {
    aspect: "3:4",
    prompt: `A small, older apartment kitchen. Honey-oak laminate cabinet doors from the 1990s, speckled beige laminate worktop, white square wall tiles with grey grout, a freestanding white stove, a stainless sink under a small window, a white fridge with a couple of magnets, a kettle and a dish rack on the counter, vinyl tile floor, a fluorescent tube ceiling light that is switched off. Clean but worn and dated.`,
  },
  "home-office": {
    aspect: "4:3",
    prompt: `A makeshift home office in the corner of a spare room. A plain white flat-pack desk against the wall with a laptop, a tangle of cables and a basic desk lamp, a worn black mesh office chair, a cardboard box and a plastic storage bin on the floor, a narrow cheap bookshelf half filled with folders, a window with plain vertical blinds, beige wall-to-wall carpet, bare magnolia walls. Functional and uninspiring.`,
  },
  "sala-panama": {
    aspect: "4:3",
    prompt: `The sala (living room) of an ordinary middle-class house in Panama. Glossy beige ceramic tile floor, cream painted concrete block walls, tall glass louvre (jalousie) windows with white metal security bars and bright tropical daylight and green foliage outside, a white ceiling fan with lights, a brown faux-leather sofa set with a matching loveseat, a dark wood veneer entertainment unit with a TV, a plastic stacking chair in the corner, a wall clock. Plain, clean and a little bare.`,
  },
  "dining-room": {
    aspect: "4:3",
    prompt: `A plain dining room in an older suburban house. A heavy dark-stained wooden dining table with six mismatched chairs, an old sideboard against the wall with a few stacked plates and a fruit bowl, faded yellowish walls, a dated brass ceiling light with frosted glass shades over the table, net curtains on a window, a doorway on one side, worn oak-effect laminate floor. Old-fashioned and tired.`,
  },
  "kids-room": {
    aspect: "4:3",
    prompt: `A plain child's bedroom. A single bed with a white metal frame and a faded striped duvet, a small white desk with a plastic chair, a low open shelf with a few toys, books and a plastic storage crate, bare pale walls with two small posters stuck up with tape, a window with a simple curtain, beige carpet, a plain ceiling light. Ordinary and a bit bare, not decorated.`,
  },
  "terrace": {
    aspect: "4:3",
    prompt: `A plain covered back terrace of an ordinary house in the tropics. Bare grey concrete floor, a painted concrete block wall with a door and a window into the house, a simple corrugated roof on square posts, two white plastic chairs and a small plastic table, a coiled garden hose, a couple of plants in plastic pots, a low wall with a garden of banana plants and lawn beyond, overcast bright daylight. Empty and unloved.`,
  },
};

async function main() {
  const only = process.argv.slice(2);
  const dir = path.join(ROOMS, "before");
  fs.mkdirSync(dir, { recursive: true });
  await Promise.all(Object.entries(BEFORE).map(async ([room, spec]) => {
    const file = path.join(dir, `${room}.jpg`);
    if (only.length ? !only.includes(room) : fs.existsSync(file)) return;
    const out = await falRun(BEFORE_MODEL, {
      prompt: `${spec.prompt}\n\n${LOOK}`,
      aspect_ratio: spec.aspect,
      resolution: "2K",
      output_format: "jpeg",
      num_images: 1,
    }, `before ${room}`);
    await download(out.images[0].url, file);
    console.log("saved", room);
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
