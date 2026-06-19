interface LockerSwapRowProps {
  name: string
  isSwappingOut?: boolean
  isHighlighted?: boolean
}

/** A tactic-deck pick row in the locker room — shows the swap-out overlay and swap-in highlight. */
export function LockerSwapRow({ name, isSwappingOut, isHighlighted }: LockerSwapRowProps) {
  return (
    <div
      className={`pick-row tactic-row${isSwappingOut ? ' swapping-out' : ''}`}
      style={isHighlighted ? { borderColor: 'var(--gold)' } : undefined}
    >
      <span className="rt">T</span>
      <span className="nm">{name}</span>
      {isSwappingOut && (
        <span className="res l" style={{ marginLeft: 'auto' }}>
          OUT
        </span>
      )}
    </div>
  )
}
