import Purchases, { PurchasesPackage } from "react-native-purchases";

let configured = false;

export function initPurchases(installId: string) {
  const apiKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  if (configured || !apiKey) return;
  Purchases.configure({ apiKey, appUserID: installId });
  configured = true;
}

/** Packs come from the "default" offering you set up in RevenueCat (products credits_15 / credits_50 / credits_150). */
export async function getCreditPacks(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Returns false if the user cancelled. Credits are granted server-side by the RevenueCat webhook. */
export async function buyPack(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}
