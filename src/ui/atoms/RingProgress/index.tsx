import type { ReactNode } from 'react'

interface RingProgressProps {
  /** 0..1 */
  pct: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}

/** Circular progress ring with optional centered content (e.g. a level number). */
export function RingProgress({ pct, size = 38, stroke = 4, color = 'var(--gold)', children }: RingProgressProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, pct))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease-out, ease)' }}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
      )}
    </div>
  )
}
