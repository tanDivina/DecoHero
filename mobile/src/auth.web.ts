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

export async function signOutUser(): Promise<void> {
  if (auth) await signOut(auth);
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
 * Deletes the Firebase sign-in after the server side of the account is gone, then signs out.
 * "reauth": Firebase wants a fresh Google confirmation first; call reauthAndDeleteUser() from a click.
 */
export async function deleteSignedInUser(): Promise<"done" | "reauth"> {
  const user = auth?.currentUser;
  if (!user) return "done";
  try {
    await deleteUser(user);
  } catch (e: any) {
    if (e?.code === "auth/requires-recent-login") return "reauth";
    throw e;
  }
  await signOutUser().catch(() => {});
  return "done";
}

export async function reauthAndDeleteUser(): Promise<void> {
  const user = auth?.currentUser;
  if (!user) return;
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
  await deleteUser(user);
  await signOutUser().catch(() => {});
}
