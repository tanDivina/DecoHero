import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/** The claims the API reads from a verified Firebase ID token. */
export type VerifiedToken = {
  uid: string;
  /** When the user signed in, in seconds. Stays the same when the token is refreshed. */
  auth_time?: number;
  firebase?: { sign_in_provider?: string };
};
/** Verifies a Firebase ID token. Throws if the token is not valid. */
export type VerifyIdToken = (token: string) => Promise<VerifiedToken>;

const APP_NAME = "decohero-web";

/**
 * Verifier for the web app's Google sign-in (Firebase Auth), or null when FIREBASE_PROJECT_ID is not set.
 * Only the project id is needed: verifyIdToken checks the token's signature against Google's public
 * certificates, so there is no service-account key here and none may be added.
 */
export function firebaseVerifier(): VerifyIdToken | null {
  // With this variable set firebase-admin accepts unsigned tokens. Never in production.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.NODE_ENV === "production") {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST is set in production: refusing to start (it disables token signature checks)");
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;
  const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp({ projectId }, APP_NAME);
  return (token) => getAuth(app).verifyIdToken(token);
}

/**
 * True when verification failed because Google's signing keys could not be fetched (network, Google outage),
 * not because of the token. firebase-admin 14 reports that as auth/argument-error, the same code as a bad
 * token, so the message is the only way to tell: "Error fetching public keys for Google certs: ...",
 * "Error fetching public keys." or the HTTP client's "Error while making request: ...".
 */
export function isKeyFetchFailure(err: unknown): boolean {
  const code = String((err as { code?: unknown })?.code ?? "");
  const message = String((err as { message?: unknown })?.message ?? "");
  return (
    code === "auth/internal-error" ||
    code.startsWith("app/network-") ||
    /^Error (fetching (public keys|Json Web Keys)|while making requests?\b)/i.test(message)
  );
}
