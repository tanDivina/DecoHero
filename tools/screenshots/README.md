# Play Store screenshots (v2)

Builds `store/screenshots-v2/{en,es}/01..07.png` (1080x1920) and the two contact sheets.

```
cd tools/screenshots && npm install        # puppeteer-core, drives the installed Google Chrome
node gen-before.mjs                        # sample "before" rooms (fal.ai)        -> store/rooms/before
node gen-after.mjs                         # real redesigns, server prompts (fal.ai) -> store/rooms/after
(cd ../../mobile && npx expo start --web --port 8099)   # dev server, in another terminal
node capture.mjs                           # real app screens, EN + ES              -> captures/
node compose.mjs                           # the screenshots and contact sheets
```

Only `compose.mjs` is needed to change copy or layout: rooms and captures are committed.

## Honesty rules

- Every "after" is what the app produces: `buildPrompt(styleId)` from `server/src/styles.ts` on the
  before photo, with Gemini 3.1 Flash Image. Outputs are only cropped and resized. See
  `store/rooms/README.md` for what was rejected.
- The rooms are AI-generated samples, and each screenshot says "Sample rooms".
- No ratings, reviews, user counts or awards.
- App screens are real captures of the app's own screens (browser build at phone size), not mockups.
  The phone frame and status bar around them are drawn by `compose.mjs`.

## The fal key

`fal.mjs` reads `FAL_KEY` or `~/.fal/key` when it runs. The key is never printed, logged or written
to a file. `store/rooms/fal-calls.log` records one line per call (time, model, result).

## Demo scenes in the app

`mobile/src/demo/` gives the app fixed scenes for `capture.mjs` (`?demo=home` / `?demo=results`).
They exist only in the browser dev server:

- `index.ts` is what Android and iOS bundle: a stub that returns null.
- `index.web.ts` loads `DemoApp.tsx` inside `if (__DEV__)`, which production builds strip out.
- `DemoApp.tsx` renders the real Home and Results screens with fixed props. It makes no API,
  sign-in or shop calls, and only accepts image URLs on localhost.

To check a production web build is clean:

```
cd mobile && npm run build:web -- --allow-placeholder
grep -c 'has("demo")' dist-web/_expo/static/js/web/*.js     # must print 0
```

## Known gap

The captures come from the browser build, so two details differ from Android: Home shows one
"Change photo" link instead of Camera / Gallery, and Results is a scrolling list instead of swipe
pages with dots. At 412 dp the browser build also cuts off "Tropical moderno" and "Rústico moderno"
(the Android app shrinks them to fit), which is why captures use a 448 dp wide screen.

## Seasonal sets (Christmas)

Put a set next to v2 and swap it in and out with `push-play.py`:

```
store/screenshots-xmas/en/01.png ... (2 to 8, 1080x1920)
store/screenshots-xmas/es/01.png ...
store/screenshots-xmas/feature-graphic-en.png   (optional, 1024x500; else the regular one is used)
store/screenshots-xmas/feature-graphic-es.png

python3 tools/screenshots/push-play.py --set xmas            # dry run
python3 tools/screenshots/push-play.py --set xmas --commit   # live after Play's review, about a day
python3 tools/screenshots/push-play.py --set v2 --commit     # revert in January, regular feature graphic too
```

Only show what the app really does: make the set after the Christmas mode has shipped.
