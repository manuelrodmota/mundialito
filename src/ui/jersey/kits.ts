/** Per-nation kit table and fallback logic.
 * KITS hex values and patterns are ported verbatim from design/design_handoff_jersey_cards/Jersey.jsx.
 */
import type { Kit } from './buildJerseySVG'
import { NATIONS, NEUTRAL_BANDS } from '../data/nations'

const S = (base: string, trim: string): Kit => ({ pattern: 'solid', base, trim })

/** Per-nation kit definitions — verbatim from the handoff. */
export const KITS: Record<string, Kit> = {
  Argentina: { pattern: 'stripes', base: '#74ACDF', stripe: '#FFFFFF', trim: '#0A1A3F' },
  France: S('#1E2A78', '#FFFFFF'),
  Brazil: S('#FCD116', '#00843D'),
  England: S('#FFFFFF', '#0A1A3F'),
  Portugal: S('#A50021', '#006847'),
  Spain: S('#C60B1E', '#FCD116'),
  Germany: S('#FFFFFF', '#111111'),
  Netherlands: S('#F36C21', '#111111'),
  Belgium: S('#C8102E', '#FCD116'),
  Croatia: { pattern: 'checker', base: '#FFFFFF', stripe: '#D52B1E', trim: '#0A1A3F' },
  Uruguay: S('#5C9BD6', '#14274E'),
  Italy: S('#1A47B8', '#FFFFFF'),
  Morocco: S('#C1272D', '#006233'),
  Japan: S('#14215B', '#FFFFFF'),
  USA: S('#FFFFFF', '#0A1A3F'),
  'United States': S('#FFFFFF', '#0A1A3F'),
  Mexico: S('#006847', '#FFFFFF'),
  Senegal: S('#FFFFFF', '#00853F'),
  Poland: S('#FFFFFF', '#DC143C'),
  'South Korea': S('#C8102E', '#14215B'),
  Norway: S('#C8102E', '#00205B'),
  Canada: S('#D52B1E', '#FFFFFF'),
  Nigeria: S('#008751', '#FFFFFF'),
  Cameroon: S('#007A5E', '#FCD116'),
  Egypt: S('#CE1126', '#FFFFFF'),
  Algeria: S('#FFFFFF', '#007A3D'),
  Sweden: S('#FFCD00', '#1E4FA0'),
  Denmark: S('#C8102E', '#FFFFFF'),
  Scotland: S('#14274E', '#FFFFFF'),
  Wales: S('#C8102E', '#FFFFFF'),
  Australia: S('#FFCD00', '#00843D'),
  Iran: S('#FFFFFF', '#C8102E'),
  Qatar: S('#7A1F3D', '#FFFFFF'),
  'Saudi Arabia': S('#FFFFFF', '#006C35'),
  Ecuador: S('#FFD100', '#1E4FA0'),
  Colombia: S('#FCD116', '#1E4FA0'),
  Chile: S('#D52B1E', '#0039A6'),
  Hungary: S('#CE2939', '#FFFFFF'),
  Georgia: S('#FFFFFF', '#E2231A'),
  Serbia: S('#C6363C', '#0C4076'),
  Switzerland: S('#D52B1E', '#FFFFFF'),
  Ghana: S('#FFFFFF', '#CE1126'),
  Slovenia: S('#FFFFFF', '#005DA4'),
  Russia: S('#FFFFFF', '#0039A6'),
  'Ivory Coast': S('#FF7900', '#007A3D'),
  "Côte d'Ivoire": S('#FF7900', '#007A3D'),
  Tunisia: S('#E70013', '#FFFFFF'),
  'Costa Rica': S('#CE1126', '#002B7F'),
  Austria: S('#ED2939', '#FFFFFF'),
  Bosnia: S('#1A4FA0', '#FCD116'),
  'Bosnia & Herzegovina': S('#1A4FA0', '#FCD116'),
  'Bosnia and Herzegovina': S('#1A4FA0', '#FCD116'),
  Türkiye: S('#E30A17', '#FFFFFF'),
  Turkey: S('#E30A17', '#FFFFFF'),
  Czechia: S('#D7141A', '#FFFFFF'),
  'Czech Republic': S('#D7141A', '#FFFFFF'),
  Paraguay: { pattern: 'stripes', base: '#D52B1E', stripe: '#FFFFFF', trim: '#14274E' },
  'Cape Verde': S('#1A4FA0', '#CE1126'),
  'South Africa': S('#FCB514', '#007A4D'),
  'DR Congo': S('#2477C9', '#CE1126'),
  Jordan: S('#FFFFFF', '#CE1126'),
  Uzbekistan: S('#FFFFFF', '#1565C0'),
  Iraq: S('#FFFFFF', '#CE1126'),
  'Curaçao': S('#1A4FA0', '#FCD116'),
  Curacao: S('#1A4FA0', '#FCD116'),
  Haiti: S('#14387F', '#D21034'),
  Panama: S('#DA121A', '#072357'),
  'New Zealand': S('#111111', '#FFFFFF'),
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170
}

/** Derives a solid kit from the nation's simplified flag bands when no KITS entry exists. */
export function fallbackKit(nation: string): Kit {
  const bands = NATIONS[nation] ?? NEUTRAL_BANDS
  let base = bands[0]
  if (isLight(base) && !isLight(bands[1])) base = bands[1]
  const trim = bands.find((c) => c.toLowerCase() !== base.toLowerCase()) ?? '#111111'
  return { pattern: 'solid', base, trim }
}

/** Returns the kit for a nation, falling back to flag-derived colours for unknowns. */
export function kitForNation(nation: string): Kit {
  return KITS[nation] ?? fallbackKit(nation)
}
