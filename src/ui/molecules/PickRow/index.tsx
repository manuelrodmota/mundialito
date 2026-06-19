interface PickRowProps {
  rating: number | string
  name: string
  slots?: number
  isCaptain?: boolean
  onCaptainToggle?: () => void
  onRemove?: () => void
  isTactic?: boolean
  isSwappingOut?: boolean
  highlighted?: boolean
}

/** A single pick-row entry in the squad builder list. */
export function PickRow({
  rating,
  name,
  slots,
  isCaptain,
  onCaptainToggle,
  onRemove,
  isTactic,
  isSwappingOut,
  highlighted,
}: PickRowProps) {
  const cls = [
    'pick-row',
    isTactic ? 'tactic-row' : '',
    isSwappingOut ? 'swapping-out' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} style={highlighted ? { borderColor: 'var(--gold)' } : undefined}>
      <span className="rt">{rating}</span>
      <span className="nm">{name}</span>
      {slots !== undefined && <span className="sl">{slots} sl</span>}
      {!isTactic && onCaptainToggle && (
        <button
          type="button"
          className={isCaptain ? 'cap2 on' : 'cap2'}
          onClick={onCaptainToggle}
        >
          ★
        </button>
      )}
      {onRemove && (
        <button type="button" className="rm" onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  )
}

interface SlotMeterProps {
  used: number
  cap: number
}

/** Slot meter — fills brand→gold; turns red on overflow. */
export function SlotMeter({ used, cap }: SlotMeterProps) {
  const over = used > cap
  const pct = Math.min(100, Math.round((used / cap) * 100))
  return (
    <div className="slot-meter">
      <div className="row">
        <span style={{ fontSize: 13, color: 'var(--txt-dim)', fontWeight: 700 }}>
          {over ? 'OVER BUDGET' : 'SLOTS USED'}
        </span>
        <b className={over ? 'over' : ''}>
          {used} / {cap}
        </b>
      </div>
      <div className="track">
        <i className={over ? 'over' : ''} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}
