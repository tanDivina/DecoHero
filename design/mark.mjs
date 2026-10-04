// DecoHero mark: an arched doorway split by a before/after slider.
// Left = the room as it is (empty, dark). Right = the redesign (furnished, light).
// Run `node design/build.mjs` to regenerate every PNG from this file.

export const C = {
  olive: "#3E5641",
  oliveDeep: "#2C3E2F",
  limewash: "#E8EBE6",
  brass: "#C2923F", // a touch brighter than the UI brass so it holds up at icon size
  ink: "#1C2321",
};

// Arch on a 1024 canvas, sized to sit inside Android's adaptive-icon safe zone (r ≈ 338).
const L = 372, R = 652, TOP = 292, BOTTOM = 732, SPLIT = 452;
const r = (R - L) / 2;
const arch = `M${L},${BOTTOM} V${TOP + r} A${r},${r} 0 0 1 ${R},${TOP + r} V${BOTTOM} Z`;

// Armchair, in the redesigned half.
const chair = `
  <rect x="508" y="556" width="104" height="96" rx="28"/>
  <rect x="488" y="604" width="36" height="88" rx="18"/>
  <rect x="596" y="604" width="36" height="88" rx="18"/>
  <rect x="500" y="634" width="120" height="52" rx="16"/>
  <rect x="506" y="684" width="12" height="34" rx="5"/>
  <rect x="602" y="684" width="12" height="34" rx="5"/>`;

// Pendant lamp hanging in the redesigned half.
const lamp = `
  <rect x="557" y="${TOP}" width="6" height="118"/>
  <path d="M528,446 a32,32 0 0 1 64,0 z"/>`;

// Slider bar starts where the split meets the arch's curve.
const barTop = Math.round(TOP + r - Math.sqrt(r * r - (SPLIT - (L + R) / 2) ** 2));
const handle = (fill, knock) => `
  <rect x="${SPLIT - 7}" y="${barTop}" width="14" height="${BOTTOM - barTop}" fill="${fill}"/>
  <circle cx="${SPLIT}" cy="470" r="44" fill="${fill}"/>
  <path d="M${SPLIT - 10},452 l-16,18 l16,18 M${SPLIT + 10},452 l16,18 l-16,18"
        fill="none" stroke="${knock}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Full-colour mark. `bg` = null gives a transparent canvas (adaptive foreground). */
export function markSvg({ bg = C.olive, size = 1024, scale = 1, rounded = 0 } = {}) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="arch"><path d="${arch}"/></clipPath>
    <clipPath id="after"><rect x="${SPLIT}" y="0" width="1024" height="1024"/></clipPath>
  </defs>
  ${bg ? `<rect width="1024" height="1024" rx="${rounded}" fill="${bg}"/>` : ""}
  <g transform="${t}">
    <path d="${arch}" fill="${C.oliveDeep}"/>
    <g clip-path="url(#arch)">
      <g clip-path="url(#after)">
        <rect width="1024" height="1024" fill="${C.limewash}"/>
        <g fill="${C.olive}">${chair}${lamp}</g>
        <rect x="0" y="${BOTTOM - 22}" width="1024" height="22" fill="${C.brass}" opacity="0.35"/>
      </g>
    </g>
    <path d="${arch}" fill="none" stroke="${C.limewash}" stroke-width="18"/>
    ${handle(C.brass, C.limewash)}
  </g>
</svg>`;
}

/** Single-colour version for Android 13+ themed icons (white on transparent, shapes cut out). */
export function monoSvg({ size = 1024 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="arch"><path d="${arch}"/></clipPath>
    <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
      <rect width="1024" height="1024" fill="black"/>
      <g clip-path="url(#arch)"><rect x="${SPLIT}" width="1024" height="1024" fill="white"/></g>
      <g fill="black">${chair}${lamp}</g>
      <rect x="${SPLIT - 30}" y="0" width="60" height="1024" fill="black"/>
      <circle cx="${SPLIT}" cy="470" r="64" fill="black"/>
      <path d="${arch}" fill="none" stroke="white" stroke-width="18"/>
      ${handle("white", "black")}
    </mask>
  </defs>
  <rect width="1024" height="1024" fill="white" mask="url(#m)"/>
</svg>`;
}
