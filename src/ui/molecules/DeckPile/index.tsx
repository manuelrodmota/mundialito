import type { CSSProperties } from 'react'

interface DeckPileProps {
  kind: 'draw' | 'locked' | 'discard' | 'exiled'
  count: number
  mark?: string
  label?: string
  cue?: string
  dw?: number
}

/** Deck pile visualisation — draw, bench-locked, discard, or exiled. */
export function DeckPile({ kind, count, mark, label, cue, dw = 56 }: DeckPileProps) {
  const isEmpty = count === 0
  return (
    <div
      className={`deckpile5 dp7 ${kind}${isEmpty ? ' is-empty' : ''}`}
      style={{ position: 'static' }}
    >
      <div className="dp-stack" style={{ '--dw': dw + 'px' } as CSSProperties}>
        {isEmpty ? (
          <div className="dp-card empty" />
        ) : (
          [0, 1, 2].slice(0, Math.min(3, count)).map((i) => (
            <div
              key={i}
              className="dp-card"
              style={{ transform: `translate(${i * -2}px, ${i * -3}px)` }}
            >
              {i === Math.min(3, count) - 1 && mark && (
                <span className="dp-mark">{mark}</span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="dp-meta">
        <span className="dp-lab">{label}</span>
        <span className="dp-count">{count}</span>
      </div>
      {cue && <span className="dp-cue">{cue}</span>}
    </div>
  )
}
