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
| `MAX_NEW_INSTALLS_PER_IP_PER_DAY` | no | Installs per IP that get free credits, default `3`. |
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

## Known limits

- Install ids are generated by the app, so a determined abuser on many IPs can still farm free credits. The free daily cap bounds the cost; Play Integrity checks are the real fix if the `users` table shows it.
- Refunds (RevenueCat `CANCELLATION` events) don't remove credits yet.
- Sandbox purchases (licence testers) grant real credits on this server. Fine for internal testing.
