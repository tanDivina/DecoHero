import "dotenv/config";
import { createApp } from "./app.js";
import { askYesNo, describeError, DOOR_CHECK_MODEL, generateRedesign, IMAGE_MODEL } from "./gemini.js";
import { MAX_FREE_GENERATIONS_PER_DAY, MAX_GENERATIONS_PER_DAY, purgeOldDesigns, purgeOldIps } from "./db.js";
import { flagOn } from "./styles.js";

const app = createApp(generateRedesign, IMAGE_MODEL, { askYesNo });

// Retention: blank stored IPs older than 48 h and drop design rows older than 7 days, at startup and then hourly.
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
const port = Number(process.env.PORT || 8080);
app.listen(port, () =>
  console.log(
    `DecoHero API on :${port} using ${IMAGE_MODEL}; daily caps ${MAX_GENERATIONS_PER_DAY} total / ${MAX_FREE_GENERATIONS_PER_DAY} free; ` +
      `tree clearing ${flagOn("TREE_CLEAR") ? "on" : "off"}; door check ${flagOn("DOOR_CHECK") ? `on (${DOOR_CHECK_MODEL})` : "off"}`
  )
);
