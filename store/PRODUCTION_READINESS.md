# DecoHero: production readiness for Google Play

Audit date: Nov 15 2026. App `com.heroapps.decohero`, developer account Divina Endeavors LLC (organisation, so no 12-tester / 14-day closed test rule).

How this was checked:
- Play Developer API (androidpublisher v3), read-only: one edit opened, read and deleted without commit. Nothing was uploaded or changed.
- Repo `~/DecoHero` (branch `android-app`, HEAD b2383a8), live pages, and the live server's public `/health` and `/api/config`.
- The API cannot read the App content forms (data safety, content rating, target audience, ads, app access, privacy URL), the payments profile, or review status. Those rows say "unknown, needs console".

## 1. Verdict

Not submittable today. The store presence and products are in place; what is left is one account issue, one build, a set of stale claims in the listing, and console forms nobody can confirm from outside the console. If the payments issue is quick, this is about one working session.

Blockers, in order:

1. **Payments account issue (open since Oct 30).** Not readable by API, so the exact effect is unknown. An unresolved payments profile issue can stop sales or payouts for an app that sells in-app products. Dorien has to open it and do what it asks (it may need ID or bank details) before anything else.
2. **No production build yet.** At audit time the internal track still showed 1.0.5 (vc6); uploaded bundles are vc 1, 3, 4, 5, 6. Production is empty. 1.0.6 (vc7) has to land on internal, pass a quick device test, and then be promoted.
3. **The listing promises things the app no longer does.** Google can reject for misleading metadata, and users will notice.
   - Full description, EN and ES: "Your first 3 designs are free" / "Tus primeros 3 diseños son gratis". The server default is now 1 (`FREE_CREDITS`, `server/src/db.ts` line 116). The value set on Railway was not checked.
   - Screenshot 07 (EN checked by eye, ES is built from the same template): headline "Start with three free designs" and prices $2.99 / $7.99 / $19.99. Live Play prices are $3.99 / $9.99 / $24.99.
   - Decision for Dorien: either set `FREE_CREDITS=3` on Railway (the free count is true again at once, no listing change) or change the text to 1 (wording in section 3). The price tiles in screenshot 07 need a rebuild either way.
4. **App access instructions still say 3 free credits.** Replacement text in section 3.
5. **Production countries are not set.** The API returns an empty country list for the production track. The three products are already priced and available in 174 regions.
6. **App content forms: status unknown.** Content rating, target audience, ads, data safety, advertising ID, government / financial / health declarations. Internal testing does not need all of them, production does. Antigravity must open the Dashboard and "App content" and confirm each one shows as complete (section 4).
7. **Privacy policy is behind the code (fix before submitting, small).** Both published policies describe one Gemini call per design. The server now can also send the photo and the design to a second Gemini model, keeps a 7-day design record, receives ceiling height and the tapped spot, and the app shows an affiliate link. Wording in section 3. The data safety answers themselves still hold (see section 3.3).

Not blockers for the Android submission:
- Terms page TODOs: the terms cover the web app only and Play does not require terms. Still worth closing because the web app takes real payments (drafts in section 3.5).
- Amazon affiliate links: gated off on the server and the live config sends no shop links at all. Apply to Amazon after the listing is public.
- Christmas screenshots: optional. No `store/screenshots-xmas` set exists yet.
- Icon: the API shows the icon equal to `store/play-icon-512.png` for both languages. Whether a listing change is still waiting to be sent for review is not visible by API.

Review time after submitting is unknown; a first production review often takes several days.

## 2. Checklist

Status: done / missing / unknown (needs console). "API" means confirmed through the Play API on Nov 15 2026.

