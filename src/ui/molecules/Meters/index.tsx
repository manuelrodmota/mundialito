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
  /**
   * v11 telegraph: the conversion probability (0–1) a shot would convert at when this meter is
   * full — shown so the player knows the odds before locking in. Omit to hide.
   */
  conversion?: number
}

const HEAT_KEYS = ['match.heat.fresh', 'match.heat.warm', 'match.heat.hot', 'match.heat.gassed'] as const

/**
 * Pressure → shot meter with fatigue heat colouring (data-heat 0–3). The bar shows how much of a
 * chance has been built; at full it triggers a shot that converts at `conversion`. v11 §14.
 */
export function XGMeter({ goals, xg, heat, label, mine = false, conversion }: XGMeterProps) {
  const { t } = useLang()
  const pct = Math.min(100, Math.round(xg * 100))
  const ready = pct >= 100
  const convPct = conversion !== undefined ? Math.round(conversion * 100) : undefined
  const tip = t('match.meter.tip')
  return (
    <div className={`xgm4${mine ? ' mine' : ''}${ready ? ' shot-ready' : ''}`} data-heat={heat} title={tip}>
      <div className="xgm-row">
        <span className="xgm-goals">{goals}</span>
        <div className="xgm-bar">
          <i style={{ width: pct + '%' }} />
          <span className="xgm-val">
            {ready
              ? t('match.meter.shotReady')
              : t('match.meter.chance', { pct })}
          </span>
        </div>
      </div>
      <div className="xgm-sub">
        <span>{label}</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {convPct !== undefined && (
            <span className="conv-tag" title={tip}>{t('match.meter.conv', { pct: convPct })}</span>
          )}
          <span className="heat-tag">{t(HEAT_KEYS[heat])}</span>
        </span>
      </div>
    </div>
  )
}
