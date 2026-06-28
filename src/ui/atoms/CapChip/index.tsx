import { useLang } from '../../i18n'

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
 * Reads "Label  current/max" so each chip says what it counts at a glance.
 */
export function CapChip(props: CapChipProps) {
  const { t } = useLang()

  if (props.kind === 'star') {
    return <span className="cap-chip5 star">{t('match.cap.star')}</span>
  }

  const { kind, current, max } = props
  const isFull = current >= max
  const cls = ['cap-chip5', kind === 'tactics' ? 'tac' : '', isFull ? 'full' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={cls}>
      <span className="cap-lab">{t(kind === 'tactics' ? 'match.cap.tactics' : 'match.cap.players')}</span>
      <span className="cap-val">
        <b>{current}</b>/{max}
      </span>
    </span>
  )
}
