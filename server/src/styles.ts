// Prompts live on the server so nobody can use your API key to generate arbitrary images.
// Style ids must match mobile/src/stylePresets.ts.
import { CLEARANCE_CM, productForHeight, recommendTree, SPECIES_PROMPT, type TreeProduct } from "./treeCatalog.js";
import type { Place } from "./marker.js";

const BASE = `Redesign the room in this photo as a professional interior designer would.
Keep the room's architecture exactly as it is: same walls, windows, doors, floor plan, ceiling height,
camera position, lens and perspective. Change furniture, decor, color palette, materials, textiles and lighting
to match the style below. The result must look like a real, photorealistic interior photograph with natural light,
believable proportions and furniture that fits the space. No people, no text, no watermarks.`;

export const STYLE_PROMPTS: Record<string, string> = {
  "modern-minimal": "Style: modern minimalist. Clean lines, warm whites and greys, hidden storage, one statement light, very little clutter.",
  "scandinavian": "Style: Scandinavian. Light oak, white walls, wool and linen textiles, soft greys, plants, cosy but airy.",
  "japandi": "Style: Japandi. Low natural-wood furniture, muted earthy tones, paper lamps, ceramics, calm and uncluttered.",
  "tropical-modern": "Style: tropical modern. Teak and rattan, white plaster, large tropical plants, linen, ceiling fan, breezy and bright, suited to a hot humid climate.",
  "mid-century": "Style: mid-century modern. Walnut furniture with tapered legs, mustard and teal accents, globe lights, graphic rug.",
  "industrial": "Style: industrial loft. Black metal, reclaimed wood, leather, exposed-bulb lighting, concrete tones.",
  "boho": "Style: bohemian. Layered rugs, macrame, rattan, terracotta pots, many plants, warm patterned textiles.",
  "coastal": "Style: coastal. Whites and soft blues, driftwood, linen slipcovers, jute rug, light and relaxed.",
  "mediterranean": "Style: Mediterranean. Limewashed walls, terracotta floor tones, wrought iron, olive wood, blue accents.",
  "luxury-classic": "Style: classic luxury. Velvet upholstery, marble, brass details, symmetrical layout, chandelier.",
  "farmhouse": "Style: modern farmhouse. Distressed wood, black hardware, neutral linens, vintage accents.",
  "art-deco": "Style: art deco. Geometric patterns, emerald and gold, curved velvet furniture, lacquer, glamorous lighting."
};

// Christmas mode (app 1.0.3+): add one tree, leave the room alone. Ids must match mobile/src/stylePresets.ts.
const TREE_INTRO = `Edit this photo of a room by adding ONE Christmas tree to it. This is a careful photo edit, not a redesign.
Keep everything else exactly as it is: the same walls, windows, doors, floor, ceiling, furniture, rugs, curtains, art,
plants, colors, daylight, camera position, lens and perspective. Do not move, remove, restyle, recolor or replace anything.`;

// TREE_CLEAR=on (server 1.0.6): small movable things on the tree's spot are taken out instead of painted over.
// Off (the default) keeps TREE_INTRO and PLACE_AUTO above and below word for word as in 1.0.5.
const TREE_INTRO_CLEAR = `Edit this photo of a room by adding ONE Christmas tree to it. This is a careful photo edit, not a redesign.
Keep the room exactly as it is: the same walls, windows, doors, floor, ceiling, built-ins, large furniture (sofas,
armchairs, beds, tables, cabinets, shelving, TV), rugs, curtains, art, colors, daylight, camera position, lens and
perspective. Do not restyle, recolor or replace anything. The only exception is the clearing rule below.`;

const CLEAR = `Clearing rule: the tree needs a clear circle of floor as wide as its lowest branches. Only small, light things that
one person would carry aside to put up a tree may be taken out of that circle: a potted plant, a floor lamp, a small
side table or stool, a basket, a pouf, a floor cushion. Remove such an item completely, as if it had been carried out
of the room: no leaf, pot, shade, leg or shadow of it may remain or show behind or through the tree, and the wall and
floor it covered must continue exactly like the wall and floor around it. Do not put it anywhere else in the room and
do not remove anything outside the circle. Large furniture is never moved, cut or redrawn: where it reaches into the
circle, the tree stands beside it the way a real tree would, in front of or behind it depending on which is nearer the
camera, and never passes through it.`;

