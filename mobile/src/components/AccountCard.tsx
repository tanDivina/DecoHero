import type { Account } from "../auth";

/** The Android app has no account (see the install ID card in AboutScreen). Web: AccountCard.web.tsx. */
export function AccountCard(_props: { account: Account | null; onNotice: (msg: string) => void }) {
  return null;
}
