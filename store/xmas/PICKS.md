# DecoHero Christmas examples: picks

Made Nov 15 2026 with `server/scripts/xmas-examples.ts`, which calls the production functions directly
(same normalisation, magenta marker, `buildPrompt`, `generateRedesign`, place check as `/api/redesign`).
Production flags at the time: TREE_CLEAR on, PLACE_CHECK on, DOOR_CHECK off, default image model. No watermark (paid-user output).
Inputs: ceiling 250 cm, tree 213 cm (7 ft Fraser fir, the size the app recommends for that ceiling).
Taps: living room x=0.62 y=0.575 (floor between sofa and armchair); sala x=0.16 y=0.70 (left corner), and x=0.45 y=0.63 (where the stacked chairs stand) for the two sala regenerations.
Gemini image generations used: 15 of 16 (8 first images, 4 automatic place-check retries, 3 regenerations).

Nothing here is hand edited. Files in `raw/` are the best pipeline output per room and style; every other attempt is in `raw/attempts/`
(`.a1` = first image, `.a2` = place-check retry, `.served` = what the live app would have served in round one).

## Verdict per image (raw/)

| File | Verdict |
| --- | --- |
| living-room-xmas-classic.png | KEEP. First attempt. Room intact, coffee table kept, tree stands in front of the sofa's right seat, warm lights. Tree about 20% of the width left of the tap. |
| living-room-xmas-nordic.png | KEEP. Exactly on the tap, nothing moved, most honest result of the set. Quiet look, tree a little small. |
| living-room-xmas-tropical.png | KEEP. First attempt. Room intact, table kept, rattan star and leaf-wrapped gifts read well. Left of the tap like classic. |
| living-room-xmas-coquette.png | KEEP with a note. Regeneration. Sofa and armchair intact, bow clear of the lamp, but the glass coffee table was removed. |
| sala-panama-xmas-classic.png | KEEP. First attempt. Both sofas, TV, windows and fan intact; stacked chairs removed. Tree mid-room, far from the corner tap. |
| sala-panama-xmas-nordic.png | KEEP. First attempt. Same strengths as classic; tree a bit slimmer. Chairs removed, far from the corner tap. |
| sala-panama-xmas-tropical.png | KEEP. Regeneration with the tap on the chairs. Everything intact, chairs cleared as the clearing rule intends, on the spot. Best sala image. |
| sala-panama-xmas-coquette.png | KEEP with a note. Regeneration. Sofas and TV intact, on the spot, but the stacked chairs were moved to the left of the TV stand instead of removed. |

## Rejected (raw/attempts/)

| File | Why |
| --- | --- |
| living-room-xmas-classic.served.png | Place-check retry. Two-seat sofa turned into a one-seat armchair. |
| living-room-xmas-tropical.served.png | Place-check retry. Coffee table removed, oversized tree in the foreground hides the armchair. |
| living-room-xmas-coquette.served.png | Tree in the middle of the room, top bow overlaps the ceiling lamp, coffee table removed. |
| sala-panama-xmas-classic.served.png | Usable backup: chairs removed, back sofa half hidden. The first attempt is cleaner. |
| sala-panama-xmas-nordic.served.png | Place-check retry. Tree stands in front of the TV and hides it. |
| sala-panama-xmas-tropical.served.png | Sofas rearranged: back sofa gone, front loveseat turned. |
| sala-panama-xmas-coquette.served.png | Front loveseat removed, back sofa turned into an armchair, bow overlaps the fan. |

## Top picks

### (a) Website hero before/after
1. `sala-panama-before.png` + `sala-panama-xmas-tropical.png`. Landscape, pixel-stable room so a slider wipe works, the tree is large and central, and a tropical tree in a Panama sala is the story only DecoHero tells. On the tapped spot.
2. `sala-panama-before.png` + `sala-panama-xmas-classic.png`. Same room, the red and gold tree is the most instantly "Christmas" image and pops against the cream block walls. Note: the stacked chairs disappear in both.

### (b) Play screenshot (portrait)
1. `living-room-before.png` + `living-room-xmas-classic.png`. Portrait 3:4, plain rental room turned festive, coffee table and sofa stay put, reads at thumbnail size.
2. `living-room-before.png` + `living-room-xmas-coquette.png`. Strongest colour contrast and the biggest tree in frame; good as a second "pick your style" screenshot. Coffee table is gone, so do not use it in a slider.

Runner-up for an "exactly where you tapped" claim: `living-room-xmas-nordic.png`.

## Pipeline problems seen

- Left-corner tap in the sala (x=0.16) was ignored 4 out of 4 times: trees came out at x=0.45 to 0.51. Retries only reached x=0.44 and x=0.35, still off.
- Living room: 2 of 5 first images were off the tap (x=0.45 and 0.48 for a tap at 0.62); the locator also reads the base 10 to 15% lower than the tap when the skirt is hidden by furniture.
- The place-check retry made the picture worse in 3 of 4 cases (sofa shrunk, coffee table removed, TV hidden) while "closer" still won, so the app would have served the worse image.
- Clearing goes beyond small items: a glass coffee table removed (3 times), a loveseat removed, a sofa reshaped, sofas rearranged. In one image the stacked chairs were moved elsewhere instead of removed.
- Coquette's large top bow tends to reach the ceiling lamp or fan (2 of 4).
- No marker leaks, no text or watermark artefacts, no cone-shaped or floating trees, walls and windows unchanged in all 15 images.
