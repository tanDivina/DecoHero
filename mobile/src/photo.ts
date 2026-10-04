import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Photo, PickResult, photoAspect } from "./photoShape";

export type { Photo, PickResult } from "./photoShape";

const MAX_EDGE = 1280;

async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<Photo> {
  // Downscale on the phone so each upload is ~200 KB instead of several MB.
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (asset.width >= asset.height && asset.width > MAX_EDGE) ctx.resize({ width: MAX_EDGE });
  else if (asset.height > asset.width && asset.height > MAX_EDGE) ctx.resize({ height: MAX_EDGE });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return { uri: saved.uri, base64: saved.base64 ?? "", aspect: photoAspect(saved.width, saved.height) };
}

export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { denied: true };
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (res.canceled || !res.assets[0]) return {};
  return { photo: await prepare(res.assets[0]) };
}

export async function choosePhoto(): Promise<PickResult> {
  // Android 13+ uses the system photo picker here, so no media permission is needed.
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (res.canceled || !res.assets[0]) return {};
  return { photo: await prepare(res.assets[0]) };
}
