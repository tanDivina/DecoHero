// Shared by photo.ts and photo.web.ts (a .web file can't import "./photo", that resolves to itself).
/** width and height are the real pixel size of the JPEG that is sent; aspect is the (clamped) shape it is shown at. */
export type Photo = { uri: string; base64: string; aspect: number; width: number; height: number };
/** A spot on the photo as fractions of its width and height (0,0 = top left). Sent to the server as `place`. */
export type Place = { x: number; y: number };
type Size = { width: number; height: number };
/** failed: the file could not be read as an image (web only). */
export type PickResult = { photo?: Photo; denied?: boolean; failed?: boolean };

/** Width ÷ height, kept between portrait 3:4 and landscape 4:3 so the photo never dominates the screen. */
export function photoAspect(width: number, height: number): number {
  if (!width || !height) return 4 / 3;
  return Math.min(4 / 3, Math.max(3 / 4, width / height));
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** How a photo shown with resizeMode "cover" sits in its view: drawn size and the part cropped off each side. */
function cover(view: Size, photo: Size) {
  if (!photo.width || !photo.height || !view.width || !view.height) return { w: view.width, h: view.height, dx: 0, dy: 0 };
  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const w = photo.width * scale;
  const h = photo.height * scale;
  return { w, h, dx: (w - view.width) / 2, dy: (h - view.height) / 2 };
}

/** A touch inside the view, as a spot on the whole photo (the view may crop a very tall or wide photo). */
export function viewToPlace(x: number, y: number, view: Size, photo: Size): Place {
  const c = cover(view, photo);
  if (!c.w || !c.h) return { x: 0.5, y: 0.5 };
  return { x: clamp01((x + c.dx) / c.w), y: clamp01((y + c.dy) / c.h) };
}

/** Where a spot on the photo is drawn inside the view. */
export function placeToView(place: Place, view: Size, photo: Size): { x: number; y: number } {
  const c = cover(view, photo);
  return { x: place.x * c.w - c.dx, y: place.y * c.h - c.dy };
}
