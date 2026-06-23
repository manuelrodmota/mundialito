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
  /** Goals scored. */
  goals: number
  /** Current pressure fill 0–1 (the chance built toward a shot). */
  xg: number
  /** Fatigue heat level 0–3. */
  heat: 0 | 1 | 2 | 3
  label: string
  /** Whether this is the player's own meter. */
  mine?: boolean
}

const HEAT_KEYS = ['match.heat.fresh', 'match.heat.warm', 'match.heat.hot', 'match.heat.gassed'] as const

/**
 * Pressure → shot meter with fatigue heat colouring (data-heat 0–3). The bar fills as you attack;
 * the label reads the goal chance qualitatively (low / med / high) rather than a raw % — a full bar
 * is a high chance, not a sure thing. The "high" band glows. Fatigue ("FRESH") sits on its own line.
 * v11 §14.
 */
export function XGMeter({ goals, xg, heat, label, mine = false }: XGMeterProps) {
  const { t } = useLang()
  const pct = Math.min(100, Math.round(xg * 100))
  const level: 'low' | 'med' | 'high' = pct >= 60 ? 'high' : pct >= 30 ? 'med' : 'low'
  const barText = t(
    level === 'high' ? 'match.meter.chanceHigh' : level === 'med' ? 'match.meter.chanceMed' : 'match.meter.chanceLow',
  )
  const tip = t('match.meter.tip')
  return (
    <div className={`xgm4${mine ? ' mine' : ''} chance-${level}`} data-heat={heat} title={tip}>
      <div className="xgm-row">
        <span className="xgm-goals">{goals}</span>
        <div className="xgm-bar" title={tip}>
          <i style={{ width: pct + '%' }} />
          <span className="xgm-val">{barText}</span>
        </div>
      </div>
      <div className="xgm-sub">
        <span>{label}</span>
        <span className="heat-tag">{t(HEAT_KEYS[heat])}</span>
      </div>
    </div>
  )
}
