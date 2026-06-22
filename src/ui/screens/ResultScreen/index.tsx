import type { MatchState } from '../../../engine/types'
import { MERCY_LEAD, ROUND_CAP } from '../../../engine'
import { useLang } from '../../i18n'
import type { Translate } from '../../i18n'

function decisionNote(match: MatchState, t: Translate): string {
  const g0 = match.players[0]!.goals
  const g1 = match.players[1]!.goals
  const diff = Math.abs(g0 - g1)

  if (match.extraTime) {
    return t('run.decisionExtraTime')
  }

  if (diff >= MERCY_LEAD && match.round < ROUND_CAP) {
    return t('run.decisionMercy', { diff })
  }

  return t('run.decisionFullTime')
}

function findMvp(match: MatchState, t: Translate): string {
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  if (p0.xg >= p1.xg) {
    return t('run.mvpYou')
  }
  return match.opponent.name
}

interface ResultScreenProps {
  match: MatchState
  onRematch: () => void
  onBack: () => void
}

/** Finished-match result screen — Win/Loss + scoreline + MVP + decision note + rematch. */
export function ResultScreen({ match, onRematch, onBack }: ResultScreenProps) {
  const { t } = useLang()
  const p0 = match.players[0]!
  const p1 = match.players[1]!
  const isWin = match.winner === 0
  const note = decisionNote(match, t)
  const mvp = findMvp(match, t)

  return (
    <div className="screen menu">
      <div className="stadium-bg"></div>
      <div className="logo-block">
        <div className="kicker">{note}</div>
        <h1>{isWin ? t('run.victory') : t('run.defeat')}</h1>
        <div className="sub">
          {t('run.scoreline', {
            g0: p0.goals,
            g1: p1.goals,
            opponent: match.opponent.name,
            mvp,
          })}
        </div>
      </div>

      <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
        <button type="button" className="btn btn-gold btn-big" onClick={onRematch}>
          {t('run.rematch')}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onBack}>
          {t('run.mainMenu')}
        </button>
      </div>
    </div>
  )
}
