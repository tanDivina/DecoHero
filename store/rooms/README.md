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

`bedroom art-deco` was dropped completely (it turned the window into leaded glass).

`fal-calls.log` has one line per fal call (time, model, result). No keys are stored anywhere here.
