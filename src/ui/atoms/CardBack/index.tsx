import type { CSSProperties } from 'react'

interface CardBackProps {
  size?: number
  className?: string
}

/** Face-down card with the WC backmark. */
export function CardBack({ size = 132, className = '' }: CardBackProps) {
  return (
    <div
      className={`wcard back${className ? ' ' + className : ''}`}
      style={{ '--cw': size + 'px' } as CSSProperties}
    >
      <div className="inner">
        <div className="backmark">WC</div>
      </div>
    </div>
  )
}
