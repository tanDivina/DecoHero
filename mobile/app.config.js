// Release guard: a production bundle must never ship pointing at a LAN / http API.
// NODE_ENV is "production" when Gradle bundles JS for a release build (expo export:embed),
// for `expo run:android --variant release`, and EAS sets EAS_BUILD_PROFILE.
// Put the real URL in .env.production (or the shell env) before a release build.

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$)|\.local$|(^|\.)example\.com$/i;

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

module.exports = ({ config }) => {
  const isRelease =
    process.env.NODE_ENV === "production" || process.env.EAS_BUILD_PROFILE === "production";
  if (isRelease) {
    const rcKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
    const problem =
      apiUrlProblem(process.env.EXPO_PUBLIC_API_URL) ||
      (!rcKey || !rcKey.startsWith("goog_") || rcKey.includes("xxxx")
        ? "EXPO_PUBLIC_RC_ANDROID_KEY must be the RevenueCat Google Play public key (goog_...), or the shop is empty"
        : null);
    if (problem) {
      throw new Error(
        `[DecoHero] Refusing to build a release: ${problem}. ` +
          "Set it in mobile/.env.production or the shell env."
      );
    }
  }
  return {
    ...config,
    plugins: [...(config.plugins ?? []), "./plugins/withReleaseSigning"],
  };
};
