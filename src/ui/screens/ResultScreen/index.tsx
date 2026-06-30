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
  /** MP rematch handshake: you've already requested a rematch and are waiting on the opponent. */
  rematchPending?: boolean
  /** MP rematch handshake: the opponent has requested a rematch (prompt you to accept). */
  opponentWantsRematch?: boolean
}

/** Finished-match result screen — Win/Loss + scoreline + MVP + decision note + rematch. */
export function ResultScreen({
  match,
  onRematch,
  onBack,
  rematchPending = false,
  opponentWantsRematch = false,
}: ResultScreenProps) {
  const { t } = useLang()
  const p0 = match.players[0]!
  const p1 = match.players[1]!
  // Only a resolved winner is a real win; an unknown winner must never read as "Defeat".
  const isWin = match.winner === 0
  const decided = match.winner !== null
  const note = decisionNote(match, t)
  const mvp = findMvp(match, t)

  return (
    <div className="screen menu">
      <div className="stadium-bg"></div>
      <div className="logo-block">
        <div className="kicker">{note}</div>
        <h1>{!decided ? t('run.fullTime') : isWin ? t('run.victory') : t('run.defeat')}</h1>
        <div className="sub">
          {t('run.scoreline', {
            g0: p0.goals,
            g1: p1.goals,
            opponent: match.opponent.name,
            mvp,
          })}
        </div>
      </div>

      {opponentWantsRematch && !rematchPending && (
        <div className="mp-rematch-prompt" role="status">{t('mp.result.oppWantsRematch')}</div>
      )}

      <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
        <button
          type="button"
          className="btn btn-gold btn-big"
          onClick={onRematch}
          disabled={rematchPending}
        >
          {rematchPending ? t('mp.result.rematchWaiting') : t('run.rematch')}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onBack}>
          {t('run.mainMenu')}
        </button>
      </div>
    </div>
  )
}
