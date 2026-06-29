import type { CSSProperties, MouseEventHandler } from 'react'
import type { TacticalCard as TacticalCardData } from '../../../engine/types'
import { SlotPips } from '../../atoms/SlotPips'
import { CAT_GLYPH } from './glyphs'
import { useLang } from '../../i18n'
import { tacticalName } from '../../organisms/CardDetailModal/tacticalText'

interface TacticCardProps {
  card: TacticalCardData
  size?: number
  /** Human-readable description (engine TacticalCard has no text field — pass separately). */
  description?: string
  fieldCost?: number
  faceDown?: boolean
  showSlots?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
  className?: string
}

/** Tactical card — category-accented card with glyph disc, name, and rules text.
 * Keys on card.type === "tactical" (engine convention, not prototype "tactic").
 */
export function TacticCard({
  card,
  size = 168,
  description,
  fieldCost,
  faceDown,
  showSlots,
  onClick,
  className = '',
}: TacticCardProps) {
  const { t } = useLang()
  const cost = fieldCost ?? card.cost

  if (faceDown) {
    return (
      <div
        className={`wcard back${className ? ' ' + className : ''}`}
        style={{ '--cw': size + 'px' } as CSSProperties}
      >
        <div className="inner">
          <div className="backmark">WC</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`tcard${onClick ? ' clickable' : ''}${className ? ' ' + className : ''}`}
      data-cat={card.category}
      style={{ '--cw': size + 'px' } as CSSProperties}
      onClick={onClick}
    >
      <div className="cost" title={t('card.staminaCost')}>
        {cost}
      </div>
      <div className="inner">
        <div className="cat">{card.category}</div>
        <div className="glyph">{CAT_GLYPH[card.category]}</div>
        <div className="tname">{tacticalName(t, card.effect.kind, card.name)}</div>
        {description && <div className="ttext">{description}</div>}
      </div>
      {showSlots && <SlotPips n={card.slots} />}
    </div>
  )
}
