import { useEffect, useRef, useState } from "react";
import { prepareFile } from "./photo.web";
import type { Photo } from "./photoShape";

const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");

/**
 * Lets the user drop a photo anywhere on the page. `dragging` is true while a file hovers over it;
 * `canDrop` is true on devices with a mouse, where the hint is worth showing.
 */
export function usePhotoDrop(onPhoto: (p: Photo) => void, onFail: () => void): { dragging: boolean; canDrop: boolean } {
  const [dragging, setDragging] = useState(false);
  const handlers = useRef({ onPhoto, onFail });
  handlers.current = { onPhoto, onFail };

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    // Without preventDefault the browser would navigate away to show the dropped file.
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return handlers.current.onFail();
      prepareFile(file).then(
        (p) => handlers.current.onPhoto(p),
        () => handlers.current.onFail()
      );
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const canDrop = typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  return { dragging, canDrop };
}
