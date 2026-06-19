interface CapChipProps {
  /** 'players' = per-round player cap; 'tactics' = tactical-plays-this-half counter. */
  kind: 'players' | 'tactics'
  current: number
  max: number
}

/** Cap chip showing live usage against a limit.
 * Player cap (.cap-chip5) and tactical-plays counter (.cap-chip5.tac) share this component.
 * Both go .full at the limit.
 */
export function CapChip({ kind, current, max }: CapChipProps) {
  const isFull = current >= max
  const cls = [
    'cap-chip5',
    kind === 'tactics' ? 'tac' : '',
    isFull ? 'full' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={cls}>
      <b>{current}</b>/{max} {kind === 'tactics' ? 'tactics · half' : 'players'}
    </span>
  )
}
