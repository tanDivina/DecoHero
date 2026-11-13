import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/** Verifies a Firebase ID token and returns at least the Firebase uid. Throws if the token is not valid. */
export type VerifyIdToken = (token: string) => Promise<{ uid: string }>;

const APP_NAME = "decohero-web";

/**
 * Verifier for the web app's Google sign-in (Firebase Auth), or null when FIREBASE_PROJECT_ID is not set.
 * Only the project id is needed: verifyIdToken checks the token's signature against Google's public
 * certificates, so there is no service-account key here and none may be added.
 */
export function firebaseVerifier(): VerifyIdToken | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;
  const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp({ projectId }, APP_NAME);
  return (token) => getAuth(app).verifyIdToken(token);
}
