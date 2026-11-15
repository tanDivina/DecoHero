import type { ReactNode } from "react";
import type { Account } from "./auth";

/** Android has no sign-in: the app renders straight away. The web version (AuthGate.web.tsx) asks for Google. */
export function AuthGate({ children }: { children: (account: Account | null) => ReactNode }) {
  return <>{children(null)}</>;
}
