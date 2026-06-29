import type { PlayerCard, TacticalCard, Card } from '../../../engine/types'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { Button } from '../../atoms/Button'
import { Modal } from '../Modal'
import { useLang } from '../../i18n'
import { tacticalName } from '../CardDetailModal/tacticalText'

const ROLE_KEY: Record<string, string> = {
  FWD: 'card.roleFwd',
  MID: 'card.roleMid',
  DEF: 'card.roleDef',
  GK: 'card.roleGk',
}

const RARITY_KEY: Record<string, string> = {
  common: 'card.rarityCommon',
  rare: 'card.rarityRare',
  epic: 'card.rarityEpic',
  legendary: 'card.rarityLegendary',
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
  /** Optional primary action (e.g. "Play this card" in-match); renders a gold CTA above Close. */
  primaryLabel?: string
  onPrimary?: () => void
  /** Optional status line shown above the actions (e.g. "Needs ≥1 FWD" / "No plays left this half"). */
  note?: string
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
  primaryLabel,
  onPrimary,
  note,
}: CardModalProps) {
  const { t } = useLang()
  if (!card) return null

  const isPlayer = card.type === 'player'
  const pc = isPlayer ? (card as PlayerCard) : null
  const tc = !isPlayer ? (card as TacticalCard) : null
  const mult = pc ? RARITY_MULT[pc.rarity] : undefined
  const slotWord = (n: number) => t(n === 1 ? 'card.slot' : 'card.slots')

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
        <h3>{tc ? tacticalName(t, tc.effect.kind, tc.name) : card.name}</h3>
        {isPlayer && pc ? (
          <>
            <div className="tag">
              {t('card.tagPlayer', {
                nation: pc.nation,
                wc: pc.worldCup,
                rarity: t(RARITY_KEY[pc.rarity] ?? 'card.rarityCommon').toUpperCase(),
                slots: pc.slots,
                slotWord: slotWord(pc.slots),
              })}
            </div>
            <div className="ab">
              <b>
                ATK {pc.atk} / DEF {pc.def}.
              </b>{' '}
              {t(ROLE_KEY[pc.position])}
            </div>
            {showMult && mult && (
              <div className="ab">
                <b>{t('card.starQuality')}</b>{' '}
                {t('card.starQualityBody', {
                  rarity: t(RARITY_KEY[pc.rarity] ?? 'card.rarityCommon'),
                  mult,
                  atk: Math.round(pc.atk * parseFloat(mult)),
                  def: Math.round(pc.def * parseFloat(mult)),
                })}
              </div>
            )}
            <div className="ab">
              <b>{t('card.cost')}</b>{' '}
              {t('card.costPlayerBody', { n: fieldCost ?? pc.cost })}
            </div>
          </>
        ) : tc ? (
          <>
            <div className="tag">
              {t('card.tagTactical', {
                category: tc.category.toUpperCase(),
                slots: tc.slots,
                slotWord: slotWord(tc.slots),
              })}
            </div>
            {tacticDescription && <div className="ab">{tacticDescription}</div>}
            <div className="ab">
              <b>{t('card.cost')}</b> {t('card.costTacticalBody', { n: fieldCost ?? tc.cost })}
            </div>
          </>
        ) : null}
        {note && <div className="card-modal-note">{note}</div>}
        {primaryLabel && onPrimary && (
          <Button variant="gold" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t('card.close')}
        </Button>
      </div>
    </Modal>
  )
}