| # | Requirement | Status | Evidence / note | Owner |
|---|---|---|---|---|
| 1 | Payments profile healthy, merchant account active | unknown, urgent issue open since Oct 30 | Not readable by API | Dorien |
| 2 | Developer account verified (identity, D-U-N-S, phone, email) | unknown | Account level | Dorien |
| 3 | EU trader status declared (Digital Services Act; needed to distribute in the EU) | unknown | Account level, organisation = trader | Dorien |
| 4 | Signed AAB for production, target API level | missing | Internal = 1.0.5 (vc6); vc7 in progress. targetSdk 36, minSdk 24 | Claude (build), Antigravity (promote) |
| 5 | Release notes EN + ES | missing | Draft in section 3.6 | Claude / Antigravity |
| 6 | App name EN / ES | done | API: "DecoHero: Room Redesign AI", "DecoHero: Rediseña tu espacio" | |
| 7 | Short description EN / ES | done | API, matches `store/listing.md` | |
| 8 | Full description EN / ES | done but stale | "first 3 designs free" in both; no mention of Christmas mode (optional) | Dorien decides, Claude pushes or Antigravity pastes |
| 9 | App icon 512 | done | API hash = `store/play-icon-512.png` (both languages). Pending review state unknown | Antigravity to confirm |
| 10 | Feature graphic 1024x500 | done | API hash = `store/feature-graphic-en.png` / `-es.png` | |
| 11 | Phone screenshots (2 to 8) | done but 07 is stale | 7 per language, 1080x1920, = `store/screenshots-v2/{en,es}/01..07.png`. 07: "three free designs" and old prices | Claude (rebuild + push) |
| 12 | Screenshots show Christmas mode | no | None of the 7 show it; no xmas set in `store/`. `tools/screenshots/push-play.py --set xmas` is ready once a set exists. Optional | Claude |
| 13 | 7-inch / 10-inch tablet screenshots | none | Optional. Console may show a recommendation, not a blocker | |
| 14 | Category and tags | unknown | Planned: House & Home; interior design, home decor, room planner | Antigravity |
| 15 | Contact details | done | API: support@hero-apps.com, website `http://hero-apps.com/decohero` (works; switch to https when in the console) | Antigravity |
| 16 | Privacy policy URL in Play | unknown | Planned `https://hero-apps.com/decohero/privacy.html` (returns 200; the app links to the same URL) | Antigravity |
| 17 | Privacy policy content matches the app | missing | Section 3.2 | Claude writes, Dorien approves and deploys |
| 18 | App access | wrong text | Says 3 free credits. Section 3.1 | Antigravity |
| 19 | Ads declaration | unknown | Planned "No ads" (no ad SDK). The app does show an affiliate tree-shop button with "We may earn a commission." Whether Play counts that as ads is a judgement call: read the help text beside the question. Paid placements and store links are normally not "ads" there, but this is not confirmed | Antigravity, Dorien decides if unclear |
| 20 | Content rating (IARC questionnaire) | unknown | Planned answers in `store/data-safety.md`: utility, no objectionable content, no user interaction, digital purchases yes | Antigravity |
| 21 | Target audience and content | unknown | Planned 18 and over, not appealing to children | Antigravity |
| 22 | Data safety form | unknown whether submitted | Answers in `store/data-safety.md` still correct, no change needed (section 3.3) | Antigravity |
| 23 | Advertising ID declaration | unknown | Answer No. `AD_ID` is blocked in `mobile/app.json` | Antigravity |
| 24 | Government apps | unknown | Answer No | Antigravity |
| 25 | Financial features | unknown | Answer: none of the listed features (consumable in-app purchases only) | Antigravity |
| 26 | Health apps | unknown | Answer: no health features | Antigravity |
| 27 | News apps | unknown | Answer No | Antigravity |
| 28 | Photo and video permissions declaration | not expected | `READ_MEDIA_*` blocked; system photo picker. If the console asks after vc7, check the merged manifest | Claude if asked |
| 29 | Other sensitive permission declarations (foreground service, exact alarm, location) | not applicable | Only CAMERA requested | |
| 30 | AI-generated content | policy met in app; no separate form known | Report button on every design (`ResultsScreen.tsx`, `/api/report`), fixed prompts, no free text. If the console shows an AI question, answer Yes with in-app reporting | Antigravity |
| 31 | User-generated content policy | not applicable | Users cannot see each other's content; sharing is the Android share sheet only | |
| 32 | Account deletion URL | not applicable on Android | No accounts in the Android app; deletion by email with the install ID (stated in the policy). Web accounts are web only | |
| 33 | Countries / regions for production | missing | API: empty for production | Antigravity, Dorien picks the list |
| 34 | App pricing | done | Free app | |
| 35 | In-app products active | done | API: `credits_15`, `credits_50`, `credits_150`, purchase options ACTIVE, 174 regions, none unavailable. EN + es-419 titles | |
| 36 | Product prices | done | API: US $3.99 / $9.99 / $24.99; BE EUR 4.39 / 10.99 / 26.99; MX MXN 85 / 215 / 539. EU withdrawal type set to digital content | |
| 37 | Product table in `store/listing.md` | stale (repo only) | Still says $2.99 / $7.99 / $19.99 | Claude |
| 38 | Purchase + refund flow | done | Tested on internal (per notes) | |
| 39 | RevenueCat webhook to production server | done | Per notes; server `/health` ok | |
| 40 | Gemini key on paid tier (policy says so; applies to both models, same key) | unknown | Check billing is active on project `decohero-prod` | Antigravity |
| 41 | Daily caps sized for launch | unknown | `MAX_GENERATIONS_PER_DAY` default 300; GCP budget alert was $30/month | Dorien |
| 42 | Play App Signing | done | Uploads to internal work | |
| 43 | Terms page | not required by Play | Web only; TODOs open (section 3.5) | Dorien |
| 44 | Amazon Associates app approval | after launch | Needs the public listing. `AMAZON_APP_APPROVED` stays unset | Dorien |

