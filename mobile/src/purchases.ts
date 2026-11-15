import Purchases, { PURCHASES_ERROR_CODE, PurchasesPackage } from "react-native-purchases";

import type { BuyResult, CreditPack } from "./packs";

export type { BuyResult, CreditPack } from "./packs";

let configured = false;
// The Play packages behind the packs last handed to the shop, by package id.
const packages = new Map<string, PurchasesPackage>();

export function initPurchases(installId: string) {
  const apiKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  if (configured || !apiKey) return;
  Purchases.configure({ apiKey, appUserID: installId });
  configured = true;
}

/** Packs come from the "default" offering you set up in RevenueCat (products credits_15 / credits_50 / credits_150). */
export async function getCreditPacks(): Promise<CreditPack[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all["default"] ?? offerings.current;
  packages.clear();
  return (offering?.availablePackages ?? []).map((pkg) => {
    packages.set(pkg.identifier, pkg);
    const { identifier, title, price, currencyCode, priceString } = pkg.product;
    return { id: pkg.identifier, productId: identifier, title, price, currencyCode, priceString };
  });
}

export async function buyPack(pack: CreditPack): Promise<BuyResult> {
  const pkg = packages.get(pack.id);
  if (!pkg) return "error";
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
