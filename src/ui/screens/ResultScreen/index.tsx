import type { MatchState } from '../../../engine/types'
import { MERCY_LEAD, ROUND_CAP } from '../../../engine'
import { ResultTitle } from '../../organisms/ResultTitle'
import { Button } from '../../atoms/Button'

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
    <div className="result-screen">
      <ResultTitle you={p0.goals} them={p1.goals} note={note} />

      <div className="result-outcome">
        {isWin ? (
          <div className="result-win-label">Victory!</div>
        ) : (
          <div className="result-loss-label">Defeat</div>
        )}
      </div>

      <div className="result-vs">
        <span>YOU</span>
        <span className="result-score">
          {p0.goals} – {p1.goals}
        </span>
        <span>{match.opponent.name}</span>
      </div>

      <div className="result-mvp">
        <span className="result-mvp-label">Most Dangerous: </span>
        <span className="result-mvp-name">{mvp}</span>
      </div>

      {match.opponent.blurb && (
        <div className="result-blurb">{match.opponent.blurb}</div>
      )}

      <div className="result-actions">
        <Button variant="gold" size="big" onClick={onRematch}>
          Rematch
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Main Menu
        </Button>
      </div>
    </div>
  )
}
