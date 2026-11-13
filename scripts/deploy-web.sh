#!/usr/bin/env bash
# Builds and deploys https://deco.hero-apps.com (landing pages + web app under /app), then checks the
# live site. Dorien runs this; nothing else deploys the web app.
#
# One-time setup (see WEB_CONSOLE_TASKS.md, step 4):
#   1. Create the Vercel project `decohero-web` (no Git connection) and add the domain deco.hero-apps.com.
#   2. Link the build folder to it. web-dist/ is rebuilt from scratch every time, so the link is kept in
#      .vercel-web/ at the repo root (git-ignored) and copied in before each deploy:
#        ./scripts/build-web.sh --site-only
#        (cd web-dist && vercel link --project decohero-web)
#        mkdir -p .vercel-web && cp web-dist/.vercel/project.json .vercel-web/project.json
#      `vercel link` can overwrite a .env.local in the folder it runs in. web-dist/ has none; never run
#      it from the repo root or from mobile/.
#   3. Google sign-in on phones: site/vercel.json proxies /__/auth/* and /__/firebase/* to the Firebase project
#      `first-grove-453221-q7` (first-grove-453221-q7.firebaseapp.com), so the app can use authDomain = deco.hero-apps.com.
#      If the Firebase project gets another id, change both rewrites. In Google Cloud > Credentials > the
#      OAuth web client, add https://deco.hero-apps.com/__/auth/handler as an authorized redirect URI.
#
#   ./scripts/deploy-web.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/web-dist"
LINK="$ROOT/.vercel-web/project.json"
DOMAIN="https://deco.hero-apps.com"

if [ ! -f "$LINK" ]; then
  echo "No Vercel link found at .vercel-web/project.json. Do the one-time setup at the top of this script." >&2
  exit 1
fi

"$ROOT/scripts/build-web.sh"

mkdir -p "$OUT/.vercel"
cp "$LINK" "$OUT/.vercel/project.json"

echo "== Deploy"
vercel deploy "$OUT" --prod --yes

echo "== Check the live site"
FAIL=0
status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
expect() { # expect <code> <path>
  local got
  got="$(status "$DOMAIN$2")"
  if [ "$got" = "$1" ]; then
    echo "ok    $got  $2"
  else
    echo "FAIL  $got  $2 (expected $1)"
    FAIL=1
  fi
}

# Pages that must work.
for path in / /es /privacy /terms /es/privacy /es/terms /app /app/about; do
  expect 200 "$path"
done

# One font file of the web app (moved from assets/node_modules to assets/vendor by build-web.sh).
FONT="$(cd "$OUT" && find app/assets/vendor -type f \( -name '*.ttf' -o -name '*.otf' -o -name '*.woff2' \) 2>/dev/null | head -n 1)"
if [ -n "$FONT" ]; then
  expect 200 "/$FONT"
else
  echo "FAIL  no font file found under web-dist/app/assets/vendor"
  FAIL=1
fi

# The Firebase sign-in helper behind the /__/auth and /__/firebase rewrites.
expect 200 "/__/auth/handler"
expect 200 "/__/firebase/init.json"

# A hashed asset that does not exist must be a 404, not the app shell (which would be cached for a year).
expect 404 "/app/_expo/static/js/web/nope-123.js"
expect 404 "/app/assets/nope-123.ttf"

# Files that must never be public. /app/* falls back to the app shell (200, HTML), so under /app the
# check is that the answer is the app shell and not the file itself.
for path in /.env /.env.local /.env.web /.env.production /server.ts /package.json /vercel.json \
            /gsc_key.json /service-account.json /google-services.json /upload-keystore.jks \
            /scripts/deploy-web.sh /scripts/build-web.sh /PRIVACY_POLICY.md /.vercel/project.json; do
  expect 404 "$path"
done
for path in /app/.env /app/.env.local /app/.env.web /app/server.ts /app/google-services.json; do
  body="$(curl -s --max-time 20 "$DOMAIN$path" | head -c 400)"
  if printf '%s' "$body" | grep -qi '<!doctype html'; then
    echo "ok    app shell  $path"
  else
    echo "FAIL  $path does not return the app shell. Look at what it serves."
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "Some checks failed. Do not call this deploy done until they pass." >&2
  exit 1
fi
echo "All checks passed."
