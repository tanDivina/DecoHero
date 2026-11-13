// Web build settings (public values, inlined at build time). Imported by web-only files.
// Keep the placeholder test in step with app.config.js, which blocks release builds on the same rule.
const PLACEHOLDER = /^$|xxxx|your[-_]|example\.com|changeme/i;

export const webEnv = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  rcWebKey: process.env.EXPO_PUBLIC_RC_WEB_KEY ?? "",
};

const isSet = (v: string) => !PLACEHOLDER.test(v);

/** Names of the settings that are missing or still placeholders. Empty = ready to run. */
export function webConfigProblems(): string[] {
  const missing: string[] = [];
  const apiOk = isSet(webEnv.apiUrl) && (__DEV__ || webEnv.apiUrl.startsWith("https://"));
  if (!apiOk) missing.push("EXPO_PUBLIC_API_URL");
  if (!isSet(webEnv.firebaseApiKey)) missing.push("EXPO_PUBLIC_FIREBASE_API_KEY");
  if (!isSet(webEnv.firebaseAuthDomain)) missing.push("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!isSet(webEnv.firebaseProjectId)) missing.push("EXPO_PUBLIC_FIREBASE_PROJECT_ID");
  if (!isSet(webEnv.firebaseAppId)) missing.push("EXPO_PUBLIC_FIREBASE_APP_ID");
  if (!isSet(webEnv.rcWebKey) || !webEnv.rcWebKey.startsWith("rcb_")) missing.push("EXPO_PUBLIC_RC_WEB_KEY");
  return missing;
}

export const firebaseReady = () =>
  [webEnv.firebaseApiKey, webEnv.firebaseAuthDomain, webEnv.firebaseProjectId, webEnv.firebaseAppId].every(isSet);
