import type { RunState } from '../../../engine/types'
import { Trophy } from '../../organisms/Trophy'

const STAGE_LABELS: Record<RunState['stage'], string> = {
  group: 'Group',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  final: 'Final',
}

const STAGE_ORDER: RunState['stage'][] = ['group', 'group', 'group', 'r16', 'qf', 'sf', 'final']
const MATCH_LABELS = ['Group 1', 'Group 2', 'Group 3', 'R16', 'QF', 'SF', 'Final']

interface RunSummaryProps {
  runState: RunState
  onRestart: () => void
  onHome: () => void
}

/** Derives a human-readable label for how far the player reached. */
function reachedLabel(runState: RunState): string {
  const { matchIndex, alive, stage } = runState

  if (alive && stage === 'final') return 'World Champions'

  const labelIndex = alive ? matchIndex : matchIndex
  const stageLabel = MATCH_LABELS[labelIndex] ?? STAGE_LABELS[stage]
  return alive ? `Reached the ${stageLabel}` : `Fell in the ${stageLabel}`
}

/** End-of-run screen.
 * - Final win: renders Trophy + champion headline + run stats + Restart/Home.
 * - Loss (run over, not won): renders run summary + Restart/Home.
 * Prop-driven container; import type only from engine.
 */
export function RunSummary({ runState, onRestart, onHome }: RunSummaryProps) {
  const isRunWon = runState.alive && runState.stage === 'final' && runState.matchIndex >= 6
  const stagesCleared = runState.defeated.length
  const reachedText = reachedLabel(runState)

  if (isRunWon) {
    return (
      <div className="screen menu">
        <div className="stadium-bg" />

        <div className="logo-block" style={{ alignItems: 'center' }}>
          <div className="kicker">World Cup Clash</div>
          <Trophy label="WORLD CHAMPIONS" />
          <h1 style={{ marginTop: 8 }}>Champions!</h1>
          <div className="sub">
            You conquered all 7 stages and lifted the trophy.
          </div>
        </div>

        <div className="run-list">
          {STAGE_ORDER.map((stage, i) => {
            const beaten = runState.defeated[i]
            if (!beaten) return null
            return (
              <div key={i} className="rrow">
                <span className="st">{MATCH_LABELS[i] ?? STAGE_LABELS[stage]}</span>
                <span className="nm">{beaten}</span>
                <span className="res w">WIN</span>
              </div>
            )
          })}
        </div>

        <div className="sub" style={{ fontSize: 13, color: 'var(--txt-dim)' }}>
          {stagesCleared} match{stagesCleared !== 1 ? 'es' : ''} won
        </div>

        <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
          <button type="button" className="btn btn-gold btn-big" onClick={onRestart}>
            Play Again
          </button>
          <button type="button" className="btn btn-ghost btn-big" onClick={onHome}>
            Main Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen menu">
      <div className="stadium-bg" />

      <div className="logo-block">
        <div className="kicker">Run Over</div>
        <h1>Defeated</h1>
        <div className="sub">{reachedText}</div>
      </div>

      <div className="run-list">
        {STAGE_ORDER.map((stage, i) => {
          const beaten = runState.defeated[i]
          const isElimination = !runState.alive && i === runState.matchIndex && !beaten
          const label = MATCH_LABELS[i] ?? STAGE_LABELS[stage]

          if (beaten) {
            return (
              <div key={i} className="rrow">
                <span className="st">{label}</span>
                <span className="nm">{beaten}</span>
                <span className="res w">WIN</span>
              </div>
            )
          }

          if (isElimination) {
            return (
              <div key={i} className="rrow">
                <span className="st">{label}</span>
                <span className="nm">—</span>
                <span className="res l">OUT</span>
              </div>
            )
          }

          return null
        })}
      </div>

      <div className="sub" style={{ fontSize: 13, color: 'var(--txt-dim)' }}>
        {stagesCleared} match{stagesCleared !== 1 ? 'es' : ''} won
      </div>

      <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
        <button type="button" className="btn btn-primary btn-big" onClick={onRestart}>
          Try Again
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onHome}>
          Main Menu
        </button>
      </div>
    </div>
  )
}