/** Goes into PLACE_AUTO right before "Keep it well clear" when the clearing rule is on. */
const AUTO_EMPTY_FIRST = `First look for a spot whose circle of floor is already empty. Only if the room has none, use the spot where the fewest small items have to be cleared.`;

// Where the tree goes when the user leaves it to us.
const PLACE_AUTO_HEAD = `Stand the tree on the floor in a free spot where a person would really put it: best in an empty corner or beside a window.`;
const PLACE_AUTO_TAIL = `Keep it well clear of every door, closet doors included: leave at least about 1 m (an arm's length) of open floor between
the tree and any door frame, and keep it out of the arc a door needs to swing fully open. Never put it in a doorway or a
walkway, in front of a radiator, baseboard heater or air vent, or in front of the TV, and it must not cover or pass
through furniture. If a corner is next to a door, use a different corner or wall. Before placing the tree, find every door, doorway and opening in the photo, open or closed: in the final image the tree, its skirt and the gifts must not overlap any of them, and every door must stay exactly as it is (an open door stays open and fully visible, a closed door stays closed). Never remove, hide or redraw a door to make room for the tree.`;

// Where the tree goes when the user tapped a spot (app 1.0.5+). The server drew the marker (see marker.ts);
// the spot wins over our own placement preferences, but doors stay untouchable.
const pct = (v: number) => Math.round(v * 100);

/**
 * `place` (checked numbers from 0 to 1) is also given in words, so the spot does not hang on the marker alone.
 * Server 1.0.6: the spot now beats composition and nearby furniture. In 1.0.5 a tap on or beside a side table made
 * the model slide the tree back toward open floor, because nothing may be moved and the tree may not pass through furniture.
 */
function placeMarked(place: Place | undefined, clear: boolean): string {
  const where = place
    ? ` The centre dot is about ${pct(place.x)}% of the image width from the left edge and about ${pct(place.y)}% of the image height from the top.`
    : "";
  const occupied = clear
    ? `The circle of the clearing rule below is centred on the marked spot.`
    : `If a small piece of furniture (a side table, a stool, a plant, a lamp) stands on or right next to the spot, the tree still stands on the spot: draw it directly in front of or behind that piece, whichever their distances from the camera require, and do not move the tree sideways to avoid it.`;
  return `The photo has a bright magenta circle with a magenta dot in its centre drawn on top of it. That is a marker
the user added to show where the tree goes; it is not part of the room.${where} Stand the tree on the floor so that its trunk meets
the floor exactly on the centre dot of the magenta marker and the skirt is centred on that dot, so the marker ends up hidden under
the middle of the tree, not beside it or at the edge of the skirt. If the marker is not on the floor, use the floor spot directly below it.
The marked spot decides where the tree stands, not the composition: do not slide the tree toward open floor, a rug, a corner or
the middle of the room, and do not choose a spot of your own. In the final image the foot of the trunk is at the same position
across the width of the picture as the dot. ${occupied} Use this spot
even if it is close to a door, a window or furniture, but every door must stay exactly as it is (an open door stays open and
fully visible, a closed door stays closed): never remove, hide or redraw a door to make room for the tree. Remove the marker
completely: the final image must contain no magenta circle, no magenta dot and no magenta tint anywhere. Wherever the tree,
its skirt or the gifts do not cover the marker, show the floor exactly as it looks right around it.`;
}

// The partner ships full farm-cut firs, so every theme draws that tree; themes only change what hangs on it.
const TREE_REST = `The tree is a real, fresh-cut
fir with natural, slightly irregular branches. Whatever the theme, it has the full, dense, wide silhouette of a
farm-grown Christmas tree: a classic pyramid with thick layers of branches from just above the floor to the tip, widest at
the bottom (about two thirds as wide as the tree is tall), with no bare trunk or see-through gaps between the layers. It is
never a slim, pencil, narrow or sparse-branched tree. It stands in a tree stand that is hidden by the tree skirt or collar
described below. Add only the modest decor described below, close to the tree, and no other Christmas decorations anywhere
else in the room. The tree must look like it was really there when the photo was taken: correct perspective, contact
shadow on the floor, and light and reflections that match the room. Match the time of day: in a daylit photo the tree's
lights are on but faint and cast no glow on the walls; in an evening photo they cast a soft warm glow on the nearby floor and
walls. There is a soft contact shadow under the skirt, falling away from the main window. Photorealistic. No people, no pets, no text, no watermarks.`;

