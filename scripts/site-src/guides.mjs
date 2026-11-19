// Guide pages (SEO landing pages) built by build-site.mjs with guide.tpl.html.
// Rules for this copy: no em dashes, no emoji, no invented numbers, reviews or user counts. Every picture
// is real model output from store/rooms (see store/rooms/README.md) or site/img/rooms.
// Tree sizes follow the app: tallest tree = ceiling minus 12 in (30 cm), see mobile/src/treeSize.ts.
// Each body is a function of h, the helpers in build-site.mjs:
//   h.fig(src, alt, caption?)             one picture (width/height read from the file)
//   h.pair(before, after, bAlt, aAlt, afterLabel, caption?)   before and after side by side
//   h.url(key)                            path of another guide, by key
//   h.calc()                              the ceiling calculator (needs scripts: ["tree-calc"])
//   h.sizeTable()                         the ceiling chart for this page's language
//   h.styleCards(ids?)                    cards linking to style pages (EN)

const XMAS_BEFORE_ALT = "Sample apartment living room before: beige sofa, brown armchair, glass coffee table, a TV on a pine chest and a window with curtains";
const SALA_BEFORE_ALT = "Sample living room in a Panama house before: two brown sofas, tiled floor, tall barred windows and stacked plastic chairs next to the TV";
const SALA_BEFORE_ALT_ES = "Sala de muestra en una casa de Panamá antes: dos sofás marrones, piso de baldosa, ventanas altas con rejas y sillas plásticas apiladas junto al televisor";
const XMAS_BEFORE_ALT_ES = "Sala de apartamento de muestra antes: sofá beige, sillón marrón, mesa de centro de vidrio, televisor sobre una cómoda de pino y una ventana con cortinas";

