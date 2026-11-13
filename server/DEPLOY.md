# Deploying the DecoHero API

The API is one small Node container. Credits live in a SQLite file, so it needs a **persistent volume at `/data`** and must run as **exactly one instance** (rate limits and the SQLite file are per instance). Never put any of the values below in the repo or the mobile app.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini key. Server refuses to start without it. |
| `REVENUECAT_WEBHOOK_SECRET` | yes | Long random string; same value goes in RevenueCat's webhook Authorization header. Without it every purchase webhook gets 401. |
| `FIREBASE_PROJECT_ID` | for the web app | Project ID of the Firebase project the web app signs in with (Firebase console > Project settings). Public value, not a secret. Without it web requests get 503 `WEB_DISABLED`; Android is not affected. **No service-account key is needed and none may be added**: tokens are checked against Google's public certificates. |
| `WEB_ORIGINS` | no | Browser origins allowed to call `/api`, comma-separated, default `https://deco.hero-apps.com`. Origin only: no path, no trailing slash. |
| `TOMBSTONE_SALT` | no | Secret salt for the hash of a deleted web account's Firebase uid (kept 2 hours). Without it the salt is derived from `FIREBASE_PROJECT_ID`, which is public, so set it: `openssl rand -hex 24`. Changing it only means deletes from the last 2 hours are no longer recognised. |
| `IMAGE_MODEL` | no | Default `gemini-3.1-flash-image`. `gemini-3.1-flash-lite-image` is about half the cost (check quality first). |
| `MAX_GENERATIONS_PER_DAY` | no | Hard global cap per UTC day, default `300` (~$20/day). Once hit, generation returns 503 `DAILY_LIMIT` until 00:00 UTC. `0` switches generation off (kill switch). |
| `MAX_FREE_GENERATIONS_PER_DAY` | no | Cap for unpaid users, default `100`. Returns 503 `FREE_DAILY_LIMIT`. Paying users keep working. |
| `FREE_CREDITS` | no | Credits for a new install, default `3`. |
| `MAX_NEW_INSTALLS_PER_IP_PER_DAY` | no | Installs per IP (per 24 h) that get free credits, default `15` (shared Wi-Fi and carrier NAT put many phones behind one IP). Installs past the limit start at 0 and `/api/me` returns `freeDenied: true`. |
| `MAX_FAILURES_PER_INSTALL_PER_DAY` | no | Failed or undelivered designs per install per UTC day, default `10`. After that `/api/redesign` returns 429 `TOO_MANY_FAILURES`. |
| `API_LIMIT_PER_IP_PER_MIN` | no | Requests per IP per minute on `/api/*`, default `120`. |
| `REDESIGN_LIMIT_PER_IP_PER_10MIN` | no | Redesigns per IP per 10 minutes, default `60`. |
| `REDESIGN_LIMIT_PER_INSTALL_PER_10MIN` | no | Redesigns per unpaid install per 10 minutes, default `12`. |
| `REDESIGN_LIMIT_PER_PAID_INSTALL_PER_10MIN` | no | Redesigns per paying install per 10 minutes, default `40`. Over any limit: 429 `RATE_LIMITED` with `retryAfterSec` and a `Retry-After` header. |
| `TRUST_PROXY` | no | Proxy hops in front of the app, default `1` (right for Railway and Render). |
| `DB_PATH` | no | Already `/data/decohero.db` in the Dockerfile. Don't change it. |
| `PORT` | no | Set by the platform automatically. |

Generate the webhook secret locally: `openssl rand -hex 24`.

## Before you deploy: lock down the Gemini key

The key is the thing that got the other GCP project suspended, so:

1. Create the key in a **separate GCP project just for DecoHero** (AI Studio > Get API key > Create in new project).
2. Google Cloud Console > APIs & Services > Credentials > the key > **API restrictions: Generative Language API only**. No application restriction is needed (it only lives on the server), but if you're on Railway Pro with a static outbound IP you can add that IP.
3. Billing > Budgets & alerts: a budget for that project with email alerts at 50/90/100%.
4. Optional extra fuse: IAM & Admin > Quotas > Generative Language API, lower the requests-per-day quota for the image model to roughly `MAX_GENERATIONS_PER_DAY`.

## Railway (preferred)

1. railway.com > New Project > Deploy from GitHub repo > pick the DecoHero repo. (Or, from `server/`, run `railway init` then `railway up`; `.env` and `data/` are excluded via `.gitignore`/`.dockerignore`.)
2. Service > Settings > **Root Directory: `server`**. Railway finds the `Dockerfile` and builds it.
3. Service > Variables: add `GEMINI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `FIREBASE_PROJECT_ID` (for the web app; `WEB_ORIGINS` only if the web app is not on `https://deco.hero-apps.com`), and `MAX_GENERATIONS_PER_DAY` / `MAX_FREE_GENERATIONS_PER_DAY` if you want values other than the defaults.
4. Right-click the service on the canvas > **Attach Volume**, mount path **`/data`**.
5. Settings > Deploy > **Healthcheck Path: `/health`**. Keep Replicas at **1**.
6. Settings > Networking > **Generate Domain**. That `https://...up.railway.app` URL is the API URL.

