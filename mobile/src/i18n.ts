import { getLocales } from "expo-localization";
import { deletePref, getPref, setPref } from "./prefs";
import { STYLE_PRESETS, TREE_PRESETS } from "./stylePresets";
import { CM_PER_FT, formatLength, formatPrice, type TreeFit, type TreePick, type TreeProduct, type Unit } from "./treeSize";

export type Lang = "en" | "es";
const LANG_KEY = "decohero_lang";

/** The phone's (or Android per-app) language; used until the user picks one in the app. */
function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === "es" ? "es" : "en";
}

// `lang` and `t` are live bindings: setLang() swaps them and App re-renders.
export let lang: Lang = deviceLang();

const en = {
  tagline: "See your room in a new style before you buy a thing.",
  takePhoto: "Take a photo",
  choosePhoto: "Choose from gallery",
  changePhoto: "Change photo",
  pickStyles: "Pick up to 4 styles",
  tip: "Stand in a corner and shoot in daylight so the whole room is in frame.",
  redesign: (n: number) => (n === 1 ? "Redesign · 1 credit" : `Redesign · ${n} credits`),
  pickFirst: "Add a photo and pick a style",
  needPhoto: "Add a photo of your room",
  needStyle: "Pick at least one style",
  redesignLabel: "Redesign",
  maxStyles: "Up to 4 styles at a time",
  viewResults: "View last designs",
  camera: "Camera",
  gallery: "Gallery",
  freeDenied: "Free designs aren't available on this device or network right now. Credit packs still work.",
  credits: (n: number) => (n === 1 ? "1 credit" : `${n} credits`),
  designing: (s: string) => `Designing ${s}…`,
  holdToCompare: "Hold the photo to see your original",
  original: "Original",
  save: "Save",
  saved: "Saved to gallery",
  share: "Share",
  report: "Report",
  reported: "Reported. We'll review this design.",
  tryAgain: "Try again",
  failed: "This design didn't come through and your credit was returned.",
  lostConnection: "Lost connection before this design arrived. Designs that don't reach you aren't charged. Try again.",
  genericError: "Something went wrong with this design. Try again in a moment.",
  tooManyFailures: "Several designs didn't work out today. Try a different photo, or try again tomorrow.",
  pageOf: (i: number, n: number) => `Design ${i} of ${n}`,
  outOfCredits: "You're out of credits. Get a pack to keep designing.",
  notEnough: (n: number) => (n === 0 ? "You're out of credits." : `You have ${n === 1 ? "1 credit" : `${n} credits`}. Pick fewer styles or get more.`),
  network: "Couldn't reach DecoHero. Check your connection and try again.",
  config: "This build of DecoHero isn't set up to reach its server. Please update the app.",
  rateLimited: (sec?: number) => {
    let wait = "Wait a few minutes";
    if (sec !== undefined) {
      const min = Math.ceil(sec / 60);
      if (min <= 1) wait = "Wait about a minute";
      else if (min < 90) wait = `Wait about ${min} minutes`;
      else {
        const h = Math.round(min / 60);
        wait = h === 1 ? "Wait about an hour" : `Wait about ${h} hours`;
      }
    }
    return `That was a lot of designs at once. ${wait} and try again.`;
  },
  busy: "DecoHero is very busy right now. Please try again later.",
  freeDailyLimit: "Free designs are used up for today. Try again tomorrow, or get credits to keep designing.",
  tooLarge: "That photo is too large. Try another photo or take a new one.",
  getCredits: "Get credits",
  shopTitle: "Get credits",
  shopSub: "One credit makes one design. Credits never expire, and any purchase removes the DecoHero mark from new designs.",
  youHave: (n: number) => (n === 1 ? "You have 1 credit" : `You have ${n} credits`),
  creditsStay: "Credits stay with this install of DecoHero on this phone.",
  buy: (price: string) => `Buy for ${price}`,
  purchasePending: "Payment received. Your credits will appear in a few seconds.",
  purchaseDone: "Credits added.",
  noOfferings: "Credit packs aren't available right now. Check your connection and try again.",
  cameraDenied: "Allow camera access in Settings to take a photo.",
  mediaDenied: "Allow photo access in Settings to save designs.",
  back: "Back",
  aiNotice: "Designs are AI-generated ideas, not exact products or measurements.",
  mostPopular: "Most popular",
  paymentPending: "Your payment is pending. Credits are added as soon as Google Play confirms it.",
  purchaseNotAllowed: "Purchases aren't allowed on this device or account.",
  storeProblem: "Google Play had a problem. You weren't charged. Try again in a moment.",
  purchaseFailed: "The purchase didn't go through. You weren't charged.",
  purchaseSlow: "Your credits are on the way. They'll show up in a minute or two.",
  about: "About and privacy",
  aboutTitle: "About",
  aboutBody: "DecoHero turns a photo of your room into design ideas. Photos are sent to our server only to create your designs. We don't store them.",
  privacyPolicy: "Privacy policy",
  installIdLabel: "Your install ID",
  installIdHelp: "This anonymous ID holds your credits. To have your data deleted, send us this ID (see the privacy policy for how).",
  shareInstallId: "Share install ID",
  installIdShare: (id: string) => `DecoHero install ID: ${id}`,
  saveFailed: "Couldn't save this design. Try again, or use Share.",
  shareFailed: "Couldn't share this design. Try again, or use Save.",
  language: "Language",
  phoneLanguage: "Use phone language",
  packTitle: (n: number) => `${n} credits`,
  perDesign: (price: string) => `${price} per design`,
  modeRooms: "Rooms",
  modeChristmas: "Christmas",
  treeTagline: "See how a Christmas tree fits your room before you order one.",
  treeIntro: "We add one tree to your photo and leave the rest of the room as it is.",
  pickTrees: "Pick up to 4 tree styles",
  needTree: "Pick at least one tree style",
  pickFirstTree: "Add a photo and pick a tree style",
  addTree: (n: number) => (n === 1 ? "Add a tree · 1 credit" : `Add trees · ${n} credits`),
  addTreeLabel: "Add a tree",
  ceilingTitle: "Ceiling height",
  ceilingUnit: (unit: "ft" | "m"): string => (unit === "ft" ? "Feet" : "Meters"),
  ceilingRange: (unit: "ft" | "m"): string =>
    unit === "ft" ? "Enter a ceiling height between 6 and 20 ft" : "Enter a ceiling height between 1.8 and 6 m",
  treeFit: (tree: string, unit: "ft" | "m") =>
    `Recommended tree: ${tree}. That leaves at least ${unit === "ft" ? "12 in" : "30 cm"} under the ceiling for the stand and the topper.`,
  treeLargest: (tree: string) => `Recommended tree: ${tree}. It is the largest tree our partner sells.`,
  treeTabletop: (tree: string) => `Your ceiling is too low for a floor tree with its stand and topper. Recommended: ${tree}.`,
  treeNone: (tree: string) => `No floor tree fits under this ceiling. A small tree on a table still works: ${tree}.`,
  treeNoneBare: "No floor tree fits under this ceiling.",
  treeRecommended: (tree: string, ceiling: string) => `Recommended for your ${ceiling} ceiling: ${tree}`,
  treeSizeTitle: "Tree size",
  treeSizeHint: "The tallest tree that fits is selected. Pick a smaller one if you like.",
  treePicked: (tree: string, gap: string) => `Your tree: ${tree}. That leaves about ${gap} under the ceiling.`,
  treeChosen: (tree: string, ceiling: string) => `Your tree for your ${ceiling} ceiling: ${tree}`,
  species: (s: "fraser" | "balsam" | "hybrid"): string =>
    s === "fraser" ? "Fraser fir" : s === "balsam" ? "Balsam fir" : "Balsam-Fraser hybrid",
  sizeRange: (from: string, to: string) => `${from} to ${to} ft`,
  sizeUpTo: (size: string) => `up to ${size}`,
  buyThisTree: (size: string, species: string, price: string) => `Buy this ${size} ${species}, ${price}`,
  allTrees: "See all trees",
  pricesNote: "Prices from the partner's store, may change.",
  flockNote: (species: string) => `Real ${species}; add your own snow flocking.`,
  placeHint: "Tap roughly where the tree should go (optional). It stands on the open floor nearest your tap.",
  placeSet: "Tree spot set. The tree goes on the open floor nearest this spot. Tap the photo to move it.",
  placeAuto: "Let DecoHero choose",
  placeMarker: "Tree spot",
  moveTree: "Move tree · 1 credit",
  moveTreeTitle: "Move the tree",
  moveTreeHint: "Tap the spot on the floor where the tree should stand. Moving it makes a new design and uses 1 credit.",
  treeEstimate: "This is an estimate. Measure your ceiling before you order.",
  buyTree: "Buy a real tree",
  shopLook: "Shop this look",
  shopStyles: "Shop the styles",
  shopStylesIntro: "Real trees and decor for each Christmas style. No photo or credits needed. Links open outside the app.",
  realTree: "Real tree",
  buyTreeNote: "Opens our partner's store for real farm-cut trees. Delivery in the US only.",
  partnerDisclosure: "We may earn a commission.",
  amazonDisclosure: "As an Amazon Associate we earn from qualifying purchases.",
  linkFailed: "Couldn't open the store. Try again in a moment.",
  // Web app (deco.hero-apps.com/app)
  signInWhy: "Sign in so your designs and credits follow you.",
  signInGoogle: "Continue with Google",
  signInFailed: "Couldn't sign in. Try again.",
  notConfiguredTitle: "Not set up yet",
  notConfiguredBody: "This copy of DecoHero isn't configured yet. Please check back soon.",
  notConfiguredMissing: "Missing settings:",
  webDisabled: "DecoHero on the web isn't open yet. Please check back soon.",
  authUnavailable: "Couldn't check your sign-in just now. Try again in a moment.",
  choosePhotoWeb: "Choose a photo",
  dropHint: "Or drop a photo anywhere on this page.",
  dropHere: "Drop your photo to use it",
  photoFailed: "Couldn't open that photo. Try a JPEG or PNG.",
  downloaded: "Design downloaded",
  creditsStayWeb: "Credits stay with your account. Sign in on any browser to use them.",
  storeProblemWeb: "The payment didn't go through. You weren't charged. Try again in a moment.",
  paymentPendingWeb: "Your payment is pending. Credits are added as soon as it's confirmed.",
  browserLanguage: "Use browser language",
  accountLabel: "Your account",
  signedInAs: (email: string) => `Signed in as ${email}`,
  signOut: "Sign out",
  deleteAccount: "Delete account",
  deleteConfirmTitle: "Delete your account?",
  deleteConfirmBody: "This deletes your account and your design history. Unused credits are lost and can't be restored. Google will first ask you to confirm it's you.",
  deleteConfirmYes: "Delete my account",
  deleteNotConfirmed: "Google didn't confirm it's you, so nothing was deleted.",
  accountDeleted: "Your account was deleted.",
  accountDataDeleted: "Your DecoHero data is deleted, but the Google sign-in record could not be removed. Email support@hero-apps.com to finish.",
  deleteFailed: "Couldn't delete your account. Try again.",
  cancel: "Cancel",
  terms: "Terms of use",
};

