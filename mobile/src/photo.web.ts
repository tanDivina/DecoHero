// Web build of photo.ts: a file input (phones offer the camera from it) and the same downscale as the app.
import { photoAspect } from "./photoShape";
import type { Photo, PickResult } from "./photoShape";

export type { Photo, PickResult, Place } from "./photoShape";

// Same as photo.ts: longest edge 1280 px, JPEG quality 0.8, so uploads are ~200 KB.
const MAX_EDGE = 1280;
const QUALITY = 0.8;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

/** Downscales and re-encodes a picked or dropped file. Throws if the browser can't read it as an image. */
export async function prepareFile(file: Blob): Promise<Photo> {
  // The browser applies the camera's EXIF rotation when it decodes the image.
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("empty image");
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  // JPEG has no transparency: put white behind PNGs with see-through areas.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const uri = canvas.toDataURL("image/jpeg", QUALITY);
  const base64 = uri.split(",")[1] ?? "";
  if (!base64) throw new Error("encode failed");
  return { uri, base64, aspect: photoAspect(canvas.width, canvas.height), width: canvas.width, height: canvas.height };
}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    const done = (file: File | null) => {
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => done(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}

export async function choosePhoto(): Promise<PickResult> {
  const file = await pickFile();
  if (!file) return {};
  try {
    return { photo: await prepareFile(file) };
  } catch {
    return { failed: true };
  }
}

// On phones the same file input offers "Take photo", so there is no separate camera path.
export const takePhoto = choosePhoto;
