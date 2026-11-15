// Release guard: a production bundle must never ship pointing at a LAN / http API.
// NODE_ENV is "production" when Gradle bundles JS for a release build (expo export:embed),
// for `expo run:android --variant release`, and EAS sets EAS_BUILD_PROFILE.
// Put the real URL in .env.production (or the shell env) before a release build.
//
// Web builds (`npm run build:web`, which sets DECOHERO_PLATFORM=web) are checked for the web settings
// instead: https API URL, the Firebase web config and the RevenueCat Web Billing key (rcb_...).

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$)|\.local$|(^|\.)example\.com$/i;
// Same rule as src/webConfig.ts, which shows the "not set up yet" page for these values.
const PLACEHOLDER = /^$|xxxx|your[-_]|example\.com|changeme/i;

function apiUrlProblem(raw) {
  if (!raw) return "EXPO_PUBLIC_API_URL is not set";
  let url;
  try {
    url = new URL(raw);
  } catch {
    return `EXPO_PUBLIC_API_URL is not a valid URL (${raw})`;
  }
  if (url.protocol !== "https:") return `EXPO_PUBLIC_API_URL must use https (got ${raw})`;
  if (PRIVATE_HOST.test(url.hostname)) return `EXPO_PUBLIC_API_URL points at a local or placeholder host (${raw})`;
  return null;
}

function androidProblem() {
  const rcKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  return (
    apiUrlProblem(process.env.EXPO_PUBLIC_API_URL) ||
    (!rcKey || !rcKey.startsWith("goog_") || rcKey.includes("xxxx")
      ? "EXPO_PUBLIC_RC_ANDROID_KEY must be the RevenueCat Google Play public key (goog_...), or the shop is empty"
      : null)
  );
}

function webProblem() {
  const apiProblem = apiUrlProblem(process.env.EXPO_PUBLIC_API_URL);
  if (apiProblem) return apiProblem;
  for (const name of [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
  ]) {
    if (PLACEHOLDER.test(process.env[name] ?? "")) return `${name} is not set (Firebase web app config), or nobody can sign in`;
  }
  const rcKey = process.env.EXPO_PUBLIC_RC_WEB_KEY ?? "";
  if (!rcKey.startsWith("rcb_") || PLACEHOLDER.test(rcKey)) {
    return "EXPO_PUBLIC_RC_WEB_KEY must be the RevenueCat Web Billing public key (rcb_...), or the shop is empty";
  }
  return null;
}

/** True for `npm run build:web` and for a bare `expo export --platform web` (or `-p web`). */
function isWebBuild() {
  if (process.env.DECOHERO_PLATFORM === "web") return true;
  const argv = process.argv;
  return argv.some((a, i) => a === "--platform=web" || ((a === "--platform" || a === "-p") && argv[i + 1] === "web"));
}

module.exports = ({ config }) => {
  const isRelease =
    process.env.NODE_ENV === "production" || process.env.EAS_BUILD_PROFILE === "production";
  const web = isWebBuild();
  if (isRelease) {
    const problem = web ? webProblem() : androidProblem();
    // Web only: `npm run build:web -- --allow-placeholder` makes a preview that shows "not set up yet".
    const previewOnly = web && process.env.DECOHERO_ALLOW_PLACEHOLDER === "1";
    if (problem && previewOnly) {
      console.warn(`[DecoHero] Web PREVIEW build, not for release: ${problem}.`);
    } else if (problem) {
      throw new Error(
        `[DecoHero] Refusing to build a release: ${problem}. ` +
          (web ? "Set it in mobile/.env.web or the shell env." : "Set it in mobile/.env.production or the shell env.")
      );
    }
  }
  return {
    ...config,
    // The web app is served under https://deco.hero-apps.com/app. Web builds only: native builds keep their config.
    ...(web ? { experiments: { ...(config.experiments ?? {}), baseUrl: "/app" } } : {}),
    plugins: [...(config.plugins ?? []), "./plugins/withReleaseSigning", "./plugins/withNoFontWeightAdjustment"],
  };
};
