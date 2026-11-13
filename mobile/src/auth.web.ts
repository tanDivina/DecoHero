// Web sign-in: Firebase Auth with Google. The server checks the ID token and keys credits to the account.
import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider, deleteUser, getAuth, getRedirectResult, onAuthStateChanged, reauthenticateWithPopup,
  signInWithPopup, signInWithRedirect, signOut,
  type Auth, type User,
} from "firebase/auth";
import { firebaseReady, webEnv } from "./webConfig";

export type Account = { uid: string; email: string | null };
export type SignInResult = "popup" | "redirect" | "cancelled";

let auth: Auth | null = null;

function getAuthOrThrow(): Auth {
  if (auth) return auth;
  if (!firebaseReady()) throw new Error("Firebase is not configured");
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: webEnv.firebaseApiKey,
      authDomain: webEnv.firebaseAuthDomain,
      projectId: webEnv.firebaseProjectId,
      appId: webEnv.firebaseAppId,
    });
  auth = getAuth(app);
  return auth;
}

const toAccount = (u: User | null): Account | null => (u ? { uid: u.uid, email: u.email } : null);

/** Calls back with the signed-in account (or null) now and on every change. Returns the unsubscribe. */
export function watchAccount(onChange: (account: Account | null) => void): () => void {
  return onAuthStateChanged(getAuthOrThrow(), (u) => onChange(toAccount(u)));
}

/** Completes a sign-in that left the page for Google. Throws if that sign-in failed. */
export async function finishRedirectSignIn(): Promise<void> {
  await getRedirectResult(getAuthOrThrow());
}

// Redirect sign-in only works reliably when the auth handler is served from the page's own host
// (browsers block the cross-site storage it needs otherwise), so phones use it only in that setup.
function preferRedirect(): boolean {
  const smallTouch = window.matchMedia("(max-width: 700px) and (pointer: coarse)").matches;
  return smallTouch && webEnv.firebaseAuthDomain === window.location.host;
}

const POPUP_UNAVAILABLE = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"];
const POPUP_CLOSED = ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"];

export async function signInWithGoogle(): Promise<SignInResult> {
  const a = getAuthOrThrow();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (preferRedirect()) {
    await signInWithRedirect(a, provider);
    return "redirect";
  }
  try {
    await signInWithPopup(a, provider);
    return "popup";
  } catch (e: any) {
    if (POPUP_CLOSED.includes(e?.code)) return "cancelled";
    if (POPUP_UNAVAILABLE.includes(e?.code)) {
      await signInWithRedirect(a, provider);
      return "redirect";
    }
    throw e;
  }
}

/** Signs out and reloads the page, so nothing of this account (state, RevenueCat user) stays in memory. */
export async function signOutUser(): Promise<void> {
  try {
    if (auth) await signOut(auth);
  } finally {
    window.location.reload();
  }
}

export function currentAccount(): Account | null {
  return toAccount(auth?.currentUser ?? null);
}

/** A valid ID token for the signed-in user (Firebase renews it when it is about to expire), or null. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/**
 * Asks Google to confirm it is still the same person, which Firebase requires before deleting a sign-in.
 * Must run straight from a click (no await before it), or the browser blocks the popup.
 */
export async function reauthenticate(): Promise<"ok" | "cancelled" | "failed"> {
  const user = auth?.currentUser;
  if (!user) return "failed";
  try {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return "ok";
  } catch (e: any) {
    return POPUP_CLOSED.includes(e?.code) ? "cancelled" : "failed";
  }
}

/** Deletes the Firebase sign-in, after the server side of the account is gone. False = could not. */
export async function deleteCurrentUser(): Promise<boolean> {
  const user = auth?.currentUser;
  if (!user) return true;
  try {
    await deleteUser(user);
    return true;
  } catch {
    return false;
  }
}
