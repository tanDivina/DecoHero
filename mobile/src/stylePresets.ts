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

export type StyleId = (typeof STYLE_PRESETS)[number]["id"];
export const MAX_STYLES_PER_RUN = 4;
