import type { CSSProperties, MouseEventHandler } from 'react'
import type { TacticalCard as TacticalCardData } from '../../../engine/types'
import { SlotPips } from '../../atoms/SlotPips'

import type { ReactElement } from 'react'

const CAT_GLYPH: Record<string, ReactElement> = {
  instant: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ff9d92" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="rgba(232,85,74,0.25)" />
    </svg>
  ),
  skill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#82c0f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="rgba(62,148,222,0.18)" />
      <path d="M12 3 L12 21 M3 12 L21 12" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ecd089" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21 L18 21 M12 17 L12 21 M5 4 L19 4 L19 9 A7 7 0 0 1 5 9 Z" fill="rgba(232,200,115,0.18)" />
    </svg>
  ),
}

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
      <div className="cost" title="Stamina cost">
        {cost}
      </div>
      <div className="inner">
        <div className="cat">{card.category}</div>
        <div className="glyph">{CAT_GLYPH[card.category]}</div>
        <div className="tname">{card.name}</div>
        {description && <div className="ttext">{description}</div>}
      </div>
      {showSlots && <SlotPips n={card.slots} />}
    </div>
  )
}