## Render (alternative)

1. render.com > New > Web Service > connect the repo.
2. **Root Directory: `server`**, Language/Runtime: **Docker**.
3. Instance type: **Starter or higher** (the free tier has no persistent disk and sleeps).
4. Advanced > **Add Disk**: mount path **`/data`**, 1 GB is plenty.
5. Advanced > **Health Check Path: `/health`**.
6. Environment: same variables as above.
7. Keep it at 1 instance. With a disk attached, Render deploys stop the old instance before starting the new one, so expect a few seconds of downtime per deploy.

## After the first deploy

Replace `API` with the real URL.

```bash
curl https://API/health                               # {"ok":true,"model":"gemini-3.1-flash-image"}
curl -i -X POST https://API/webhooks/revenuecat       # 401
curl -i https://API/.env                              # 404 JSON, nothing leaked
curl -i -X OPTIONS https://API/api/redesign -H 'Origin: https://example.com' -H 'Access-Control-Request-Method: POST'
                                                      # no Access-Control-* headers
curl -i -X OPTIONS https://API/api/redesign -H 'Origin: https://deco.hero-apps.com' -H 'Access-Control-Request-Method: POST'
                                                      # 204 with Access-Control-Allow-Origin: https://deco.hero-apps.com
curl -i https://API/api/me -H 'Origin: https://deco.hero-apps.com'
                                                      # 401 {"error":"AUTH_REQUIRED"}
curl -i https://API/api/me -H 'Authorization: Bearer x'
                                                      # 401 {"error":"AUTH_INVALID"} (503 WEB_DISABLED = FIREBASE_PROJECT_ID missing)
curl -i -X OPTIONS https://API/webhooks/revenuecat -H 'Origin: https://deco.hero-apps.com' -H 'Access-Control-Request-Method: POST'
                                                      # no Access-Control-* headers
```

Then:

1. Put the URL in the mobile app's `EXPO_PUBLIC_API_URL` (must be `https://`) and do one real redesign from the phone. If it fails with a model error in the logs, set `IMAGE_MODEL=gemini-3.1-flash-image-preview`.
2. RevenueCat > Integrations > Webhooks: URL `https://API/webhooks/revenuecat`, Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`. Use "Send test event": it should show 200.
3. Check per-IP limits see real client IPs, not the proxy's. After two people on different networks have opened the app, open a shell on the service (Railway: `railway ssh`; Render: Shell tab) and run:
   ```bash
   node -e "const D=require('better-sqlite3');console.log(new D('/data/decohero.db').prepare('select ip,count(*) n from users group by ip').all())"
   ```
   Different IPs = good. If everyone shows the same private IP (10.x / 100.64.x), raise `TRUST_PROXY` to `2`.
4. Redeploy once and confirm `/api/me` still shows the same credits (proves the volume works).

## Rotating keys

**Gemini key** (do this immediately if you ever suspect a leak):
1. AI Studio / Cloud Console: create a new key in the DecoHero project with the same API restriction.
2. Update `GEMINI_API_KEY` in Railway/Render. Both redeploy automatically on variable change.
3. Do one redesign from the phone, then **delete the old key** in Cloud Console.
4. Emergency stop without rotating: set `MAX_GENERATIONS_PER_DAY=0`.

**RevenueCat webhook secret**: generate a new one, update `REVENUECAT_WEBHOOK_SECRET` on the server, then paste the new value into RevenueCat's Authorization header. Webhooks that hit the gap get 401 and RevenueCat retries them, so no purchase is lost.

## Local checks

- `npm test`: end-to-end checks (webhook purchase, duplicate, suffixed product id, refund; new-install cap and `freeDenied`; reports; disconnect refund; rate limits; web sign-in, CORS, account delete and its abuse cases) against a temp SQLite file with a fake Gemini and a fake token check. No network, no keys.
- `npm run watermark-sample [input.jpg] [output.jpg]`: renders the free-design watermark and prints the output path. To check the production font, run it inside the built image, e.g. `docker build -t decohero-api . && docker run --rm -v "$PWD/scripts:/app/scripts" -v "$PWD/src:/app/src" -v /tmp:/out decohero-api npx --yes tsx scripts/watermark-sample.ts "" /out/wm.jpg`.

## API notes

- The app sends its install id in the `X-Install-Id` header. Version 1.0.0 of the app sends `?installId=` (GET `/api/me`) or `installId` in the JSON body instead; both still work. Ids must be UUIDs and are stored lowercase.
- `GET /api/me` returns `{ userId, credits, paid, freeDenied }`. `userId` is the install id on Android and the account's random user id on web.

### Web app

- The web app (Expo web build on `https://deco.hero-apps.com/app`) signs in with Google through Firebase Auth and sends `Authorization: Bearer <Firebase ID token>` on every `/api` call. Any install id on such a request is ignored.
- Only Google sign-ins are accepted (`firebase.sign_in_provider` must be `google.com`), whatever else is switched on in the Firebase project.
- `GET /api/me` is the only call that creates an account: the first time a Firebase uid is seen it gets a random user id (table `web_accounts`: Firebase uid, user id, created date; no email or name), the same free credits as an install, and it counts toward the same per-IP new-user limit. Every other `/api` call from a uid without an account answers 401 `ACCOUNT_NOT_FOUND`, so the web app calls `/api/me` first. Rate limits and credits key on that user id.
- The web app logs in to RevenueCat (Web Billing) with the `userId` from `/api/me`, so the same webhook credits it. Nothing web-specific is configured on the webhook.
- A web account's `userId` is not an install id: a request that sends it as `X-Install-Id` (or `installId`) without a token gets 401 `AUTH_REQUIRED`.
- Errors: 401 `AUTH_INVALID` (bad or expired token, not a Google sign-in, or a sign-in older than the account's delete: sign in again), 401 `AUTH_REQUIRED` (request from a web origin without a token), 401 `ACCOUNT_NOT_FOUND` (valid token, no account yet: call `GET /api/me`), 503 `WEB_DISABLED` (`FIREBASE_PROJECT_ID` not set), 503 `AUTH_UNAVAILABLE` (Google's signing keys could not be fetched: retry, do not sign the user out).
- CORS headers are sent only on `/api`, only to the origins in `WEB_ORIGINS`. Preflights are answered with 204 before the rate limiters. Outside production (`NODE_ENV` other than `production`; the Dockerfile sets `production`) the Expo dev origins `http://localhost:8081` and `http://localhost:19006` are allowed as well.
- `POST /api/account/delete` (Bearer only) deletes the signed-in web account: the `web_accounts` row, the user row (credits, paid flag, IP), its generation log and its reports. Unused credits are lost. What stays:
  - purchase rows, for accounting and so a retried webhook or a refund cannot credit twice, with their user id replaced by `deleted`;
  - the bare random user id in `deleted_users`, so a purchase webhook that arrives later credits nobody (logged as `NOT CREDITED (account deleted)`, answered 200; refund it in RevenueCat if the buyer asks) and the id cannot be reused;
  - for 2 hours, a salted SHA-256 hash of the Firebase uid in `web_tombstones`. While it is there, tokens from a sign-in made before the delete get 401 `AUTH_INVALID`, so a token that was still valid cannot re-create the account. A new sign-in after the delete works at once and starts a new account;
  - for up to 48 hours from when the account was created, the IP it was created from in `free_grants` (IP and time only, no id), so deleting does not hand the free credits back.