type Strings = typeof en;

const es: Strings = {
  tagline: "Mira tu espacio con otro estilo antes de comprar nada.",
  takePhoto: "Tomar foto",
  choosePhoto: "Elegir de la galería",
  changePhoto: "Cambiar foto",
  pickStyles: "Elige hasta 4 estilos",
  tip: "Párate en una esquina y toma la foto con luz de día para que se vea todo el espacio.",
  redesign: (n) => (n === 1 ? "Rediseñar · 1 crédito" : `Rediseñar · ${n} créditos`),
  pickFirst: "Agrega una foto y elige un estilo",
  needPhoto: "Agrega una foto de tu espacio",
  needStyle: "Elige al menos un estilo",
  redesignLabel: "Rediseñar",
  maxStyles: "Hasta 4 estilos a la vez",
  viewResults: "Ver los últimos diseños",
  camera: "Cámara",
  gallery: "Galería",
  freeDenied: "Los diseños gratis no están disponibles en este dispositivo o en esta red por ahora. Los paquetes de créditos sí funcionan.",
  credits: (n) => (n === 1 ? "1 crédito" : `${n} créditos`),
  designing: (s) => `Diseñando ${s}…`,
  holdToCompare: "Mantén presionada la foto para ver el original",
  original: "Original",
  save: "Guardar",
  saved: "Guardado en la galería",
  share: "Compartir",
  report: "Reportar",
  reported: "Gracias por avisar. Revisaremos este diseño.",
  tryAgain: "Intentar de nuevo",
  failed: "Este diseño no se generó y te devolvimos el crédito.",
  lostConnection: "Se perdió la conexión antes de que llegara este diseño. Los diseños que no te llegan no se cobran. Inténtalo de nuevo.",
  genericError: "Algo salió mal con este diseño. Inténtalo de nuevo en un momento.",
  tooManyFailures: "Varios diseños no funcionaron hoy. Prueba con otra foto o inténtalo mañana.",
  pageOf: (i, n) => `Diseño ${i} de ${n}`,
  outOfCredits: "Te quedaste sin créditos. Compra un paquete para seguir diseñando.",
  notEnough: (n) => (n === 0 ? "Te quedaste sin créditos." : `Tienes ${n === 1 ? "1 crédito" : `${n} créditos`}. Elige menos estilos o compra más.`),
  network: "No pudimos conectar con DecoHero. Revisa tu conexión e inténtalo de nuevo.",
  config: "Esta versión de DecoHero no está configurada para conectar con su servidor. Actualiza la app.",
  rateLimited: (sec) => {
    let wait = "Espera unos minutos";
    if (sec !== undefined) {
      const min = Math.ceil(sec / 60);
      if (min <= 1) wait = "Espera un minuto";
      else if (min < 90) wait = `Espera unos ${min} minutos`;
      else {
        const h = Math.round(min / 60);
        wait = h === 1 ? "Espera una hora" : `Espera unas ${h} horas`;
      }
    }
    return `Pediste muchos diseños seguidos. ${wait} e inténtalo de nuevo.`;
  },
  busy: "DecoHero tiene mucha demanda en este momento. Inténtalo de nuevo más tarde.",
  freeDailyLimit: "Ya usaste los diseños gratis de hoy. Inténtalo mañana o compra créditos para seguir diseñando.",
  tooLarge: "Esa foto es demasiado grande. Prueba con otra foto o toma una nueva.",
  getCredits: "Comprar créditos",
  shopTitle: "Comprar créditos",
  shopSub: "Un crédito es un diseño. Los créditos no vencen, y cualquier compra quita la marca DecoHero de tus diseños nuevos.",
  youHave: (n) => (n === 1 ? "Tienes 1 crédito" : `Tienes ${n} créditos`),
  creditsStay: "Los créditos quedan en esta instalación de DecoHero, en este teléfono.",
  buy: (price) => `Comprar por ${price}`,
  purchasePending: "Pago recibido. Tus créditos aparecerán en unos segundos.",
  purchaseDone: "Créditos agregados.",
  noOfferings: "Los paquetes de créditos no están disponibles en este momento. Revisa tu conexión e inténtalo de nuevo.",
  cameraDenied: "Permite el acceso a la cámara en Configuración para tomar una foto.",
  mediaDenied: "Permite el acceso a fotos en Configuración para guardar diseños.",
  back: "Volver",
  aiNotice: "Los diseños son ideas generadas con IA, no productos ni medidas exactas.",
  mostPopular: "Más popular",
  paymentPending: "Tu pago está pendiente. Los créditos se agregan en cuanto Google Play lo confirme.",
  purchaseNotAllowed: "No se permiten compras en este dispositivo o cuenta.",
  storeProblem: "Google Play tuvo un problema. No se te cobró. Inténtalo de nuevo en un momento.",
  purchaseFailed: "La compra no se completó. No se te cobró.",
  purchaseSlow: "Tus créditos van en camino. Aparecerán en uno o dos minutos.",
  about: "Acerca de y privacidad",
  aboutTitle: "Acerca de",
  aboutBody: "DecoHero convierte una foto de tu espacio en ideas de diseño. Las fotos se envían a nuestro servidor solo para crear tus diseños. No las guardamos.",
  privacyPolicy: "Política de privacidad",
  installIdLabel: "Tu ID de instalación",
  installIdHelp: "Este ID anónimo guarda tus créditos. Para que borremos tus datos, envíanos este ID (la política de privacidad explica cómo).",
  shareInstallId: "Compartir ID de instalación",
  installIdShare: (id) => `ID de instalación de DecoHero: ${id}`,
  saveFailed: "No se pudo guardar este diseño. Inténtalo de nuevo o usa Compartir.",
  shareFailed: "No se pudo compartir este diseño. Inténtalo de nuevo o usa Guardar.",
  language: "Idioma",
  phoneLanguage: "Usar idioma del teléfono",
  packTitle: (n) => `${n} créditos`,
  perDesign: (price) => `${price} por diseño`,
  modeRooms: "Espacios",
  modeChristmas: "Navidad",
  treeTagline: "Mira cómo queda un árbol de Navidad en tu espacio antes de pedirlo.",
  treeIntro: "Agregamos un árbol a tu foto y dejamos el resto del espacio tal como está.",
  pickTrees: "Elige hasta 4 estilos de árbol",
  needTree: "Elige al menos un estilo de árbol",
  pickFirstTree: "Agrega una foto y elige un estilo de árbol",
  addTree: (n) => (n === 1 ? "Agregar árbol · 1 crédito" : `Agregar árboles · ${n} créditos`),
  addTreeLabel: "Agregar árbol",
  ceilingTitle: "Altura del techo",
  ceilingUnit: (unit) => (unit === "ft" ? "Pies" : "Metros"),
  ceilingRange: (unit) =>
    unit === "ft" ? "Escribe una altura de techo entre 6 y 20 ft" : "Escribe una altura de techo entre 1.8 y 6 m",
  treeFit: (tree, unit) =>
    `Árbol recomendado: ${tree}. Así quedan al menos ${unit === "ft" ? "12 in" : "30 cm"} bajo el techo para la base y la estrella.`,
  treeLargest: (tree) => `Árbol recomendado: ${tree}. Es el más grande que vende nuestro aliado.`,
  treeTabletop: (tree) => `Tu techo es muy bajo para un árbol de piso con su base y la estrella. Recomendado: ${tree}.`,
  treeNone: (tree) => `Bajo este techo no cabe un árbol de piso. Un árbol pequeño sobre una mesa sí funciona: ${tree}.`,
  treeNoneBare: "Bajo este techo no cabe un árbol de piso.",
  treeRecommended: (tree, ceiling) => `Recomendado para tu techo de ${ceiling}: ${tree}`,
  treeSizeTitle: "Tamaño del árbol",
  treeSizeHint: "Está marcado el árbol más alto que cabe. Elige uno más pequeño si prefieres.",
  treePicked: (tree, gap) => `Tu árbol: ${tree}. Quedan unos ${gap} bajo el techo.`,
  treeChosen: (tree, ceiling) => `Tu árbol para tu techo de ${ceiling}: ${tree}`,
  species: (s) => (s === "fraser" ? "abeto Fraser" : s === "balsam" ? "abeto balsámico" : "híbrido balsámico-Fraser"),
  sizeRange: (from, to) => `${from} a ${to} ft`,
  sizeUpTo: (size) => `hasta ${size}`,
  buyThisTree: (size, species, price) => `Comprar este ${species} de ${size}, ${price}`,
  allTrees: "Ver todos los árboles",
  pricesNote: "Precios de la tienda de nuestro aliado; pueden cambiar.",
  flockNote: (species) => `Es un ${species} natural; la nieve artificial la agregas tú.`,
  placeHint: "Toca más o menos donde quieres el árbol (opcional). Queda en el espacio libre del piso más cercano.",
  placeSet: "Lugar del árbol marcado. El árbol va en el espacio libre del piso más cercano. Toca la foto para cambiarlo.",
  placeAuto: "Que DecoHero elija",
  placeMarker: "Lugar del árbol",
  moveTree: "Mover el árbol · 1 crédito",
  moveTreeTitle: "Mover el árbol",
  moveTreeHint: "Toca el lugar del piso donde quieres el árbol. Moverlo genera un diseño nuevo y usa 1 crédito.",
  treeEstimate: "Es un cálculo aproximado. Mide tu techo antes de hacer el pedido.",
  buyTree: "Comprar un árbol real",
  shopLook: "Compra este look",
  shopStyles: "Ver los estilos",
  shopStylesIntro: "Árboles naturales y decoración para cada estilo navideño. No necesitas foto ni créditos. Los enlaces se abren fuera de la app.",
  realTree: "Árbol natural",
  buyTreeNote: "Abre la tienda de nuestro aliado, con árboles naturales recién cortados. Envíos solo dentro de Estados Unidos.",
  partnerDisclosure: "Podemos recibir una comisión.",
  amazonDisclosure: "Como Asociado de Amazon, ganamos con las compras que cumplen los requisitos.",
  linkFailed: "No se pudo abrir la tienda. Inténtalo de nuevo en un momento.",
  // Web app (deco.hero-apps.com/app)
  signInWhy: "Inicia sesión para que tus diseños y créditos te sigan.",
  signInGoogle: "Continuar con Google",
  signInFailed: "No se pudo iniciar sesión. Inténtalo de nuevo.",
  notConfiguredTitle: "Aún no está listo",
  notConfiguredBody: "Esta copia de DecoHero todavía no está configurada. Vuelve pronto.",
  notConfiguredMissing: "Ajustes que faltan:",
  webDisabled: "DecoHero en la web todavía no está abierto. Vuelve pronto.",
  authUnavailable: "No pudimos verificar tu sesión en este momento. Inténtalo de nuevo en un momento.",
  choosePhotoWeb: "Elegir una foto",
  dropHint: "O suelta una foto en cualquier parte de esta página.",
  dropHere: "Suelta tu foto para usarla",
  photoFailed: "No se pudo abrir esa foto. Prueba con un JPEG o PNG.",
  downloaded: "Diseño descargado",
  creditsStayWeb: "Los créditos quedan en tu cuenta. Inicia sesión en cualquier navegador para usarlos.",
  storeProblemWeb: "El pago no se completó. No se te cobró. Inténtalo de nuevo en un momento.",
  paymentPendingWeb: "Tu pago está pendiente. Los créditos se agregan en cuanto se confirme.",
  browserLanguage: "Usar idioma del navegador",
  accountLabel: "Tu cuenta",
  signedInAs: (email) => `Sesión iniciada como ${email}`,
  signOut: "Cerrar sesión",
  deleteAccount: "Eliminar cuenta",
  deleteConfirmTitle: "¿Eliminar tu cuenta?",
  deleteConfirmBody: "Esto elimina tu cuenta y tu historial de diseños. Los créditos sin usar se pierden y no se pueden recuperar. Primero Google te pedirá confirmar que eres tú.",
  deleteConfirmYes: "Eliminar mi cuenta",
  deleteNotConfirmed: "Google no confirmó que eres tú, así que no se eliminó nada.",
  accountDeleted: "Tu cuenta fue eliminada.",
  accountDataDeleted: "Tus datos de DecoHero fueron eliminados, pero no se pudo quitar el registro de inicio de sesión con Google. Escribe a support@hero-apps.com para terminar.",
  deleteFailed: "No se pudo eliminar tu cuenta. Inténtalo de nuevo.",
  cancel: "Cancelar",
  terms: "Términos de uso",
};

