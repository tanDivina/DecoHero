# DecoHero SEO plan (deco.hero-apps.com), Nov 19 2026

The domain is new, and Christmas search peaks in late November and early December. The guide pages go after
long-tail questions people type while they shop for a tree. The room-design pages are slower and carry on after
the season.

## What is on branch seo/traffic

| URL | Target queries (from Google autocomplete, US / MX) |
|---|---|
| /christmas-tree-size-calculator | what size christmas tree for 8 / 9 / 10 / 12 foot ceiling, christmas tree size for ceiling height, what size christmas tree do i need, how wide is a 7 ft tree |
| /es/calculadora-arbol-de-navidad | que tamaño de arbol de navidad comprar, tamaño de arbol de navidad, arbol de 7 pies techo 2.40 |
| /where-to-put-christmas-tree | where to put christmas tree in (small) living room, where to put christmas tree in open floor plan, christmas tree in front of window, best place to put christmas tree |
| /es/donde-poner-el-arbol-de-navidad | donde poner el arbol de navidad en la sala, en un salon pequeño, mejor lugar para poner el arbol de navidad |
| /christmas-tree-themes | christmas tree theme ideas, nordic / tropical / pink coquette / tartan / winter wonderland christmas tree |
| /ai-room-design-from-photo | ai room design from photo, ai room design app free, ai interior design app, redesign my room ai, ai room design upload photo |
| /es/diseno-de-interiores-con-ia | diseño de interiores con ia, rediseñar habitación con ia desde foto |
| /styles + /styles/{12 ids} | japandi living room ideas, scandinavian / mid-century / boho / coastal / farmhouse / industrial / art deco / mediterranean / tropical modern living room and bedroom ideas |

There is no search-volume data yet (DataForSEO keys are missing in ~/Projects/keyword-mcp/.env). Before
Christmas, rank by Search Console impressions, not by guesses.

Technical work: JSON-LD (SoftwareApplication, FAQPage, Article, BreadcrumbList), hreflang pairs, sitemap.xml
(26 URLs with alternates), robots.txt, Christmas OG images, one CSP rule that covers every static page, and Play
links with utm_source=deco.hero-apps.com plus utm_campaign set to each page.

## Off-site checklist, in order

1. **Deploy, then check.** Merge seo/traffic, deploy, and then curl /sitemap.xml, /robots.txt,
   /styles, /styles/japandi and /es/calculadora-arbol-de-navidad (each should return 200). Also check that the
   CSP header is present on /styles/japandi and absent on /app. Run the Rich Results Test on /christmas-tree-size-calculator.
2. **Search Console (5 min).** sc-domain:hero-apps.com is already verified and covers deco.hero-apps.com. Under that
   property, submit `https://deco.hero-apps.com/sitemap.xml` in Sitemaps. Use URL Inspection and "Request indexing" for the
   two calculator pages, the two placement pages and the home page, because those are the ones on a deadline. Optional:
   add the URL-prefix property https://deco.hero-apps.com/ (verified automatically) so the weekly report and the
   keywords MCP show deco on its own row instead of inside hero-apps.com.
3. **GA4 (10 min).** Create a GA4 property with a web stream for https://deco.hero-apps.com (the weekly report finds
   properties by stream URL). Paste the G- ID into `GA4_ID` in scripts/build-site.mjs and rebuild. The CSP already
   allows it. Add one line on analytics to the privacy policy (EN + ES) before turning it on, and think about a
   consent banner for EU visitors. ga.js also logs `play_store_click` and `open_app_click` events.
   Lighter option: Vercel Web Analytics, which is cookieless and needs no banner, but the weekly email does not read it.
4. **Bing Webmaster Tools (5 min).** Import from Google Search Console and submit the sitemap. This also feeds
   ChatGPT search and Copilot answers.
5. **Links from your own sites (15 min, biggest quick win for a new subdomain).**
   - hero-apps.com: the DecoHero card should link to /christmas-tree-size-calculator with the anchor text
     "Christmas tree size calculator", next to the home link.
   - hero-apps.com/mateo and the other hero-apps pages: add a footer link.
   - bocasstyle.com: a December post on decorating a tropical home for Christmas that links to /christmas-tree-themes#tropical
     and to the Spanish placement guide.
   - Play listing: set the website field to https://deco.hero-apps.com.
6. **AI tool directories (1 to 2 h, do them all in one sitting).** Use the same short description and the Christmas OG image.
   There's An AI For That, Futurepedia, Toolify, AI Tool Hunt, TopAI.tools, AlternativeTo (list DecoHero as an
   alternative to RoomGPT, Interior AI and REimagineHome), SaaSHub and Product Hunt. Launch on Product Hunt on a
   Tuesday to Thursday in late November, with the Christmas angle.
7. **Partner link.** Ask Mike (Christmas Trees in the Mail) to link the calculator page from his size guide or
   FAQ. The page names his trees' size ranges and helps his buyers pick a size.
8. **Reddit and Pinterest (seasonal).** Before/after pins of the tree renders on Pinterest, linking to the themes and
   placement pages. On Reddit, answer "what size tree for my ceiling" questions in r/ChristmasTrees and
   r/HomeDecorating with the chart and no app pitch, and link the page only where the rules allow it.
9. **Hreflang and ES.** If the ES pages get impressions, add ES versions of the themes page and of the 3 most-viewed
   style pages.
10. **January.** Restore the room-redesign title and description in scripts/site-src/strings.mjs (the old values
   are in the comments there). Change the guide nav to lead with Styles. Keep the Christmas pages live all year,
   since they rank again the next November.

## Still open

- Only 3 of the 6 tree themes have sample renders (Winter wonderland, Pink coquette and Heritage tartan are text
  only). Rendering those 3 on the sample apartment would cost about $0.21 with tools/screenshots/gen-after.mjs, and
  then the themes page can show all six.
- The home hero still opens with room redesign, and only the metadata moved to Christmas. To lead with the tree,
  make the Christmas pair the default in the hero toggle (site.js) and swap the h1 for the season.