## 3. Ready-to-paste text

### 3.1 App access

Simplest correct choice: **"All functionality in my app is available without any access restrictions."** There is no login, so no instructions are needed.

If the form is kept on "restricted" with instructions, replace the text with:

```
No login or account is needed. Open the app, take or choose a photo of a room, pick a style and tap Redesign.
Every new install gets 1 free credit, which makes 1 design. That is enough to see the full flow: redesign, compare with the original (press and hold), save, share and report.
More designs need a credit pack (in-app purchase through Google Play Billing: 15, 50 or 150 credits). Nothing else is locked.
Christmas mode: choose a Christmas theme, enter the ceiling height and optionally tap where the tree should stand.
Languages: English and Spanish (follows the phone language).
```

One free credit means a reviewer can make exactly one design. If Dorien prefers more room for the reviewer, `FREE_CREDITS=3` on Railway during review also makes the current listing text true; then say "3 free credits" above.

### 3.2 Listing text if the free count stays at 1

EN, replaces the line under NO ACCOUNT, NO SUBSCRIPTION:

```
Your first design is free. After that, buy a credit pack: one credit is one design, and credits never expire. Any purchase also removes the small DecoHero mark from new designs.
```

ES:

```
Tu primer diseño es gratis. Después, compra un paquete de créditos: un crédito es un diseño y los créditos no vencen. Cualquier compra también quita la pequeña marca DecoHero de tus nuevos diseños.
```

Screenshot 07 headline: "Start with a free design" / "Empieza con un diseño gratis", price tiles $3.99, $9.99, $24.99.

Optional Christmas paragraph (EN / ES), only while Christmas mode is on:

```
CHRISTMAS MODE
See a decorated Christmas tree in your own room. Pick a theme, tell the app your ceiling height and tap where the tree should stand.
```

```
MODO NAVIDAD
Mira un árbol de Navidad decorado en tu propio espacio. Elige un tema, indica la altura del techo y toca el lugar donde va el árbol.
```

### 3.3 Data safety: what changed and what to answer

