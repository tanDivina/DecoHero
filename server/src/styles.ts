// Prompts live on the server so nobody can use your API key to generate arbitrary images.
// Style ids must match mobile/src/stylePresets.ts.

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
const TREE_BASE = `Edit this photo of a room by adding ONE Christmas tree to it. This is a careful photo edit, not a redesign.
Keep everything else exactly as it is: the same walls, windows, doors, floor, ceiling, furniture, rugs, curtains, art,
plants, colors, daylight, camera position, lens and perspective. Do not move, remove, restyle, recolor or replace anything.
Stand the tree on the floor in a free spot where a person would really put it: best in an empty corner or beside a window.
Keep it well clear of every door, closet doors included: leave at least about 1 m (an arm's length) of open floor between
the tree and any door frame, and keep it out of the arc a door needs to swing fully open. Never put it in a doorway or a
walkway, in front of a radiator, baseboard heater or air vent, or in front of the TV, and it must not cover or pass
through furniture. If a corner is next to a door, use a different corner or wall. Before placing the tree, find every door, doorway and opening in the photo, open or closed: in the final image the tree, its skirt and the gifts must not overlap any of them, and every door must stay exactly as it is (an open door stays open and fully visible, a closed door stays closed). Never remove, hide or redraw a door to make room for the tree. The tree is a real, fresh-cut
fir with natural, slightly irregular branches, standing in a tree stand that is hidden by the tree skirt or collar
described below. Add only the modest decor described below, close to the tree, and no other Christmas decorations anywhere
else in the room. The tree must look like it was really there when the photo was taken: correct perspective, contact
shadow on the floor, and light and reflections that match the room. Photorealistic. No people, no pets, no text, no watermarks.`;

// The six agreed themes. No brand names in ids or prompts.
export const TREE_PROMPTS: Record<string, string> = {
  "xmas-classic": "Theme: classic nostalgic warmth. Tree: a full, lush Fraser fir with warm amber-white string lights and traditional glossy glass ball ornaments in deep red and gold, evenly spaced, with a glowing many-pointed Moravian star on top. The tree gives off a soft warm glow. Skirt: deep red velvet. Decor: a few gifts wrapped in red, gold and cream paper under the tree.",
  "xmas-winter": "Theme: winter wonderland. Tree: a full fir heavily flocked with white, so every branch looks covered in fresh powder snow. Tiny warm white micro fairy lights, silver crystal ornaments, iced snowflake pendants and mercury-glass baubles in silver and champagne, a sparkling silver snowflake on top. Skirt: thick white faux fur. Decor: a few gifts wrapped in white and silver paper.",
  "xmas-nordic": "Theme: Nordic minimalist. Tree: a slim, pencil-shaped fir, narrow from bottom to top (its widest point is about a quarter of its height), slightly sparse so the branches show, taking up very little floor space. Tiny warm white micro fairy lights, a small number of raw, unpainted natural wood ornaments, a plain natural wood star on top. Nothing shiny, no tinsel, no bright colors: calm and airy. Skirt: a round natural seagrass wicker tree collar. Decor: two gifts wrapped in plain white paper with natural twine.",
  "xmas-coquette": "Theme: pastel pink coquette. Tree: a full green fir with lightly frosted tips, decorated entirely in blush pink and pearl white. Blush-pink velvet bows clipped to the branches, pearl baubles, a few small mirrored disco-ball baubles, warm fairy lights, a large blush velvet bow on top. Soft, pretty and romantic, not garish. Skirt: plush white faux fur. Decor: a few gifts wrapped in blush pink and white paper with satin ribbon.",
  "xmas-tartan": "Theme: heritage tartan. Tree: a full, dark hunter-green fir. Wide tartan ribbon woven through the branches, some in dark navy-and-green Black Watch tartan and some in red tartan, vintage brass bells, a few deep red and antique gold baubles, a tartan bow on top. Warm string lights with a soft candle-like glow. Skirt: a natural woven rattan tree collar. Decor: a few gifts wrapped in kraft paper with tartan ribbon.",
  "xmas-tropical": "Theme: tropical Christmas, indoors, for a home in a hot climate. Tree: a full Fraser fir with warm white string lights, ornaments in natural wood and woven rattan, seashells and baubles in soft coral tones, a woven rattan star on top. Light, breezy and natural, nothing snowy. Skirt: a seagrass basket collar. Decor: a few gifts wrapped in kraft paper with green leaves tucked under the ribbon.",
};

