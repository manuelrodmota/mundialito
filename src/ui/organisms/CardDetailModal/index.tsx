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
  var: 'VAR Review — cancels one Tactical Card the opponent played this round (it is exiled).',
  offsideTrap: 'Offside Trap — the opponent\'s highest-ATK attacker contributes 0 to their xG this round. Requires ≥1 DEF.',
  referee: "Referee's Whistle — books an opposing player; a second booking is a red card (sent off).",
  injury: 'Injury — injures one opposing player: −15 ATK/DEF for the rest of the match.',
  waterBreak: 'Water Break / Fresh Legs — resets your fatigue to 0 and grants +2 stamina this round.',
  substitution: 'Substitution — fresh legs: reduces your fatigue by 8 and draws a card.',
  tikiTaka: 'Tiki-Taka — +0.20 xG this round. Requires ≥2 MID.',
  catenaccio: 'Catenaccio — halves the opponent\'s xG against you this round. Requires ≥2 DEF.',
  counterAttack: 'Counter-Attack — if your DEF ≥ their ATK this round, +0.40 xG on the break. Requires ≥1 FWD.',
  highPress: 'High Press — the opponent\'s defender is Pressed (DEF −10) and gains +6 fatigue. Requires ≥2 FWD/MID.',
  longBall: 'Long Ball — a direct +0.45 xG this round, bypassing the back line. Requires ≥1 FWD.',
  nutmeg: 'Nutmeg — your best forward ignores the opponent\'s defense this round. Requires ≥1 FWD.',
  penalty: 'Penalty Kick — +0.60 xG this round, a near-certain finish. Requires ≥1 FWD.',
  teamTalk: 'Halftime Team Talk — removes all debuffs from your cards, clears your fatigue, and draws 2.',
  timeWasting: 'Time Wasting — the opponent\'s xG floor drops to 0 next round (an idle attack scores nothing).',
  handOfGod: 'Hand of God — +0.80 xG (a guaranteed goal). Once per match. Requires ≥1 FWD.',
  fortress: 'Fortress — persistent: +8 DEF effectiveness every round.',
  talisman: 'Talisman — persistent: your Captain\'s-nation cards gain +3 ATK / +3 DEF.',
  totalFootball: 'Total Football — persistent: each player also lends 50% of its other stat to the opposite lane.',
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
  /** Optional primary action (e.g. "Play this card" in-match). */
  primaryLabel?: string
  onPrimary?: () => void
  /** Optional status line shown above the actions (gate requirement / per-half cap reached). */
  note?: string
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
  primaryLabel,
  onPrimary,
  note,
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
        primaryLabel={primaryLabel}
        onPrimary={onPrimary}
        note={note}
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