Code checked: `server/src/gemini.ts`, `app.ts`, `db.ts`, `shopLinks.ts`, `treeCatalog.ts`, `mobile/src/api.ts`.

| New behaviour | What the code does | Data safety effect |
|---|---|---|
| Place check (`PLACE_CHECK=on`) | Sends the **generated design only** to `gemini-3.5-flash-lite` and asks where the tree stands. May trigger one more image generation (photo sent to the image model again). Logs coordinates and totals, no IDs, no images | None. Same data type (Photos), same recipient (Gemini API, same key), still in memory only |
| Door check (`DOOR_CHECK=on`) | Sends the **user's photo and the design** to `gemini-3.5-flash-lite` with a yes/no question | None, same reasoning |
| Tree size and spot | Request carries ceiling height, optional tree height (cm) and the tapped point. Used for the prompt, not stored | Covered by "App interactions". No change |
| `designs` table | Design ID, install ID, style ID, whether the free move was used, time. Purged after 7 days | Covered by "App interactions". No change |
| Partner link | Tree buttons open `christmastreesinthemail.com` in the browser with the referral parameter. The app sends the partner nothing about the user | No data shared. No change |
| Amazon / plain shop links | Live config currently returns none. Amazon links gated by `AMAZON_APP_APPROVED` | No change |
| Firebase accounts | Web app only | Not part of the Android form |

Answers stay as in `store/data-safety.md`: Photos (collected, not shared, ephemeral, app functionality); Purchase history; App interactions; Device or other IDs; encrypted in transit yes; deletion request yes.

Whether `PLACE_CHECK` and `DOOR_CHECK` are switched on in production is unknown (Railway variables; the startup log line says "door check on/off; place check on/off"). The policy wording below is true either way.

Suggested addition to the repo note in `store/data-safety.md` (first table, photo row): "then the Gemini API (image model, plus the check model `gemini-3.5-flash-lite` for Christmas designs when `DOOR_CHECK` / `PLACE_CHECK` are on)".

### 3.4 Privacy policy updates

Apply to both: `~/hero-apps/decohero/privacy.html` (the Android page, the URL the app and Play use) and `PRIVACY_POLICY.md` + `scripts/site-src/privacy.es.md` (deco.hero-apps.com). Update the "Last updated" date.

**Section 1, replace the sentence "Our server sends the photo and a fixed style instruction to the Google Gemini API, receives the redesigned image, and returns it to your device." with:**

```
Our server sends the photo and a fixed style instruction to the Google Gemini API, receives the redesigned image, and returns it to your device. For Christmas designs the app also sends the ceiling height you entered, the tree size you chose and, if you tapped one, the spot for the tree. To check the result, our server may send the design, and in some cases your photo with it, to a second Google Gemini model that only answers a question, such as where the tree stands or whether a door was covered. If the answer shows a mistake, the server makes the design once more at no cost to you. These checks use the same Gemini API under the same terms, and nothing from them is stored.
```

ES:

```
Nuestro servidor envía la foto y una instrucción de estilo fija a la API de Google Gemini, recibe la imagen rediseñada y la devuelve a tu dispositivo. En los diseños de Navidad la app también envía la altura del techo que indicaste, el tamaño del árbol que elegiste y, si tocaste uno, el lugar para el árbol. Para revisar el resultado, nuestro servidor puede enviar el diseño, y en algunos casos tu foto junto con él, a un segundo modelo de Google Gemini que solo responde una pregunta, por ejemplo dónde está el árbol o si una puerta quedó tapada. Si la respuesta muestra un error, el servidor genera el diseño una vez más sin costo para ti. Estas revisiones usan la misma API de Gemini con las mismas condiciones y no se guarda nada de ellas.
```

**Section 2, new table row (after "Design log"):**

```
| Christmas design record | Your ID, a random design ID, the theme, whether its free "Move tree" was used, and the time. Deleted automatically after 7 days. It does not include your photo or the design. | Lets you move the tree once for free |
```

ES:

```
| Registro de diseño de Navidad | Tu ID, un ID de diseño aleatorio, el tema, si ya se usó el "Mover árbol" gratis y la hora. Se borra automáticamente a los 7 días. No incluye tu foto ni el diseño. | Permite mover el árbol una vez gratis |
```

**"Who else receives data" table, Gemini row, replace "What it receives":**

```
Your room photo, the generated design (for the checks in section 1) and the style instruction
```

ES: `La foto de tu espacio, el diseño generado (para las revisiones de la sección 1) y la instrucción de estilo`

**New short section "Shop links" (before "Permissions"):**

```
## Shop links
In Christmas mode the app shows links to stores, for example to buy a real tree from our partner Christmas Trees in the Mail. Some are affiliate links: if you buy after tapping one, we may earn a commission, and the app says so next to the link. A link opens in your browser or in the store's app. We do not send the store your photo, your designs or your ID; the link only tells the store that the visit came from DecoHero. What you do on the store's site is covered by that store's privacy policy.
```

ES:

```
## Enlaces a tiendas
En el modo Navidad la app muestra enlaces a tiendas, por ejemplo para comprar un árbol natural de nuestro socio Christmas Trees in the Mail. Algunos son enlaces de afiliado: si compras después de tocar uno, podemos recibir una comisión, y la app lo indica junto al enlace. El enlace se abre en tu navegador o en la app de la tienda. No enviamos a la tienda tu foto, tus diseños ni tu ID; el enlace solo le indica que la visita viene de DecoHero. Lo que hagas en el sitio de la tienda se rige por la política de privacidad de esa tienda.
```

When Amazon links go live later, add: "Amazon links are affiliate links too: as an Amazon Associate we earn from qualifying purchases."

**Section 10 (retention), add after the 48-hour sentence:** "Christmas design records are deleted after 7 days." / "Los registros de diseños de Navidad se borran a los 7 días."

### 3.5 Terms drafts (web terms, `scripts/site-src/terms.en.md`)

Drafts only, not legal advice. The existing TODO asks for a lawyer's review of sections 4, 7 and 8; that still stands.

**Scope line (top), so the Android app is covered:**

```
These terms apply when you use DecoHero, in the Android app or in the web app at https://deco.hero-apps.com/app, and when you buy credits. Purchases in the Android app are made through Google Play and are also subject to Google Play's terms.
```

**Section 3, credits on web and Android.** In the code the Android balance belongs to an install ID and the web balance to a sign-in, with no link between them:

```
Credits bought in the Android app and credits bought in the web app are separate balances. They cannot be moved from one to the other.
```

**Section 4, refunds. Replace the second bullet with:**

```
- Unused packs: if you have not used any credit from a pack, you can ask for a full refund within 14 days of buying it.
- Used packs: once you have used a credit from a pack, that pack is not refundable, except where the law of your country gives you a right we cannot exclude, or where the app did not work as described.
- Web purchases: email support@hero-apps.com from the address of the Google account you sign in with, and tell us which purchase it is about.
- Android purchases: refunds are handled by Google Play under its refund policy. Ask through Google Play, or email us and we will help.
```

**Section 4, EU, EEA and UK withdrawal (new paragraph):**

```
If you live in the European Union, the European Economic Area or the United Kingdom, you have 14 days to withdraw from a purchase of digital content without giving a reason. Credits are digital content that we supply as soon as you use them. By using a credit from a pack within those 14 days, you ask us to start supplying it immediately and you accept that you lose the right of withdrawal for that pack. A pack with no credits used can be withdrawn from within 14 days for a full refund: email support@hero-apps.com.
```

Notes for Dorien:
- For the waiver to hold, EU and UK rules expect the buyer's express consent before supply starts, plus a confirmation (for example in the receipt). For Android, Play handles this; the three products are already marked as digital content with withdrawal right in Play. For the web checkout this needs a line or checkbox at the point of purchase, which is a code change and not done.
- If the rule above is too generous or too strict, the two knobs are the 14 days for unused packs and whether partly used packs get anything back.