/** Own keys only, so ids like "constructor" or "__proto__" are not styles. */
export function isTreeStyle(styleId: unknown): styleId is string {
  return typeof styleId === "string" && Object.hasOwn(TREE_PROMPTS, styleId);
}

export function isStyle(styleId: unknown): styleId is string {
  return (typeof styleId === "string" && Object.hasOwn(STYLE_PROMPTS, styleId)) || isTreeStyle(styleId);
}

// Accepted ranges for the optional sizes on /api/redesign: ceilings from 6 to 20 ft, trees from 4 to 12 ft.
const CEILING_CM = { min: 180, max: 620 };
const TREE_CM = { min: 120, max: 370 };

export type TreeSize = { ceilingCm?: number; treeCm?: number };

const sizeIn = (v: unknown, range: { min: number; max: number }): number | undefined | null => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < range.min || v > range.max) return null;
  return Math.round(v);
};

/**
 * Checks the optional ceilingCm / treeCm numbers of a Christmas request. Returns whole centimetres, or null
 * when a value is present but not a number in range, or the tree would not fit under the ceiling.
 */
export function parseTreeSize(ceilingCm: unknown, treeCm: unknown): TreeSize | null {
  const ceiling = sizeIn(ceilingCm, CEILING_CM);
  const tree = sizeIn(treeCm, TREE_CM);
  if (ceiling === null || tree === null) return null;
  if (ceiling !== undefined && tree !== undefined && tree >= ceiling) return null;
  return { ceilingCm: ceiling, treeCm: tree };
}

/** "7.5 ft (229 cm)": both units, built from a checked whole number, so nothing a client sends reaches the prompt. */
const length = (cm: number) => `${String(Math.round((cm / 30.48) * 10) / 10)} ft (${cm} cm)`;

function scaleLine({ ceilingCm, treeCm }: TreeSize): string {
  if (ceilingCm !== undefined && treeCm !== undefined) {
    return `Scale: the ceiling of this room is ${length(ceilingCm)} high. The tree is ${length(treeCm)} tall from the floor to its tip, ` +
      `so there is a gap of about ${ceilingCm - treeCm} cm between the tip and the ceiling, where the topper sits. Draw the tree at exactly ` +
      `that height relative to the ceiling, the doors and the furniture. Nothing touches the ceiling.`;
  }
  if (treeCm !== undefined) {
    return `Scale: the tree is ${length(treeCm)} tall from the floor to its tip. Draw it at exactly that height relative to the doors ` +
      `and the furniture. Nothing touches the ceiling.`;
  }
  if (ceilingCm !== undefined) {
    return `Scale: the ceiling of this room is ${length(ceilingCm)} high. Size the tree so that its tip ends about 15 cm (6 in) below ` +
      `the ceiling, with the topper in that gap. Nothing touches the ceiling.`;
  }
  return "Scale: size the tree so that its tip ends about 15 cm (6 in) below the ceiling, with the topper in that gap. Nothing touches the ceiling.";
}

/** `size` only matters for Christmas styles; interior styles ignore it. */
export function buildPrompt(styleId: string, size: TreeSize = {}): string | null {
  if (isTreeStyle(styleId)) return `${TREE_BASE}\n\n${TREE_PROMPTS[styleId]}\n\n${scaleLine(size)}`;
  return isStyle(styleId) ? `${BASE}\n\n${STYLE_PROMPTS[styleId]}` : null;
}
