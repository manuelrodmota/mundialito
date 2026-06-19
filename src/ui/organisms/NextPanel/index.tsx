import type { ReactNode } from 'react'
import { MiniCrest } from '../../atoms/Crest'
import { TierStars, FormationChip, Chip } from '../../atoms/Chip'
import type { Formation, Tier } from '../../../engine/types'

interface NextPanelProps {
  /** Opponent crest band colours. */
  cols?: [string, string, string]
  year?: string
  round?: string
  name: string
  tier: Tier
  formation?: Formation
  blurb?: string
  extra?: string
  actions?: ReactNode
}

const TIER_STARS: Record<Tier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

/** Next-match panel — opponent identity, tier stars, difficulty chips, and action stack. */
export function NextPanel({
  cols = ['#74ACDF', '#fff', '#74ACDF'],
  year = "'26",
  round = 'Round of 16',
  name,
  tier,
  formation,
  blurb,
  extra,
  actions,
}: NextPanelProps) {
  return (
    <div className="next-panel">
      <MiniCrest cols={cols} size={64} year={year} />
      <div className="meta">
        <div className="vs">
          {round} · vs
        </div>
        <h3>{name}</h3>
        <div className="chips">
          <TierStars filled={TIER_STARS[tier]} />
          {formation && <FormationChip formation={formation}>{formation.charAt(0).toUpperCase() + formation.slice(1)}</FormationChip>}
          {extra && <Chip>{extra}</Chip>}
        </div>
        {blurb && <div className="blurb">{blurb}</div>}
      </div>
      {actions && <div className="actions3">{actions}</div>}
    </div>
  )
}
