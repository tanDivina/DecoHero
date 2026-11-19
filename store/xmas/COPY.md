# DecoHero: Christmas mode copy (drafts)

Drafted Nov 15 2026. Nothing here is pushed, deployed or committed.
Sources checked: `server/src/styles.ts`, `server/src/treeCatalog.ts`, `server/src/shopLinks.ts`, `server/src/app.ts`,
`mobile/src/i18n.ts`, `mobile/src/stylePresets.ts`, `scripts/site-src/strings.mjs`, `scripts/site-src/index.tpl.html`.
Rules followed: no em dashes, no emoji, no hype words, only claims the code supports. See "Open questions" at the end.

How it gets applied: `tools/screenshots/push-play.py --text` reads only the full description from `store/listing.md`
("## English" / "## Español"). It does not read this file and it does not touch the short description, except
`--add-es`, which sets title, short and full description of es-419 from `listing.md`. So: paste the blocks below into
`listing.md`, and set the English short description by hand in Play Console.

---

## 1. Google Play

### English

**Short description** (77/80):
`Redesign your room from a photo. New: see a Christmas tree in your own space.`

**CHRISTMAS MODE block** (800 characters). Insert it in the full description after the paragraph that starts
"Take a photo of any room, pick up to four styles..." and before the "12 STYLES" heading, with one blank line
above and below. The opening line "See your room in a new style before you buy a thing." stays first.
New full description total: 1975/4000 (was 1173).

```
CHRISTMAS MODE
See how a Christmas tree fits your room before you order one. Switch to Christmas, add a photo, and DecoHero adds one tree to it and keeps the rest of the room in place.
• 6 tree styles: Classic warmth · Winter wonderland · Nordic minimal · Pink coquette · Heritage tartan · Tropical Christmas
• Enter your ceiling height and the app picks the tallest tree that fits, with room for the stand and the topper. Choose a smaller size if you like.
• Tap the photo where the tree should go, or let DecoHero choose the spot
• Links to buy a real farm-cut tree (delivery in the US only). Some are affiliate links, so we may earn a commission.
One tree design uses one credit, the same as a room design. Tree sizes are estimates: measure your ceiling before you order.
```

### Español (es-419, also fine for es-ES)

**Descripción breve** (79/80):
`Rediseña tu espacio con una foto. Nuevo: prueba un árbol de Navidad en tu sala.`

**Bloque MODO NAVIDAD** (841 caracteres). Va en la descripción completa después del párrafo que empieza con
"Toma una foto de cualquier ambiente, elige hasta cuatro estilos..." y antes del título "12 ESTILOS", con una línea
en blanco arriba y abajo. La primera línea "Mira tu espacio con otro estilo antes de comprar nada." se queda primera.
Nuevo total de la descripción completa: 2106/4000 (antes 1263).

```
MODO NAVIDAD
Mira cómo queda un árbol de Navidad en tu espacio antes de pedirlo. Cambia a Navidad, agrega una foto y DecoHero le pone un árbol y mantiene el resto del espacio en su lugar.
• 6 estilos de árbol: Clásico cálido · Invierno mágico · Nórdico · Rosa coquette · Tartán clásico · Navidad tropical
• Escribe la altura de tu techo y la app marca el árbol más alto que cabe, con espacio para la base y la estrella. Si prefieres, elige uno más pequeño.
• Toca la foto donde quieres el árbol o deja que DecoHero elija el lugar
• Enlaces para comprar un árbol natural (envíos solo dentro de Estados Unidos). Algunos son enlaces de afiliado, así que podemos recibir una comisión.
Un diseño con árbol usa un crédito, igual que un rediseño. El tamaño es un cálculo aproximado: mide tu techo antes de hacer el pedido.
```

Note: "Invierno mágico" is the style's name inside the app (`mobile/src/stylePresets.ts`), so it is kept as a name
even though "mágico" is otherwise on the avoid list. If you rename the style in the app, rename it here too.

### January revert (around Jan 2, together with `push-play.py --set v2 --commit`)

1. Short descriptions back to:
   - EN (76): `Photograph your room and see it redesigned in 12 interior styles in seconds.`
   - ES (72): `Fotografía tu espacio y míralo rediseñado en 12 estilos de interiorismo.`
2. Delete the whole CHRISTMAS MODE / MODO NAVIDAD block (heading through the "measure your ceiling" line) plus one of
   the two blank lines around it, so "12 STYLES" / "12 ESTILOS" follows the intro paragraph again. Totals go back to
   1173 (EN) and 1263 (ES).
3. Run `push-play.py --text` (dry run), then with `--commit`. Set the EN short description by hand in Play Console.
4. If `CHRISTMAS_MODE` is switched off on the server, revert the listing on the same day or before: the listing must
   not describe a mode the app no longer shows. If the mode stays on all year, a softer option is to keep the block,
   move it below "HOW IT WORKS" and only revert the short descriptions.
