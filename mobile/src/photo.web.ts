// Browser stand-in for photo.ts, used only for web previews (the browser picker returns base64 directly).
import * as ImagePicker from "expo-image-picker";
import { photoAspect } from "./photoShape";

export type { Photo, PickResult } from "./photoShape";
import type { PickResult } from "./photoShape";

async function pickWeb(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.8 });
  const a = res.canceled ? undefined : res.assets[0];
  if (!a) return {};
  return { photo: { uri: a.uri, base64: a.base64 ?? a.uri.split(",")[1] ?? "", aspect: photoAspect(a.width, a.height) } };
}

export const takePhoto = pickWeb;
export const choosePhoto = pickWeb;
