// Ids must match server/src/styles.ts. Order = order shown in the picker.
export const STYLE_PRESETS = [
  { id: "tropical-modern", en: "Tropical modern", es: "Tropical moderno" },
  { id: "modern-minimal", en: "Minimal", es: "Minimalista" },
  { id: "japandi", en: "Japandi", es: "Japandi" },
  { id: "scandinavian", en: "Scandinavian", es: "Nórdico" },
  { id: "mid-century", en: "Mid-century", es: "Mid-century" },
  { id: "boho", en: "Boho", es: "Boho" },
  { id: "coastal", en: "Coastal", es: "Costero" },
  { id: "mediterranean", en: "Mediterranean", es: "Mediterráneo" },
  { id: "industrial", en: "Industrial", es: "Industrial" },
  { id: "luxury-classic", en: "Classic luxury", es: "Clásico de lujo" },
  { id: "farmhouse", en: "Farmhouse", es: "Rústico moderno" },
  { id: "art-deco", en: "Art deco", es: "Art déco" },
] as const;

// Christmas mode: one tree is added and the room stays as it is. Ids must match TREE_PROMPTS in server/src/styles.ts.
export const TREE_PRESETS = [
  { id: "xmas-classic", en: "Classic warmth", es: "Clásico cálido" },
  { id: "xmas-winter", en: "Winter wonderland", es: "Invierno mágico" },
  { id: "xmas-nordic", en: "Nordic minimal", es: "Nórdico" },
  { id: "xmas-coquette", en: "Pink coquette", es: "Rosa coquette" },
  { id: "xmas-tartan", en: "Heritage tartan", es: "Tartán clásico" },
  { id: "xmas-tropical", en: "Tropical Christmas", es: "Navidad tropical" },
] as const;

export const isTreeStyle = (id: string) => TREE_PRESETS.some((p) => p.id === id);

export type StyleId = (typeof STYLE_PRESETS)[number]["id"];
export const MAX_STYLES_PER_RUN = 4;
