# DecoHero: Google Play listing

Paste into Play Console → Grow → Store presence → Main store listing.
Add Spanish under "Manage translations" → es-419 (Latin America) and es-ES.
Limits: app name 30, short description 80, full description 4000 characters.

| Asset | File |
|---|---|
| App icon 512×512 | `store/play-icon-512.png` |
| Feature graphic 1024×500 | `store/feature-graphic-en.png` / `feature-graphic-es.png` |
| Phone screenshots 1080×1920 (2–8) | `store/screenshots/en-01…05.png` / `es-01…05.png` |

Screenshots are frames waiting for real captures. Take them on a phone with
`adb exec-out screencap -p > store/raw/01.png` (or `store/raw/es/01.png` for Spanish UI),
then run `node design/build.mjs`. What each one should show is printed in its placeholder.

Category: **House & Home**. Tags: interior design, home decor, room planner.
Contains ads: **No**. In-app purchases: **Yes** (credit packs).

---

## English

**App name** (26): `DecoHero: Room Redesign AI`

**Short description** (76):
`Photograph your room and see it redesigned in 12 interior styles in seconds.`

**Full description:**

See your room in a new style before you buy a thing.

Take a photo of any room, pick up to four styles, and DecoHero redesigns it while keeping your walls, windows and layout exactly where they are. Swipe between the results, then press and hold to flip back to your original and compare.

12 STYLES
Tropical modern · Minimal · Japandi · Scandinavian · Mid-century · Boho · Coastal · Mediterranean · Industrial · Classic luxury · Farmhouse · Art deco

HOW IT WORKS
• Snap a photo or choose one from your gallery
• Pick up to four styles at once
• Swipe through your redesigns as they arrive
• Hold the image to see the before
• Save to your gallery or share with your partner, landlord or contractor

NO ACCOUNT, NO SUBSCRIPTION
Your first 3 designs are free. After that, buy a credit pack: one credit is one design, and credits never expire. Any purchase also removes the small DecoHero mark from new designs.

PRIVATE BY DESIGN
No sign-up and no ads. Your photo is used only to create your designs and isn't kept on our servers afterwards, or used to train AI models.

Designs are AI-generated ideas to inspire you, not exact products or measurements. In English and Spanish.

---

## Español

**Nombre** (29): `DecoHero: Rediseña tu espacio`

**Descripción breve** (72):
`Fotografía tu espacio y míralo rediseñado en 12 estilos de interiorismo.`

**Descripción completa:**

Mira tu espacio con otro estilo antes de comprar nada.

Toma una foto de cualquier ambiente, elige hasta cuatro estilos y DecoHero lo rediseña manteniendo tus paredes, ventanas y distribución tal como están. Desliza entre los resultados y mantén presionada la imagen para volver al original y comparar.

12 ESTILOS
Tropical moderno · Minimalista · Japandi · Nórdico · Mid-century · Boho · Costero · Mediterráneo · Industrial · Clásico de lujo · Rústico moderno · Art déco

CÓMO FUNCIONA
• Toma una foto o elige una de tu galería
• Elige hasta cuatro estilos a la vez
• Desliza entre tus rediseños a medida que llegan
• Mantén presionada la imagen para ver el antes
• Guarda en tu galería o comparte con tu pareja, arrendador o contratista

SIN CUENTA, SIN SUSCRIPCIÓN
Tus primeros 3 diseños son gratis. Después, compra un paquete de créditos: un crédito es un diseño y los créditos no vencen. Cualquier compra también quita la pequeña marca DecoHero de tus nuevos diseños.

PRIVADO DESDE EL DISEÑO
Sin registro y sin anuncios. Tu foto solo se usa para crear tus diseños; no la guardamos en nuestros servidores después ni la usamos para entrenar modelos de IA.

Los diseños son ideas generadas con IA para inspirarte, no productos ni medidas exactas. En inglés y español.

---

## In-app products (Play Console → Monetize → In-app products)

| Product ID | Name (EN / ES) | Description (EN / ES) | Price |
|---|---|---|---|
| `credits_15` | 15 designs / 15 diseños | 15 room redesigns. Never expire. / 15 rediseños. No vencen. | $2.99 |
| `credits_50` | 50 designs / 50 diseños | 50 room redesigns. Never expire. / 50 rediseños. No vencen. | $7.99 |
| `credits_150` | 150 designs / 150 diseños | 150 room redesigns. Never expire. / 150 rediseños. No vencen. | $19.99 |
