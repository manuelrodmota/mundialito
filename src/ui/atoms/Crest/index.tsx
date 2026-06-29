import type { CSSProperties } from 'react'
import { useLang } from '../../i18n'

interface MiniCrestProps {
  cols?: [string, string, string]
  size?: number
  year?: string
}

/** Round three-band crest stamp, optionally annotated with a World Cup year. */
export function MiniCrest({
  cols = ['#74ACDF', '#fff', '#74ACDF'],
  size = 46,
  year,
}: MiniCrestProps) {
  return (
    <span className="crest3" style={{ '--cs': size + 'px' } as CSSProperties}>
      {cols.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
      {year && <span className="yr">{year}</span>}
    </span>
  )
}

interface PlayerCrestProps {
  variant?: 'you' | 'ai'
}

/** Monogram crest for the player (YOU) or AI opponent. */
export function PlayerCrest({ variant = 'you' }: PlayerCrestProps) {
  const { t } = useLang()
  return (
    <span className={variant === 'ai' ? 'crest ai' : 'crest'}>
      {variant === 'ai' ? t('match.ai') : t('match.you')}
    </span>
  )
}
