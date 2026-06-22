import { useLang } from '../../i18n'

interface ResultTitleProps {
  you: number
  them: number
  note?: string
}

/** Match result overlay — win / loss / draw with score. */
export function ResultTitle({ you, them, note }: ResultTitleProps) {
  const { t } = useLang()
  const outcome = you > them ? 'win' : you < them ? 'loss' : 'draw'
  const outcomeLabel =
    you > them ? t('result.youWin') : you < them ? t('result.youLose') : t('result.draw')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div className="mvp-tag">{t('result.fullTime')} · {outcomeLabel}</div>
      <div className={`result-title ${outcome}`} style={{ fontSize: 44 }}>
        {you} — {them}
      </div>
      {note && <div className="note" style={{ fontSize: 13 }}>{note}</div>}
    </div>
  )
}
