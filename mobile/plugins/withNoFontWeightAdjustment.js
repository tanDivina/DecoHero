// Android 12+ "Bold text" (Settings > Accessibility) sets Configuration.fontWeightAdjustment.
// Android's TextView draws text bolder, but React Native measures text without it, so labels
// were measured too narrow and got clipped ("Mid-centur", "About and"). Until RN accounts for
// it, render at the app's own weights so measuring and drawing match. Font size scaling is
// unaffected (RN handles fontScale correctly).
//
// Only fontWeightAdjustment is overridden: a fresh Configuration() has every field "undefined",
// so applyOverrideConfiguration leaves locale, fontScale, night mode, etc. to follow the system
// (an earlier version copied the whole Configuration, which froze those at launch).
const { withMainActivity } = require("expo/config-plugins");

const MARKER = "// decohero: font-weight-override v2";

const METHOD = `
  ${MARKER}
  override fun attachBaseContext(newBase: android.content.Context) {
    super.attachBaseContext(newBase)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
      try {
        applyOverrideConfiguration(android.content.res.Configuration().apply { fontWeightAdjustment = 0 })
      } catch (e: IllegalStateException) {
        // Resources were already created; skip the override rather than crash.
      }
    }
  }
`;

// The v1 block, removed if a non-clean prebuild still has it in MainActivity.kt.
const LEGACY = `
  // decohero: no-font-weight-adjustment
  override fun attachBaseContext(newBase: android.content.Context) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
      val cfg = android.content.res.Configuration(newBase.resources.configuration)
      if (cfg.fontWeightAdjustment != 0) {
        cfg.fontWeightAdjustment = 0
        super.attachBaseContext(newBase.createConfigurationContext(cfg))
        return
      }
    }
    super.attachBaseContext(newBase)
  }
`;

module.exports = function withNoFontWeightAdjustment(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== "kt") {
      throw new Error("[DecoHero] withNoFontWeightAdjustment expects a Kotlin MainActivity");
    }
    let src = cfg.modResults.contents;
    if (src.includes(LEGACY)) src = src.replace(LEGACY, "");
    if (src.includes("decohero: no-font-weight-adjustment")) {
      throw new Error("[DecoHero] old font-weight block found but not in the expected form; run prebuild --clean");
    }
    if (!src.includes(MARKER)) {
      const anchor = "class MainActivity : ReactActivity() {";
      if (!src.includes(anchor)) throw new Error("[DecoHero] MainActivity anchor not found");
      src = src.replace(anchor, anchor + "\n" + METHOD);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
