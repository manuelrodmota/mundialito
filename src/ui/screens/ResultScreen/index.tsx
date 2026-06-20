import type { MatchState } from '../../../engine/types'
import { MERCY_LEAD, ROUND_CAP } from '../../../engine'

interface ResultScreenProps {
  match: MatchState
  onRematch: () => void
  onBack: () => void
}

function decisionNote(match: MatchState): string {
  const g0 = match.players[0]!.goals
  const g1 = match.players[1]!.goals
  const diff = Math.abs(g0 - g1)

  if (match.extraTime) {
    return 'Golden-goal extra time'
  }

  if (diff >= MERCY_LEAD && match.round < ROUND_CAP) {
    return `${diff}-goal mercy rule`
  }

  return 'Full-time result'
}

function findMvp(match: MatchState): string {
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  if (p0.xg >= p1.xg) {
    return 'YOU'
  }
  return match.opponent.name
}

/** Finished-match result screen — Win/Loss + scoreline + MVP + decision note + rematch. */
export function ResultScreen({ match, onRematch, onBack }: ResultScreenProps) {
  const p0 = match.players[0]!
  const p1 = match.players[1]!
  const isWin = match.winner === 0
  const note = decisionNote(match)
  const mvp = findMvp(match)

  return (
    <div className="screen menu">
      <div className="stadium-bg"></div>
      <div className="logo-block">
        <div className="kicker">{note}</div>
        <h1>{isWin ? 'Victory!' : 'Defeat'}</h1>
        <div className="sub">
          YOU {p0.goals} – {p1.goals} {match.opponent.name} · Most dangerous: {mvp}
        </div>
      </div>

      <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
        <button type="button" className="btn btn-gold btn-big" onClick={onRematch}>
          Rematch
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onBack}>
          Main Menu
        </button>
      </div>
    </div>
  )
}
