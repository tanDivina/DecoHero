import "dotenv/config";
import { createApp } from "./app.js";
import {
  askYesNo, AUTO_SPOT_MODEL, checkRemovedPieces, describeError, DOOR_CHECK_MODEL, generateRedesign, IMAGE_MODEL, locateTree, nameMarkedPieces,
  pickTreeSpot, PLACE_CHECK_MODEL, REMOVE_CHECK_MODEL, REMOVE_NAMES_MODEL,
} from "./gemini.js";
import { MAX_FREE_GENERATIONS_PER_DAY, MAX_GENERATIONS_PER_DAY, purgeOldDesigns, purgeOldIps } from "./db.js";
import { flagOn } from "./styles.js";

const app = createApp(generateRedesign, IMAGE_MODEL, { askYesNo, locateTree, nameMarkedPieces, pickTreeSpot, checkRemovedPieces });

// Retention, at startup and then hourly: blank stored IPs and drop per-IP new-user rows older than 48 h,
// drop design rows older than 7 days, and drop the uid hashes of web accounts deleted more than 2 h ago.
const runIpPurge = () => {
  try {
    const n = purgeOldIps();
    if (n) console.log(`retention: cleared ip on ${n} users older than 48h`);
    const d = purgeOldDesigns();
    if (d) console.log(`retention: removed ${d} design rows older than 7 days`);
  } catch (err) {
    console.error(`retention purge failed: ${describeError(err)}`);
  }
};
runIpPurge();
setInterval(runIpPurge, 60 * 60 * 1000).unref();

if (!process.env.REVENUECAT_WEBHOOK_SECRET) console.warn("REVENUECAT_WEBHOOK_SECRET is not set: purchases will be rejected");
if (!process.env.FIREBASE_PROJECT_ID) console.warn("FIREBASE_PROJECT_ID is not set: web app sign-in is off (Bearer requests get 503 WEB_DISABLED)");
const port = Number(process.env.PORT || 8080);
app.listen(port, () =>
  console.log(
    `DecoHero API on :${port} using ${IMAGE_MODEL}; daily caps ${MAX_GENERATIONS_PER_DAY} total / ${MAX_FREE_GENERATIONS_PER_DAY} free; ` +
      `tree clearing ${flagOn("TREE_CLEAR") ? "on" : "off"}; door check ${flagOn("DOOR_CHECK") ? `on (${DOOR_CHECK_MODEL})` : "off"}; ` +
      `place check ${flagOn("PLACE_CHECK") ? `on (${PLACE_CHECK_MODEL})` : "off"}; ` +
      `remove names ${flagOn("REMOVE_NAMES") ? `on (${REMOVE_NAMES_MODEL})` : "off"}; frame check ${flagOn("FRAME_CHECK") ? "on" : "off"}; ` +
      `decor step ${flagOn("DECOR_STEP") ? "on" : "off"}; two-step removal ${flagOn("STYLE_REMOVE_TWO_STEP") ? "on" : "off"}; ` +
      `removal check ${flagOn("STYLE_REMOVE_CHECK") ? `on (${REMOVE_CHECK_MODEL})` : "off"}; auto spot ${flagOn("AUTO_SPOT") ? `on (${AUTO_SPOT_MODEL})` : "off"}`
  )
);
