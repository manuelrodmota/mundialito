/** Nation flag-band data and crest asset map.
 * Single shared source feeding Flag/Crest chips and the jersey flag-fallback.
 * Ported verbatim from design/js/data.js (NATIONS + CRESTS).
 */

/** Three vertical band hex colours for each nation's simplified flag chip. */
export const NATIONS: Record<string, [string, string, string]> = {
  Argentina: ["#74ACDF", "#FFFFFF", "#74ACDF"],
  France: ["#0055A4", "#FFFFFF", "#EF4135"],
  Brazil: ["#009C3B", "#FFDF00", "#009C3B"],
  England: ["#FFFFFF", "#CE1124", "#FFFFFF"],
  Portugal: ["#006600", "#FF0000", "#FF0000"],
  Spain: ["#AA151B", "#F1BF00", "#AA151B"],
  Germany: ["#000000", "#DD0000", "#FFCE00"],
  Netherlands: ["#AE1C28", "#FFFFFF", "#21468B"],
  Belgium: ["#000000", "#FDDA24", "#EF3340"],
  Croatia: ["#FF0000", "#FFFFFF", "#171796"],
  Uruguay: ["#7BB2DD", "#FFFFFF", "#7BB2DD"],
  Italy: ["#008C45", "#F4F5F0", "#CD212A"],
  Morocco: ["#C1272D", "#006233", "#C1272D"],
  Japan: ["#FFFFFF", "#BC002D", "#FFFFFF"],
  USA: ["#3C3B6E", "#FFFFFF", "#B22234"],
  Mexico: ["#006847", "#FFFFFF", "#CE1126"],
  Senegal: ["#00853F", "#FDEF42", "#E31B23"],
  Poland: ["#FFFFFF", "#DC143C", "#DC143C"],
  "South Korea": ["#FFFFFF", "#CD2E3A", "#0047A0"],
  Norway: ["#BA0C2F", "#FFFFFF", "#00205B"],
  Canada: ["#FF0000", "#FFFFFF", "#FF0000"],
  Nigeria: ["#008751", "#FFFFFF", "#008751"],
  Cameroon: ["#007A5E", "#CE1126", "#FCD116"],
  Egypt: ["#CE1126", "#FFFFFF", "#000000"],
  Algeria: ["#006233", "#FFFFFF", "#D21034"],
  Sweden: ["#006AA7", "#FECC02", "#006AA7"],
  Denmark: ["#C8102E", "#FFFFFF", "#C8102E"],
  Scotland: ["#005EB8", "#FFFFFF", "#005EB8"],
  Wales: ["#FFFFFF", "#00B140", "#D30731"],
  Australia: ["#00205B", "#FFFFFF", "#E4002B"],
  Iran: ["#239F40", "#FFFFFF", "#DA0000"],
  Qatar: ["#8A1538", "#FFFFFF", "#8A1538"],
  "Saudi Arabia": ["#165D31", "#FFFFFF", "#165D31"],
  Ecuador: ["#FFD100", "#0072CE", "#EF3340"],
  Colombia: ["#FCD116", "#003893", "#CE1126"],
  Chile: ["#0039A6", "#FFFFFF", "#D52B1E"],
  Hungary: ["#CE2939", "#FFFFFF", "#477050"],
  Georgia: ["#FFFFFF", "#FF0000", "#FFFFFF"],
  Serbia: ["#C6363C", "#0C4076", "#FFFFFF"],
  Switzerland: ["#DA291C", "#FFFFFF", "#DA291C"],
  Ghana: ["#CE1126", "#FCD116", "#006B3F"],
  Slovenia: ["#FFFFFF", "#005DA4", "#ED1C24"],
  Russia: ["#FFFFFF", "#0039A6", "#D52B1E"],
  "Ivory Coast": ["#FF8200", "#FFFFFF", "#009A44"],
  Tunisia: ["#E70013", "#FFFFFF", "#E70013"],
  "Costa Rica": ["#002B7F", "#FFFFFF", "#CE1126"],
  "—": ["#525252", "#737373", "#525252"],
};

