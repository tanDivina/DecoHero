# Sample rooms for store screenshots

Everything in this folder is AI-generated. No photo shows a real person's home.

## before/

Eight ordinary "before" rooms, made with fal.ai `fal-ai/nano-banana-pro` (text to image) by
`tools/screenshots/gen-before.mjs`. The prompts are in that file.

## after/

Redesigns of those rooms, made the way the app makes them:

- prompt: exactly `buildPrompt(styleId)` from `server/src/styles.ts` (BASE text plus the style line)
- model: Google Gemini 3.1 Flash Image ("Nano Banana 2", the server's `IMAGE_MODEL`), called through
  fal.ai as `fal-ai/nano-banana-2/edit`
- input: the before photo downsized to 1280 px on the longest edge, JPEG quality 80, as the app uploads it
- settings: model defaults (no aspect ratio or size forced), same as the server

The files are the model's output, untouched. Screenshots only crop and resize them.
`manifest.json` lists room, style, model id, the SHA-256 of the prompt, and `attempt`.

### What was left out

`attempt: 2` means the first output was thrown away and the style was run once more, the same as a
user tapping "Try again". First outputs were rejected when they changed the room itself:

| First output | Why it was rejected |
|---|---|
| living-room japandi | added ceiling beams and narrowed the room |
| living-room art-deco | added a tray ceiling and wall panelling, moved the camera |
| dining-room art-deco | added a window on the back wall |
| dining-room luxury-classic | moved the camera to a frontal view |
| bedroom luxury-classic | new floor, different window, moved camera |
| kids-room scandinavian, coastal | added a door that isn't in the photo |
| home-office mid-century | a different room (window moved) |
| home-office industrial | changed the window and the view outside |
| sala-panama tropical-modern | removed the window bars |

`bedroom art-deco` was dropped completely in the first batch (it turned the window into leaded glass).

Nov 15 2026: the landing page's styles section shows all 12 styles on living-room, sala-panama and
bedroom, so the missing pairs were made. Rejected outputs are kept in `../rejected/` (`-a1` = first try):

| Rejected | Why |
|---|---|
| living-room mid-century (Nov 13) | glass table and plant cramped against the sofa |
| living-room mid-century a1 | camera moved to a frontal view |
| living-room modern-minimal a1 | furniture layout and camera changed |
| living-room luxury-classic a2 | second try was worse (frontal camera, panelling); a1 kept |
| living-room farmhouse a1 | window frame and camera changed |
| sala-panama mediterranean (Nov 13) | changed the room too much |
| sala-panama modern-minimal a1 | removed the window bars |
| sala-panama luxury-classic a1 | moved a wall window, added a mirror wall |
| bedroom art-deco a1 | panelled walls, changed window |

`fal-calls.log` has one line per fal call (time, model, result). No keys are stored anywhere here.
