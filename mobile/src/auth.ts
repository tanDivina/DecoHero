// Sign-in exists only on the web (auth.web.ts, Firebase). The Android app is anonymous: it never imports
// this file, so nothing here (and no firebase code) reaches the native bundle. These stubs only give the
// web-only files their types when tsc resolves "./auth".
export type Account = { uid: string; email: string | null };

/** "popup" = signed in; "redirect" = the page is leaving for Google; "cancelled" = the user closed it. */
export type SignInResult = "popup" | "redirect" | "cancelled";

const webOnly = (): never => {
  throw new Error("Sign-in is only available on the web");
};

export function watchAccount(_onChange: (account: Account | null) => void): () => void {
  return () => {};
}
export async function finishRedirectSignIn(): Promise<void> {}
export async function signInWithGoogle(): Promise<SignInResult> {
  return webOnly();
}
export async function signOutUser(): Promise<void> {}
export function currentAccount(): Account | null {
  return null;
}
export async function getIdToken(_forceRefresh = false): Promise<string | null> {
  return null;
}
/** Asks Google to confirm it is still the same person. Call straight from a click, or the popup is blocked. */
export async function reauthenticate(): Promise<"ok" | "cancelled" | "failed"> {
  return webOnly();
}
/** Deletes the sign-in itself, after the server side of the account is gone. False = could not. */
export async function deleteCurrentUser(): Promise<boolean> {
  return webOnly();
}