export const guides = [
  // ------------------------------------------------------------------ tree size calculator (EN)
  {
    key: "tree-size",
    lang: "en",
    slug: "christmas-tree-size-calculator",
    pair: "tree-size-es",
    campaign: "tree_size",
    scripts: ["tree-calc"],
    title: "What size Christmas tree for your ceiling? Calculator and chart",
    desc: "Enter your ceiling height and get the tallest Christmas tree that fits, with 12 inches left for the stand and the topper. Chart for 7 to 12 ft ceilings, in feet and metres.",
    eyebrow: "Christmas tree size",
    h1: "What size Christmas tree fits your ceiling?",
    lede: "Measure your ceiling, take off 12 inches, and you have the tallest tree to buy. That foot of space is for the stand under the tree and the star on top. Type your ceiling height below, or find it in the chart.",
    og: "/img/rooms/xmas-living-room-classic.webp",
    body: (h) => `
${h.calc()}
<section class="prose">
  <h2 id="chart">Christmas tree size chart by ceiling height</h2>
  <p>Tallest tree is the ceiling height minus 12 in (30 cm). Width is for a full farm-grown fir, which is usually about two thirds as wide as it is tall. Slim and pencil trees need much less floor.</p>
</section>
${h.sizeTable()}
<section class="prose">
  <h2 id="8-foot-ceiling">8 foot ceiling: a 7 foot tree</h2>
  <p>Eight feet is the standard ceiling in most US homes and apartments, and the tallest tree for it is 7 ft. The popular 7.5 ft artificial tree leaves only 6 inches, which is tight once the stand lifts the tree and the topper goes on. If you love a 7.5 ft tree, pair it with a low stand and a flat star, or choose 7 ft and keep the tall topper.</p>
  <h2 id="9-foot-ceiling">9 foot ceiling: an 8 foot tree</h2>
  <p>A 9 ft ceiling takes an 8 ft tree. If your topper is tall, like a large star or a big bow, drop to 7.5 ft so it does not bend against the ceiling.</p>
  <h2 id="10-foot-ceiling">10 foot ceiling and higher</h2>
  <p>For 10 ft, buy a 9 ft tree. Above that the same rule holds, but very tall trees get wide: a full 9 ft fir can be about 6 ft across at the bottom, so check the floor before you check the ceiling. With a vaulted or sloped ceiling, measure at the exact spot where the tree will stand, not at the highest point of the room.</p>
  <h2 id="ranges">Sold as "6-7 ft"? Use the top number</h2>
  <p>Real trees are cut by hand and often sold in ranges, and a tree listed as 6-7 ft can arrive at 7 ft. Plan for the top of the range. The farm-cut trees DecoHero links to are sold this way, so the app picks the tree by the tallest size that may arrive.</p>
  <h2 id="width">Check the width, too</h2>
  <p>A 7 ft fir that is about 4.5 to 5 ft wide at the bottom needs a circle of floor that size, plus room to walk past it. Before you order, put a strip of tape on the floor where the lowest branches will reach. If the circle blocks a door or a walkway, go one size down or choose a slimmer tree.</p>
  <h2 id="measure">How to measure your ceiling</h2>
  <p>Measure from the floor to the ceiling at the spot where the tree will stand, with a tape measure or a laser measure. Older homes and rooms with beams or a sloped ceiling are often lower in one corner than in the middle of the room.</p>
  <h2 id="see-it">See the size in your own room</h2>
  <p>A number on a chart is hard to picture. In DecoHero's Christmas mode you enter your ceiling height and add a photo of your room. The app picks the tallest tree that leaves 12 in under the ceiling, and draws that tree into your photo at that height. You can tap where it should stand and compare up to four decorating styles. Tree sizes in the picture are estimates, so measure before you order.</p>
  ${h.pair("/img/rooms/xmas-living-room-before.webp", "/img/rooms/xmas-living-room-classic.webp", XMAS_BEFORE_ALT, "The same living room with a Christmas tree in Classic warmth style between the sofa and the armchair: red and gold baubles, warm lights, a star on top and gifts on a red tree skirt", "After, Classic warmth", "Sample room. Designs are AI-generated ideas, not exact products or measurements.")}
</section>`,
    faq: [
      ["What size Christmas tree for an 8 foot ceiling?", "A 7 ft tree. That leaves 12 inches for the stand and the topper."],
      ["Will a 7.5 ft tree fit under an 8 ft ceiling?", "Only just. It leaves 6 inches, so you need a low stand and a flat topper. A 7 ft tree is the safer choice."],
      ["What size Christmas tree for a 9 foot ceiling?", "An 8 ft tree, or 7.5 ft if your topper is tall."],
      ["What size Christmas tree for a 10 foot ceiling?", "A 9 ft tree. Check the width as well: a full 9 ft fir can be about 6 ft across at the bottom."],
      ["How wide is a 7 ft Christmas tree?", "A full farm-grown fir is usually about two thirds as wide as it is tall, so about 4.5 to 5 ft at the bottom. Slim and pencil trees are much narrower."],
      ["What size tree for a small apartment?", "Measure the ceiling and the floor space. A 5 or 6 ft tree suits most apartment living rooms. With very little floor, a 3 or 4 ft tree on a side table works."],
    ],
    cta_h: "Try a tree in your own room",
    cta_p: "Add a photo, enter your ceiling height and see the tree that fits, in up to four decorating styles. Your first design is free.",
    related: ["tree-placement", "tree-themes", "room-design"],
  },

  // ------------------------------------------------------------------ tree size calculator (ES)
  {
    key: "tree-size-es",
    lang: "es",
    slug: "calculadora-arbol-de-navidad",
    pair: "tree-size",
    campaign: "tree_size_es",
    scripts: ["tree-calc"],
    title: "¿De qué tamaño comprar el árbol de Navidad? Calculadora por altura del techo",
    desc: "Escribe la altura de tu techo y mira el árbol de Navidad más alto que cabe, con 30 cm libres para la base y la estrella. Tabla en metros y en pies.",
    eyebrow: "Tamaño del árbol de Navidad",
    h1: "¿De qué tamaño comprar el árbol de Navidad?",
    lede: "Mide el techo, réstale 30 cm y tienes la altura máxima del árbol. Esos 30 cm son para la base que levanta el árbol y para la estrella de arriba. Escribe la altura de tu techo o búscala en la tabla.",
    og: "/img/rooms/sala-panama-xmas-tropical.webp",
    body: (h) => `
${h.calc()}
<section class="prose">
  <h2 id="tabla">Tabla de tamaños según la altura del techo</h2>
  <p>Árbol más alto = altura del techo menos 30 cm. El ancho es el de un abeto natural frondoso, que suele medir unas dos terceras partes de su altura. Los árboles delgados ocupan mucho menos piso.</p>
</section>
${h.sizeTable()}
<section class="prose">
  <h2 id="pies">Árboles en pies: 6, 6,5 y 7 pies</h2>
  <p>En muchas tiendas de Panamá, México y el resto de América Latina los árboles se venden en pies. Un árbol de 6 pies mide 1,83 m, uno de 6,5 pies 1,98 m, uno de 7 pies 2,13 m y uno de 7,5 pies 2,29 m. Con un techo de 2,40 m, el de 6,5 pies cabe con margen. El de 7 pies deja 27 cm, así que funciona con una base baja y una estrella plana.</p>
  <h2 id="techo-bajo">Techo de 2,20 a 2,50 m</h2>
  <p>Es la altura de muchos apartamentos. Con 2,20 m, el árbol más alto es de 1,90 m. Con 2,50 m, de 2,20 m. Si el techo tiene vigas o una parte más baja, mide justo donde va a ir el árbol.</p>
  <h2 id="ancho">Revisa también el ancho</h2>
  <p>Un árbol frondoso de 2,10 m puede medir 1,40 m de ancho abajo. Antes de comprarlo, marca en el piso con cinta un círculo de ese tamaño. Si tapa una puerta o el paso, elige un tamaño menos o un árbol delgado.</p>
  <h2 id="calor">Lejos del calor</h2>
  <p>La NFPA, la asociación de prevención de incendios de Estados Unidos, recomienda dejar al menos 90 cm (3 pies) entre el árbol y cualquier fuente de calor: estufas, calentadores, velas o lámparas que se calientan. Un árbol natural necesita agua en la base todos los días.</p>
  <h2 id="en-tu-sala">Míralo en tu propia sala</h2>
  <p>En el modo Navidad de DecoHero escribes la altura de tu techo y subes una foto de tu sala. La app elige el árbol más alto que deja 30 cm libres y lo dibuja en tu foto a esa altura. Puedes tocar el lugar donde lo quieres y comparar hasta cuatro estilos de decoración. El tamaño en la imagen es una estimación: mide antes de comprar.</p>
  ${h.pair("/img/rooms/sala-panama-before.webp", "/img/rooms/sala-panama-xmas-tropical.webp", SALA_BEFORE_ALT_ES, "La misma sala con un árbol de Navidad estilo Navidad tropical donde estaban las sillas apiladas: adornos tejidos, estrella de ratán y base de cesta. Sofás, televisor, ventanas y piso sin cambios", "Después, Navidad tropical", "Sala de muestra. Los diseños son ideas generadas con IA, no productos ni medidas exactas.")}
</section>`,
    faq: [
      ["¿Qué tamaño de árbol para un techo de 2,40 m?", "Hasta 2,10 m. Un árbol de 6,5 pies (1,98 m) cabe con margen."],
      ["¿Cabe un árbol de 7 pies en un techo de 2,40 m?", "Muy justo: quedan 27 cm. Necesitas una base baja y una estrella plana."],
      ["¿Qué tamaño de árbol para un techo de 2,70 m?", "Hasta 2,40 m, es decir, un árbol de 7,5 pies (2,29 m)."],
      ["¿Cuánto mide de ancho un árbol de 7 pies?", "Un abeto frondoso suele medir unas dos terceras partes de su altura, es decir, entre 1,40 y 1,50 m abajo. Los árboles delgados son mucho más angostos."],
    ],
    cta_h: "Prueba un árbol en tu propia sala",
    cta_p: "Sube una foto, escribe la altura del techo y mira el árbol que cabe, en hasta cuatro estilos de decoración. Tu primer diseño es gratis.",
    related: ["tree-placement-es", "room-design-es"],
  },

  // ------------------------------------------------------------------ tree placement (EN)
  {
    key: "tree-placement",
    lang: "en",
    slug: "where-to-put-christmas-tree",
    pair: "tree-placement-es",
    campaign: "tree_placement",
    title: "Where to put a Christmas tree: placement ideas for small living rooms",
    desc: "Where a Christmas tree works in a living room: corners, next to a window, in place of a chair, in an open floor plan. With real before and after pictures and the safety distances.",
    eyebrow: "Christmas tree placement",
    h1: "Where to put your Christmas tree",
    lede: "The best spot is close to an outlet, at least 3 ft from heat, out of the walkway and in view from where you sit. In a small living room that usually means a corner, the side of a window, or the spot of a chair you move out for December.",
    og: "/img/rooms/xmas-living-room-classic.webp",
    body: (h) => `
<section class="prose">
  <h2 id="checklist">Before you pick a spot</h2>
  <ul>
    <li><strong>An outlet nearby.</strong> Lights need power, and a cable across the floor is a trip hazard. Run a short extension along the wall, not across a walkway.</li>
    <li><strong>3 ft from heat.</strong> The NFPA, the US fire protection association, advises at least 3 ft between the tree and any heat source: fireplaces, radiators, heat vents, space heaters, candles and lamps that run hot.</li>
    <li><strong>Doors and walkways stay clear.</strong> A full tree is about two thirds as wide as it is tall. Check that every door still opens all the way.</li>
    <li><strong>Visible from the sofa.</strong> You will look at the tree most from your seat, so check the view from there, not from the doorway.</li>
  </ul>
  <h2 id="corner">A corner</h2>
  <p>A corner takes up the least usable floor, hides the cable, and leaves the room's main paths alone. It also suits homes with toddlers or pets, because there are only two open sides to guard. If the corner is next to a door, use another corner: a tree that blocks a door swing gets knocked every time someone comes in.</p>
  <h2 id="window">Next to a window, or in front of it</h2>
  <p>A tree in a window is seen from the street, which many people want. The trade-offs are less daylight, curtains you can't close, and in many homes a radiator under the window, which is too close to a real tree. Standing the tree beside the window instead keeps most of the light and still shows the lights from outside.</p>
  ${h.pair("/img/rooms/xmas-living-room-before.webp", "/img/rooms/xmas-living-room-tropical.webp", XMAS_BEFORE_ALT, "The same living room with a Christmas tree in Tropical Christmas style in the gap between the sofa and the armchair, by the window: woven and blush ornaments, a rattan star and a basket base", "After, Tropical Christmas", "Sample apartment: the tree uses the gap between the sofa and the armchair, by the window. AI-generated ideas, not exact products or measurements.")}
  <h2 id="small-living-room">In a small living room, swap out a piece of furniture</h2>
  <p>In a small room the easiest floor to find is under something you can live without for a month: an armchair, a side table, a plant stand, a stack of extra chairs. Move it to a bedroom or storage and give the tree its spot. In the sample below the tree stands where a stack of plastic chairs used to be, and the rest of the room is unchanged.</p>
  ${h.pair("/img/rooms/sala-panama-before.webp", "/img/rooms/sala-panama-xmas-tropical.webp", SALA_BEFORE_ALT, "The same room with a Christmas tree in Tropical Christmas style where the stacked chairs stood: woven ornaments, a rattan star and a basket base. Sofas, TV, windows and floor are unchanged", "After, Tropical Christmas", "Sample room in Panama. AI-generated ideas, not exact products or measurements.")}
  <p>Other options when floor space is short: a slim or pencil tree, which needs about half the floor of a full fir, or a 3 to 4 ft tabletop tree on a side table or a console.</p>
  <h2 id="open-floor-plan">In an open floor plan</h2>
  <p>Put the tree against a wall or a large piece of furniture that faces the seating area, so it belongs to the living room and not to the kitchen or the hall. Keep it out of the line between the kitchen and the sofa, which is the path people walk most.</p>
  <h2 id="tv">Next to the TV</h2>
  <p>A tree beside the TV wall is in view whenever you sit down, and the outlets are already there. Leave enough space that the branches do not cover the screen or the speakers, and keep it away from the back of electronics that run warm.</p>
  <h2 id="try">Try a few spots before you move anything</h2>
  <p>DecoHero's Christmas mode draws a tree into a photo of your own room. Tap the spot where it should stand, or let the app choose a free spot, then compare. Each try uses one credit, and the first design is free. In the app's Christmas mode the tree stands on the open floor nearest your tap and keeps clear of doors.</p>
</section>`,
    faq: [
      ["Where should a Christmas tree go in a small living room?", "In a corner, beside a window, or in the spot of a chair or side table that you move out for December. Keep it 3 ft from heat and out of walkways."],
      ["Can I put a Christmas tree in front of a window?", "Yes, and it is seen from outside. Check for a radiator or heat vent under the window first: the NFPA advises 3 ft between the tree and any heat source."],
      ["How far should a Christmas tree be from a fireplace or radiator?", "At least 3 ft, according to the US National Fire Protection Association. Water a real tree every day as well."],
      ["Where do you put a Christmas tree in an open floor plan?", "Against a wall or a large piece of furniture that faces the seating area, out of the path between the kitchen and the sofa."],
    ],
    cta_h: "See the tree in your room before you move a thing",
    cta_p: "Add a photo of your room and tap where the tree should stand. Compare up to four decorating styles side by side. Your first design is free.",
    related: ["tree-size", "tree-themes", "room-design"],
  },

  // ------------------------------------------------------------------ tree placement (ES)
  {
    key: "tree-placement-es",
    lang: "es",
    slug: "donde-poner-el-arbol-de-navidad",
    pair: "tree-placement",
    campaign: "tree_placement_es",
    title: "Dónde poner el árbol de Navidad en una sala pequeña: ideas reales",
    desc: "Dónde poner el árbol de Navidad en la sala: en una esquina, junto a la ventana, en lugar de un sillón o en un espacio abierto. Con fotos de antes y después y las distancias de seguridad.",
    eyebrow: "Dónde poner el árbol",
    h1: "Dónde poner el árbol de Navidad",
    lede: "El mejor lugar está cerca de un tomacorriente, a 90 cm de cualquier fuente de calor, fuera del paso y a la vista desde donde te sientas. En una sala pequeña eso suele ser una esquina, un lado de la ventana o el lugar de un mueble que sacas en diciembre.",
    og: "/img/rooms/sala-panama-xmas-tropical.webp",
    body: (h) => `
<section class="prose">
  <h2 id="antes">Antes de elegir el lugar</h2>
  <ul>
    <li><strong>Un tomacorriente cerca.</strong> Las luces necesitan corriente y un cable atravesado en el piso hace tropezar. Pasa la extensión pegada a la pared.</li>
    <li><strong>90 cm lejos del calor.</strong> La NFPA, la asociación de prevención de incendios de Estados Unidos, recomienda al menos 3 pies (unos 90 cm) entre el árbol y estufas, calentadores, velas o lámparas que se calientan.</li>
    <li><strong>Puertas y pasillos libres.</strong> Un árbol frondoso mide de ancho unas dos terceras partes de su altura. Comprueba que todas las puertas abren por completo.</li>
    <li><strong>A la vista desde el sofá.</strong> Vas a mirar el árbol sobre todo desde tu asiento. Revisa la vista desde ahí.</li>
  </ul>
  <h2 id="esquina">En una esquina</h2>
  <p>Una esquina ocupa el piso que menos se usa, esconde el cable y deja libres los pasos de la sala. También conviene si hay niños pequeños o mascotas, porque solo quedan dos lados abiertos. Si la esquina está junto a una puerta, usa otra.</p>
  <h2 id="ventana">Junto a la ventana</h2>
  <p>Un árbol en la ventana se ve desde la calle. A cambio, entra menos luz y no puedes cerrar la cortina. Ponerlo a un lado de la ventana mantiene casi toda la luz y las luces del árbol se siguen viendo desde fuera.</p>
  <h2 id="sala-pequena">En una sala pequeña, cambia un mueble por el árbol</h2>
  <p>En una sala pequeña, el piso más fácil de encontrar está debajo de algo que puedes guardar un mes: un sillón, una mesita, una planta o una pila de sillas. En la muestra de abajo el árbol está donde antes estaban las sillas plásticas apiladas, y el resto de la sala no cambia.</p>
  ${h.pair("/img/rooms/sala-panama-before.webp", "/img/rooms/sala-panama-xmas-tropical.webp", SALA_BEFORE_ALT_ES, "La misma sala con un árbol de Navidad estilo Navidad tropical donde estaban las sillas apiladas: adornos tejidos, estrella de ratán y base de cesta. Sofás, televisor, ventanas y piso sin cambios", "Después, Navidad tropical", "Sala de muestra en Panamá. Ideas generadas con IA, no productos ni medidas exactas.")}
  <p>Si el espacio es muy poco, hay dos opciones más: un árbol delgado, que ocupa más o menos la mitad del piso de uno frondoso, o un árbol de mesa de 90 cm a 1,20 m sobre una mesita o un aparador.</p>
  <h2 id="espacio-abierto">En un espacio abierto</h2>
  <p>Ponlo contra una pared o un mueble grande que mire hacia los sofás, para que forme parte de la sala. Déjalo fuera del camino entre la cocina y el sofá, que es el paso que más se usa.</p>
  <h2 id="clima-calido">En casa con clima cálido</h2>
  <p>En casas de clima tropical el sol directo y el calor secan rápido un árbol natural. Busca un lugar sin sol de la tarde y lejos de la salida del aire acondicionado, y riega la base todos los días.</p>
  <h2 id="prueba">Prueba varios lugares antes de mover nada</h2>
  <p>El modo Navidad de DecoHero dibuja un árbol en una foto de tu propia sala. Toca el lugar donde lo quieres, o deja que la app elija un espacio libre, y compara. Cada prueba usa un crédito, y el primer diseño es gratis.</p>
</section>`,
    faq: [
      ["¿Dónde poner el árbol de Navidad en una sala pequeña?", "En una esquina, a un lado de la ventana o en el lugar de un sillón o una mesita que sacas en diciembre. Lejos del calor y fuera del paso."],
      ["¿A qué distancia del calor debe ir el árbol?", "Al menos 90 cm (3 pies), según la NFPA de Estados Unidos. Un árbol natural necesita agua todos los días."],
      ["¿Se puede poner el árbol frente a la ventana?", "Sí, y se ve desde la calle. Entra menos luz y no puedes cerrar la cortina; a un lado de la ventana es un buen punto medio."],
    ],
    cta_h: "Mira el árbol en tu sala antes de mover nada",
    cta_p: "Sube una foto de tu sala y toca dónde quieres el árbol. Compara hasta cuatro estilos de decoración. Tu primer diseño es gratis.",
    related: ["tree-size-es", "room-design-es"],
  },

  // ------------------------------------------------------------------ tree themes (EN)
  {
    key: "tree-themes",
    lang: "en",
    slug: "christmas-tree-themes",
    pair: null,
    campaign: "tree_themes",
    title: "Christmas tree theme ideas: 6 looks, from Nordic minimal to tropical",
    desc: "Six Christmas tree themes with the ornaments, lights, topper and skirt for each: Classic warmth, Winter wonderland, Nordic minimal, Pink coquette, Heritage tartan and Tropical Christmas.",
    eyebrow: "Christmas tree themes",
    h1: "Six Christmas tree themes, and what goes on each",
    lede: "A theme is a short list: a few ornament colours, one kind of light, a topper and a skirt. These are the six themes in DecoHero's Christmas mode, with the exact parts of each. Three are shown on the same sample apartment so you can compare them.",
    og: "/img/rooms/xmas-living-room-nordic.webp",
    body: (h) => `
<section class="prose">
  <div class="trio">
    ${h.fig("/img/rooms/xmas-living-room-classic.webp", "Sample living room with a Christmas tree in Classic warmth style: red and gold baubles, warm lights, a star and gifts on a red tree skirt", "Classic warmth")}
    ${h.fig("/img/rooms/xmas-living-room-nordic.webp", "The same living room with a Christmas tree in Nordic minimal style: a few pale wooden ornaments, warm white lights, a basket collar and two white gifts", "Nordic minimal")}
    ${h.fig("/img/rooms/xmas-living-room-tropical.webp", "The same living room with a Christmas tree in Tropical Christmas style: woven and coral ornaments, a rattan star, a basket base and gifts with green leaves", "Tropical Christmas")}
  </div>
  <p class="sample-note">Sample room. Designs are AI-generated ideas, not exact products or measurements.</p>
  <h2 id="classic">Classic warmth</h2>
  <p>Warm amber-white lights and glossy glass baubles in deep red and gold, spaced evenly. A many-pointed Moravian star on top, a deep red velvet skirt, and gifts in red, gold and cream paper. It suits traditional rooms with wood furniture and warm lamps.</p>
  <h2 id="winter">Winter wonderland</h2>
  <p>A tree flocked white so the branches look covered in snow, with tiny warm white fairy lights, silver crystal ornaments, iced snowflakes and mercury-glass baubles in silver and champagne. A silver snowflake on top and a white faux fur skirt. Note that flocking is a finish: a farm-cut tree arrives green, so you add the flocking yourself or buy a pre-flocked artificial tree.</p>
  <h2 id="nordic">Nordic minimal</h2>
  <p>A full green fir with only a little on it: warm white micro lights, a small number of raw wooden ornaments and a plain wooden star, so plenty of green shows. No tinsel and nothing shiny. A seagrass collar instead of a skirt and two gifts in white paper with twine. It works in Scandinavian, Japandi and minimal rooms.</p>
  <h2 id="coquette">Pink coquette</h2>
  <p>Blush pink and pearl white: velvet bows clipped to the branches, pearl baubles, a few small mirrored disco-ball ornaments, warm fairy lights and a large blush velvet bow on top. A white faux fur skirt and gifts in pink and white with satin ribbon. Keep the pink to one or two shades so it stays soft.</p>
  <h2 id="tartan">Heritage tartan</h2>
  <p>A dark green tree with wide tartan ribbon woven through the branches, in navy-and-green Black Watch and in red tartan, plus brass bells and a few deep red and antique gold baubles. A tartan bow on top, a woven rattan collar and gifts in kraft paper with tartan ribbon. It fits farmhouse and classic rooms, and rooms with a fireplace.</p>
  <h2 id="tropical">Tropical Christmas</h2>
  <p>For a home in a hot climate: warm white lights, ornaments in natural wood and woven rattan, seashells and soft coral baubles, a woven rattan star and a seagrass basket collar. Gifts in kraft paper with green leaves under the ribbon. Nothing snowy. It pairs well with tropical modern, coastal and boho rooms.</p>
  ${h.pair("/img/rooms/sala-panama-before.webp", "/img/rooms/sala-panama-xmas-tropical.webp", SALA_BEFORE_ALT, "The same room with a Christmas tree in Tropical Christmas style where the stacked chairs stood: woven ornaments, a rattan star and a basket base", "After, Tropical Christmas", "Tropical Christmas in a sample living room in Panama. AI-generated ideas.")}
  <h2 id="choose">How to choose a theme for your room</h2>
  <p>Start from what is already in the room. Pick ornament colours that repeat one colour you already have, such as the wood of the floor, a cushion or a rug, and match the lights to your lamps: warm white for most rooms, cooler white only with cool, bright interiors. If you can't decide, try two or three on a photo of your room and compare them side by side.</p>
</section>`,
    faq: [
      ["What are popular Christmas tree themes?", "Classic red and gold, white winter wonderland, Nordic minimal with wood ornaments, pink coquette with bows, tartan with brass bells, and natural tropical themes with rattan and shells."],
      ["How many colours should a Christmas tree theme have?", "Two or three, plus the light colour. Fewer colours look calmer and make a theme easier to recognise."],
      ["What Christmas tree theme suits a small room?", "Light themes with fewer ornaments, such as Nordic minimal, keep a small room from looking crowded. A seagrass collar takes less floor than a wide skirt."],
    ],
    cta_h: "Compare themes on a photo of your room",
    cta_p: "Pick up to four of the six themes and see each one on your own room, side by side. Your first design is free.",
    related: ["tree-size", "tree-placement", "styles"],
  },

  // ------------------------------------------------------------------ room design from a photo (EN)
  {
    key: "room-design",
    lang: "en",
    slug: "ai-room-design-from-photo",
    pair: "room-design-es",
    campaign: "room_design",
    title: "AI room design from a photo: your own room in 12 styles",
    desc: "Upload a photo of your room and get photoreal redesigns that keep your walls, windows and floor plan. 12 styles, real before and after examples, and what the AI gets wrong. 1 free design.",
    eyebrow: "AI room design",
    h1: "Redesign your room from a photo",
    lede: "Take a photo of a room, pick up to four interior styles, and DecoHero returns a photoreal redesign of that same room for each style. The walls, windows, doors and camera angle stay where they are; the furniture, colours, materials and lighting change.",
    og: "/img/g/bedroom-boho.webp",
    body: (h) => `
<section class="prose">
  <h2 id="examples">Before and after, on real sample rooms</h2>
  <p>Every redesign below is the app's real output for the "before" photo next to it, made with the same instructions the app uses. Only rejected first tries were thrown away, when the AI changed the room itself.</p>
  ${h.pair("/img/g/bedroom-before.webp", "/img/g/bedroom-boho.webp", "Sample bedroom before the redesign", "The same bedroom redesigned in Boho style", "After, Boho")}
  ${h.pair("/img/g/kitchen-before.webp", "/img/g/kitchen-farmhouse.webp", "Sample kitchen before the redesign", "The same kitchen redesigned in Farmhouse style", "After, Farmhouse")}
  ${h.pair("/img/g/home-office-before.webp", "/img/g/home-office-mid-century.webp", "Sample home office before the redesign", "The same home office redesigned in Mid-century style", "After, Mid-century")}
  ${h.pair("/img/g/dining-room-before.webp", "/img/g/dining-room-art-deco.webp", "Sample dining room before the redesign", "The same dining room redesigned in Art deco style", "After, Art deco")}
  ${h.pair("/img/g/terrace-before.webp", "/img/g/terrace-mediterranean.webp", "Sample terrace before the redesign", "The same terrace redesigned in Mediterranean style", "After, Mediterranean")}
  ${h.pair("/img/g/kids-room-before.webp", "/img/g/kids-room-scandinavian.webp", "Sample kids room before the redesign", "The same kids room redesigned in Scandinavian style", "After, Scandinavian")}
  <p class="sample-note">Sample rooms. Every room here is AI-generated, so no photo shows a real person's home. Designs are ideas, not exact products or measurements.</p>
  <h2 id="how">How it works</h2>
  <ol class="num">
    <li>Take a photo of the room or pick one from your gallery.</li>
    <li>Choose up to four of the 12 styles. Each style uses one credit and gives one design.</li>
    <li>Designs arrive one at a time. Press and hold a design to flip back to your original photo, and save the ones you like.</li>
  </ol>
  <p>There is no prompt to write. The app sends your photo with fixed instructions to Google's Gemini image model, which tell it to keep the architecture and change the furnishing.</p>
  <h2 id="photo-tips">Photos that work best</h2>
  <ul>
    <li>Stand in a corner and hold the phone level, so most of the room is in frame.</li>
    <li>Shoot in daylight with the lights on. Dark photos give dark, muddy designs.</li>
    <li>Clear the floor of bags and laundry. The AI keeps what it sees as part of the room.</li>
    <li>Landscape photos suit wide rooms, portrait photos suit narrow ones.</li>
  </ul>
  <h2 id="limits">What it gets wrong</h2>
  <p>The AI sometimes changes the room itself. While making the samples on this page, first tries added ceiling beams, moved a window, added a door that wasn't there, or swapped barred windows for plain glass. When that happens, run the style again. A design that fails outright gives its credit back; a design you just don't like does not. Furniture in the designs is an idea, not a product you can order, and sizes are not measured.</p>
  <h2 id="price">What it costs</h2>
  <p>Your first design is free when you sign in. After that, credits come in packs: 15 designs for $3.99, 50 for $9.99 and 150 for $24.99. There is no subscription and credits don't expire. It works on Android from Google Play and in any browser, iPhone included, at deco.hero-apps.com/app.</p>
  <h2 id="styles">The 12 styles</h2>
</section>
${h.styleCards()}`,
    faq: [
      ["Is there a free AI room design app?", "DecoHero gives you one free design when you sign in. More designs are paid, from $3.99 for 15. There is no subscription."],
      ["Does the AI keep my room's layout?", "It is instructed to keep the walls, windows, doors, floor plan and camera angle and to change only furniture, colours, materials and lighting. It sometimes changes the room anyway; run the style again when it does."],
      ["What happens to my photo?", "It goes to DecoHero's server, which sends it to Google's paid Gemini API and returns the design. The server handles photos in memory and doesn't store them. The privacy policy has the details."],
      ["Does it work on iPhone?", "There is no iPhone app yet. On an iPhone, the web app at deco.hero-apps.com/app runs in the browser."],
    ],
    cta_h: "Try it on your own room",
    cta_p: "One photo, up to four styles, a redesign of each in seconds. Your first design is free.",
    related: ["styles", "tree-size", "tree-placement"],
  },

  // ------------------------------------------------------------------ room design from a photo (ES)
  {
    key: "room-design-es",
    lang: "es",
    slug: "diseno-de-interiores-con-ia",
    pair: "room-design",
    campaign: "room_design_es",
    title: "Diseño de interiores con IA desde una foto: tu espacio en 12 estilos",
    desc: "Sube una foto de tu espacio y recibe rediseños fotorrealistas que mantienen paredes, ventanas y distribución. 12 estilos, ejemplos reales de antes y después y lo que la IA hace mal. 1 diseño gratis.",
    eyebrow: "Diseño de interiores con IA",
    h1: "Rediseña tu espacio a partir de una foto",
    lede: "Toma una foto de un espacio, elige hasta cuatro estilos y DecoHero te devuelve un rediseño fotorrealista de ese mismo espacio para cada estilo. Paredes, ventanas, puertas y ángulo de cámara se quedan igual; cambian los muebles, los colores, los materiales y la luz.",
    og: "/img/g/sala-panama-tropical-modern.webp",
    body: (h) => `
<section class="prose">
  <h2 id="ejemplos">Antes y después, en espacios de muestra</h2>
  <p>Cada rediseño es el resultado real de la app para la foto de "antes" que tiene al lado, hecho con las mismas instrucciones que usa la app.</p>
  ${h.pair("/img/g/sala-panama-before.webp", "/img/g/sala-panama-tropical-modern.webp", SALA_BEFORE_ALT_ES, "La misma sala rediseñada en estilo Tropical moderno", "Después, Tropical moderno")}
  ${h.pair("/img/g/bedroom-before.webp", "/img/g/bedroom-japandi.webp", "Dormitorio de muestra antes del rediseño", "El mismo dormitorio rediseñado en estilo Japandi", "Después, Japandi")}
  ${h.pair("/img/g/kitchen-before.webp", "/img/g/kitchen-mediterranean.webp", "Cocina de muestra antes del rediseño", "La misma cocina rediseñada en estilo Mediterráneo", "Después, Mediterráneo")}
  ${h.pair("/img/g/terrace-before.webp", "/img/g/terrace-tropical-modern.webp", "Terraza de muestra antes del rediseño", "La misma terraza rediseñada en estilo Tropical moderno", "Después, Tropical moderno")}
  <p class="sample-note">Espacios de muestra generados con IA: ninguna foto muestra la casa de una persona real. Los diseños son ideas, no productos ni medidas exactas.</p>
  <h2 id="como-funciona">Cómo funciona</h2>
  <ol class="num">
    <li>Toma una foto del espacio o elige una de tu galería.</li>
    <li>Elige hasta cuatro de los 12 estilos. Cada estilo usa un crédito y da un diseño.</li>
    <li>Los diseños llegan uno por uno. Mantén pulsado un diseño para ver tu foto original y guarda los que te gusten.</li>
  </ol>
  <p>No hay que escribir nada. La app envía tu foto con instrucciones fijas al modelo de imágenes Gemini de Google, que le piden mantener la arquitectura y cambiar el mobiliario.</p>
  <h2 id="fotos">Fotos que funcionan mejor</h2>
  <ul>
    <li>Párate en una esquina y sostén el teléfono derecho, para que entre casi todo el espacio.</li>
    <li>Toma la foto de día y con las luces encendidas.</li>
    <li>Quita del piso bolsas y ropa: la IA conserva lo que ve como parte del espacio.</li>
  </ul>
  <h2 id="limites">Lo que hace mal</h2>
  <p>A veces la IA cambia el espacio en sí. Al preparar estas muestras, algunos primeros intentos agregaron vigas al techo, movieron una ventana, agregaron una puerta o quitaron las rejas de las ventanas. Cuando pasa, vuelve a generar ese estilo. Si un diseño falla, el crédito vuelve a tu saldo; si simplemente no te gusta, no. Los muebles son ideas, no productos que puedas pedir.</p>
  <h2 id="precio">Cuánto cuesta</h2>
  <p>Tu primer diseño es gratis al iniciar sesión. Después hay paquetes: 15 diseños por US$3.99, 50 por US$9.99 y 150 por US$24.99. Sin suscripción, y los créditos no vencen. Funciona en Android desde Google Play y en cualquier navegador, también en iPhone, en deco.hero-apps.com/app.</p>
</section>`,
    faq: [
      ["¿Hay una app gratis de diseño de interiores con IA?", "DecoHero te da un diseño gratis al iniciar sesión. Los demás son de pago, desde US$3.99 por 15. Sin suscripción."],
      ["¿La IA mantiene la distribución de mi espacio?", "Tiene instrucciones de mantener paredes, ventanas, puertas, distribución y ángulo de cámara, y cambiar solo muebles, colores, materiales y luz. A veces cambia el espacio igual; en ese caso, vuelve a generar el estilo."],
      ["¿Funciona en iPhone?", "Todavía no hay app para iPhone. En un iPhone, la app web en deco.hero-apps.com/app funciona en el navegador."],
    ],
    cta_h: "Pruébalo con tu propio espacio",
    cta_p: "Una foto, hasta cuatro estilos y un rediseño de cada uno en segundos. Tu primer diseño es gratis.",
    related: ["tree-size-es", "tree-placement-es"],
  },
];

