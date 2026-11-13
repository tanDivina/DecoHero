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
/** Deletes the sign-in itself (after the server side is gone). "reauth" = Google must confirm first. */
export async function deleteSignedInUser(): Promise<"done" | "reauth"> {
  return webOnly();
}
/** Opens Google to confirm, then deletes the sign-in. Call from a click. */
export async function reauthAndDeleteUser(): Promise<void> {
  return webOnly();
}
