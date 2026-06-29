import type { CSSProperties, ReactNode } from 'react'
import { MiniCrest } from '../../atoms/Crest'
import { TierStars, FormationChip, Chip } from '../../atoms/Chip'
import { teamBadge } from '../../data/nations'
import type { Formation, Tier } from '../../../engine/types'
import { useLang } from '../../i18n'

interface NextPanelProps {
  /** Opponent crest band colours (fallback when no nation badge resolves). */
  cols?: [string, string, string]
  /** Opponent nation — resolves the real federation crest, else the circle-flags flag. */
  nation?: string
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
  nation,
  year = "'26",
  round,
  name,
  tier,
  formation,
  blurb,
  extra,
  actions,
}: NextPanelProps) {
  const { t } = useLang()
  const badge = nation ? teamBadge(nation) : null
  return (
    <div className="next-panel">
      {badge ? (
        <span className="crest3 has-img" style={{ '--cs': '64px' } as CSSProperties} title={nation}>
          <img src={badge} alt={`${nation ?? ''} crest`} loading="lazy" draggable={false} />
          {year && <span className="yr">{year}</span>}
        </span>
      ) : (
        <MiniCrest cols={cols} size={64} year={year} />
      )}
      <div className="meta">
        <div className="vs">
          {round ?? t('run.stageR16Long')} · vs
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
