import type { CSSProperties, MouseEventHandler } from 'react'
import type { PlayerCard as PlayerCardData, Status } from '../../../engine/types'
import { Flag } from '../../atoms/Flag'
import { SlotPips } from '../../atoms/SlotPips'
import { RarityMultBadge } from '../../atoms/Chip'
import { WCJersey } from '../../jersey/WCJersey'

/** Map from engine StatusKind to card overlay state. */
interface CardStatus {
  booked?: boolean
  injured?: boolean
}

interface PlayerCardProps {
  card: PlayerCardData
  size?: number
  isCaptain?: boolean
  /** Status overlays: booked, injured. */
  status?: CardStatus | Status
  /** Field cost override — use to pass engine-computed per-round cost (UI must not import engine). */
  fieldCost?: number
  selected?: boolean
  unaffordable?: boolean
  faceDown?: boolean
  showSlots?: boolean
  showMult?: boolean
  /** Compact mode — drops the stat row + meta so the jersey keeps its room on small (field) cards. */
  compact?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
  className?: string
}

function isBooked(status: CardStatus | Status | undefined): boolean {
  if (!status) return false
  if ('booked' in status) return !!status.booked
  if ('kind' in status) return (status as Status).kind === 'booked' || (status as Status).kind === 'red'
  return false
}

function isInjured(status: CardStatus | Status | undefined): boolean {
  if (!status) return false
  if ('injured' in status) return !!(status as CardStatus).injured
  if ('kind' in status) return (status as Status).kind === 'injured'
  return false
}

/** Derives a visual colour tier from a player's overall rating.
 * Keeps gameplay rarity (used for balance multipliers) separate from presentation.
 */
function colorTier(overall: number): string {
  if (overall >= 87) return 'legendary'
  if (overall >= 84) return 'epic'
  if (overall >= 80) return 'rare'
  return 'common'
}

/** Player card — the hero object of World Cup Clash.
 * Rarity surface via data-rarity, jersey in the figure, stat row, flag chip, status overlays.
 */
export function PlayerCard({
  card,
  size = 168,
  isCaptain,
  status,
  fieldCost,
  selected,
  unaffordable,
  faceDown,
  showSlots,
  showMult,
  compact,
  onClick,
  className = '',
}: PlayerCardProps) {
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

  const wrapClass = [
    'fan-card',
    selected ? 'selected' : '',
    unaffordable ? 'unaffordable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const cardEl = (
    <div
      className={`wcard v2${compact ? ' compact' : ''}${onClick ? ' clickable' : ''}${className ? ' ' + className : ''}`}
      data-rarity={colorTier(card.overall)}
      style={{ '--cw': size + 'px' } as CSSProperties}
      onClick={onClick}
    >
      <div className="cost" title="Stamina cost to field this round">
        {cost}
      </div>
      {showMult && <RarityMultBadge rarity={card.rarity} />}
      {isCaptain && <div className="captain-band">CAPTAIN</div>}
      {isBooked(status) && (
        <div className="st-booked" title="Booked — next whistle is a red" />
      )}
      {isInjured(status) && (
        <div className="st-injured" title="Injured — −15 ATK/DEF">
          ✚
        </div>
      )}
      <div className="inner">
        <div className="top">
          <div className="ratpos">
            <div className="rating">{card.overall}</div>
            <div className="pos">{card.position}</div>
          </div>
          <Flag nation={card.nation} />
        </div>
        <div className="figure">
          <WCJersey nation={card.nation} />
        </div>
        <div className="strip">
          <div className="pname">{card.name}</div>
          {!compact && (
            <>
              <div className="statrow">
                <span className="atk">⚔ {card.atk}</span>
                <span className="def">⛨ {card.def}</span>
              </div>
              <div className="meta">
                <span>{card.nation}</span>
                <span>·</span>
                <span>WC {card.worldCup}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {showSlots && <SlotPips n={card.slots} />}
    </div>
  )

  if (selected || unaffordable) {
    return <div className={wrapClass} style={{ width: size }}>{cardEl}</div>
  }
  return cardEl
}

export type { PlayerCardProps, CardStatus }
