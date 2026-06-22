interface StaminaPipsProps {
  /** Stamina remaining after the staged lineup (may go negative when over budget). */
  remaining: number
  /** This round's stamina budget (8 → 10 → 12 as the match ramps). */
  max: number
  /** Accessible label for the readout (e.g. "Stamina"). */
  label?: string
}

/**
 * Per-round stamina readout — one pip per point, filled = remaining, dim = already spent.
 * Goes `.over` (amber) when the staged lineup would cost more than the budget, so an
 * over-commit is visible at a glance. Mirrors the design prototype's `Pips3`.
 */
export function StaminaPips({ remaining, max, label }: StaminaPipsProps) {
  const over = remaining < 0
  const filled = Math.max(0, remaining)
  const pipCount = Math.max(max, filled)
  return (
    <span className={`stamina-pips${over ? ' over' : ''}`} aria-label={label}>
      {Array.from({ length: pipCount }).map((_, i) => (
        <span key={i} className={`pip${i < filled ? ' full' : ''}`} />
      ))}
      <span className="lbl">
        {remaining}/{max} ⚡
      </span>
    </span>
  )
}
