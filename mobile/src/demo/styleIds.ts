import { STYLE_PRESETS } from "../stylePresets";

export function isStyleId(id: string | undefined): id is string {
  return !!id && STYLE_PRESETS.some((s) => s.id === id);
}