- It does not delete the Firebase Auth user or the RevenueCat/Stripe customer; the web app deletes the Firebase user itself, and RevenueCat/Stripe records are removed from their dashboards on request.
- The server refuses to start in production when `FIREBASE_AUTH_EMULATOR_HOST` is set (it would switch off token signature checks).
- `/api/redesign` refunds the credit if the phone disconnects before the response is fully written, and gives the daily slot back if the model returned no image. Both count toward `MAX_FAILURES_PER_INSTALL_PER_DAY`.
- Webhook purchases that cannot be credited (unknown product id, no install id) answer 500 so RevenueCat retries them; look for `NOT CREDITED` in the logs. Product ids are matched on the part before `:`.

## Known limits

- Install ids are generated by the app, so a determined abuser on many IPs can still farm free credits. The free daily cap bounds the cost; Play Integrity checks are the real fix if the `users` table shows it.
- Refunds: a RevenueCat `CANCELLATION` for a credit pack removes that pack's credits (never below 0), once per store transaction, and an install whose purchases are all refunded counts as unpaid again (watermark, free limits). Credits already spent before the refund are not clawed back.
- Retention: `users.ip` is blanked once an install is 48 hours old, and `free_grants` rows (IP and time of each new user) are dropped at the same age (at startup and hourly). The free-credit check only needs the last 24 hours. The uid hashes of deleted web accounts are dropped after 2 hours (checked hourly).
- Purchases are credited only to an install id (the app logs in to RevenueCat with it). An event without one is logged as `NOT CREDITED`, answered with 500 (RevenueCat retries a few times) and needs a manual fix if it never resolves.
- Request logs: Railway's HTTP logs record each request's path, so `/api/me?installId=...` calls from app version 1.0.0 put the install id next to the client IP there. Newer app versions send it in a header, which is not logged.
- Web sign-in accepts Google accounts only. Still keep the other sign-in methods off in the Firebase project (Firebase console > Authentication > Sign-in method).
- A deleted web account that signs in again is a new user, like a reinstall on Android: it gets free credits only while its IP is under `MAX_NEW_INSTALLS_PER_IP_PER_DAY`. New users are counted per IP in `free_grants`, which a delete does not touch, so a delete and sign-in loop from one IP stops getting credits at the limit. Someone who changes IP for every new account can still collect free credits; the free daily cap bounds the cost.
- Sandbox purchases (licence testers) grant real credits on this server. Fine for internal testing.