**Section 8, governing law. Choice for Dorien** (company is in the United States, owner lives in Panama; the state of registration was not found in the repo):

Option A, state of registration (usual choice):

```
These terms are governed by the laws of the State of [STATE WHERE DIVINA ENDEAVORS LLC IS REGISTERED], United States, without regard to its conflict of law rules. Disputes go to the state or federal courts located in [STATE]. If you are a consumer, the mandatory consumer protection rules of the country where you live still apply to you, and you may also bring a claim in the courts of that country.
```

Option B, same law but no fixed court (softer, fewer promises):

```
These terms are governed by the laws of the State of [STATE], United States. If you are a consumer, the mandatory consumer protection rules of the country where you live still apply to you, and nothing here stops you from bringing a claim in the courts of that country.
```

Panama as governing law is not recommended: the contracting company is the US LLC.

Still open in the same file and not drafted here: liability cap amount, notice period before closing the service, ownership wording for AI designs (section 7).

### 3.6 Release notes for the production release (1.0.6)

EN (`en-US`):

```
First public release. Photograph a room and see it redesigned in 12 styles. Christmas mode: see a real-size tree in your room, tap where it should stand, and move it once for free.
```

ES (`es-419`):

```
Primera versión pública. Toma una foto de tu espacio y míralo rediseñado en 12 estilos. Modo Navidad: mira un árbol de tamaño real en tu espacio, toca dónde va y muévelo una vez gratis.
```

## 4. Steps for Antigravity (Play Console, in the browser)

Rules: no em dashes in any text. Do not start the production rollout until Dorien says go. Stop and hand over to Dorien at anything that needs ID, bank details or 2FA.

1. **Payments issue.** Open the urgent notice (Inbox / Settings > Payments profile). Write down exactly what it asks for and the deadline. If it needs documents or bank details, stop and give Dorien the list.
2. **Account checks.** Settings > Developer account: confirm identity verification is complete and note whether EU trader status is declared. Report both.
3. **Dashboard.** Open the app's Dashboard and "Publishing overview". List every task still shown as incomplete under "Set up your app" and "Publish your app on Google Play", and any change waiting under "Changes not yet sent for review" (this is where a pending icon change would show).
4. **App content** (Policy > App content). Confirm or complete each form with the answers in `store/data-safety.md`:
   - Privacy policy: `https://hero-apps.com/decohero/privacy.html`
   - App access: use section 3.1 of this file
   - Ads: No. If the help text says affiliate links count as ads, stop and ask Dorien
   - Content rating questionnaire: complete and submit; note the rating
   - Target audience: 18 and over
   - Data safety: as in `store/data-safety.md`, no changes; confirm it is submitted
   - Advertising ID: No
   - Government apps: No. Financial features: none. Health: none. News: No
5. **Store settings.** Category House & Home; tags interior design, home decor, room planner; website `https://hero-apps.com/decohero`; email support@hero-apps.com.
6. **Listing text.** Only after Dorien decides on 1 or 3 free designs: if 1, paste the lines from section 3.2 into the EN and es-419 full descriptions (or ask Claude to push them by API with the new screenshot 07).
7. **Countries.** Production > Countries / regions: add the countries Dorien chooses (ask her; default suggestion is all available countries).
8. **Gemini billing.** Google Cloud console, project `decohero-prod`: confirm a billing account is linked and active (the privacy policy promises the paid tier). Report the current month's spend.
9. **Production release.** After Claude confirms 1.0.6 (vc7) is on internal and device-tested: Production > Create new release > add vc7 from library, release notes from section 3.6, then "Send for review" when Dorien says go. Choose managed publishing on if Dorien wants to pick the go-live moment.
10. **Report back:** each form's status, the payments issue text, the content rating, the country count, anything the console flagged, and the review submission time. No keys or account numbers in the report.
