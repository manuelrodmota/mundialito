import type { CSSProperties } from 'react'

interface AvatarProps {
  /** Profile picture URL (e.g. Google). Falls back to the letter + colour when absent. */
  url?: string
  letter: string
  color?: string
  /** Large rounded-square variant for the account hero. */
  big?: boolean
}

/** Account avatar — Google profile picture if available, else a coloured monogram. */
export function Avatar({ url, letter, color, big }: AvatarProps) {
  const className = `avatar${big ? ' big' : ''}`
  if (url) {
    return (
      <span className={className}>
        <img src={url} alt="" referrerPolicy="no-referrer" draggable={false} />
      </span>
    )
  }
  return (
    <span className={className} style={color ? ({ background: color } as CSSProperties) : undefined}>
      {letter}
    </span>
  )
}
