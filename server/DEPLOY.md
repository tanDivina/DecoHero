# Deploying the DecoHero API

The API is one small Node container. Credits live in a SQLite file, so it needs a **persistent volume at `/data`** and must run as **exactly one instance** (rate limits and the SQLite file are per instance). Never put any of the values below in the repo or the mobile app.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini key. Server refuses to start without it. |
| `REVENUECAT_WEBHOOK_SECRET` | yes | Long random string; same value goes in RevenueCat's webhook Authorization header. Without it every purchase webhook gets 401. |
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
| `TREE_SHOP_URL` | no | Link behind the app's "Buy a real tree" button in Christmas mode (first button of "Shop this look"). Unset: `https://christmastreesinthemail.com`. Put the affiliate link here once you have it (must be `https://` and not an Amazon address; anything else is ignored with a warning in the logs). `off` hides the button. |
| `SHOP_LINKS` | no | Decor links under Christmas results in app 1.0.4+ ("Shop this look"), as one line of JSON: theme id to a list of links. See "Shop this look links" below. Unset or empty: no decor links. Takes effect on the next app start, no app release needed. |
| `AMAZON_APP_APPROVED` | no | Leave unset until Amazon Associates has approved DecoHero as a mobile app. Only the exact value `true` lets links of kind `amazon` out of the server; with anything else they are removed from `/api/config`. |
| `CHRISTMAS_MODE` | no | `off` hides the Rooms / Christmas switch in the app (after the season). Christmas style ids keep working on the server. |
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

## Shop this look links

`SHOP_LINKS` maps a Christmas theme id (`xmas-classic`, `xmas-winter`, `xmas-nordic`, `xmas-coquette`, `xmas-tartan`, `xmas-tropical`) to at most 4 links. Each link has `label_en`, `label_es` (optional, English is used if missing), `url` and `kind` (`"partner"` or `"amazon"`). The label is the button text, at most 40 characters.

Example with made-up addresses (paste it as a single line):

```json
{"xmas-classic":[{"label_en":"Red velvet tree skirt","label_es":"Pie de árbol de terciopelo rojo","url":"https://shop.example.com/red-velvet-skirt?ref=EXAMPLE","kind":"partner"},{"label_en":"Glass ornaments on Amazon","label_es":"Esferas de vidrio en Amazon","url":"https://www.amazon.com/dp/EXAMPLE00?tag=example-20","kind":"amazon"}],"xmas-nordic":[{"label_en":"Wooden ornaments","label_es":"Adornos de madera","url":"https://decor.example.org/wood-ornaments","kind":"partner"}]}
```

Rules the server enforces. A link that breaks one is skipped and named in the logs (`SHOP_LINKS: "xmas-classic" link 2 ignored (...)`); the other links keep working and the server never fails to start over this variable.

- `https://` only, no login in the address, at most 600 characters.
- Known theme ids only; anything else is ignored.
- At most 4 links per theme (extra ones are ignored); labels longer than 40 characters are cut.
- `kind: "amazon"` must point to an Amazon store (`amazon.com`, `amazon.com.mx`, `amazon.es`, ...) or `amzn.to`.
- `kind: "partner"` may not point to Amazon (`amazon.*`, `amzn.*`, `a.co`) and may not have "Amazon" in its label. This check reads the address as written: do not put an Amazon link behind another shortener or redirect.

**Amazon links stay off until Amazon approves the app.** Amazon Associates only allows its links inside an "Approved Mobile Application": the app must be live in a public app store, approved by Amazon, and use its own tracking ID. Until then keep `AMAZON_APP_APPROVED` unset: links of kind `amazon` can already sit in `SHOP_LINKS`, but they are filtered out on the server and never reach the app. After approval, put the app's own tracking ID in the Amazon links and set `AMAZON_APP_APPROVED=true`. The links are free to reach: in Christmas mode the Home screen has a "Shop the styles" entry that lists every theme's links without a photo, a design or credits (Amazon requires that its links are accessible without paying), and each Christmas result repeats its own theme's links. The app opens every shop link in the phone's browser or the store's app (never inside DecoHero) and shows "As an Amazon Associate we earn from qualifying purchases." whenever an Amazon link is on screen.

