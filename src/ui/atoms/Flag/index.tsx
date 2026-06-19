import { crestSrc, NATIONS, NEUTRAL_BANDS } from '../../data/nations'

interface FlagProps {
  nation: string
}

/** Three-band flag chip with crest image when available, falling back to coloured bands. */
export function Flag({ nation }: FlagProps) {
  const src = crestSrc(nation)
  if (src) {
    return (
      <span className="flag crest-on" title={nation}>
        <img src={src} alt={nation + ' crest'} loading="lazy" draggable={false} />
      </span>
    )
  }
  const cols = NATIONS[nation] ?? NEUTRAL_BANDS
  return (
    <span className="flag" title={nation}>
      {cols.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  )
}
