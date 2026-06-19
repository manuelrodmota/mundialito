/** Procedural SVG jersey builder for World Cup Clash player cards.
 * Ported verbatim from design/design_handoff_jersey_cards/Jersey.jsx.
 * Paths, gradient stops, layer order, and hex values are exact copies from the handoff.
 */

export type KitPattern = 'solid' | 'stripes' | 'checker'

export interface Kit {
  pattern: KitPattern
  base: string
  trim: string
  stripe?: string
}

// SVG silhouette path constants — crew neck + sharp set-in sleeves (verbatim from handoff)
const BODY = "M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46 C182,52 196,57 212,63 C228,70 243,79 254,89 C259,95 262,101 262,109 L260,135 Q259,141 252,140 L219,127 Q214,126 214,133 L211,295 Q211,302 202,302 L98,302 Q89,302 89,295 L86,133 Q86,126 81,127 L48,140 Q41,141 40,135 L38,109 C38,101 41,95 46,89 C57,79 72,70 88,63 C104,57 118,52 132,46 Z"
const COLLAR = "M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46"
const SEAM_L = "M131,49 C105,66 90,98 86,131"
const SEAM_R = "M169,49 C195,66 210,98 214,131"
const CUFF_L = "M40,135 L81,127"
const CUFF_R = "M260,135 L219,127"

function fillEl(kit: Kit): string {
  const w = 300, h = 340
  if (kit.pattern === 'stripes') {
    let r = `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`
    const sw = 23
    for (let x = 46; x < w; x += sw * 2) {
      r += `<rect x="${x}" y="0" width="${sw}" height="${h}" fill="${kit.stripe ?? kit.trim}"/>`
    }
    return r
  }
  if (kit.pattern === 'checker') {
    let r = `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`
    const s = 26
    for (let y = 0, j = 0; y < h; y += s, j++) {
      for (let x = 0, i = 0; x < w; x += s, i++) {
        if ((i + j) % 2 === 0) {
          r += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${kit.stripe ?? kit.trim}"/>`
        }
      }
    }
    return r
  }
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="${kit.base}"/>`
}

let gid = 0

/** Builds the jersey SVG string for the given kit.
 * Returns a locally-generated SVG string safe to inject via dangerouslySetInnerHTML —
 * all values originate from the KITS table or flag-band fallback; no untrusted user input reaches here.
 */
export function buildJerseySVG(kit: Kit): string {
  const id = "wcj" + (gid++)
  let knit = ""
  for (let x = 44; x < 256; x += 7) {
    knit += `<line x1="${x}" y1="0" x2="${x}" y2="340" stroke="#000" stroke-width="0.7" opacity="0.04"/>`
  }
  const trim = kit.trim
  return `<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="clip${id}"><path d="${BODY}"/></clipPath>
      <linearGradient id="sh${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.06"/>
        <stop offset="0.15" stop-color="#000" stop-opacity="0.17"/>
        <stop offset="0.24" stop-color="#000" stop-opacity="0.04"/>
        <stop offset="0.31" stop-color="#000" stop-opacity="0.26"/>
        <stop offset="0.42" stop-color="#000" stop-opacity="0.02"/>
        <stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/>
        <stop offset="0.58" stop-color="#000" stop-opacity="0.02"/>
        <stop offset="0.69" stop-color="#000" stop-opacity="0.26"/>
        <stop offset="0.76" stop-color="#000" stop-opacity="0.04"/>
        <stop offset="0.85" stop-color="#000" stop-opacity="0.17"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.06"/>
      </linearGradient>
      <linearGradient id="sheen${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0.36" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#fff" stop-opacity="0.14"/>
        <stop offset="0.64" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#clip${id})">
      ${fillEl(kit)}
      ${knit}
      <rect x="0" y="0" width="300" height="340" fill="url(#sh${id})"/>
      <rect x="0" y="0" width="300" height="340" fill="url(#sheen${id})"/>
      <path d="M122,150 Q128,225 122,296" stroke="#000" stroke-width="4" fill="none" opacity="0.07" stroke-linecap="round"/>
      <path d="M178,150 Q172,225 178,296" stroke="#000" stroke-width="4" fill="none" opacity="0.07" stroke-linecap="round"/>
      <ellipse cx="150" cy="120" rx="46" ry="28" fill="#fff" opacity="0.06"/>
    </g>
    <path d="${BODY}" fill="none" stroke="${trim}" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="${SEAM_L}" fill="none" stroke="${trim}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
    <path d="${SEAM_R}" fill="none" stroke="${trim}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
    <path d="${COLLAR}" fill="none" stroke="${trim}" stroke-width="10" stroke-linecap="round"/>
    <path d="${COLLAR}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
    <path d="${CUFF_L}" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${CUFF_R}" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}
