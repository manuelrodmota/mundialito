type CapChipProps =
  | {
      /** 'players' = per-round player cap; 'tactics' = tactical-plays-this-half counter. */
      kind: 'players' | 'tactics'
      current: number
      max: number
    }
  | {
      /** 'star' = static "star core · support half-price" indicator (lights while a lane holds a premium). */
      kind: 'star'
    }

/** Cap chip showing live usage against a limit, or the v10 star-core indicator.
 * Player cap (.cap-chip5), tactical-plays counter (.cap-chip5.tac), and the
 * star-core chip (.cap-chip5.star) share this component. The first two go .full at the limit.
 */
export function CapChip(props: CapChipProps) {
  if (props.kind === 'star') {
    return <span className="cap-chip5 star">★ star core · support half-price</span>
  }

  const { kind, current, max } = props
  const isFull = current >= max
  const cls = ['cap-chip5', kind === 'tactics' ? 'tac' : '', isFull ? 'full' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={cls}>
      <b>{current}</b>/{max} {kind === 'tactics' ? 'tactics · half' : 'players'}
    </span>
  )
}
