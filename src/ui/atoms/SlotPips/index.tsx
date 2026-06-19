interface SlotPipsProps {
  n: number
}

/** Slot cost pips display — shows pip dots or FREE for zero-cost cards. */
export function SlotPips({ n }: SlotPipsProps) {
  if (!n) return <span className="slotpips zero">FREE</span>
  return (
    <span className="slotpips">
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  )
}
