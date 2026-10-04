import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";

const KEY = "decohero_install_id";
let cached: string | null = null;

/** Anonymous id: no sign-up needed. Also used as the RevenueCat app user id so purchases map to credits. */
export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  cached = id;
  return id;
}