// The six agreed themes. No brand names in ids or prompts.
export const TREE_PROMPTS: Record<string, string> = {
  "xmas-classic": "Theme: classic nostalgic warmth. Tree: a full, lush Fraser fir with warm amber-white string lights and traditional glossy glass ball ornaments in deep red and gold, evenly spaced, with a glowing many-pointed Moravian star on top. The tree gives off a soft warm glow. Skirt: deep red velvet. Decor: a few gifts wrapped in red, gold and cream paper under the tree.",
  "xmas-winter": "Theme: winter wonderland. Tree: a full fir heavily flocked with white, so every branch looks covered in fresh powder snow. Tiny warm white micro fairy lights, silver crystal ornaments, iced snowflake pendants and mercury-glass baubles in silver and champagne, a sparkling silver snowflake on top. Skirt: thick white faux fur. Decor: a few gifts wrapped in white and silver paper.",
  "xmas-nordic": "Theme: Nordic minimalist. Tree: a full, dense, wide Fraser fir with the classic pyramidal silhouette of a farm-grown tree: thick, lush branches all the way down, broad at the base. It is not a slim, pencil or sparse-branched tree and not an open, thinly branched Scandinavian-style tree. Only the ornaments and lights are minimal: tiny warm white micro fairy lights, a small number of raw, unpainted natural wood ornaments, a plain natural wood star on top, so plenty of green shows between them. Nothing shiny, no tinsel, no bright colors: calm and understated. Skirt: a round natural seagrass wicker tree collar. Decor: two gifts wrapped in plain white paper with natural twine.",
  "xmas-coquette": "Theme: pastel pink coquette. Tree: a full green fir with lightly frosted tips, decorated entirely in blush pink and pearl white. Blush-pink velvet bows clipped to the branches, pearl baubles, a few small mirrored disco-ball baubles, warm fairy lights, a large blush velvet bow on top. Soft, pretty and romantic, not garish. Skirt: plush white faux fur. Decor: a few gifts wrapped in blush pink and white paper with satin ribbon.",
  "xmas-tartan": "Theme: heritage tartan. Tree: a full, dark hunter-green fir. Wide tartan ribbon woven through the branches, some in dark navy-and-green Black Watch tartan and some in red tartan, vintage brass bells, a few deep red and antique gold baubles, a tartan bow on top. Warm string lights with a soft candle-like glow. Skirt: a natural woven rattan tree collar. Decor: a few gifts wrapped in kraft paper with tartan ribbon.",
  "xmas-tropical": "Theme: tropical Christmas, indoors, for a home in a hot climate. Tree: a full Fraser fir with warm white string lights, ornaments in natural wood and woven rattan, seashells and baubles in soft coral tones, a woven rattan star on top. The decoration is light, breezy and natural, nothing snowy; the tree itself stays full and dense. Skirt: a seagrass basket collar. Decor: a few gifts wrapped in kraft paper with green leaves tucked under the ribbon.",
};

/** Own keys only, so ids like "constructor" or "__proto__" are not styles. */
export function isTreeStyle(styleId: unknown): styleId is string {
  return typeof styleId === "string" && Object.hasOwn(TREE_PROMPTS, styleId);
}

export function isStyle(styleId: unknown): styleId is string {
  return (typeof styleId === "string" && Object.hasOwn(STYLE_PROMPTS, styleId)) || isTreeStyle(styleId);
}

// Accepted ranges for the optional sizes on /api/redesign: ceilings from 6 to 20 ft, trees from 4 to 12 ft
// (what apps up to 1.0.4 send) or the height of a product in the partner's catalogue (app 1.0.5+).
const CEILING_CM = { min: 180, max: 620 };
const TREE_CM = { min: 120, max: 370 };

/** `species` is one of the fixed SPECIES_PROMPT texts, set here from the catalogue and never by a client. */
export type TreeSize = { ceilingCm?: number; treeCm?: number; species?: string };

const sizeIn = (v: unknown, range: { min: number; max: number }): number | undefined | null => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < range.min || v > range.max) return null;
  return Math.round(v);
};

