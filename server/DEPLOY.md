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
| `TREE_SHOP_URL` | no | The partner store link with the affiliate parameter, e.g. `https://christmastreesinthemail.com/?sca_ref=YOUR_REF`. Unset: `https://christmastreesinthemail.com` (no commission). Must be `https://` and not an Amazon address; anything else is ignored with a warning in the logs. Its query string is copied onto every product link of the tree catalogue, so this is the only place the affiliate reference lives (never in the app or the repo). `off` hides the tree buttons, product names and prices. |
| `TREE_CATALOG` | no | Replaces the built-in list of the partner's trees (names, sizes, prices, product pages) as one line of JSON. See "Tree catalogue" below. Unset: the list in `src/treeCatalog.ts` (store prices of Nov 13 2026). Takes effect on the next app start. |
| `SHOP_LINKS` | no | Decor links under Christmas results in app 1.0.4+ ("Shop this look"), as one line of JSON: theme id to a list of links. See "Shop this look links" below. Unset or empty: no decor links. Takes effect on the next app start, no app release needed. |
| `AMAZON_APP_APPROVED` | no | Leave unset until Amazon Associates has approved DecoHero as a mobile app. Only the exact value `true` lets links of kind `amazon` out of the server; with anything else they are removed from `/api/config`. |
| `PLACE_CHECK` | no | `on` (or `1`, `true`, `yes`) switches on the place check for Christmas designs with a tapped spot (including "Move tree"). Default off: nothing changes until you set it. After each such design a cheap vision model (`PLACE_CHECK_MODEL`, default the door-check model `gemini-3.5-flash-lite`) says where the tree's base is. If it is off the spot, the server makes one more attempt with a correction in the prompt ("the tree came out at about 59% from the left; it must stand at about 75% from the left") and serves whichever of the two is closer. The user pays 1 credit as always (0 for a free move) and never gets an error from the check: if the check fails or times out (30 s), the design is served unchecked. Cost: one vision call per placed design (a fraction of a cent), plus at most one extra image (~$0.067 on `gemini-3.1-flash-image`) when the tree is off the spot. The extra image takes a slot of `MAX_GENERATIONS_PER_DAY` (never of the free cap); at the cap the retry is skipped. Adds a few seconds to every placed design and a full second generation to the ones that are retried. Read per request, so changing the variable needs no deploy. The startup log line says `place check on/off`; missed spots log a `place check` line with running totals `{checked, off, retried, fixed, errors}` (no install ids, no IPs). |
| `PLACE_CHECK_TOLERANCE` | no | How far the tree's base may be from the tapped spot, left to right, as a fraction of the image width. Default `0.12`. Lower retries more often (more cost), higher accepts more misses. Values outside 0 to 1 are ignored. Depth is fixed: a base more than 20% of the image height above or below the spot also counts as off. |
| `FRAME_CHECK` | no | `on` (or `1`, `true`, `yes`) switches on the frame check for all Christmas designs (tree only, whole-room decor, take out furniture). Default off: nothing changes until you set it. A Christmas design is an edit of the photo, but sometimes the model redraws the whole room from another distance or angle and all the furniture moves. The server measures locally (no model call, no extra cost per design) how much of the photo is still in place; below 40% it makes one more attempt with a correction in the prompt and serves whichever of the two is closer to the photo. In the Nov 19 2026 test sheets (`store/fidelity-v*`) redrawn rooms scored 0 to 23% and every design that kept the framing 58 to 84%. The user pays 1 credit as always and never gets an error from the check. Cost: at most one extra image (~$0.067) per redrawn room; it takes a slot of `MAX_GENERATIONS_PER_DAY` (never of the free cap) and is skipped at the cap. Runs before the door and place checks. Read per request. The startup log line says `frame check on/off`; redrawn rooms log a `frame check` line with running totals `{checked, redrawn, retried, fixed, errors}` (no install ids, no IPs). |
| `REMOVE_NAMES` | no | `on` (or `1`, `true`, `yes`) names the furniture before a removal ("Take out furniture", Christmas and room redesigns). Default off. A cheap vision model (`REMOVE_NAMES_MODEL`, default the door-check model `gemini-3.5-flash-lite`) looks at the photo with the cyan X markers and says which piece is under each X, how many pieces of that kind the room has, and which unmarked pieces touch it. The prompt then repeats the removal rule in those words ("A cyan X is on the white desk on the right ... Right next to it: the white chair at the desk ... stays"). Its answer is stripped to plain words before it reaches the prompt. If the call fails or takes longer than 12 s, the design is made with the normal prompt. Cost: one vision call per removal (a fraction of a cent) and 1 to 3 s before the image starts. Read per request. Failed namings log a `remove names failed` line with running totals `{asked, named, errors}`. |
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

