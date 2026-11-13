import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { STYLE_PRESETS } from "./stylePresets";

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
    const saved = await SecureStore.getItemAsync(LANG_KEY);
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
  SecureStore.setItemAsync(LANG_KEY, l).catch(() => {});
}

/** Forget the in-app choice and follow the phone's language again. */
export function followPhoneLang() {
  pref = null;
  apply(deviceLang());
  SecureStore.deleteItemAsync(LANG_KEY).catch(() => {});
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
  const s = STYLE_PRESETS.find((p) => p.id === id);
  return s ? s[lang] : id;
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
