// Web build of files.ts: designs live in memory as data URLs; Save downloads, Share uses the Web Share API.
const names = new Map<string, string>();

export async function writeTempJpeg(base64: string, name: string): Promise<string> {
  const uri = `data:image/jpeg;base64,${base64}`;
  names.set(uri, `${name}.jpg`);
  return uri;
}

/** Built without awaiting anything, so navigator.share still counts as started by the click. */
function toFile(uri: string): File {
  const bin = atob(uri.slice(uri.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], names.get(uri) ?? "decohero.jpg", { type: "image/jpeg" });
}

/** Downloads the design as a JPEG. */
export async function saveToGallery(uri: string): Promise<boolean> {
  const url = URL.createObjectURL(toFile(uri));
  const a = document.createElement("a");
  a.href = url;
  a.download = names.get(uri) ?? "decohero.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function canShareImages(): boolean {
  try {
    const probe = new File([new Uint8Array(1)], "decohero.jpg", { type: "image/jpeg" });
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareImage(uri: string): Promise<boolean> {
  if (!canShareImages()) return false;
  try {
    await navigator.share({ files: [toFile(uri)], title: "DecoHero" });
  } catch (e: any) {
    // Closing the share sheet is not a failure.
    if (e?.name !== "AbortError") throw e;
  }
  return true;
}
