// What the shop needs to show a credit pack, whichever store it comes from (Google Play or Web Billing).
export type CreditPack = {
  /** Package id inside the RevenueCat offering; pass the pack back to buyPack(). */
  id: string;
  /** Store product id: credits_15 / credits_50 / credits_150 (Play may add a ":base" suffix). */
  productId: string;
  /** Store title, used only when the credit amount can't be read from productId. */
  title: string;
  /** Price as a number in currencyCode, e.g. 2.99. */
  price: number;
  currencyCode: string;
  /** Price as the store formats it, e.g. "$2.99". */
  priceString: string;
};

/**
 * "done": paid, credits arrive via the server webhook. "pending": the store is still waiting for the
 * payment (cash/bank methods common in Latin America), credits arrive once it clears.
 * Other failures come back as "notAllowed" | "store" | "network" | "error".
 */
export type BuyResult = "done" | "cancelled" | "pending" | "notAllowed" | "store" | "network" | "error";

/** Credits in a pack, from its product id (credits_15, credits_15:base, ...). Null if unknown. */
export function packCredits(pack: CreditPack): number | null {
  const m = /credits_(\d+)/.exec(pack.productId);
  return m ? Number(m[1]) : null;
}
