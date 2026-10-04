# DecoHero for Android (React Native / Expo)

Photograph a room, pick up to 4 styles, swipe through photorealistic redesigns, hold to compare with the original, save or share. English and Spanish built in (follows the phone's language). Monetised with credit packs through Google Play Billing via RevenueCat.

```
server/   Node API: holds the Gemini key, prompts, credit ledger, purchase webhook
mobile/   Expo app: App.tsx + src/ (screens, i18n, purchases, photo handling)
PRIVACY_POLICY.md   Template you must publish at a public URL before launch
```

## Why there is a server
The original AI Studio app called Gemini with your API key. Anything inside an APK can be extracted, so a key in the app would be stolen and billed to you within days. The app only talks to `server/`, which owns the key, the style prompts (so nobody can use you as a free image generator), and the credit balances.

## 1. Run the server
```bash
cd server
cp .env.example .env          # add GEMINI_API_KEY, pick a REVENUECAT_WEBHOOK_SECRET
npm install
npm run dev                   # http://localhost:8080/health
```
**Deploy** somewhere with a persistent disk, because credits live in SQLite: Railway, Render or Fly.io with a volume mounted at `/data` (the Dockerfile already points the DB there). Cloud Run alone is NOT suitable without swapping SQLite for Firestore/Postgres — its disk is wiped on restart and users would lose paid credits.

Model: `gemini-2.5-flash-image` (what AI Studio apps used) is shut down as of 2 Oct 2026, so the server defaults to `gemini-3.1-flash-image`. To roughly halve image cost, set `IMAGE_MODEL=gemini-3.1-flash-lite-image` after checking quality on 20+ real room photos.

## 2. Create the Expo app and drop in the code
```bash
npx create-expo-app@latest decohero --template blank-typescript
cd decohero
npx expo install expo-image-picker expo-image-manipulator expo-media-library expo-sharing \
  expo-file-system expo-secure-store expo-crypto expo-localization expo-splash-screen \
  react-native-safe-area-context @expo-google-fonts/instrument-serif expo-font expo-dev-client
npx expo install react-native-purchases
```
Then copy `mobile/App.tsx`, `mobile/src/`, `mobile/eas.json` into the project, merge `mobile/app.json` into the generated one (keep its `assets` paths), and create `.env` from `mobile/.env.example`. Change `android.package` to your own reverse domain — it can never be changed after the first upload.

`expo install` picks versions matching your Expo SDK, which is why exact versions aren't pinned here. If `npx tsc --noEmit` flags a changed API after an SDK bump, the likely spots are `src/photo.ts` (image manipulator) and `src/files.ts`.

RevenueCat is a native module, so **Expo Go won't work**. Use a dev build:
```bash
npm i -g eas-cli && eas login
eas build --profile development --platform android   # install the APK on your phone
npx expo start --dev-client
```

## 3. Payments (Play Console + RevenueCat)
1. Play Console → your app → Monetize → In-app products: create **one-time (consumable)** products `credits_15`, `credits_50`, `credits_150`. Suggested prices: $2.99 / $7.99 / $19.99.
2. RevenueCat: create a project, add the Android app with your package name, upload the Google service-account JSON (their docs walk through it), import the 3 products, put them in an offering named `default`.
3. RevenueCat → Integrations → Webhooks: URL `https://YOUR-API/webhooks/revenuecat`, Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`.
4. Put the Google public SDK key in `EXPO_PUBLIC_RC_ANDROID_KEY`.
Product ids ↔ credit amounts are mapped in `server/src/index.ts` (`CREDIT_PACKS`). Add licence testers in Play Console so you can test purchases without being charged.

**Unit economics** at the defaults: a design costs you about $0.067 (3.1 Flash Image, 1K) or ~$0.034 (Lite). Google keeps 15% of your first $1M/year. The $2.99 pack nets ~$2.54 and costs ~$1.00 (or ~$0.51 on Lite) to fulfil — even if every credit is used.

## 4. Ship to Google Play
```bash
eas build --profile production --platform android    # produces an .aab
eas submit --profile production --platform android   # uploads as a draft
```
Before production you need: the privacy policy URL, the Data safety form (photos are uploaded for processing and not stored; device id used for credits; purchase history), content rating, the AI-generated content declaration (the Report button satisfies the in-app flagging requirement), and the photo-permission declaration if Play asks about `READ_MEDIA_IMAGES` (only used to save designs).

**New personal developer accounts must run a closed test with 12+ testers for 14 continuous days before production is unlocked.** Start this the same day you have a working build. An organisation account (needs a D-U-N-S number) skips it but verification can take longer.

## Free tier and abuse protection
New installs get `FREE_CREDITS` (3). One IP can only claim free credits for `MAX_NEW_INSTALLS_PER_IP_PER_DAY` installs, and the API is rate-limited. Free designs carry a small "DecoHero" mark (free advertising when shared); any purchase removes it. A determined abuser can still farm free credits — add Play Integrity checks if you see that in the `users` table.

## What I couldn't do from here
I couldn't open `src/` or `server.ts` in the original repo (GitHub blocked automated access), so this is a clean rebuild of the app described in `gallery.md` rather than a line-by-line port. If the web version has features beyond style redesigns (the `jspdf`/`jszip` dependencies suggest PDF or zip export), tell me and I'll add them. The code hasn't been compiled or run on a device yet — expect a small round of fixes on your first build.
