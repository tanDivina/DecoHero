// The legacy API is the stable, documented way to write base64 to disk across recent Expo SDKs.
import * as FileSystem from "expo-file-system/legacy";
// SDK 57 moved the simple save API to /legacy; the root export now throws at runtime.
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";

export async function writeTempJpeg(base64: string, name: string): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}${name}.jpg`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function saveToGallery(uri: string): Promise<boolean> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

/** False when this device can't share; throws if the share sheet fails to open. */
export async function shareImage(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: "DecoHero" });
  return true;
}
