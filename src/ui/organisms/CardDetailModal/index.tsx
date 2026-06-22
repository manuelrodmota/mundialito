import type { Card } from '../../../engine/types'
import { CardModal } from '../CardModal'
import { useLang } from '../../i18n'

/** Maps a tactical effect kind to its translation key (resolved via `t()` in the component). */
const TACTICAL_DESCRIPTION_KEYS: Record<string, string> = {
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

const TACTICAL_DESCRIPTIONS: Record<string, string> = {
  var: 'VAR Review — overturns one opponent card, nullifying its ATK or DEF contribution this round.',
  offsideTrap: 'Offside Trap — your opponent\'s attack lane is voided if they played ≥1 FWD. Requires ≥1 DEF in your defense lane.',
  referee: "Referee's Whistle — stops the clock. Both players' boards are locked; no more cards can be played this round.",
  injury: 'Injury — inflicts an injury status on one opposing player card (−15 ATK/DEF) for 2 rounds.',
  waterBreak: 'Water Break / Fresh Legs — restores 2 stamina immediately and lowers fatigue.',
  substitution: 'Substitution — swap one of your locked premium cards back to your hand, refreshing it.',
  tikiTaka: 'Tiki-Taka — increases your xG by 20% this round. Requires ≥2 MID in your attack lane.',
  catenaccio: 'Catenaccio — doubles the DEF contribution of your defense lane. Requires ≥2 DEF.',
  counterAttack: 'Counter-Attack — adds +0.40 xG bonus if you have ≥1 FWD in attack. Best when defending.',
  highPress: 'High Press — drains 3 of your opponent\'s stamina next round. Requires ≥2 FWD or MID in attack.',
  longBall: 'Long Ball — adds 0.45 xG if ≥1 FWD in your attack lane. Ignores opponent DEF multipliers.',
  nutmeg: 'Nutmeg — bypasses one opposing defender entirely. Requires ≥1 FWD in attack.',
  penalty: 'Penalty Kick — grants 0.85 xG this round, nearly guaranteed goal. Requires ≥1 FWD in attack.',
  teamTalk: 'Halftime Team Talk — grants +1 stamina at the start of the next round.',
  timeWasting: 'Time Wasting — slows the opponent\'s attack, reducing their xG contribution by 15%.',
  handOfGod: 'Hand of God — grants 1.0 xG; a guaranteed goal. Single-use per match. Requires ≥1 FWD.',
  fortress: 'Fortress — adds +8 DEF effectiveness to your defense lane for this round.',
  talisman: 'Talisman — your captain gains +3 to both ATK and DEF until the end of the match.',
  totalFootball: 'Total Football — your ATK and DEF lanes both receive full formation bonuses simultaneously.',
}

interface CardDetailModalProps {
  card: Card | null
  open: boolean
  onClose: () => void
  isCaptain?: boolean
  showMult?: boolean
  fieldCost?: number
  /** Opponent team blurb shown when viewing opponent cards. */
  teamBlurb?: string
}

/** Thin wrapper over the DS CardModal organism.
 *  Adds tactical-text lookup by effect kind and an optional opponent team blurb.
 */
export function CardDetailModal({
  card,
  open,
  onClose,
  isCaptain,
  showMult,
  fieldCost,
  teamBlurb,
}: CardDetailModalProps) {
  const { t } = useLang()
  if (!card) return null

  const tacticDescription =
    card.type === 'tactical'
      ? (TACTICAL_DESCRIPTION_KEYS[card.effect.kind]
          ? t(TACTICAL_DESCRIPTION_KEYS[card.effect.kind])
          : t('builder.tacNoDescription', { name: card.name }))
      : undefined

  return (
    <>
      <CardModal
        card={card}
        open={open}
        onClose={onClose}
        isCaptain={isCaptain}
        showMult={showMult}
        tacticDescription={tacticDescription}
        fieldCost={fieldCost}
      />
      {open && teamBlurb && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,13,21,.9)',
            color: '#eee',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 360,
            textAlign: 'center',
            zIndex: 1001,
          }}
        >
          {teamBlurb}
        </div>
      )}
    </>
  )
}

export { TACTICAL_DESCRIPTIONS, TACTICAL_DESCRIPTION_KEYS }