/** Fallback bands for entirely unknown nations. */
export const NEUTRAL_BANDS: [string, string, string] = ["#525252", "#737373", "#525252"];

import algeria from '../assets/crests/algeria.svg'
import argentina from '../assets/crests/argentina.svg'
import australia from '../assets/crests/australia.svg'
import austria from '../assets/crests/austria.svg'
import belgium from '../assets/crests/belgium.svg'
import bosnia from '../assets/crests/bosnia.svg'
import brazil from '../assets/crests/brazil.svg'
import canada from '../assets/crests/canada.svg'
import capeVerde from '../assets/crests/cape-verde.svg'
import colombia from '../assets/crests/colombia.svg'
import costaRica from '../assets/crests/costa-rica.svg'
import croatia from '../assets/crests/croatia.svg'
import curacao from '../assets/crests/curacao.svg'
import czechia from '../assets/crests/czechia.svg'
import drCongo from '../assets/crests/dr-congo.svg'
import ecuador from '../assets/crests/ecuador.svg'
import egypt from '../assets/crests/egypt.svg'
import england from '../assets/crests/england.svg'
import france from '../assets/crests/france.svg'
import germany from '../assets/crests/germany.svg'
import ghana from '../assets/crests/ghana.svg'
import haiti from '../assets/crests/haiti.svg'
import iran from '../assets/crests/iran.svg'
import ivoryCast from '../assets/crests/ivory-coast.svg'
import japan from '../assets/crests/japan.svg'
import jordan from '../assets/crests/jordan.svg'
import mexico from '../assets/crests/mexico.svg'
import morocco from '../assets/crests/morocco.svg'
import netherlands from '../assets/crests/netherlands.svg'
import newZealand from '../assets/crests/new-zealand.svg'
import norway from '../assets/crests/norway.svg'
import panama from '../assets/crests/panama.svg'
import paraguay from '../assets/crests/paraguay.svg'
import portugal from '../assets/crests/portugal.svg'
import qatar from '../assets/crests/qatar.svg'
import saudiArabia from '../assets/crests/saudi-arabia.svg'
import scotland from '../assets/crests/scotland.svg'
import senegal from '../assets/crests/senegal.svg'
import southAfrica from '../assets/crests/south-africa.svg'
import southKorea from '../assets/crests/south-korea.svg'
import spain from '../assets/crests/spain.svg'
import sweden from '../assets/crests/sweden.svg'
import switzerland from '../assets/crests/switzerland.svg'
import tunisia from '../assets/crests/tunisia.svg'
import turkiye from '../assets/crests/turkiye.svg'
import uruguay from '../assets/crests/uruguay.svg'
import usa from '../assets/crests/usa.svg'
import uzbekistan from '../assets/crests/uzbekistan.svg'
import cameroon from '../assets/crests/cameroon.svg'
import chile from '../assets/crests/chile.svg'
import denmark from '../assets/crests/denmark.svg'
import hungary from '../assets/crests/hungary.svg'
import italy from '../assets/crests/italy.svg'
import nigeria from '../assets/crests/nigeria.svg'
import poland from '../assets/crests/poland.svg'
import serbia from '../assets/crests/serbia.svg'
import slovenia from '../assets/crests/slovenia.svg'

