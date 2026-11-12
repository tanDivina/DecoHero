# DecoHero: Play Console data safety + app content (draft)

Drafted Nov 12 2026 from what the code in `mobile/` and `server/src/` actually does. Re-check against the
server before submitting: another pass on `server/` was in progress when this was written.

## What the app sends off the phone

| What | Where it goes | Code |
|---|---|---|
| Room photo (downscaled JPEG, max 1280 px, base64) | DecoHero server, then the Gemini API | `mobile/src/photo.ts`, `mobile/src/api.ts` (`/api/redesign`) |
| Anonymous install ID (random UUID kept in SecureStore) | DecoHero server; RevenueCat as the app user ID | `mobile/src/identity.ts`, `mobile/src/purchases.ts` |
| Chosen style IDs, report flags | DecoHero server | `api.redesign`, `api.report` |
| Purchases (product, transaction) | Google Play Billing, RevenueCat, then RevenueCat webhook to the server | `react-native-purchases`, `server/src/index.ts` |
| IP address | DecoHero server (rate limiting, free-credit abuse limit) | `server/src/index.ts` `clientIp`, `server/src/db.ts` `users.ip` |

Server tables (`server/src/db.ts`): `users` (install id, credits, paid flag, **ip**, created_at), `purchases`,
`generations` (user, style, ok, time), `reports`, `daily_usage`. Photos and generated designs are not written
to the database or disk.

No ads SDK, no analytics SDK, no crash reporter, no location, no contacts, no account/sign-in.
`AD_ID` is explicitly blocked in `app.json`.

## Data safety form answers

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes (the release build refuses any
non-https API URL; RevenueCat and Play Billing use TLS).

**Do you provide a way for users to request that their data is deleted?** Yes: by email (see the privacy
policy). There are no accounts, so the "delete account" URL requirement does not apply.

### Data types

| Play category > type | Collected | Shared | Ephemeral | Required / optional | Purposes |
|---|---|---|---|---|---|
| Photos and videos > Photos | Yes | No (Gemini is a service provider acting for us, see note 1) | Yes | Required to use the core feature (user chooses each photo) | App functionality |
| Financial info > Purchase history | Yes | No | No | Optional (only if the user buys credits) | App functionality |
| App activity > Other user-generated content (reports on a design) | Yes | No | No | Optional | App functionality (content moderation) |
| App activity > App interactions (which styles were generated) | Yes | No | No | Required | App functionality, fraud prevention |
| Device or other IDs (anonymous install ID) | Yes | No | No | Required | App functionality, fraud prevention |

Notes:
1. **Gemini terms.** "Not shared" and "not used to train AI" are only true if the server's Gemini key is on a
   **paid (billing-enabled) tier**. On the free tier Google may use prompts and images to improve its
   products, which would make the privacy policy line "we don't use your photos to train AI models" untrue.
   Confirm billing is enabled on the Gemini project before submitting.
2. **IP address.** The server keeps the IP in `users.ip` for as long as the user row exists (used to cap free
   installs per IP per day). Play does not list IP address as its own data type, but the privacy policy
   currently says it is used "temporarily". Either purge `users.ip` after ~24 h on the server, or change the
   policy wording to say it is stored with the install record.
3. **RevenueCat.** Check RevenueCat's current "Google Play data safety" doc when filling this in; they list
   Purchase history and an app user ID. Our app user ID is the anonymous install ID above, so no extra types.
4. Generated designs: returned to the phone and written only to the app cache; saved to the gallery only when
   the user taps Save. Not collected beyond the request.

## App content section

| Item | Answer |
|---|---|
| Privacy policy | Public URL required. `PRIVACY_POLICY.md` is a template with `[DATE]`, `[YOUR NAME / COMPANY]`, `[EMAIL]` placeholders and is **not published yet** (no hero-apps.com page found: `hero-apps.com/decohero/privacy.html` returns 404). Suggested: fill it in and publish at `https://hero-apps.com/decohero/privacy.html`, same pattern as `hero-apps.com/plantmapper/privacy.html`. Operator: Divina Endeavors LLC. |
| Ads | No ads. |
| App access | All functionality available without login. Note for reviewers: new installs get 3 free credits; no special access needed. |
| Content rating (IARC) | Category: Utility / productivity style app (House & Home). No violence, sexual content, drugs, gambling, or profanity. Users do not interact or communicate with each other. Shares content only via the Android share sheet. Contains digital purchases: Yes. Generative AI content: Yes, with an in-app Report button on every design. |
| Target audience | 18 and over (keeps it out of the Families policy; the privacy policy says it is not directed at children under 13). Not designed to appeal to children. |
| News app | No. |
| Government app | No. |
| Financial features | None (in-app purchases of consumable credits only). |
| Health | None. |
| Data safety | As above. |
| AI-generated content | Yes. Users can flag any design in-app (Report button, `ResultsScreen.tsx`, sends `/api/report`). Style prompts are fixed server-side; users can't enter free text prompts. |
| Photo and video permissions | The app no longer declares `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (blocked in `app.json`). Picking uses the system photo picker; saving uses MediaStore, which needs no permission on Android 10+ (`WRITE_EXTERNAL_STORAGE` only up to API 32). So no Photo and Video permissions declaration should be needed. If Play still asks, check the merged manifest of the uploaded AAB. |
| Foreground service / exact alarms / other sensitive permissions | None. |

## Permissions in the release manifest (merged manifest of the Nov 12 2026 release build)

`CAMERA` (take a room photo), `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `com.android.vending.BILLING`
(RevenueCat / Play Billing), `USE_BIOMETRIC` + `USE_FINGERPRINT` (pulled in by a library, most likely
expo-secure-store; never prompted, no Play declaration needed), `READ_EXTERNAL_STORAGE` and
`WRITE_EXTERNAL_STORAGE` with `maxSdkVersion=32` (photo picker / save on old Android).
Removed via `blockedPermissions`: `RECORD_AUDIO`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`,
`READ_MEDIA_VISUAL_USER_SELECTED`, `ACCESS_MEDIA_LOCATION`, `SYSTEM_ALERT_WINDOW`, `AD_ID`.
minSdk 24, targetSdk 36.