5. Landing: remove the Christmas section and hero toggle, put `hero_note` back (section 3).

---

## 2. Alternative short descriptions

### English

| # | Text | Chars | Why |
|---|---|---|---|
| A | `See a Christmas tree in your room before you buy. Redesign rooms in 12 styles.` | 78 | Leads with the exact search phrase "christmas tree"; best for December search traffic, weaker for the year-round core. |
| B | `Room redesign from a photo, plus Christmas decor: try a tree in your own room.` | 78 | Covers "christmas decor" and "room redesign" in one line; keeps redesign first. |
| C | `AI room redesign in 12 styles. Christmas mode: 6 tree styles in your own room.` | 78 | Most concrete (12 and 6); matches "ai room design" searches, but has "tree" without "Christmas tree" as a phrase. |

### Español

| # | Texto | Caracteres | Por qué |
|---|---|---|---|
| A | `Mira un árbol de Navidad en tu sala antes de comprarlo. Rediseña en 12 estilos.` | 79 | Empieza con "árbol de Navidad", la búsqueda más fuerte en diciembre; el rediseño queda segundo. |
| B | `Rediseño de interiores y decoración navideña: prueba el árbol en tu propia sala.` | 80 | Incluye "decoración navideña" y "rediseño de interiores"; justo en el límite de 80. |
| C | `Rediseña tu espacio en 12 estilos. Modo Navidad: 6 estilos de árbol en tu foto.` | 79 | La más concreta (12 y 6); no contiene la frase completa "árbol de Navidad". |

---

## 3. Landing page (deco.hero-apps.com)

New keys for `scripts/site-src/strings.mjs`. Values are HTML, same as the existing keys. Every key exists in both
languages, as `build-site.mjs` requires. The template (`index.tpl.html`) needs a new section and a hero toggle to
use them; suggested place for the section: between `#how` and `#styles`, id `christmas`.

### English (`en`)

```js
    // Christmas mode section
    xmas_eyebrow: "Christmas mode",
    xmas_h2: "See the tree in your room before you order it.",
    xmas_p: "Switch to Christmas, add a photo of your room, and DecoHero adds one Christmas tree to it. The rest of the room stays in place. Pick up to four of six tree styles and compare them side by side.",
    xmas_li1: "Enter your ceiling height and the tallest tree that fits is selected, with room for the stand and the topper.",
    xmas_li2: "Tap the photo where the tree should go, or let DecoHero choose the spot.",
    xmas_li3: "Links to buy a real farm-cut tree. Some are affiliate links.",
    xmas_cta: "Try Christmas mode",
    xmas_note: "One tree design uses one credit. Tree sizes are estimates, so measure your ceiling before you order.",
    nav_xmas: "Christmas",
    // Hero toggle above the before/after slider
    hero_toggle_label: "Sample to compare",
    hero_toggle_rooms: "Rooms",
    hero_toggle_xmas: "Christmas",
    ba_after_xmas: "After, Classic warmth",
    // Seasonal replacement for hero_note (optional)
    hero_note_xmas: "New: Christmas mode. Try a tree in your own room. 1 free design when you sign in with Google.",
    // FAQ
    faq7_q: "How does the Christmas tree work?",
    faq7_a: "<p>In Christmas mode DecoHero adds one tree to your photo and keeps the rest of the room in place. Enter your ceiling height and the tallest tree that fits is selected, leaving at least 12 in (30 cm) under the ceiling for the stand and the topper. You can pick a smaller size. Tap the photo where the tree should go, or let DecoHero choose. The tree stands on the open floor nearest your tap.</p><p>With your results you get links to buy a real farm-cut tree from our partner's store, which delivers in the US only,. Some of these are affiliate links, so we may earn a commission if you buy through them. The picture is an estimate: measure your ceiling before you order.</p>",
```

### Español (`es`)

