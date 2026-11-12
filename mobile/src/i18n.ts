import { getLocales } from "expo-localization";
import { STYLE_PRESETS } from "./stylePresets";

export type Lang = "en" | "es";
export const lang: Lang = getLocales()[0]?.languageCode === "es" ? "es" : "en";

const en = {
  tagline: "See your room in a new style before you buy a thing.",
  takePhoto: "Take a photo",
  choosePhoto: "Choose from gallery",
  changePhoto: "Change photo",
  pickStyles: "Pick up to 4 styles",
  tip: "Stand in a corner and shoot in daylight so the whole room is in frame.",
  redesign: (n: number) => (n === 1 ? "Redesign · 1 credit" : `Redesign · ${n} credits`),
  pickFirst: "Add a photo and pick a style",
  credits: (n: number) => (n === 1 ? "1 credit" : `${n} credits`),
  designing: (s: string) => `Designing ${s}…`,
  holdToCompare: "Hold the photo to see your original",
  original: "Original",
  save: "Save",
  saved: "Saved to gallery",
  share: "Share",
  report: "Report",
  reported: "Reported. We'll review this design.",
  tryMore: "Try other styles",
  failed: "This design didn't come through and your credit was returned. Go back and try again.",
  outOfCredits: "You're out of credits. Get a pack to keep designing.",
  notEnough: (n: number) => (n === 0 ? "You're out of credits." : `You have ${n === 1 ? "1 credit" : `${n} credits`}. Pick fewer styles or get more.`),
  network: "Couldn't reach DecoHero. Check your connection and try again.",
  config: "This build of DecoHero isn't set up to reach its server. Please update the app.",
  rateLimited: "That was a lot of designs at once. Wait a minute and try again.",
  busy: "DecoHero is very busy right now. Please try again later.",
  freeDailyLimit: "Free designs are used up for today. Try again tomorrow, or get credits to keep designing.",
  tooLarge: "That photo is too large. Try another photo or take a new one.",
  getCredits: "Get credits",
  shopTitle: "Get credits",
  shopSub: "One credit makes one design. Credits never expire, and any purchase removes the DecoHero mark from new designs.",
  buy: (price: string) => `Buy for ${price}`,
  purchasePending: "Payment received. Your credits will appear in a few seconds.",
  purchaseDone: "Credits added.",
  noOfferings: "Credit packs aren't available right now. Check your connection and try again.",
  cameraDenied: "Allow camera access in Settings to take a photo.",
  mediaDenied: "Allow photo access in Settings to save designs.",
  back: "Back",
  aiNotice: "Designs are AI-generated ideas, not exact products or measurements.",
  bestValue: "Best value",
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
  credits: (n) => (n === 1 ? "1 crédito" : `${n} créditos`),
  designing: (s) => `Diseñando ${s}…`,
  holdToCompare: "Mantén presionada la foto para ver el original",
  original: "Original",
  save: "Guardar",
  saved: "Guardado en la galería",
  share: "Compartir",
  report: "Reportar",
  reported: "Reportado. Revisaremos este diseño.",
  tryMore: "Probar otros estilos",
  failed: "Este diseño no se generó y te devolvimos el crédito. Vuelve e inténtalo otra vez.",
  outOfCredits: "Te quedaste sin créditos. Compra un paquete para seguir diseñando.",
  notEnough: (n) => (n === 0 ? "Te quedaste sin créditos." : `Tienes ${n === 1 ? "1 crédito" : `${n} créditos`}. Elige menos estilos o compra más.`),
  network: "No pudimos conectar con DecoHero. Revisa tu conexión e inténtalo de nuevo.",
  config: "Esta versión de DecoHero no está configurada para conectar con su servidor. Actualiza la app.",
  rateLimited: "Fueron muchos diseños a la vez. Espera un minuto e inténtalo de nuevo.",
  busy: "DecoHero está muy ocupado ahora. Inténtalo de nuevo más tarde.",
  freeDailyLimit: "Ya se usaron los diseños gratis de hoy. Inténtalo mañana o consigue créditos para seguir diseñando.",
  tooLarge: "Esa foto es demasiado grande. Prueba con otra foto o toma una nueva.",
  getCredits: "Comprar créditos",
  shopTitle: "Comprar créditos",
  shopSub: "Un crédito es un diseño. Los créditos no vencen, y cualquier compra quita la marca DecoHero de tus nuevos diseños.",
  buy: (price) => `Comprar por ${price}`,
  purchasePending: "Pago recibido. Tus créditos aparecerán en unos segundos.",
  purchaseDone: "Créditos agregados.",
  noOfferings: "Los paquetes no están disponibles ahora. Revisa tu conexión e inténtalo de nuevo.",
  cameraDenied: "Permite el acceso a la cámara en Ajustes para tomar una foto.",
  mediaDenied: "Permite el acceso a fotos en Ajustes para guardar diseños.",
  back: "Volver",
  aiNotice: "Los diseños son ideas generadas con IA, no productos ni medidas exactas.",
  bestValue: "Mejor precio",
  paymentPending: "Tu pago está pendiente. Los créditos se agregan en cuanto Google Play lo confirme.",
  purchaseNotAllowed: "Las compras no están permitidas en este dispositivo o cuenta.",
  storeProblem: "Google Play tuvo un problema. No se te cobró. Inténtalo de nuevo en un momento.",
  purchaseFailed: "La compra no se completó. No se te cobró.",
  purchaseSlow: "Tus créditos van en camino. Aparecerán en uno o dos minutos.",
  about: "Información y privacidad",
  aboutTitle: "Información",
  aboutBody: "DecoHero convierte una foto de tu espacio en ideas de diseño. Las fotos se envían a nuestro servidor solo para crear tus diseños. No las guardamos.",
  privacyPolicy: "Política de privacidad",
  installIdLabel: "Tu ID de instalación",
  installIdHelp: "Este ID anónimo guarda tus créditos. Para que borremos tus datos, envíanos este ID (la política de privacidad explica cómo).",
  shareInstallId: "Compartir ID de instalación",
};

export const t: Strings = lang === "es" ? es : en;

export function styleName(id: string): string {
  const s = STYLE_PRESETS.find((p) => p.id === id);
  return s ? s[lang] : id;
}

/** Friendly text for an API error code (see src/api.ts). */
export function errorMessage(code?: string, fallback: string = t.failed): string {
  switch (code) {
    case "NO_CREDITS": return t.outOfCredits;
    case "NETWORK": return t.network;
    case "CONFIG": return t.config;
    case "RATE_LIMITED":
    case "HTTP_429": return t.rateLimited;
    case "DAILY_LIMIT": return t.busy;
    case "FREE_DAILY_LIMIT": return t.freeDailyLimit;
    case "TOO_LARGE":
    case "HTTP_413": return t.tooLarge;
    default: return fallback;
  }
}