export let t: Strings = lang === "es" ? es : en;

/** The language picked inside the app; null = follow the phone (or Android per-app language). */
let pref: Lang | null = null;

function apply(l: Lang) {
  lang = l;
  t = l === "es" ? es : en;
}

export function langPref(): Lang | null {
  return pref;
}

/** Load the language the user picked in the app, if any. Call once before the first render. */
export async function loadLangPref(): Promise<void> {
  try {
    const saved = await getPref(LANG_KEY);
    if (saved === "en" || saved === "es") {
      pref = saved;
      apply(saved);
    }
  } catch {}
}

/** Switch language now and remember it on this device. */
export function setLang(l: Lang) {
  pref = l;
  apply(l);
  setPref(LANG_KEY, l).catch(() => {});
}

/** Forget the in-app choice and follow the phone's language again. */
export function followPhoneLang() {
  pref = null;
  apply(deviceLang());
  deletePref(LANG_KEY).catch(() => {});
}

/**
 * With no in-app choice, pick up a changed phone / per-app language (Settings > Apps > DecoHero > Language).
 * Returns true when the UI language changed.
 */
export function syncDeviceLang(): boolean {
  if (pref) return false;
  const d = deviceLang();
  if (d === lang) return false;
  apply(d);
  return true;
}

export function styleName(id: string): string {
  const s = [...STYLE_PRESETS, ...TREE_PRESETS].find((p) => p.id === id);
  return s ? s[lang] : id;
}