// Per-style pages at /styles/<id> (EN). Facts follow the style instructions in server/src/styles.ts.
// intro: what the style is. look: what the app puts in the room. start: changes that move a real room
// toward the style, cheapest first. fit: where it works and where it fights the room. related: style ids.
export const styleGuides = {
  "tropical-modern": {
    kw: "Tropical modern living room and bedroom ideas",
    intro: "Tropical modern is built for heat and light: pale plaster walls, dark teak, rattan and woven fibres, linen, a ceiling fan and big leafy plants. It keeps the clean lines of modern furniture and swaps heavy fabrics for things that breathe.",
    look: ["White or off-white plaster walls", "Teak or other dark tropical wood for tables and frames", "Rattan, cane and woven seagrass", "Linen upholstery and curtains", "Large tropical plants: monstera, bird of paradise, palms", "A ceiling fan, often in wood or rattan"],
    start: ["Swap heavy curtains for unlined linen in white or sand.", "Add one large plant in a woven basket, not three small ones.", "Replace a dark rug with jute or sisal.", "Bring in one rattan piece: an armchair, a pendant or a headboard."],
    fit: "It suits homes in hot, humid places and any bright room with tile or stone floors. In a dark north-facing room it can feel flat; use warmer whites there.",
    related: ["coastal", "boho", "japandi"],
  },
  "modern-minimal": {
    kw: "Minimalist living room and bedroom ideas",
    intro: "Minimal rooms have few things, each with space around it. Clean lines, warm whites and greys, storage that hides the clutter, and one light that stands out. Warm minimal avoids the cold, empty look by keeping wood and textured fabrics.",
    look: ["Warm white and soft grey walls", "Low furniture with straight lines", "Closed storage: flat cabinet fronts, built-in shelves", "One statement light", "Very little on surfaces", "A single rug in a plain tone"],
    start: ["Clear every surface, then put back three things per room.", "Add closed storage so the clutter has somewhere to go.", "Pick one light as the feature and simplify the rest.", "Keep textiles in one or two tones but vary the texture."],
    fit: "It makes small rooms look larger and suits open plans. It needs storage to work: without it the clutter comes back within a week.",
    related: ["japandi", "scandinavian", "mid-century"],
  },
  "japandi": {
    kw: "Japandi living room and bedroom ideas",
    intro: "Japandi mixes Japanese and Scandinavian design: low natural-wood furniture, muted earthy colours, paper lamps and handmade ceramics. Rooms look calm and uncluttered, with a few good objects and plenty of empty space.",
    look: ["Low sofas, beds and tables in natural wood", "Muted earth tones: oatmeal, clay, sage, charcoal", "Paper or rice-paper pendant lamps", "Ceramics with a handmade finish", "Linen and wool, no shiny fabrics", "Bare surfaces and empty floor"],
    start: ["Swap a ceiling light for a paper pendant.", "Replace bright cushions with linen in oatmeal or clay.", "Lower the eye line: a low coffee table, a low bench.", "Put away half of the decor and keep the pieces in wood, clay and stone."],
    fit: "It works in small apartments and bedrooms because it needs few things. Rooms with lots of colourful furniture need more changes to get there.",
    related: ["scandinavian", "modern-minimal", "tropical-modern"],
  },
  "scandinavian": {
    kw: "Scandinavian living room and bedroom ideas",
    intro: "Scandinavian rooms are light and cosy at the same time: light oak, white walls, wool and linen, soft greys and green plants. The style comes from long dark winters, so it chases daylight and adds warmth with textiles.",
    look: ["White walls and light oak floors or furniture", "Soft greys, off-whites and pale blue", "Wool throws, sheepskins and linen", "Simple wooden chairs and tables", "Plants in plain pots", "Several small lamps instead of one bright light"],
    start: ["Paint the walls white or a warm off-white.", "Add a wool throw and a sheepskin to the sofa.", "Put two or three small lamps around the room for evenings.", "Choose light wood for the next piece you buy."],
    fit: "It suits rooms with little daylight and small rooms that should feel larger. In a very bright, hot room, tropical modern or coastal often fits better.",
    related: ["japandi", "modern-minimal", "coastal"],
  },
  "mid-century": {
    kw: "Mid-century modern living room and bedroom ideas",
    intro: "Mid-century modern is the furniture of the 1950s and 60s: walnut pieces on tapered legs, mustard and teal accents, globe lights and a graphic rug. Furniture stands off the floor, which keeps rooms light.",
    look: ["Walnut or teak furniture on tapered legs", "Mustard, teal, burnt orange accents", "Globe and sputnik lights", "A graphic or geometric rug", "Low sideboards and credenzas", "A sofa with a tight back and slim arms"],
    start: ["Find a walnut sideboard or side table, new or second-hand.", "Add one accent colour, mustard or teal, in cushions or a chair.", "Swap a ceiling light for a globe pendant.", "Lay a geometric rug under the coffee table."],
    fit: "It works well in apartments and houses from the 1950s to 70s, and in rooms with low ceilings because the furniture is low and leggy.",
    related: ["modern-minimal", "art-deco", "industrial"],
  },
  "boho": {
    kw: "Boho living room and bedroom ideas",
    intro: "Boho is layered and relaxed: rugs on top of rugs, macrame, rattan, terracotta pots, many plants and warm patterned textiles. It looks collected over years, with pieces from different places that share warm colours.",
    look: ["Layered rugs with patterns", "Macrame wall hangings", "Rattan and cane furniture", "Terracotta pots and many plants", "Warm patterned cushions and throws", "Floor cushions and low seating"],
    start: ["Layer a smaller patterned rug over a plain jute one.", "Add three or more plants at different heights.", "Mix cushions in two or three patterns that share one warm colour.", "Hang a macrame or woven piece where a print used to be."],
    fit: "It suits rental rooms because almost all of it is textiles and plants. In a small room, keep the colours warm and the patterns few, or it looks busy.",
    related: ["tropical-modern", "mediterranean", "coastal"],
  },
  "coastal": {
    kw: "Coastal living room and bedroom ideas",
    intro: "Coastal rooms are light and relaxed: whites and soft blues, driftwood, linen slipcovers and a jute rug. It suggests a house near the sea without anchors and seashell prints everywhere.",
    look: ["White and soft blue palette", "Driftwood and whitewashed wood", "Linen slipcovers on sofas and chairs", "A jute or sisal rug", "Sheer curtains", "Blue and white stripes, used sparingly"],
    start: ["Put a white or natural linen slipcover on the sofa.", "Swap the rug for jute.", "Add soft blue in two places: cushions and a vase, for example.", "Replace heavy curtains with sheer white ones."],
    fit: "It suits bright rooms and warm climates, and works far from the sea. In a dark room the blues can feel cold; add warm wood to balance them.",
    related: ["tropical-modern", "scandinavian", "mediterranean"],
  },
  "mediterranean": {
    kw: "Mediterranean living room and bedroom ideas",
    intro: "Mediterranean rooms borrow from houses in southern Spain, Italy and Greece: limewashed walls, terracotta tones, wrought iron, olive wood and touches of blue. The walls do a lot of the work, with texture and soft, uneven colour.",
    look: ["Limewashed or textured plaster walls", "Terracotta floors or terracotta tones", "Wrought iron in lights, mirrors and chairs", "Olive wood and rustic wood beams", "Blue accents in ceramics or textiles", "Arches, where the room already has them"],
    start: ["Limewash one wall; it changes the room more than any furniture.", "Add a wrought iron light or mirror.", "Bring in terracotta through pots, tiles or a rug.", "Use blue in ceramics, not on the walls."],
    fit: "It suits warm climates, tiled floors and homes with arches or thick walls. In a small modern apartment, keep it light: limewash and ceramics, without heavy dark wood.",
    related: ["tropical-modern", "farmhouse", "boho"],
  },
  "industrial": {
    kw: "Industrial living room and bedroom ideas",
    intro: "Industrial style comes from old factories turned into lofts: black metal, reclaimed wood, leather, exposed bulbs and concrete tones. Materials stay raw and visible.",
    look: ["Black metal frames, shelving and lights", "Reclaimed or rough-sawn wood", "Leather sofas and chairs, often cognac or brown", "Exposed bulbs and cage lights", "Concrete grey and brick tones", "Open shelving instead of closed cabinets"],
    start: ["Replace a shelf with black metal and wood open shelving.", "Swap a shade for an exposed-bulb pendant.", "Add one leather piece: an armchair or a pouf.", "Use grey and warm brown, not bright colour."],
    fit: "It suits lofts, high ceilings and rooms with exposed brick or concrete. In a small, low room it can feel heavy; keep the metal thin and add light textiles.",
    related: ["mid-century", "farmhouse", "modern-minimal"],
  },
  "luxury-classic": {
    kw: "Classic luxury living room and bedroom ideas",
    intro: "Classic luxury is formal and balanced: velvet upholstery, marble, brass details, a chandelier and a symmetrical layout, with matching pieces on either side of a centre point.",
    look: ["Velvet sofas and chairs", "Marble on tables or the fireplace", "Brass lamps, handles and frames", "A chandelier", "A symmetrical layout around a centre point", "Pairs: two lamps, two chairs, two side tables"],
    start: ["Arrange the room around one centre point, such as the sofa or the bed, with pairs on either side.", "Add matching table lamps in brass.", "Swap a pendant for a small chandelier.", "Bring in velvet through cushions or one chair."],
    fit: "It suits rooms with high ceilings and mouldings, and formal living and dining rooms. In a small room, use one chandelier and fewer pieces, all in pairs.",
    related: ["art-deco", "mediterranean", "farmhouse"],
  },
  "farmhouse": {
    kw: "Modern farmhouse living room and bedroom ideas",
    intro: "Modern farmhouse mixes country materials with clean, neutral rooms: distressed wood, black hardware, neutral linens and vintage accents. It is warm and practical rather than rustic.",
    look: ["Distressed or reclaimed wood", "Black hardware, lights and window frames", "Neutral linens in white, cream and grey", "Vintage accents: baskets, crocks, old frames", "Shiplap or board-and-batten walls", "Slipcovered sofas"],
    start: ["Swap handles and light fixtures for black.", "Add a distressed wood piece: a coffee table, a bench or a shelf.", "Use white and cream linen for the sofa, curtains and bedding.", "Hang a few vintage frames or baskets."],
    fit: "It suits kitchens, family rooms and houses with wood floors. In a sleek modern apartment it can look like a costume; pick two or three elements instead of all of them.",
    related: ["industrial", "luxury-classic", "scandinavian"],
  },
  "art-deco": {
    kw: "Art deco living room and bedroom ideas",
    intro: "Art deco comes from the 1920s and 30s: geometric patterns, emerald and gold, curved velvet furniture, lacquer and glamorous lighting. It is bold, and it works best when one or two pieces carry it.",
    look: ["Geometric patterns: fans, chevrons, stepped shapes", "Emerald, navy or black with gold", "Curved velvet sofas and chairs", "Lacquered or high-gloss surfaces", "Glamorous lights in brass and glass", "Mirrored and reflective details"],
    start: ["Add one curved velvet piece in emerald or navy.", "Swap a lamp for brass and glass.", "Hang a mirror with a stepped or fan-shaped frame.", "Use gold in small doses: frames, handles, a tray."],
    fit: "It suits living and dining rooms meant for evenings. Too many deco pieces in a small room look like a film set; let one wall or one sofa lead.",
    related: ["luxury-classic", "mid-century", "modern-minimal"],
  },
};

