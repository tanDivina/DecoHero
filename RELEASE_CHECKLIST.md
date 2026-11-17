# DecoHero release checklist (Google Play internal testing)

Code is release-ready on branch `android-app`. These are the remaining steps, in order. Never paste a key into the repo, the app or this file.

## 1. Gemini key (GCP)
- AI Studio > Get API key > **Create in new project** (a DecoHero-only project).
- Cloud Console > Credentials > that key > API restrictions: **Generative Language API only**.
- Billing > Budgets & alerts: budget for the project, alerts at 50/90/100%.
- Details: `server/DEPLOY.md` "Before you deploy".

## 2. Railway deploy + volume
- New Project > Deploy from GitHub repo > Root Directory `server` (Dockerfile build).
- Variables:

  | Name | Value |
  |---|---|
  | `GEMINI_API_KEY` | key from step 1 (required) |
  | `REVENUECAT_WEBHOOK_SECRET` | `openssl rand -hex 24` (required, keep a copy for step 6) |
  | `IMAGE_MODEL` | optional, default `gemini-3.1-flash-image` |
  | `MAX_GENERATIONS_PER_DAY` | optional, default `300` (`0` = kill switch) |
  | `MAX_FREE_GENERATIONS_PER_DAY` | optional, default `100` |
  | `FREE_CREDITS` | optional, default `3` |
  | `MAX_NEW_INSTALLS_PER_IP_PER_DAY` | optional, default `3` |
  | `TRUST_PROXY` | optional, default `1` |

  `DB_PATH` (`/data/decohero.db`) comes from the Dockerfile and `PORT` from Railway; don't set them.
- Attach Volume at **`/data`**. Healthcheck path `/health`. Replicas **1**.
- Generate Domain, then run the curl checks in `server/DEPLOY.md` "After the first deploy".

## 3. Mobile production env
Create `mobile/.env.production` (gitignored by `.env*`):
```
EXPO_PUBLIC_API_URL=https://<railway-domain>      # no trailing slash, https only
EXPO_PUBLIC_RC_ANDROID_KEY=goog_...                # RevenueCat > API keys > Google Play public key
```
A release bundle refuses to build if the URL isn't public https or the RevenueCat key isn't a `goog_` key.

## 4. Signed AAB (local Gradle)
Upload key: `~/.secrets/decohero-upload.jks`, passwords as `DECOHERO_UPLOAD_*` in `~/.gradle/gradle.properties`.
```bash
cd ~/DecoHero/mobile
npx expo prebuild --platform android --clean      # regenerates android/ with the signing plugin
cd android && ./gradlew bundleRelease              # ~35-40 min on this Mac
keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab | head -5
```
The `keytool` owner must be the upload key, not `CN=Android Debug`. If Gradle warns "release will be DEBUG-signed", stop: the properties weren't found.
First upload is `versionCode 1` / `1.0.0` (`mobile/app.json`). Bump `android.versionCode` for every later upload.

## 5. Play Console upload
- Create app (package `com.heroapps.decohero`, can't change later), enrol in Play App Signing.
- Testing > Internal testing > Create release > upload `app-release.aab`, add testers.
- Monetize > In-app products: one-time products `credits_15`, `credits_50`, `credits_150` (this needs an uploaded build). Add licence testers.
- Privacy policy URL: `https://hero-apps.com/decohero/privacy.html`. Data safety, content rating, AI-generated content declaration.

## 6. RevenueCat wiring
- Project > Android app `com.heroapps.decohero`, upload the Google service-account JSON (from `~/.secrets`, never the repo).
- Import the 3 products as **consumable**, put them in offering **`default`** (set as current).
- Integrations > Webhooks: URL `https://<railway-domain>/webhooks/revenuecat`, Authorization `Bearer <REVENUECAT_WEBHOOK_SECRET>`. "Send test event" must return 200.

## 7. Device test (licence tester account)
- Install from the internal testing link. New install shows 3 credits.
- A redesign works; the free design has the DecoHero mark.
- Buy `credits_15`: credits rise within ~20 s, the mark disappears on new designs. Server log shows `purchase ... granted=true`.
- About and privacy (home screen, bottom): privacy link opens, install ID shows and shares.
- Airplane mode: friendly network message, no crash. Spanish phone: all text in Spanish.
- Redeploy the server once and confirm credits are unchanged (volume works).
