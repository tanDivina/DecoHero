# DecoHero: Christmas Play listing plan

Prepared Nov 15 2026. Nothing here has been pushed to Play or deployed. The files are ready; the push is a manual step.

## New files

| File | Size | What |
|---|---|---|
| `store/screenshots-xmas/en/02-xmas.png` | 1080x1920 | Christmas screenshot, English |
| `store/screenshots-xmas/es/02-xmas.png` | 1080x1920 | Christmas screenshot, Spanish |
| `store/feature-graphic-xmas-en.png` | 1024x500 | Christmas feature graphic, English |
| `store/feature-graphic-xmas-es.png` | 1024x500 | Christmas feature graphic, Spanish |
| `store/xmas/review-sheet.png` | 2358x2334 | Contact sheet: the four files above plus the proposed order |
| `tools/screenshots/compose-xmas.mjs` | | Builds all of the above: `node tools/screenshots/compose-xmas.mjs` |

Photos: `store/xmas/raw/living-room-before.png` and `living-room-xmas-classic.png` (the Play pick in `PICKS.md`), with
`living-room-xmas-nordic`, `-tropical` and `-coquette` as the three small tiles. All are unedited pipeline output, only
cropped and resized. Coquette is used as a tile only, not as a before/after, because its coffee table is gone.
Style names come from `TREE_PRESETS` in `mobile/src/stylePresets.ts`.

Captions:

| | English | Español |
|---|---|---|
| Screenshot headline | See a Christmas tree in your own room | Mira un árbol de Navidad en tu propia sala |
| Screenshot line | Six tree styles, sized to your ceiling. | Seis estilos de árbol, a la medida de tu techo. |
| Feature graphic | Christmas mode / DecoHero / See a Christmas tree in your own room. | Modo Navidad / DecoHero / Mira un árbol de Navidad en tu propia sala. |

## Proposed screenshot order (same for EN and ES, 8 of 8)

| Position | File | Shows |
|---|---|---|
| 1 | `store/screenshots-v2/<lang>/01.png` | Before / after hero (Japandi) |
| 2 | `store/screenshots-xmas/<lang>/02-xmas.png` | NEW: Christmas tree in the same room, three more tree styles |
| 3 | `store/screenshots-v2/<lang>/02.png` | One photo, up to four styles |
| 4 | `store/screenshots-v2/<lang>/03.png` | Snap a photo, pick your styles (app screen) |
| 5 | `store/screenshots-v2/<lang>/04.png` | Results in the app |
| 6 | `store/screenshots-v2/<lang>/05.png` | Same walls, windows and floor plan |
| 7 | `store/screenshots-v2/<lang>/06.png` | Twelve styles |
| 8 | `store/screenshots-v2/<lang>/07.png` | Free design, packs, trust points |

Why position 2: the first screenshot keeps the year-round promise, and the Christmas one still shows without scrolling
in most Play layouts. It uses the same living room as screenshot 1, so the pair reads as one story.
Alternative for December only: swap positions 1 and 2 so the tree leads.

Feature graphic: `store/feature-graphic-xmas-en.png` for en-*, `store/feature-graphic-xmas-es.png` for es-*.

## How to push (not run)

`tools/screenshots/push-play.py --set xmas` reads `store/screenshots-xmas/<lang>/NN.png` (two digits only, sorted, 2 to 8)
and `store/screenshots-xmas/feature-graphic-<lang>.png`. It ignores `02-xmas.png` and does not look at
`store/feature-graphic-xmas-<lang>.png`. So first assemble the set in the order above:

```
cd ~/DecoHero/store
for l in en es; do
  cp screenshots-v2/$l/01.png screenshots-xmas/$l/01.png
  cp screenshots-xmas/$l/02-xmas.png screenshots-xmas/$l/02.png
  for n in 2 3 4 5 6 7; do cp screenshots-v2/$l/0$n.png screenshots-xmas/$l/0$((n+1)).png; done
  cp feature-graphic-xmas-$l.png screenshots-xmas/feature-graphic-$l.png
done
```

Then, around Nov 25:

```
cd ~/DecoHero
python3 tools/screenshots/push-play.py --set xmas            # dry run: prints counts and which feature graphic
python3 tools/screenshots/push-play.py --set xmas --commit   # uploads 8 screenshots + feature graphic per listing, commits the edit
```

- The dry run opens a Play edit to read the current state but commits nothing. Both runs read the key from `~/.secrets/gsc_key.json`.
- After `--commit` the change shows under Publishing overview and goes live after Play's review (about a day).
- Listing text: `store/listing.md` does not have the Christmas block yet. Paste the CHRISTMAS MODE / MODO NAVIDAD blocks
  from `store/xmas/COPY.md` into the full descriptions in `listing.md` (after the "Take a photo of any room..." paragraph,
  before "12 STYLES" / "12 ESTILOS"), then add `--text` to the commands above. `--text` sets only the full description.
- Short descriptions: set the English one by hand in Play Console. For es-419, update "Descripción breve" in `listing.md`
  and add `--add-es`, which sets title, short and full description of es-419. In the same run `--set xmas` then replaces
  the es-419 feature graphic with the Christmas one, so the order is safe.
- Do not use `--brand` for this: it uploads the regular feature graphic and skips screenshots.
- The asset table at the top of `listing.md` still names `store/screenshots/en-01...05.png`; the live set is `screenshots-v2`.

## January revert (around Jan 2)

Originals to restore, all still in the repo and untouched by this work:

- Screenshots: `store/screenshots-v2/en/01.png` to `07.png` and `store/screenshots-v2/es/01.png` to `07.png` (7 per language)
- Feature graphics: `store/feature-graphic-en.png` and `store/feature-graphic-es.png`

Steps:

1. `python3 tools/screenshots/push-play.py --set v2` (dry run), then `--set v2 --commit`. This puts back the 7 regular
   screenshots and, because `screenshots-v2` has no feature graphic of its own, the regular feature graphics.
2. Text: remove the Christmas block from `listing.md` and restore the short descriptions as listed under
   "January revert" in `COPY.md`, then run with `--text` (and `--add-es` for the es-419 short description). Steps 1 and 2
   can be one command: `push-play.py --set v2 --text --add-es --commit`.
3. Set the English short description back by hand in Play Console.
4. If `CHRISTMAS_MODE` is switched off on the server earlier, revert the listing the same day or before.
5. Optional cleanup: delete the assembled copies (`store/screenshots-xmas/<lang>/01.png` to `08.png` and
   `store/screenshots-xmas/feature-graphic-<lang>.png`). Keep `02-xmas.png` and `feature-graphic-xmas-<lang>.png` for next year.

## Open points

- "Sized to your ceiling" rests on the ceiling-height input and the tallest-tree-that-fits pick (COPY.md, Applied decisions:
  sizes OK to claim). Drop that half of the line if the size choice is ever turned off.
- The Spanish caption says "sala" (the photo is a living room, and COPY.md uses "en tu sala"); the rest of the set says "espacio".
- The three tiles show 3 of the 6 styles. There are no pipeline examples for Winter wonderland or Heritage tartan yet.
- No app UI capture of Christmas mode exists in `tools/screenshots/captures`, so the new screenshot shows results only.