`SHOP_LINKS` maps a Christmas theme id (`xmas-classic`, `xmas-winter`, `xmas-nordic`, `xmas-coquette`, `xmas-tartan`, `xmas-tropical`) to at most 4 links. Each link has `label_en`, `label_es` (optional, English is used if missing), `url` and `kind` (`"plain"`, `"partner"` or `"amazon"`). The label is the button text, at most 40 characters.

| `kind` | What it is | Shown in the app |
|---|---|---|
| `plain` | An ordinary link that earns nothing: a product or search page with no affiliate tag. Server 1.0.6+, app 1.0.6+ (older apps skip it). | Without any disclosure. |
| `partner` | An affiliate or referral link to a store that is not Amazon. | With "We may earn a commission." |
| `amazon` | An Amazon Associates link (with the app's tracking ID). Held back until `AMAZON_APP_APPROVED=true`. | With the Amazon Associate sentence. |

The tree button is separate: it comes from `TREE_SHOP_URL` / `TREE_CATALOG`, is always an affiliate link to the partner's store and always carries "We may earn a commission."

Example with made-up addresses (paste it as a single line):

```json
{"xmas-classic":[{"label_en":"Red velvet tree skirt","label_es":"Pie de árbol de terciopelo rojo","url":"https://shop.example.com/red-velvet-skirt?ref=EXAMPLE","kind":"partner"},{"label_en":"Glass ornaments on Amazon","label_es":"Esferas de vidrio en Amazon","url":"https://www.amazon.com/dp/EXAMPLE00?tag=example-20","kind":"amazon"}],"xmas-nordic":[{"label_en":"Wooden ornaments","label_es":"Adornos de madera","url":"https://decor.example.org/wood-ornaments","kind":"partner"}]}
```

Rules the server enforces. A link that breaks one is skipped and named in the logs (`SHOP_LINKS: "xmas-classic" link 2 ignored (...)`); the other links keep working and the server never fails to start over this variable.

- `https://` only, no login in the address, at most 600 characters.
- Known theme ids only; anything else is ignored.
- At most 4 links per theme (extra ones are ignored); labels longer than 40 characters are cut.
- `kind: "amazon"` must point to an Amazon store (`amazon.com`, `amazon.com.mx`, `amazon.es`, ...) or `amzn.to`.
- `kind: "plain"` may point anywhere, Amazon included, but must be written out in full (no `amzn.to`, `a.co`, `bit.ly` or other shortener) and may not carry an affiliate parameter (`tag`, `linkCode`, `sca_ref`, `ref`, `aff`, `irclickid`, ...). It is shown without a disclosure, so it has to be a link we earn nothing on.
- `kind: "partner"` may not point to Amazon (`amazon.*`, `amzn.*`, `a.co`) and may not have "Amazon" in its label. This check reads the address as written: do not put an Amazon link behind another shortener or redirect.

**Amazon links stay off until Amazon approves the app.** Amazon Associates only allows its links inside an "Approved Mobile Application": the app must be live in a public app store, approved by Amazon, and use its own tracking ID. Until then keep `AMAZON_APP_APPROVED` unset: links of kind `amazon` can already sit in `SHOP_LINKS`, but they are filtered out on the server and never reach the app. After approval, put the app's own tracking ID in the Amazon links and set `AMAZON_APP_APPROVED=true`. The links are free to reach: in Christmas mode the Home screen has a "Shop the styles" entry that lists every theme's links without a photo, a design or credits (Amazon requires that its links are accessible without paying), and each Christmas result repeats its own theme's links. The app opens every shop link in the phone's browser or the store's app (never inside DecoHero) and shows "As an Amazon Associate we earn from qualifying purchases." whenever an Amazon link is on screen.

**Plain links now, affiliate links later.** While Amazon has not approved the app, decor links can ship as `kind: "plain"`: untagged product or search pages. A starter set of plain Amazon search links, two per theme (a suggestion: replace searches with hand-picked products as you like), as one line:

```json
{"xmas-classic":[{"label_en":"Red and gold glass ornaments","label_es":"Esferas de vidrio rojas y doradas","url":"https://www.amazon.com/s?k=red+gold+glass+ball+christmas+ornaments","kind":"plain"},{"label_en":"Red velvet tree skirt","label_es":"Pie de árbol de terciopelo rojo","url":"https://www.amazon.com/s?k=red+velvet+christmas+tree+skirt","kind":"plain"}],"xmas-winter":[{"label_en":"Silver snowflake ornaments","label_es":"Adornos de copos plateados","url":"https://www.amazon.com/s?k=silver+snowflake+christmas+ornaments","kind":"plain"},{"label_en":"White faux fur tree skirt","label_es":"Pie de árbol de pelo blanco","url":"https://www.amazon.com/s?k=white+faux+fur+christmas+tree+skirt","kind":"plain"}],"xmas-nordic":[{"label_en":"Natural wood ornaments","label_es":"Adornos de madera natural","url":"https://www.amazon.com/s?k=natural+wood+christmas+ornaments","kind":"plain"},{"label_en":"Seagrass tree collar","label_es":"Base de árbol de fibra natural","url":"https://www.amazon.com/s?k=seagrass+christmas+tree+collar","kind":"plain"}],"xmas-coquette":[{"label_en":"Pink velvet bows","label_es":"Lazos de terciopelo rosa","url":"https://www.amazon.com/s?k=pink+velvet+bows+christmas+tree","kind":"plain"},{"label_en":"Pearl ornaments","label_es":"Esferas color perla","url":"https://www.amazon.com/s?k=pearl+white+christmas+ball+ornaments","kind":"plain"}],"xmas-tartan":[{"label_en":"Tartan ribbon","label_es":"Cinta de tartán","url":"https://www.amazon.com/s?k=tartan+plaid+christmas+ribbon+wired","kind":"plain"},{"label_en":"Rattan tree collar","label_es":"Base de árbol de ratán","url":"https://www.amazon.com/s?k=rattan+christmas+tree+collar","kind":"plain"}],"xmas-tropical":[{"label_en":"Rattan and shell ornaments","label_es":"Adornos de ratán y conchas","url":"https://www.amazon.com/s?k=rattan+seashell+christmas+ornaments","kind":"plain"},{"label_en":"Seagrass tree collar","label_es":"Base de árbol de fibra natural","url":"https://www.amazon.com/s?k=seagrass+christmas+tree+collar","kind":"plain"}]}
```

After Amazon approves the app, edit `SHOP_LINKS` only: put the tracking ID in each address (`&tag=YOUR-APP-ID-20`), change its `kind` to `"amazon"`, and set `AMAZON_APP_APPROVED=true`. The app picks the change up on its next start and starts showing the Amazon Associate sentence; no app release is needed.

Check what the app will get: `curl https://API/api/config`.

## Tree catalogue

App 1.0.5+ recommends one real tree from the partner's catalogue for the ceiling height the user enters, shows its name and price, and links to its product page ("Buy this 7 ft Fraser fir, $227.95"). The rule: the tallest product whose largest possible size leaves 12 in (30.5 cm) under the ceiling for the stand and the topper; Fraser fir before Balsam at the same height, the hybrid only when nothing else is as tall; never more than the largest product. The same rule runs in the app (`mobile/src/treeSize.ts`, which also holds a copy of the default list for offline use) and on the server.

When the store changes a price or a product, set `TREE_CATALOG` instead of releasing the app. It is a JSON list; each product has `name` (shown as is, at most 40 characters), `species` (`"fraser"`, `"balsam"` or `"hybrid"`), `maxFt` (the tallest tree that may arrive, 2 to 12), `minFt` (optional, the smallest listed size), `price` (US dollars, 20 to 2000) and `url` (the product page, or just its path). Example (paste it as a single line, with the whole catalogue, not only the changed product):

```json
[{"name":"7 Ft Premium Fraser","species":"fraser","minFt":7,"maxFt":7,"price":229.95,"url":"/products/EXAMPLE-7-foot-fraser"},{"name":"5 Ft Premium Balsam","species":"balsam","minFt":5,"maxFt":6,"price":189.95,"url":"https://christmastreesinthemail.com/products/EXAMPLE-5-6-balsam"}]
```

Rules the server enforces. A product that breaks one is skipped and named by position in the logs (`TREE_CATALOG: product 2 ignored (...)`); if nothing valid is left, or the value is not a JSON list, the built-in list is used. The server never fails to start over this variable.

- `https://` and the partner's store (`christmastreesinthemail.com`, with or without `www.`) only; no login or port in the address; at most 600 characters.
- Sizes and prices must be numbers inside the ranges above; at most 20 products; one entry per product page.
- Do not put the affiliate parameter in these addresses: it is added from `TREE_SHOP_URL`.

The species of the recommended product is also what the image prompt names ("a fresh-cut Fraser fir"), and the tree is drawn at the product's largest size. Winter wonderland is still drawn flocked; the app links to the plain fir and says "Real Fraser fir; add your own snow flocking."

After changing either variable: `curl https://API/api/config` and check that every `treeCatalog[].url` ends with the affiliate parameter.

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
- `npm run marker-sample [x] [y] [input.jpg] [output.jpg]`: draws the "tree goes here" marker on a photo exactly as the model receives it and prints the output path. `x` and `y` are fractions of the width and height (default `0.5 0.8`); without an input it uses `test-image2.jpeg` from the repo root.
- `npm run watermark-sample [input.jpg] [output.jpg]`: renders the free-design watermark and prints the output path. To check the production font, run it inside the built image, e.g. `docker build -t decohero-api . && docker run --rm -v "$PWD/scripts:/app/scripts" -v "$PWD/src:/app/src" -v /tmp:/out decohero-api npx --yes tsx scripts/watermark-sample.ts "" /out/wm.jpg`.

## API notes

- The app sends its install id in the `X-Install-Id` header. Version 1.0.0 of the app sends `?installId=` (GET `/api/me`) or `installId` in the JSON body instead; both still work. Ids must be UUIDs and are stored lowercase.
- `GET /api/me` returns `{ userId, credits, paid, freeDenied }`. `userId` is the install id on Android and the account's random user id on web.
- `GET /api/config` (app 1.0.3+, no install id needed) returns `{ christmas, treeShopUrl, shopLinks, treeCatalog }`. `treeCatalog` (read by app 1.0.5+, ignored by older apps) is a list of `{ id, name, species, minFt, maxFt, price, url }`; each `url` already carries the query string of `TREE_SHOP_URL`. The app reads it at start; an empty `treeShopUrl` hides the tree button. `shopLinks` (read by app 1.0.4+, ignored by 1.0.3) is `{ [themeId]: [{ en, es, url, kind }] }`, `{}` when there are none; themes without links are left out.
- `POST /api/redesign` takes the 12 interior style ids and, from app 1.0.3, six Christmas ids (`xmas-classic`, `xmas-winter`, `xmas-nordic`, `xmas-coquette`, `xmas-tartan`, `xmas-tropical`) that add one tree and keep the room. Christmas requests may carry `ceilingCm` (180 to 620) and `treeCm` as numbers. `treeCm` must be below the ceiling and either the largest size of a catalogue product (what app 1.0.5 sends; this also names the product's species in the prompt) or anything from 120 to 370 (what apps up to 1.0.4 send). With a ceiling and no `treeCm`, the server picks the tree by the catalogue rule. A present but invalid value answers 400 `BAD_SIZE` before any credit is spent. Interior styles ignore both fields.
- `POST /api/redesign`, app 1.0.5+: Christmas requests may also carry `place: { "x": 0.31, "y": 0.78 }`, the spot the user tapped for the tree as fractions of the photo's width and height (both numbers from 0 to 1, no other keys; anything else answers 400 `BAD_PLACE` before any credit is spent). The server draws a magenta ring with a dot (6% of the image width) on a copy of the photo, tells the model to stand the tree on it and to remove it, and checks the result: if clearly more strong magenta is left than the user's own photo had, the design counts as failed (502 `GENERATION_FAILED`, credit refunded, counted toward `MAX_FAILURES_PER_INSTALL_PER_DAY`; the daily slot stays used because an image was paid for). Interior styles ignore the field. "Move tree" in the app is a normal request with a new `place` and costs 1 credit. Deploy the server before releasing app 1.0.3, or Christmas styles answer `BAD_STYLE`.

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
