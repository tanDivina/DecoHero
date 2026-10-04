// The legacy API is the stable, documented way to write base64 to disk across recent Expo SDKs.
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
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

export async function shareImage(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: "DecoHero" });
  }
}
