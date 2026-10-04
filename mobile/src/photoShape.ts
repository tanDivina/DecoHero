// Shared by photo.ts and photo.web.ts (a .web file can't import "./photo", that resolves to itself).
export type Photo = { uri: string; base64: string; aspect: number };
export type PickResult = { photo?: Photo; denied?: boolean };

/** Width ÷ height, kept between portrait 3:4 and landscape 4:3 so the photo never dominates the screen. */
export function photoAspect(width: number, height: number): number {
  if (!width || !height) return 4 / 3;
  return Math.min(4 / 3, Math.max(3 / 4, width / height));
}