// /styles: the hub that links every style page.
export const stylesHub = {
  key: "styles",
  lang: "en",
  slug: "styles",
  pair: null,
  campaign: "styles",
  title: "12 interior design styles, shown on the same real rooms",
  desc: "Japandi, Scandinavian, mid-century, boho, coastal, Mediterranean, industrial, farmhouse, art deco and more, each shown on the same living room, bedroom and Panama house so you can compare them.",
  eyebrow: "Interior design styles",
  h1: "12 interior styles on the same rooms",
  lede: "Style names are easier to tell apart when the room stays the same. Each style below was applied by DecoHero to the same apartment living room, bedroom and Panama living room, keeping the walls and windows. Open a style to see all its rooms and what makes the look.",
  og: "/img/g/living-room-japandi.webp",
  body: (h) => `
${h.styleCards()}
<section class="prose">
  <p class="sample-note">Sample rooms. Designs are AI-generated ideas, not exact products or measurements.</p>
  <h2 id="choose">How to pick a style</h2>
  <p>Start with what you can't change: the floor, the windows, the climate and how much daylight the room gets. Tile floors and strong sun lean toward tropical modern, coastal or Mediterranean. Small, dim rooms lean toward Scandinavian or Japandi. Then look at the one or two pieces you're keeping, such as a leather sofa or a walnut sideboard, and pick the style they already belong to.</p>
  <p>The quickest test is your own room. Upload one photo to DecoHero and compare up to four styles side by side.</p>
</section>`,
  faq: [],
  cta_h: "See your own room in four styles",
  cta_p: "One photo, up to four styles, a redesign of each in seconds. Your first design is free.",
  related: ["room-design", "tree-themes"],
};

export const roomNames = {
  "living-room": "Apartment living room",
  "sala-panama": "Living room in a Panama house",
  "bedroom": "Bedroom",
  "dining-room": "Dining room",
  "kitchen": "Kitchen",
  "home-office": "Home office",
  "kids-room": "Kids room",
  "terrace": "Terrace",
};