const CRESTS: Record<string, string> = {
  Cameroon: cameroon,
  Chile: chile,
  Denmark: denmark,
  Hungary: hungary,
  Italy: italy,
  Nigeria: nigeria,
  Poland: poland,
  Serbia: serbia,
  Slovenia: slovenia,
  Algeria: algeria,
  Argentina: argentina,
  Australia: australia,
  Austria: austria,
  Belgium: belgium,
  Bosnia: bosnia,
  "Bosnia and Herzegovina": bosnia,
  "Bosnia & Herzegovina": bosnia,
  Brazil: brazil,
  Canada: canada,
  "Cape Verde": capeVerde,
  "Cabo Verde": capeVerde,
  Colombia: colombia,
  "Costa Rica": costaRica,
  Croatia: croatia,
  Curacao: curacao,
  "Curaçao": curacao,
  Czechia: czechia,
  "Czech Republic": czechia,
  "DR Congo": drCongo,
  Ecuador: ecuador,
  Egypt: egypt,
  England: england,
  France: france,
  Germany: germany,
  Ghana: ghana,
  Haiti: haiti,
  Iran: iran,
  "Ivory Coast": ivoryCast,
  "Côte d'Ivoire": ivoryCast,
  Japan: japan,
  Jordan: jordan,
  Mexico: mexico,
  Morocco: morocco,
  Netherlands: netherlands,
  "New Zealand": newZealand,
  Norway: norway,
  Panama: panama,
  Paraguay: paraguay,
  Portugal: portugal,
  Qatar: qatar,
  "Saudi Arabia": saudiArabia,
  Scotland: scotland,
  Senegal: senegal,
  "South Africa": southAfrica,
  "South Korea": southKorea,
  Spain: spain,
  Sweden: sweden,
  Switzerland: switzerland,
  Tunisia: tunisia,
  Türkiye: turkiye,
  Turkey: turkiye,
  Uruguay: uruguay,
  USA: usa,
  "United States": usa,
  Uzbekistan: uzbekistan,
}

/** Returns the Vite-fingerprinted crest URL for nations with art, or null otherwise. */
export function crestSrc(nation: string): string | null {
  return CRESTS[nation] ?? null
}

/** ISO 3166-1 alpha-2 codes for the circle-flags fallback (used when no bundled crest exists). */
const NATION_CODES: Record<string, string> = {
  Argentina: 'ar', France: 'fr', Brazil: 'br', England: 'gb-eng', Portugal: 'pt',
  Spain: 'es', Germany: 'de', Netherlands: 'nl', Belgium: 'be', Croatia: 'hr',
  Uruguay: 'uy', Italy: 'it', Morocco: 'ma', Japan: 'jp', USA: 'us',
  'United States': 'us', Mexico: 'mx', Senegal: 'sn', Poland: 'pl',
  'South Korea': 'kr', Norway: 'no', Canada: 'ca', Nigeria: 'ng', Cameroon: 'cm',
  Egypt: 'eg', Algeria: 'dz', Sweden: 'se', Denmark: 'dk', Scotland: 'gb-sct',
  Wales: 'gb-wls', Australia: 'au', Iran: 'ir', Qatar: 'qa', 'Saudi Arabia': 'sa',
  Ecuador: 'ec', Colombia: 'co', Chile: 'cl', Hungary: 'hu', Georgia: 'ge',
  Serbia: 'rs', Switzerland: 'ch', Ghana: 'gh', Slovenia: 'si', Russia: 'ru',
  'Ivory Coast': 'ci', "Côte d'Ivoire": 'ci', Tunisia: 'tn', 'Costa Rica': 'cr',
  Austria: 'at', Bosnia: 'ba', 'Bosnia and Herzegovina': 'ba', 'Cape Verde': 'cv',
  Curacao: 'cw', 'Curaçao': 'cw', Czechia: 'cz', 'Czech Republic': 'cz',
  'DR Congo': 'cd', Haiti: 'ht', Jordan: 'jo', 'New Zealand': 'nz', Panama: 'pa',
  Paraguay: 'py', 'South Africa': 'za', Türkiye: 'tr', Turkey: 'tr',
  Uzbekistan: 'uz', Peru: 'pe', Romania: 'ro', Ukraine: 'ua', Greece: 'gr',
  Bulgaria: 'bg', 'Northern Ireland': 'gb-nir', 'Republic of Ireland': 'ie',
  Ireland: 'ie', Honduras: 'hn', Slovakia: 'sk', Angola: 'ao',
}

/** Remote circle-flags URL (https://github.com/HatScripts/circle-flags) for a nation, or null. */
export function flagUrl(nation: string): string | null {
  const code = NATION_CODES[nation]
  return code ? `https://hatscripts.github.io/circle-flags/flags/${code}.svg` : null
}

/** Best available round badge for a nation: bundled crest first, else the circle-flags flag, else null. */
export function teamBadge(nation: string): string | null {
  return crestSrc(nation) ?? flagUrl(nation)
}
