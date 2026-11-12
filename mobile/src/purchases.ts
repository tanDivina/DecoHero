import Purchases, { PURCHASES_ERROR_CODE, PurchasesPackage } from "react-native-purchases";

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
  const offering = offerings.all["default"] ?? offerings.current;
  return offering?.availablePackages ?? [];
}

/**
 * "done": paid, credits arrive via the server webhook. "pending": Google Play is still waiting for the
 * payment (cash/bank methods common in Latin America), credits arrive once it clears.
 * Other failures come back as "notAllowed" | "store" | "network" | "error".
 */
export type BuyResult = "done" | "cancelled" | "pending" | "notAllowed" | "store" | "network" | "error";

export async function buyPack(pkg: PurchasesPackage): Promise<BuyResult> {
  try {
    await Purchases.purchasePackage(pkg);
    return "done";
  } catch (e: any) {
    if (e?.userCancelled) return "cancelled";
    switch (e?.code) {
      case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR: return "cancelled";
      case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR: return "pending";
      case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: return "notAllowed";
      case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR: return "store";
      case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR: return "network";
      default: return "error";
    }
  }
}
