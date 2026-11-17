// Web build of identity.ts. On the web the account is the Firebase sign-in, sent as a Bearer token by
// apiAuth.web.ts. This id is only a local "signed in" marker for App.tsx; it is never sent to the server.
import { currentAccount } from "./auth";

export async function getInstallId(): Promise<string> {
  return currentAccount()?.uid ?? "web";
}