const ftText = (ft: number) => String(Number(ft.toFixed(1)));

/** "7 ft" or "5 to 6 ft": the sizes the store lists for a product. Metric users also get the tallest in metres. */
export function treeSizeLabel(p: TreeProduct, unit: Unit = "ft"): string {
  const feet = p.minFt === p.maxFt ? `${ftText(p.maxFt)} ft` : t.sizeRange(ftText(p.minFt), ftText(p.maxFt));
  return unit === "m" ? `${feet}, ${t.sizeUpTo(formatLength(p.maxFt * CM_PER_FT, "m"))}` : feet;
}

/** "7 Ft Premium Fraser (Fraser fir, 7 ft), $227.95". Without a shop link: species and size only. */
export function treeDescription(p: TreeProduct, unit: Unit, withShop: boolean): string {
  const what = `${t.species(p.species)}, ${treeSizeLabel(p, unit)}`;
  return withShop ? `${p.name} (${what}), ${formatPrice(p.price)}` : what;
}

/** The recommendation sentence for a ceiling: Home shows it live, Results repeats it. */
export function treeAdvice(pick: TreePick, unit: Unit, withShop: boolean, ceilingCm?: number): string {
  if (!pick.product) return t.treeNoneBare;
  const tree = treeDescription(pick.product, unit, withShop);
  // A size the user picked: say how much room it leaves instead of calling it the recommendation.
  if (pick.picked && ceilingCm !== undefined) return t.treePicked(tree, formatLength(ceilingCm - pick.product.maxFt * CM_PER_FT, unit));
  switch (pick.kind) {
    case "largest": return t.treeLargest(tree);
    case "tabletop": return t.treeTabletop(tree);
    case "none": return t.treeNone(tree);
    default: return t.treeFit(tree, unit);
  }
}