/**
 * Checks the optional ceilingCm / treeCm numbers of a Christmas request. Returns whole centimetres, or null
 * when a value is present but not a number in range, or the tree would not fit under the ceiling.
 * A tree height that matches a catalogue product also names that product's species. With a ceiling and no
 * tree height, the tree is the one the catalogue rules recommend for that ceiling.
 */
export function parseTreeSize(ceilingCm: unknown, treeCm: unknown, catalog: readonly TreeProduct[] = []): TreeSize | null {
  const ceiling = sizeIn(ceilingCm, CEILING_CM);
  if (ceiling === null) return null;
  let tree: number | undefined;
  let product: TreeProduct | null = null;
  if (treeCm !== undefined && treeCm !== null) {
    if (typeof treeCm !== "number" || !Number.isFinite(treeCm)) return null;
    product = productForHeight(treeCm, catalog);
    if (!product && (treeCm < TREE_CM.min || treeCm > TREE_CM.max)) return null;
    tree = Math.round(treeCm);
  } else if (ceiling !== undefined) {
    product = recommendTree(ceiling, catalog);
    if (product) tree = Math.round(product.maxFt * 30.48);
  }
  if (ceiling !== undefined && tree !== undefined && tree >= ceiling) return null;
  return { ceilingCm: ceiling, treeCm: tree, species: product ? SPECIES_PROMPT[product.species] : undefined };
}

/** "7.5 ft (229 cm)": both units, built from a checked whole number, so nothing a client sends reaches the prompt. */
const length = (cm: number) => `${String(Math.round((cm / 30.48) * 10) / 10)} ft (${cm} cm)`;

/** Standard interior door height (80 in). Gives the model a second ruler besides the ceiling. */
const DOOR_CM = 203;

/** "Compared with a standard door ..." sentence, so trees aren't drawn door-height when they should be taller (or vice versa). */
function doorLine(treeCm: number): string {
  const diff = treeCm - DOOR_CM;
  if (diff >= 8) {
    return ` For reference, a standard interior door is about 203 cm (6 ft 8 in) tall, so this tree is clearly taller than a door: ` +
      `its tip is about ${diff} cm above the top of a standard door standing at the same distance from the camera.`;
  }
  if (diff <= -8) {
    return ` For reference, a standard interior door is about 203 cm (6 ft 8 in) tall, so this tree is about ${-diff} cm shorter than ` +
      `a door standing at the same distance from the camera.`;
  }
  return " For reference, this tree is about as tall as a standard interior door (203 cm, 6 ft 8 in).";
}

const GAP = `about ${Math.round(CLEARANCE_CM)} cm (12 in)`;

/** Rulers that are in almost every living-room photo, for rooms where no door is in view. */
const ANCHORS = ` Check the height against the furniture in the photo as well: the back of a sofa is about 85 cm high and its seat ` +
  `about 45 cm, a side table is about 60 cm, a dining table about 75 cm, and a baseboard about 10 to 15 cm.`;

/** Attics and lofts: the number the user typed is the tall part of the room, and the tree may not poke into the slope. */
function slopeLine(ceilingGiven: boolean, marked: boolean): string {
  return ` If the room has a sloped or vaulted ceiling (an attic, a loft, a dormer), ` +
    (ceilingGiven ? `the ceiling height given here is that of the full-height part of the room, and the tree ` : `the tree `) +
    `keeps its real height and stands where the ceiling above it is higher than the tree: no branch, tip or topper may touch, ` +
    `cross or disappear into a sloped ceiling, and the tree is never bent, cut off or shrunk to fit under one.` +
    (marked
      ? ` If the ceiling above the marked spot is too low for the tree, stand it as close to the marked spot as its height ` +
        `allows, moved only toward the higher part of the room.`
      : "");
}

