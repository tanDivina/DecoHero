# Antigravity: console setup for the DecoHero web version

You are helping Dorien launch DecoHero in the browser: landing page at https://deco.hero-apps.com and web app at https://deco.hero-apps.com/app. Claude Code has written the code on branch `web-app` in the git worktree **~/DecoHero-web** (not ~/DecoHero, which stays on `android-app` for the Android app). Your part is the browser and console work below. Claude Code does the server redeploy, the web build and the Vercel deploy afterwards, so don't run any of those.

Read first: `server/DEPLOY.md`, `mobile/.env.web.example`, `site/vercel.json` and `PRIVACY_POLICY.md` in ~/DecoHero-web. Background on what's already live (Railway server, RevenueCat project, Play app) is in ~/DecoHero/ANTIGRAVITY_TASKS.md.

## Hard rules
- **Never write a secret** (Stripe secret key, webhook secret, service-account JSON, any password) into a file, a chat message or the repo. The only values you may write to a file are the public browser values in step 6, and only into `~/DecoHero-web/mobile/.env.web`, which git ignores.
- **The Firebase project must be new and separate.** Don't use `decohero-prod` (it holds the Gemini key) or bizlens-app, hero-inbox-2026 or any other project. In Oct 2026 BizLens was suspended because a public browser Firebase key could call Gemini. A web key is public by design, so it has to live in a project where it can't reach anything that costs money.
- Don't deploy, push or run `vercel link` / `vercel env pull`: `vercel link` has wiped a `.env.local` before.
- Stop and ask Dorien before paying for anything and before any step that needs her ID, bank details or 2FA (Stripe activation will).
- No em dashes in any text you write (product names, descriptions, support pages).

## Tasks, in this order

### 1. Firebase project for Google sign-in
1. Firebase console: create project **`decohero-web`** (Analytics off). If that id is taken, Firebase suggests one with a suffix; use it and **report the exact project id**, because `site/vercel.json` proxies to `https://decohero-web.firebaseapp.com` and Claude Code has to change it.
2. Authentication > Sign-in method: enable **Google** only. Support email support@hero-apps.com. Don't enable Anonymous or Email/Password: the server trusts every account in this project, so those would let people farm free credits.
3. Authentication > Settings > Authorized domains: add `deco.hero-apps.com`.
4. Project settings > Your apps > add a **Web** app "DecoHero web" (no Firebase Hosting). Keep the config values for step 6.
5. Google Cloud console, same project:
   - APIs & Services > Credentials > "Browser key (auto created by Firebase)":
     - Application restrictions: HTTP referrers `https://deco.hero-apps.com/*` and `http://localhost:8081/*`
     - API restrictions: only **Identity Toolkit API** and **Token Service API**
   - Same page > OAuth 2.0 Client IDs > "Web client (auto created by Google Service)" > Authorized redirect URIs: add `https://deco.hero-apps.com/__/auth/handler`. The site proxies `/__/auth/*` to Firebase so sign-in works in Safari on iPhones.
   - Same page > OAuth consent screen: app name DecoHero, support email support@hero-apps.com, homepage https://deco.hero-apps.com, privacy https://deco.hero-apps.com/privacy, terms https://deco.hero-apps.com/terms. Publishing status **In production** (scopes are only email/profile/openid, so no verification is needed). Don't leave it in Testing, or sign-in only works for listed test users.
   - APIs & Services > Enabled APIs: confirm the **Generative Language API is not enabled**.

### 2. Railway variables (no redeploy of new code)
In the existing Railway service (`splendid-inspiration-production-08761935.up.railway.app`), add:
- `FIREBASE_PROJECT_ID` = the project id from step 1
- `WEB_ORIGINS` = `https://deco.hero-apps.com`

Railway may restart the service with the new variables. That's fine: the code running now ignores them. Claude Code deploys the new server code later. Check that `https://splendid-inspiration-production-08761935.up.railway.app/health` still returns `"ok":true`.

### 3. Stripe
1. Dorien logs in to Stripe with the **Divina Endeavors LLC** account (ask her; it needs 2FA). If the account isn't activated for live payments yet, list what Stripe asks for and stop at that point.
2. Settings > Public details: statement descriptor `DECOHERO` (or `DECOHERO HEROAPPS` if a longer one is required), support email support@hero-apps.com, support URL https://deco.hero-apps.com, privacy https://deco.hero-apps.com/privacy, terms https://deco.hero-apps.com/terms.

### 4. RevenueCat Web Billing
Project `cee77d74` (the one the Android app uses).
1. Apps > **+ New > Web Billing**. Name "DecoHero web". Connect the Stripe account from step 3. Currency USD. Support email support@hero-apps.com.
2. Products in that Web Billing app, one-time purchases (not subscriptions). Use **exactly these identifiers**; the server maps them to credits:
   - `credits_15`: "15 designs", $2.99
   - `credits_50`: "50 designs", $7.99
   - `credits_150`: "150 designs", $19.99
3. Offering `default` (the current one): attach each web product to the existing package next to its Play product, so one package = one Play product + one web product.
4. API keys: copy the **Web Billing public key** (starts with `rcb_`) for step 6. Also create a **sandbox** Web Billing key if RevenueCat offers one, and report whether the live key needs Stripe live mode first.
5. Integrations > Webhooks: confirm the existing webhook (Railway URL `/webhooks/revenuecat`) has no app or environment filter that would leave out Web Billing events. Don't change its Authorization header.

### 5. Vercel project + DNS
1. vercel.com dashboard (Dorien's account, not via CLI): create an empty project **`decohero-web`** with no Git repository. If the dashboard insists on a repo, stop and report; Claude Code can create it from the CLI on the first deploy.
2. Project > Settings > Domains: add `deco.hero-apps.com`. Note the DNS record Vercel asks for.
3. cPanel for hero-apps.com (Namecheap, account finclazc) > Zone Editor: add `CNAME deco` pointing to the target Vercel showed (usually `cname.vercel-dns.com`). Don't touch any other record.
4. Report whether Vercel shows the domain as valid. It can only issue the certificate once there's a deploy, so "valid configuration" is enough.

### 6. Web env file
Create `~/DecoHero-web/mobile/.env.web` from `mobile/.env.web.example` with the real **public** values:
```
EXPO_PUBLIC_API_URL=https://splendid-inspiration-production-08761935.up.railway.app
EXPO_PUBLIC_FIREBASE_API_KEY=<from step 1.4>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=deco.hero-apps.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project id from step 1>
EXPO_PUBLIC_FIREBASE_APP_ID=<from step 1.4>
EXPO_PUBLIC_RC_WEB_KEY=<rcb_ key from step 4.4>
```
The auth domain is `deco.hero-apps.com` on purpose (see step 1.5), not the firebaseapp.com one. Run `git -C ~/DecoHero-web status --short mobile` and confirm `.env.web` doesn't show up (it's ignored).

## Report back to Dorien
A short checklist: Firebase project id, whether the Google provider and OAuth consent screen are in production, the Railway health result, the Stripe activation status, RevenueCat Web Billing app + 3 products + offering done (and sandbox vs live key), the Vercel project + domain status, the DNS record added, and whether `.env.web` was written. List anything blocked and why. Don't include any keys.