/** The same recommendation next to a result or a shop link: "Recommended for your 8 ft ceiling: ...". */
export function treeForCeiling(fit: TreeFit, withShop: boolean): string {
  if (fit.product && fit.picked) return t.treeChosen(treeDescription(fit.product, fit.unit, withShop), formatLength(fit.ceilingCm, fit.unit));
  return fit.product && (fit.kind === "fit" || fit.kind === "largest")
    ? t.treeRecommended(treeDescription(fit.product, fit.unit, withShop), formatLength(fit.ceilingCm, fit.unit))
    : treeAdvice(fit, fit.unit, withShop);
}

/** "Buy this 7 ft Fraser fir, $227.95" */
export function buyTreeLabel(p: TreeProduct): string {
  return t.buyThisTree(treeSizeLabel(p), t.species(p.species), formatPrice(p.price));
}

/** Friendly text for an API error code (see src/api.ts). */
export function errorMessage(code?: string, fallback: string = t.genericError, retryAfterSec?: number): string {
  switch (code) {
    case "NO_CREDITS": return t.outOfCredits;
    case "NETWORK": return t.network;
    case "CONFIG": return t.config;
    case "RATE_LIMITED":
    case "HTTP_429": return t.rateLimited(retryAfterSec);
    case "DAILY_LIMIT": return t.busy;
    case "FREE_DAILY_LIMIT": return t.freeDailyLimit;
    case "TOO_LARGE":
    case "HTTP_413": return t.tooLarge;
    case "WEB_DISABLED": return t.webDisabled;
    case "AUTH_UNAVAILABLE": return t.authUnavailable;
    default: return fallback;
  }
}

/**
 * Text for a failed design. Only GENERATION_FAILED means the server gave the credit back; a dropped
 * connection is refunded by the server too (via requestId); anything else makes no refund claim.
 */
export function redesignErrorMessage(code?: string, retryAfterSec?: number): string {
  if (code === "GENERATION_FAILED") return t.failed;
  if (code === "NETWORK") return t.lostConnection;
  if (code === "TOO_MANY_FAILURES") return t.tooManyFailures;
  return errorMessage(code, t.genericError, retryAfterSec);
}