Check what the app will get: `curl https://API/api/config`.

## Railway (preferred)

1. railway.com > New Project > Deploy from GitHub repo > pick the DecoHero repo. (Or, from `server/`, run `railway init` then `railway up`; `.env` and `data/` are excluded via `.gitignore`/`.dockerignore`.)
2. Service > Settings > **Root Directory: `server`**. Railway finds the `Dockerfile` and builds it.
3. Service > Variables: add `GEMINI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, and `MAX_GENERATIONS_PER_DAY` / `MAX_FREE_GENERATIONS_PER_DAY` if you want values other than the defaults.
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

- `npm test`: end-to-end checks (webhook purchase, duplicate, suffixed product id, refund; new-install cap and `freeDenied`; reports; disconnect refund; rate limits; shop links and the Amazon gate) against a temp SQLite file with a fake Gemini. No network, no keys.
- `npm run watermark-sample [input.jpg] [output.jpg]`: renders the free-design watermark and prints the output path. To check the production font, run it inside the built image, e.g. `docker build -t decohero-api . && docker run --rm -v "$PWD/scripts:/app/scripts" -v "$PWD/src:/app/src" -v /tmp:/out decohero-api npx --yes tsx scripts/watermark-sample.ts "" /out/wm.jpg`.

## API notes

- The app sends its install id in the `X-Install-Id` header. Version 1.0.0 of the app sends `?installId=` (GET `/api/me`) or `installId` in the JSON body instead; both still work. Ids must be UUIDs and are stored lowercase.
- `GET /api/me` returns `{ credits, paid, freeDenied }`.
- `GET /api/config` (app 1.0.3+, no install id needed) returns `{ christmas, treeShopUrl, shopLinks }`. The app reads it at start; an empty `treeShopUrl` hides the tree button. `shopLinks` (read by app 1.0.4+, ignored by 1.0.3) is `{ [themeId]: [{ en, es, url, kind }] }`, `{}` when there are none; themes without links are left out.
- `POST /api/redesign` takes the 12 interior style ids and, from app 1.0.3, six Christmas ids (`xmas-classic`, `xmas-winter`, `xmas-nordic`, `xmas-coquette`, `xmas-tartan`, `xmas-tropical`) that add one tree and keep the room. Christmas requests may carry `ceilingCm` (180 to 620) and `treeCm` (120 to 370, below the ceiling) as numbers; a present but invalid value answers 400 `BAD_SIZE` before any credit is spent. Interior styles ignore both fields. Deploy the server before releasing app 1.0.3, or Christmas styles answer `BAD_STYLE`.
- `/api/redesign` refunds the credit if the phone disconnects before the response is fully written, and gives the daily slot back if the model returned no image. Both count toward `MAX_FAILURES_PER_INSTALL_PER_DAY`.
- Webhook purchases that cannot be credited (unknown product id, no install id) answer 500 so RevenueCat retries them; look for `NOT CREDITED` in the logs. Product ids are matched on the part before `:`.

## Known limits

- Install ids are generated by the app, so a determined abuser on many IPs can still farm free credits. The free daily cap bounds the cost; Play Integrity checks are the real fix if the `users` table shows it.
- Refunds: a RevenueCat `CANCELLATION` for a credit pack removes that pack's credits (never below 0), once per store transaction, and an install whose purchases are all refunded counts as unpaid again (watermark, free limits). Credits already spent before the refund are not clawed back.
- Retention: `users.ip` is blanked once an install is 48 hours old (at startup and hourly). The free-credit check only needs the last 24 hours.
- Purchases are credited only to an install id (the app logs in to RevenueCat with it). An event without one is logged as `NOT CREDITED`, answered with 500 (RevenueCat retries a few times) and needs a manual fix if it never resolves.
- Request logs: Railway's HTTP logs record each request's path, so `/api/me?installId=...` calls from app version 1.0.0 put the install id next to the client IP there. Newer app versions send it in a header, which is not logged.
- Sandbox purchases (licence testers) grant real credits on this server. Fine for internal testing.
