import type { Photo } from "./photoShape";

/** Drag-and-drop of a photo onto the page. Web only (photoDrop.web.ts); on the phone it does nothing. */
export function usePhotoDrop(_onPhoto: (p: Photo) => void, _onFail: () => void): { dragging: boolean; canDrop: boolean } {
  return { dragging: false, canDrop: false };
}
