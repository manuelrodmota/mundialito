import type { ReactNode } from 'react'
import type { TacticalCat, Formation } from '../../../engine/types'

interface ChipProps {
  children: ReactNode
  variant?: 'default' | 'flame' | 'stoppage'
}

/** Live-count and status chip. */
export function Chip({ children, variant = 'default' }: ChipProps) {
  const cls = variant === 'default' ? 'chip' : `chip ${variant}`
  return <span className={cls}>{children}</span>
}

interface StageTagProps {
  children: ReactNode
}

/** Stage/round label tag. */
export function StageTag({ children }: StageTagProps) {
  return <span className="stage-tag">{children}</span>
}

interface FormationChipProps {
  formation: Formation
  children: ReactNode
}

/** Formation chip with `data-f` tint. */
export function FormationChip({ formation, children }: FormationChipProps) {
  return (
    <span className="fchip" data-f={formation}>
      {children}
    </span>
  )
}

/** Ramp hint indicator for the next stamina bump. */
export function RampHint({ children }: { children: ReactNode }) {
  return <span className="ramp-hint5">{children}</span>
}

interface TacticChipProps {
  category: TacticalCat
  children: ReactNode
  cancelled?: boolean
}

/** Tactic-shelf chip, colour-keyed by category. */
export function TacticChip({ category, children, cancelled = false }: TacticChipProps) {
  const cls = cancelled ? 'tchip cancelled' : 'tchip'
  return (
    <span className={cls} data-cat={category}>
      {children}
    </span>
  )
}

interface TierStarsProps {
  /** Number of lit stars (1–5). */
  filled: number
}

/** Tier star rating (1–5 stars). */
export function TierStars({ filled }: TierStarsProps) {
  return (
    <span className="tier-stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={i >= filled ? 'off' : ''} />
      ))}
    </span>
  )
}

interface RarityMultBadgeProps {
  rarity: string
}

const RARITY_MULT: Record<string, string> = {
  rare: '1.1',
  epic: '1.2',
  legendary: '1.3',
}

/** Rarity stat multiplier badge — only shown for rare/epic/legendary. */
export function RarityMultBadge({ rarity }: RarityMultBadgeProps) {
  const mult = RARITY_MULT[rarity]
  if (!mult) return null
  return (
    <div className="rarmult5" data-rar={rarity} title={`Rarity multiplier — ×${mult} stats`}>
      ×{mult}
    </div>
  )
}
