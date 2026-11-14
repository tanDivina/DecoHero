# DecoHero: Play Console data safety + app content (draft)

Drafted Nov 12 2026 from what the code in `mobile/` and `server/src/` actually does. Re-checked against
`server/src/db.ts`, `index.ts` and `gemini.ts` the same day when the privacy policy was written; the policy
(`PRIVACY_POLICY.md`, published at `https://hero-apps.com/decohero/privacy.html`) and this form must agree.
If the server changes what it stores, update both.

## What the app sends off the phone

| What | Where it goes | Code |
|---|---|---|
| Room photo (downscaled JPEG, max 1280 px, base64) | DecoHero server, then the Gemini API | `mobile/src/photo.ts`, `mobile/src/api.ts` (`/api/redesign`) |
| Anonymous install ID (random UUID kept in SecureStore) | DecoHero server; RevenueCat as the app user ID | `mobile/src/identity.ts`, `mobile/src/purchases.ts` |
| Chosen style IDs, report flags (style ID + fixed reason `user_flag`, no image) | DecoHero server | `api.redesign`, `api.report` |
| Purchases (product, transaction) | Google Play Billing, RevenueCat, then RevenueCat webhook to the server | `react-native-purchases`, `server/src/index.ts` |
| IP address | DecoHero server (rate limiting, free-credit abuse limit) | `server/src/app.ts` `clientIp`, `server/src/db.ts` `users.ip` |

Server tables (`server/src/db.ts`), kept indefinitely except `users.ip` (blanked at 48 h, see below):
- `users`: install id, credits, paid flag, free_denied flag, **ip** (first IP seen, IPv6 cut to /64; NULL if the row was created
  by the RevenueCat webhook), created_at. `users.ip` is set to NULL once the row is 48 h old
  (`purgeOldIps`, run at startup and hourly, commit 33235db)
- `purchases`: RevenueCat event id, store transaction id, install id, product id, credits, created_at,
  refunded_at (a RevenueCat CANCELLATION refund removes that pack's credits, never below 0)
- `generations`: install id, style id, ok, created_at
- `reports`: install id, style id, reason (always `user_flag` from the app), created_at
- `daily_usage`: day, total, free (no personal data)

Also: express-rate-limit keeps IP / install id in memory for 1 to 10 minute windows (not on disk). Console
logs (kept by the host) contain the install id + product on each purchase, the product on each refund, and
style id on failures.
Photos and generated designs are handled in memory only: not written to the database, disk or logs.

No ads SDK, no analytics SDK, no crash reporter, no location, no contacts, no account/sign-in.
`AD_ID` is explicitly blocked in `app.json`.

## Data safety form answers

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes (the release build refuses any
non-https API URL; RevenueCat and Play Billing use TLS).

**Do you provide a way for users to request that their data is deleted?** Yes: by email with the install ID
from the in-app About and privacy screen (see the privacy policy). There are no accounts, so the "delete account" URL requirement does not apply.

### Data types

| Play category > type | Collected | Shared | Ephemeral | Required / optional | Purposes |
|---|---|---|---|---|---|
| Photos and videos > Photos | Yes | No (Gemini is a service provider acting for us, see note 1) | Yes | Required to use the core feature (user chooses each photo) | App functionality |
| Financial info > Purchase history | Yes | No | No | Optional (only if the user buys credits) | App functionality |
| App activity > App interactions (which styles were generated; reports flagging a design) | Yes | No | No | Required (styles) / optional (reports) | App functionality, fraud prevention |
| Device or other IDs (anonymous install ID) | Yes | No | No | Required | App functionality, fraud prevention |

Notes:
1. **Gemini terms.** "Not shared" and "not used to train AI" are only true if the server's Gemini key is on a
   **paid (billing-enabled) tier**. On the free tier Google may use prompts and images to improve its
   products. The published privacy policy now states "We use Google's paid Gemini API", so billing MUST be
   enabled on the Gemini project before the app goes live.
2. **IP address.** The server keeps the first IP in `users.ip` only until the install is 48 h old (used to cap
   free installs per IP per day; only the last 24 h are ever queried), then blanks it. Play does not list IP
   address as its own data type and we do not derive location from it, so nothing extra to declare. The
   privacy policy (sections 2 and 7) states the 48 h erase.
3. **RevenueCat.** Check RevenueCat's current "Google Play data safety" doc when filling this in; they list
   Purchase history and an app user ID. Our app user ID is the anonymous install ID above, so no extra types.
4. Generated designs: returned to the phone and written only to the app cache; saved to the gallery only when
   the user taps Save. Not collected beyond the request.

## App content section

| Item | Answer |
|---|---|
| Privacy policy | `https://hero-apps.com/decohero/privacy.html` (EN + ES on one page). Final text written Nov 12 2026 and staged at `~/hero-apps/decohero/privacy.html`; goes live with the next `./deploy.sh` in `~/hero-apps` (check it returns 200 before entering it in Play). `PRIVACY_POLICY.md` holds the same English text. Operator: Divina Endeavors LLC, contact support@hero-apps.com. Deletion is by email with the install ID shown (copy/share) on the in-app About and privacy screen (link at the bottom of Home); Play order number or first-use date as fallback. |
| Ads | No ads. |
| App access | All functionality available without login. Note for reviewers: new installs get 1 free credit; no special access needed. |
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
