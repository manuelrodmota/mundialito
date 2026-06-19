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
  /** Current xG fill 0–1. */
  xg: number
  /** Fatigue heat level 0–3. */
  heat: 0 | 1 | 2 | 3
  label: string
  /** Whether this is the player's own meter. */
  mine?: boolean
}

const HEAT_LABELS = ['Fresh', 'Warm', 'Hot', 'Gassed'] as const

/** xG progress meter with fatigue heat colouring (data-heat 0–3). */
export function XGMeter({ goals, xg, heat, label, mine = false }: XGMeterProps) {
  const pct = Math.min(100, Math.round(xg * 100))
  return (
    <div className={`xgm4${mine ? ' mine' : ''}`} data-heat={heat}>
      <div className="xgm-row">
        <span className="xgm-goals">{goals}</span>
        <div className="xgm-bar">
          <i style={{ width: pct + '%' }} />
          <span className="xgm-val">{xg.toFixed(2)} xG</span>
        </div>
      </div>
      <div className="xgm-sub">
        <span>{label}</span>
        <span className="heat-tag">{HEAT_LABELS[heat]}</span>
      </div>
    </div>
  )
}
