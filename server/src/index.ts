import "dotenv/config";
import { createApp } from "./app.js";
import { describeError, generateRedesign, IMAGE_MODEL } from "./gemini.js";
import { MAX_FREE_GENERATIONS_PER_DAY, MAX_GENERATIONS_PER_DAY, purgeOldIps } from "./db.js";

const app = createApp(generateRedesign, IMAGE_MODEL);

// Retention, at startup and then hourly: blank stored IPs and drop per-IP new-user rows older than 48 h,
// and drop the uid hashes of web accounts deleted more than 2 h ago.
const runIpPurge = () => {
  try {
    const n = purgeOldIps();
    if (n) console.log(`retention: cleared ip on ${n} users older than 48h`);
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
    `DecoHero API on :${port} using ${IMAGE_MODEL}; daily caps ${MAX_GENERATIONS_PER_DAY} total / ${MAX_FREE_GENERATIONS_PER_DAY} free`
  )
);
