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
};

export const t: Strings = lang === "es" ? es : en;

export function styleName(id: string): string {
  const s = STYLE_PRESETS.find((p) => p.id === id);
  return s ? s[lang] : id;
}
