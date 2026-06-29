import type { Card } from '../../../engine/types'
import { CardModal } from '../CardModal'
import { useLang } from '../../i18n'
import { tacticalDescription } from './tacticalText'

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
    card.type === 'tactical' ? tacticalDescription(t, card.effect.kind, card.name) : undefined

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