function scaleLine({ ceilingCm, treeCm, species }: TreeSize, marked = false): string {
  // What the shop will deliver, so the picture matches the tree that arrives.
  const kind = species ? ` The tree is a fresh-cut ${species}.` : "";
  if (ceilingCm !== undefined && treeCm !== undefined) {
    const share = Math.round((treeCm / ceilingCm) * 100);
    return `Scale: the ceiling of this room is ${length(ceilingCm)} high. The tree is ${length(treeCm)} tall from the floor to its very top, ` +
      `stand and topper included. That is ${share}% of the floor-to-ceiling height, so there is a gap of about ${ceilingCm - treeCm} cm ` +
      `of empty wall between the top of the tree and the ceiling. Draw the tree at exactly that height relative to the ceiling, the doors ` +
      `and the furniture: not taller, not shorter. Nothing touches the ceiling.` + doorLine(treeCm) + ANCHORS + slopeLine(true, marked) + kind;
  }
  if (treeCm !== undefined) {
    return `Scale: the tree is ${length(treeCm)} tall from the floor to its very top, stand and topper included. Draw it at exactly ` +
      `that height relative to the doors and the furniture. Nothing touches the ceiling.` + doorLine(treeCm) + ANCHORS + slopeLine(false, marked) + kind;
  }
  if (ceilingCm !== undefined) {
    const share = Math.round(((ceilingCm - CLEARANCE_CM) / ceilingCm) * 100);
    return `Scale: the ceiling of this room is ${length(ceilingCm)} high. Size the tree so that its very top, stand and topper included, ` +
      `ends ${GAP} below the ceiling: about ${share}% of the floor-to-ceiling height. Nothing touches the ceiling.` + ANCHORS + slopeLine(true, marked);
  }
  return `Scale: size the tree so that its very top, stand and topper included, ends ${GAP} below the ceiling. Nothing touches the ceiling.` +
    ANCHORS + slopeLine(false, marked);
}

/** Theme text with the species the shop will deliver; the themes are written for a Fraser fir. */
function themeText(styleId: string, species?: string): string {
  const text = TREE_PROMPTS[styleId];
  return species && species !== SPECIES_PROMPT.fraser ? text.replaceAll(SPECIES_PROMPT.fraser, species) : text;
}

/** Server switches read per request, so a Railway variable change needs no code change. On = 1, on, true or yes. */
const ON = new Set(["1", "on", "true", "yes"]);
export const flagOn = (name: string) => ON.has((process.env[name] ?? "").trim().toLowerCase());

/**
 * Added to the prompt of the one silent retry after the door check (see app.ts) found a door hidden or changed.
 * With a marker the tree stays where the user put it, so only the door itself is named.
 */
const DOOR_FIX_AUTO = `Correction: an earlier attempt at this edit hid, removed or changed a door or doorway of the room. That is not allowed. In this image every door and doorway of the original photo stays fully visible and exactly as it is, so stand the tree at a different spot, well away from all of them.`;
const DOOR_FIX_MARKED = `Correction: an earlier attempt at this edit removed or changed a door or doorway of the room. That is not allowed. Keep the tree on the marked spot, and draw every door and doorway of the original photo exactly as it is.`;

export type PromptOptions = {
  /** Clearing rule (TREE_CLEAR). Off: the 1.0.5 intro and placement text. */
  clear?: boolean;
  /** The retry after a failed door check. */
  doorFix?: boolean;
};

/**
 * `size`, `marked` and `opts` only matter for Christmas styles; interior styles ignore them.
 * `marked`: the photo sent to the model carries the user's magenta placement marker; pass the spot itself
 * (checked by parsePlace) so the prompt can also say in words where it is.
 */
export function buildPrompt(styleId: string, size: TreeSize = {}, marked: boolean | Place = false, opts: PromptOptions = {}): string | null {
  if (isTreeStyle(styleId)) {
    const intro = opts.clear ? TREE_INTRO_CLEAR : TREE_INTRO;
    const auto = opts.clear ? `${PLACE_AUTO_HEAD}\n${AUTO_EMPTY_FIRST}\n${PLACE_AUTO_TAIL}` : `${PLACE_AUTO_HEAD}\n${PLACE_AUTO_TAIL}`;
    const spot = typeof marked === "object" ? marked : undefined;
    const place = `${marked ? placeMarked(spot, !!opts.clear) : auto}${opts.clear ? `\n${CLEAR}\n` : " "}`;
    const fix = opts.doorFix ? `\n\n${marked ? DOOR_FIX_MARKED : DOOR_FIX_AUTO}` : "";
    return `${intro}\n${place}${TREE_REST}\n\n${themeText(styleId, size.species)}\n\n${scaleLine(size, !!marked)}${fix}`;
  }
  return isStyle(styleId) ? `${BASE}\n\n${STYLE_PROMPTS[styleId]}` : null;
}
