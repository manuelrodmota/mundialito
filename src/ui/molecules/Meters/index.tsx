import { useLang } from '../../i18n'

interface StaminaMeterProps {
  current: number
  max: number
  rampLabel?: string
}

/** Stamina pip bar — current/max with an optional ramp hint label. */
export function StaminaMeter({ current, max, rampLabel }: StaminaMeterProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div className="stamina-pips">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={'pip' + (i < current ? ' full' : '')} />
        ))}
        <span className="lbl">
          {current} / {max}
        </span>
      </div>
      {rampLabel && <span className="ramp-hint5">{rampLabel}</span>}
    </div>
  )
}

interface XGMeterProps {
  /** Current pressure fill 0–1 (the chance built toward a shot). */
  xg: number
  /** Fatigue heat level 0–3. */
  heat: 0 | 1 | 2 | 3
  label: string
  /** Whether this is the player's own meter. */
  mine?: boolean
  /** Show the inline fatigue tag to the right of the bar (off when fitness is surfaced separately). */
  showHeat?: boolean
}

/** Fatigue heat level (0–3) → i18n label key, shared so callers can render the same wording. */
export const HEAT_KEYS = ['match.heat.fresh', 'match.heat.warm', 'match.heat.hot', 'match.heat.gassed'] as const

/**
 * Pressure → shot meter with fatigue heat colouring (data-heat 0–3). One tidy row per side: a short
 * side label, the pressure bar (the chance built toward a shot), and the fatigue tag. The chance
 * level (low / med / high) colours the fill and the "high" band glows — a full bar is a high chance,
 * not a sure thing. The goal count + team name live in the scoreboard, so they're not repeated here.
 * v11 §14.
 */
export function XGMeter({ xg, heat, label, mine = false, showHeat = true }: XGMeterProps) {
  const { t } = useLang()
  const pct = Math.min(100, Math.round(xg * 100))
  const level: 'low' | 'med' | 'high' = pct >= 60 ? 'high' : pct >= 30 ? 'med' : 'low'
  const barText = t(
    level === 'high' ? 'match.meter.chanceHigh' : level === 'med' ? 'match.meter.chanceMed' : 'match.meter.chanceLow',
  )
  const tip = t('match.meter.tip')
  return (
    <div className={`xgm4${mine ? ' mine' : ''} chance-${level}`} data-heat={heat} title={tip}>
      <span className="xgm-name">{label}</span>
      <div className="xgm-bar">
        <i style={{ width: pct + '%' }} />
        <span className="xgm-val">{barText}</span>
      </div>
      {showHeat && <span className="heat-tag">{t(HEAT_KEYS[heat])}</span>}
    </div>
  )
}