```js
    // Sección Modo Navidad
    xmas_eyebrow: "Modo Navidad",
    xmas_h2: "Mira el árbol en tu sala antes de pedirlo.",
    xmas_p: "Cambia a Navidad, agrega una foto de tu espacio y DecoHero le pone un árbol de Navidad. El resto del espacio se mantiene en su lugar. Elige hasta cuatro de seis estilos de árbol y compáralos.",
    xmas_li1: "Escribe la altura de tu techo y queda marcado el árbol más alto que cabe, con espacio para la base y la estrella.",
    xmas_li2: "Toca la foto donde quieres el árbol o deja que DecoHero elija el lugar.",
    xmas_li3: "Enlaces a un árbol natural. Algunos son enlaces de afiliado.",
    xmas_cta: "Prueba el modo Navidad",
    xmas_note: "Un diseño con árbol usa un crédito. El tamaño es un cálculo aproximado: mide tu techo antes de hacer el pedido.",
    nav_xmas: "Navidad",
    // Selector del hero, sobre el antes y después
    hero_toggle_label: "Muestra para comparar",
    hero_toggle_rooms: "Espacios",
    hero_toggle_xmas: "Navidad",
    ba_after_xmas: "Después, Clásico cálido",
    // Reemplazo de temporada para hero_note (opcional)
    hero_note_xmas: "Nuevo: modo Navidad. Prueba un árbol en tu propia sala. 1 diseño gratis al iniciar sesión con Google.",
    // Preguntas
    faq7_q: "¿Cómo funciona el árbol de Navidad?",
    faq7_a: "<p>En el modo Navidad, DecoHero agrega un árbol a tu foto y mantiene el resto del espacio en su lugar. Escribes la altura de tu techo y queda marcado el árbol más alto que cabe, con al menos 30 cm (12 in) libres bajo el techo para la base y la estrella. Puedes elegir uno más pequeño. Toca la foto donde quieres el árbol o deja que DecoHero elija. El árbol queda en el espacio libre del piso más cercano a tu toque.</p><p>Con tus resultados recibes enlaces para comprar un árbol natural en la tienda de nuestro aliado, que envía solo dentro de Estados Unidos,. Algunos son enlaces de afiliado, así que podemos recibir una comisión si compras desde ellos. La imagen es un cálculo aproximado: mide tu techo antes de hacer el pedido.</p>",
```

Notes for whoever wires it up:
- `xmas_cta` links to `/app`, like the other CTAs.
- The hero toggle swaps the before/after pair. It also needs image keys and alt texts for the Christmas pair
  (`ba_after_xmas_img`, `ba_before_xmas_alt`, `ba_after_xmas_alt`); write the alts once the sample images are chosen, since
  they must describe the actual picture. `ba_after_xmas` assumes the sample is the Classic warmth style; change the
  style name if another one is used.
- `hero_note_xmas` replaces `hero_note` for the season. Revert in January.
- "Rooms" / "Christmas" and "Espacios" / "Navidad" are the same words as the mode switch in the app (`modeRooms`, `modeChristmas`).

---

## 4. hero-apps.com DecoHero card bullet

The card already has: "Christmas mode: a real tree in your own room, at the right size". "A real tree" can be read
as a physical tree, so the proposed replacement is:

`Christmas mode: see a Christmas tree in your own room, sized to your ceiling`

---

## Open questions (claims to confirm before publishing)

1. **Free tree move: left out on purpose.** The server gives the first move of each tree design free
   (`server/src/app.ts`, `claimFreeMove`, "app 1.0.6+"), but the app strings in `mobile/src/i18n.ts` say
   "Move tree · 1 credit" and "Moving it makes a new design and uses 1 credit", and nothing in `mobile/src` or
   `mobile/App.tsx` reads `freeMove` or sends `moveOf`. So no copy here says the move is free, and moving the tree is
   not mentioned as a feature. If the free move ships in the build that goes to production, add to the EN block
   "• Not the right spot? Move the tree once for free." and to ES "• ¿No quedó donde querías? Mueve el árbol una vez gratis."
2. **Decor links depend on server config.** Tree links come from the built-in partner catalogue, so they exist by
   default. Decor links per style come from the `SHOP_LINKS` variable on Railway, and Amazon links are dropped
   unless `AMAZON_APP_APPROVED=true`. If `SHOP_LINKS` is empty in production, cut "and decor for each style" /
   "y decoración de cada estilo" everywhere.
3. **Affiliate wording.** The partner tree link is only an affiliate link once `TREE_SHOP_URL` carries affiliate
   parameters. "Some are affiliate links" is true if at least one live link is affiliate; if none are yet, drop that
   sentence until they are.
4. **Which build is public.** `store/PRODUCTION_READINESS.md` says production was empty and internal had 1.0.5;
   `strings.mjs` says Android is live on Play since Nov 15. Tap-to-place needs app 1.0.5+ and the tree size choice
   needs the partner catalogue (1.0.5+). Confirm the production build is 1.0.5 or later before the listing goes live.
5. **Web app.** The "Try Christmas mode" CTA goes to `/app`. The web worktree (`~/DecoHero-web`) has the Christmas
   strings, but whether the deployed web build shows the mode switch was not checked.
6. **"Leaves the rest of the room as it is"** is the app's own wording (`treeIntro`). With `TREE_CLEAR=on` the server
   may take a plant, lamp or small table off the tree's spot. If that flag is on in production, consider "leaves the
   rest of the room in place" or adding "small things on the tree's spot may be taken out".
7. **US-only delivery** is stated in every mention of real trees, because the Spanish listing reaches Latin America,
   where the partner does not deliver.


## Applied decisions (Nov 15 2026)
- SHOP_LINKS is not set in production: decor-per-style claims removed.
- TREE_SHOP_URL carries an affiliate ref: affiliate disclosure stays.
- Production is 1.0.6 and the web app has Christmas mode: tap-to-place and sizes OK to claim.
- 'Leaves the rest as it is' softened to 'keeps the rest of the room in place' (tree clearing may remove a small item on the spot).
- Free tree move stays out until the app sends moveOf.
