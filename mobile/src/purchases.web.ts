// Web build of purchases.ts: RevenueCat Web Billing (@revenuecat/purchases-js). Same exports as purchases.ts.
import { ErrorCode, Purchases, PurchasesError, type Package } from "@revenuecat/purchases-js";
import { api } from "./api";
import { currentAccount } from "./auth";
import { lang } from "./i18n";
import type { BuyResult, CreditPack } from "./packs";
import { webEnv } from "./webConfig";

export type { BuyResult, CreditPack } from "./packs";

// The app user id RevenueCat is confirmed to be set up for; the server webhook grants credits to it.
let userId: string | null = null;
// The id the app last asked for, and the set-up for it that is still running (or finished).
let wanted: string | null = null;
let setup: Promise<void> = Promise.resolve();
const packages = new Map<string, Package>();

async function useAccount(id: string): Promise<void> {
  if (Purchases.isConfigured()) {
    // A different account on the same page (sign-out normally reloads it, so this is a safety net).
    // Nothing can be bought until RevenueCat confirms the switch: userId stays null if it fails.
    userId = null;
    packages.clear();
    await Purchases.getSharedInstance().changeUser(id);
  } else {
    Purchases.configure({ apiKey: webEnv.rcWebKey, appUserId: id });
  }
  userId = id;
}

/** id must be the `userId` from /api/me, never the Firebase uid. */
export function initPurchases(id: string) {
  if (!webEnv.rcWebKey.startsWith("rcb_") || !id || id === wanted) return;
  wanted = id;
  setup = setup.then(() => useAccount(id)).catch(() => {
    // Not set up: forget the request so the next initPurchases() tries again.
    if (wanted === id) wanted = null;
  });
}

/** Waits for the set-up to finish. True only when RevenueCat is on the account the app asked for. */
async function ready(): Promise<boolean> {
  await setup;
  return !!userId && userId === wanted;
}

/** Packs from the "default" offering (products credits_15 / credits_50 / credits_150). */
export async function getCreditPacks(): Promise<CreditPack[]> {
  if (!(await ready())) {
    // The first /api/me may have failed (offline at start): ask again so the shop can still open.
    const me = await api.me("");
    if (me.userId) initPurchases(me.userId);
  }
  if (!(await ready())) return [];
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
  // Never open a checkout unless RevenueCat is confirmed to be on the signed-in account.
  if (!(await ready())) return "error";
  const rcPackage = packages.get(pack.id);
  if (!rcPackage) return "error";
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
