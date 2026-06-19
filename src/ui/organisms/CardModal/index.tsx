import type { PlayerCard, TacticalCard, Card } from '../../../engine/types'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { Button } from '../../atoms/Button'
import { Modal } from '../Modal'

const ROLE_TEXT: Record<string, string> = {
  FWD: 'Forward — full ATK going forward, soft at the back (DEF = 55% of overall).',
  MID: 'Midfielder — balanced (85% ATK / 78% DEF). 2+ MIDs played = +1 stamina next round.',
  DEF: 'Defender — a wall (full DEF), limited going forward (55% ATK).',
  GK: 'Goalkeeper — defense lane only. DEF = overall +5, ATK 0.',
}

const RARITY_MULT: Record<string, string> = {
  rare: '1.1',
  epic: '1.2',
  legendary: '1.3',
}

interface CardModalProps {
  card: Card | null
  open: boolean
  onClose: () => void
  isCaptain?: boolean
  showMult?: boolean
  /** Human-readable description for tactical cards. */
  tacticDescription?: string
  fieldCost?: number
}

/** Full-anatomy card detail modal — reusable by the builder and board screens. */
export function CardModal({
  card,
  open,
  onClose,
  isCaptain,
  showMult,
  tacticDescription,
  fieldCost,
}: CardModalProps) {
  if (!card) return null

  const isPlayer = card.type === 'player'
  const pc = isPlayer ? (card as PlayerCard) : null
  const tc = !isPlayer ? (card as TacticalCard) : null
  const mult = pc ? RARITY_MULT[pc.rarity] : undefined

  return (
    <Modal open={open} onClose={onClose}>
      {isPlayer && pc ? (
        <PlayerCardComponent
          card={pc}
          size={230}
          isCaptain={isCaptain}
          fieldCost={fieldCost}
          showSlots
          showMult={showMult}
        />
      ) : tc ? (
        <TacticCard
          card={tc}
          size={230}
          description={tacticDescription}
          fieldCost={fieldCost}
          showSlots
        />
      ) : null}
      <div className="info">
        <h3>{card.name}</h3>
        {isPlayer && pc ? (
          <>
            <div className="tag">
              {pc.nation} · World Cup {pc.worldCup} · {pc.rarity.toUpperCase()} · {pc.slots} slot
              {pc.slots === 1 ? '' : 's'}
            </div>
            <div className="ab">
              <b>
                ATK {pc.atk} / DEF {pc.def}.
              </b>{' '}
              {ROLE_TEXT[pc.position]}
            </div>
            {showMult && mult && (
              <div className="ab">
                <b>Star quality.</b>{' '}
                {pc.rarity.charAt(0).toUpperCase() + pc.rarity.slice(1)} cards contribute ×{mult}{' '}
                their stats each round — an effective ATK {Math.round(pc.atk * parseFloat(mult))} /
                DEF {Math.round(pc.def * parseFloat(mult))}.
              </div>
            )}
            <div className="ab">
              <b>Cost.</b> {fieldCost ?? pc.cost} stamina to field, into attack or defense. Beside a
              star (premium in the lane) support cards pay half.
            </div>
          </>
        ) : tc ? (
          <>
            <div className="tag">
              {tc.category.toUpperCase()} tactical card · {tc.slots} slot{tc.slots === 1 ? '' : 's'}
            </div>
            {tacticDescription && <div className="ab">{tacticDescription}</div>}
            <div className="ab">
              <b>Cost.</b> {fieldCost ?? tc.cost} stamina.
            </div>
          </>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
