// Wires the release build to an upload keystore that lives OUTSIDE the repo.
// Values come from Gradle properties (e.g. ~/.gradle/gradle.properties) or env vars:
//   DECOHERO_UPLOAD_STORE_FILE      absolute path, e.g. /Users/<you>/.secrets/decohero-upload.jks
//   DECOHERO_UPLOAD_KEY_ALIAS
//   DECOHERO_UPLOAD_STORE_PASSWORD
//   DECOHERO_UPLOAD_KEY_PASSWORD
// If they are missing, release falls back to the debug key with a warning
// (Play rejects debug-signed bundles, so such a build can't be uploaded by mistake).
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// decohero-release-signing";

const SIGNING_BLOCK = `
    ${MARKER}
    def decoProp = { String name -> findProperty(name) ?: System.getenv(name) }
    def decoStoreFile = decoProp('DECOHERO_UPLOAD_STORE_FILE')
    def decoHasUploadKey = decoStoreFile && file(decoStoreFile).exists()
    if (!decoHasUploadKey) {
        logger.warn("DecoHero: DECOHERO_UPLOAD_STORE_FILE not set or missing; release will be DEBUG-signed (not uploadable to Play).")
    }
    signingConfigs {
        if (decoHasUploadKey) {
            release {
                storeFile file(decoStoreFile)
                storePassword decoProp('DECOHERO_UPLOAD_STORE_PASSWORD')
                keyAlias decoProp('DECOHERO_UPLOAD_KEY_ALIAS')
                keyPassword decoProp('DECOHERO_UPLOAD_KEY_PASSWORD')
            }
        }
    }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    const at = src.search(/\n\s*buildTypes\s*\{/);
    if (at < 0) throw new Error("withReleaseSigning: could not find buildTypes in app/build.gradle");
    const head = src.slice(0, at);
    let buildTypes = src.slice(at);

    // Point the release build type at the upload key (debug signing stays as the fallback).
    const releaseSigning = /(\brelease\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
    if (!releaseSigning.test(buildTypes)) throw new Error("withReleaseSigning: could not find release signingConfig");
    buildTypes = buildTypes.replace(
      releaseSigning,
      "$1signingConfig decoHasUploadKey ? signingConfigs.release : signingConfigs.debug"
    );

    // Declare the release signingConfig just before buildTypes.
    src = `${head}\n${SIGNING_BLOCK}${buildTypes}`;

    cfg.modResults.contents = src;
    return cfg;
  });
};
