import type { CSSProperties } from 'react'
import { BOX_TIERS, type BoxTier } from '../../../meta/boxes'

function PackEmblem({ tier, color }: { tier: BoxTier; color: string }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (tier === 'champions' || tier === 'trophy') {
    return (
      <svg viewBox="0 0 48 48" {...common}>
        <path d="M14 40 H34 M24 32 V40 M12 8 H36 V16 A12 12 0 0 1 12 16 Z" fill={color} fillOpacity={0.2} />
        <path d="M12 10 H7 C7 18 11 21 14 21 M36 10 H41 C41 18 37 21 34 21" />
        <path d="M24 14 l1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5 Z" fill={color} stroke="none" />
      </svg>
    )
  }
  if (tier === 'knockout') {
    return (
      <svg viewBox="0 0 48 48" {...common}>
        <path d="M9 12 H17 V22 H27 M9 36 H17 V26 H27 M27 24 H39" />
        <circle cx="39" cy="24" r="4" fill={color} fillOpacity={0.3} />
      </svg>
    )
  }
  // group — shield
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M24 7 L39 12 V24 C39 33 32 39 24 42 C16 39 9 33 9 24 V12 Z" fill={color} fillOpacity={0.2} />
      <path d="M24 18 l2 4.2 4.6 .6 -3.3 3.2 .8 4.6 -4.1 -2.2 -4.1 2.2 .8 -4.6 -3.3 -3.2 4.6 -.6 Z" fill={color} stroke="none" />
    </svg>
  )
}

interface PackProps {
  tier: BoxTier
  count?: number
  big?: boolean
  /** Explicit pack width in px (overrides big/default). Packs under 100px hide the name band. */
  size?: number
  onClick?: () => void
}

/** Box pack art (locker shelves + the opening stage). */
export function Pack({ tier, count, big, size, onClick }: PackProps) {
  const box = BOX_TIERS[tier] ?? BOX_TIERS.group
  const pw = size ?? (big ? 260 : 150)
  const compact = pw < 100
  const isTrophy = tier === 'trophy'
  const emblem = pw * (compact ? 0.56 : 0.46)
  return (
    <button
      className={`pack${isTrophy ? ' trophy' : ''}`}
      style={{ '--pw': pw + 'px', '--acc': box.accent } as CSSProperties}
      onClick={onClick}
      type="button"
    >
      <div className="pack-rays" />
      <div className="sheen" />
      <div
        className="crest-ghost"
        style={{ width: emblem, height: emblem, left: '50%', top: '42%', transform: 'translate(-50%,-50%)', position: 'absolute' }}
      >
        <PackEmblem tier={tier} color={isTrophy ? '#fff' : box.accent} />
      </div>
      {count != null && count > 1 && <span className="pack-x">×{count}</span>}
      {!compact && (
        <div className="pack-band">
          <div className="pack-tier">{isTrophy ? 'Trophy' : box.tagline}</div>
          <div className="pack-name">{isTrophy ? 'Champions' : box.name}</div>
        </div>
      )}
    </button>
  )
}
