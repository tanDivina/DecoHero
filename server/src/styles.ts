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

export function buildPrompt(styleId: string): string | null {
  const style = STYLE_PROMPTS[styleId];
  return style ? `${BASE}\n\n${style}` : null;
}
