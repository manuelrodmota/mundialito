import type { Translate } from '../../i18n'

/**
 * Tactical-card description text — the SINGLE source of truth, resolved via i18n (`builder.tac*` keys
 * in `src/ui/i18n/locales/builder.ts`). Both the card-detail modal and the in-match TacticCard use
 * this, so there is no duplicated English copy to drift out of sync with the engine (which is what
 * left the Penalty Kick / Hand of God descriptions stale). Lives in its own module (no component) so
 * it can be shared without tripping react-refresh's component-only-export rule.
 */

/** Maps a tactical effect `kind` to its translation key. */
export const TACTICAL_DESCRIPTION_KEYS: Record<string, string> = {
  var: 'builder.tacVar',
  offsideTrap: 'builder.tacOffsideTrap',
  referee: 'builder.tacReferee',
  injury: 'builder.tacInjury',
  waterBreak: 'builder.tacWaterBreak',
  substitution: 'builder.tacSubstitution',
  tikiTaka: 'builder.tacTikiTaka',
  catenaccio: 'builder.tacCatenaccio',
  counterAttack: 'builder.tacCounterAttack',
  highPress: 'builder.tacHighPress',
  longBall: 'builder.tacLongBall',
  nutmeg: 'builder.tacNutmeg',
  penalty: 'builder.tacPenalty',
  teamTalk: 'builder.tacTeamTalk',
  timeWasting: 'builder.tacTimeWasting',
  handOfGod: 'builder.tacHandOfGod',
  fortress: 'builder.tacFortress',
  talisman: 'builder.tacTalisman',
  totalFootball: 'builder.tacTotalFootball',
}

/** Resolves a tactical card's localized description (falls back to a generic line for unknown kinds). */
export function tacticalDescription(t: Translate, kind: string, name: string): string {
  const key = TACTICAL_DESCRIPTION_KEYS[kind]
  return key ? t(key) : t('builder.tacNoDescription', { name })
}

/** Maps a tactical effect `kind` to its display-name translation key. */
export const TACTICAL_NAME_KEYS: Record<string, string> = {
  var: 'builder.tacNameVar',
  offsideTrap: 'builder.tacNameOffsideTrap',
  referee: 'builder.tacNameReferee',
  injury: 'builder.tacNameInjury',
  waterBreak: 'builder.tacNameWaterBreak',
  substitution: 'builder.tacNameSubstitution',
  tikiTaka: 'builder.tacNameTikiTaka',
  catenaccio: 'builder.tacNameCatenaccio',
  counterAttack: 'builder.tacNameCounterAttack',
  highPress: 'builder.tacNameHighPress',
  longBall: 'builder.tacNameLongBall',
  nutmeg: 'builder.tacNameNutmeg',
  penalty: 'builder.tacNamePenalty',
  teamTalk: 'builder.tacNameTeamTalk',
  timeWasting: 'builder.tacNameTimeWasting',
  handOfGod: 'builder.tacNameHandOfGod',
  fortress: 'builder.tacNameFortress',
  talisman: 'builder.tacNameTalisman',
  totalFootball: 'builder.tacNameTotalFootball',
}

/** Resolves a tactical card's localized display name (falls back to the raw English name). */
export function tacticalName(t: Translate, kind: string, fallback: string): string {
  const key = TACTICAL_NAME_KEYS[kind]
  return key ? t(key) : fallback
}
