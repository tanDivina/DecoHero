// Browser stand-in for files.ts, used only for web previews (expo-media-library has no web module).
export async function writeTempJpeg(base64: string, _name: string): Promise<string> {
  return `data:image/jpeg;base64,${base64}`;
}

export async function saveToGallery(uri: string): Promise<boolean> {
  const a = document.createElement("a");
  a.href = uri;
  a.download = "decohero.jpg";
  a.click();
  return true;
}

export async function shareImage(_uri: string) {}
