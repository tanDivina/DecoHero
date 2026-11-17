# Antigravity: finish DecoHero for Play internal testing

You are helping Dorien ship DecoHero (repo ~/DecoHero, branch `android-app`) to Google Play **internal testing** so it can be shown to a partner. Claude Code has done the code side: server hardening, release signing and an upload keystore at `~/.secrets/decohero-upload.jks` (the passwords are in `~/.gradle/gradle.properties`; never print, copy or commit them). Your part is the browser and console work below. Read `ANDROID.md`, `server/DEPLOY.md`, `store/listing.md`, `store/data-safety.md` and `RELEASE_CHECKLIST.md` (if present) first.

## Hard rules
- **Never write an API key, secret or service-account JSON into the repo, a chat message, or any file in ~/DecoHero.** Keys go straight from the provider's page into the Railway variables UI or into `mobile/.env` (gitignored, public RevenueCat SDK key only). Service-account JSON goes only to `~/.secrets/`.
- Background: in Oct 2026 the BizLens GCP project was suspended because an unrestricted key was abused for Gemini. So the Gemini key must be API-restricted and the project needs a budget alert.
- Don't publish anything to production. Internal testing track only.
- No em dashes in any store text you write.
- Stop and ask Dorien before paying for anything other than the Gemini usage itself, and before any step that needs her ID, payments profile or 2FA.

## Tasks, in this order

### 1. Gemini key in its own GCP project
1. Create a new GCP project `decohero-prod`. Do not reuse bizlens-app, hero-inbox or any other project.
2. Link billing. Add a budget of $30/month with email alerts at 50%, 90% and 100%.
3. Enable **Generative Language API** only.
4. Create an API key. Restrict it under API restrictions to **Generative Language API**. Name it `decohero-server`.
5. Don't save the key anywhere yet. You'll paste it into Railway in step 2.

### 2. Deploy the server on Railway
1. Dorien may need to run `! cd ~/DecoHero && railway login` once, or log in to railway.app in the browser.
2. Create a Railway project `decohero` with a service from the `server/` folder, using the Dockerfile. Either connect GitHub repo `tanDivina/DecoHero` (branch `android-app`, root `server`), which means pushing the branch first, or run `railway up` from `~/DecoHero/server`.
3. Add a **volume mounted at `/data`**. Credits live in SQLite, so without the volume, paid credits are lost on every redeploy.
4. Set the variables listed in `server/DEPLOY.md` / `RELEASE_CHECKLIST.md`. At minimum:
   - `GEMINI_API_KEY`: from step 1
   - `REVENUECAT_WEBHOOK_SECRET`: generate a long random string and keep it in the Railway UI (it's also needed in step 5)
   - `TRUST_PROXY=1`
   - `MAX_GENERATIONS_PER_DAY=300`
   - `MAX_FREE_GENERATIONS_PER_DAY=100`
   - Do NOT set `DB_PATH` (the Dockerfile sets it to `/data/decohero.db`) or `PORT` (Railway sets it).
   - Service settings: 1 replica, health check path `/health`.
5. Generate a public domain and confirm `https://<domain>/health` returns OK.
6. Write the **https URL** (not a secret) into `mobile/.env.production` (gitignored) as `EXPO_PUBLIC_API_URL=https://<railway-domain>`. Tell Dorien the URL so Claude Code can build the signed AAB.

### 3. Signed AAB (hand back to Claude Code)
Ask Dorien to tell Claude Code: "Railway URL is <url>, build the signed release AAB." Don't build it yourself unless Dorien asks. It takes about 37 minutes locally.

### 4. Play Console app
1. Create the app: name **DecoHero**, default language English (US), App, Free, contains in-app purchases. Package `com.heroapps.decohero`; this is fixed after the first upload.
2. Opt into **Play App Signing** and use the upload key from the AAB Claude Code builds.
3. Upload the AAB to **Internal testing**. Add testers: Dorien's account plus any emails she gives you (for example the partner at Christmas Trees in the Mail; ask her for the address). Add the same people as **licence testers** (Settings → License testing).
4. App content:
   - Privacy policy: `https://hero-apps.com/decohero/privacy.html`. Check that it loads first; if it's 404, Dorien needs to run `! cd ~/hero-apps && ./deploy.sh`.
   - Data safety: answer from `store/data-safety.md`.
   - Ads: none. Content rating questionnaire. Target audience: 18+ / not for children.
   - AI-generated content declaration: the in-app Report button covers flagging.
   - Photo/media permission declaration if asked.
5. Store listing from `store/listing.md` (EN and ES), icon `store/play-icon-512.png`, feature graphics `store/feature-graphic-en.png` / `-es.png`, screenshots from `store/screenshots/`.
6. Monetize → In-app products (one-time, consumable): `credits_15` $2.99, `credits_50` $7.99, `credits_150` $19.99. These ids must match exactly. Activate them.

### 5. RevenueCat
1. New project **DecoHero**, add the Google Play app `com.heroapps.decohero`.
2. Service account: in GCP project `decohero-prod` create a service account for RevenueCat and invite it in Play Console → Users and permissions with financial + order permissions, following RevenueCat's current Google Play guide. Save its JSON only to `~/.secrets/decohero-revenuecat-sa.json`, then upload it to RevenueCat.
3. Import the 3 products and create an offering named **`default`** containing them.
4. Integrations → Webhooks: URL `https://<railway-domain>/webhooks/revenuecat`, Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`, using the same value as in Railway.
5. Put the **public Google SDK key** (starts with `goog_`) into `mobile/.env.production` as `EXPO_PUBLIC_RC_ANDROID_KEY`. The release build refuses to build without it. Ideally do this step before the AAB build. Note: Play only lets you create in-app products after a build is uploaded, so the order may be: RevenueCat app + SDK key first, then the AAB, then the products + offering.
6. After a test purchase, refund it from Play Console and confirm the RevenueCat CANCELLATION webhook removes the credits. This hasn't been verified yet.

### 6. Device test (with Dorien)
Install from the internal testing link and check each of these:
- A fresh install gets the free credits.
- Take a room photo, pick styles, and get redesigns.
- Save and share work.
- Buy `credits_15` with a licence tester card. Credits should arrive and the RevenueCat webhook should show a 200.
- Spanish UI works when the phone is set to Spanish.

## Report back to Dorien
A short list of what's done with links: GCP project id, Railway URL, Play Console app link, RevenueCat project. Also list anything blocked and why. Don't include any keys.
