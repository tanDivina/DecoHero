// Web build of purchases.ts: RevenueCat Web Billing (@revenuecat/purchases-js). Same exports as purchases.ts.
import { ErrorCode, Purchases, PurchasesError, type Package } from "@revenuecat/purchases-js";
import { api } from "./api";
import { currentAccount } from "./auth";
import { lang } from "./i18n";
import type { BuyResult, CreditPack } from "./packs";
import { webEnv } from "./webConfig";

export type { BuyResult, CreditPack } from "./packs";

// The app user id RevenueCat is set up for; credits are granted to it by the server webhook.
let userId: string | null = null;
const packages = new Map<string, Package>();

/** userId must be the `userId` from /api/me, never the Firebase uid. */
export function initPurchases(id: string) {
  const apiKey = webEnv.rcWebKey;
  if (!apiKey.startsWith("rcb_") || !id || id === userId) return;
  try {
    if (Purchases.isConfigured()) {
      // Another account signed in on this page: point RevenueCat at it before anything is bought.
      Purchases.getSharedInstance().changeUser(id).catch(() => {});
    } else {
      Purchases.configure({ apiKey, appUserId: id });
    }
    userId = id;
    packages.clear();
  } catch {
    userId = null;
  }
}

/** Packs from the "default" offering (products credits_15 / credits_50 / credits_150). */
export async function getCreditPacks(): Promise<CreditPack[]> {
  if (!userId) {
    // The first /api/me may have failed (offline at start): ask again so the shop can still open.
    const me = await api.me("");
    if (me.userId) initPurchases(me.userId);
  }
  if (!userId) return [];
  const offerings = await Purchases.getSharedInstance().getOfferings();
  const offering = offerings.all["default"] ?? offerings.current;
  packages.clear();
  return (offering?.availablePackages ?? []).map((pkg) => {
    packages.set(pkg.identifier, pkg);
    const { identifier, title, price } = pkg.product;
    return {
      id: pkg.identifier,
      productId: identifier,
      title,
      price: price.amountMicros / 1_000_000,
      currencyCode: price.currency,
      priceString: price.formattedPrice,
    };
  });
}

/** Opens the RevenueCat checkout over the page. "done" = paid; credits then arrive via the server webhook. */
export async function buyPack(pack: CreditPack): Promise<BuyResult> {
  const rcPackage = packages.get(pack.id);
  if (!rcPackage || !userId) return "error";
  try {
    await Purchases.getSharedInstance().purchase({
      rcPackage,
      customerEmail: currentAccount()?.email ?? undefined,
      selectedLocale: lang,
      skipSuccessPage: true,
    });
    return "done";
  } catch (e) {
    if (!(e instanceof PurchasesError)) return "error";
    switch (e.errorCode) {
      case ErrorCode.UserCancelledError: return "cancelled";
      case ErrorCode.PaymentPendingError: return "pending";
      case ErrorCode.PurchaseNotAllowedError:
      case ErrorCode.ProductNotAvailableForPurchaseError: return "notAllowed";
      case ErrorCode.StoreProblemError: return "store";
      case ErrorCode.NetworkError: return "network";
      default: return "error";
    }
  }
}
