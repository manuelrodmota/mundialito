import type { RunState, OpponentTeam } from '../../../engine/types'
import type { RunNodeData } from '../../organisms/Ladder'
import { Ladder } from '../../organisms/Ladder'
import { NextPanel } from '../../organisms/NextPanel'

interface RunMapProps {
  runState: RunState
  nextOpponent: OpponentTeam | null
  onPlayNext: () => void
  onBack: () => void
}

const STAGE_LABELS: Record<RunState['stage'], string> = {
  group: 'Group',
  r16: 'R16',
  qf: 'QF',
  sf: 'SF',
  final: 'Final',
}

const STAGE_ORDER: RunState['stage'][] = ['group', 'group', 'group', 'r16', 'qf', 'sf', 'final']

const STAGE_DISPLAY: string[] = ['Group 1', 'Group 2', 'Group 3', 'R16', 'QF', 'SF', 'Final']

/** Maps the linear 7-match run into bracket ladder nodes.
 *
 * Each stage node carries done/now/final state derived from matchIndex + alive,
 * plus the beaten opponent name when the stage was won.
 */
function buildLadderNodes(runState: RunState): RunNodeData[] {
  const { matchIndex, defeated, alive } = runState

  return STAGE_ORDER.map((stage, i) => {
    const isDone = i < matchIndex || (!alive && i === matchIndex)
    const isNow = i === matchIndex && alive
    const isFinal = stage === 'final'

    return {
      stage: STAGE_DISPLAY[i] ?? STAGE_LABELS[stage],
      number: i + 1,
      done: isDone,
      now: isNow,
      final: isFinal,
      beaten: isDone ? defeated[i] : undefined,
    }
  })
}

/** Run Map screen — shows the 7-stop bracket ladder and next opponent preview.
 *  Prop-driven container: receives slices from useArcadeRun and fires callbacks up.
 */
export function RunMap({ runState, nextOpponent, onPlayNext, onBack }: RunMapProps) {
  const nodes = buildLadderNodes(runState)
  const isFinalStage = runState.stage === 'final'

  return (
    <div className="screen bracket-screen">
      <div className="stadium-bg" />

      <div className="bracket-head">
        <div className="kicker">Arcade Run</div>
        <h2>Next Match</h2>
        {nextOpponent && (
          <div className="sub">
            {STAGE_DISPLAY[runState.matchIndex] ?? STAGE_LABELS[runState.stage]}
          </div>
        )}
      </div>

      <Ladder nodes={nodes} />

      {nextOpponent && (
        <NextPanel
          name={nextOpponent.name}
          year={`'${String(nextOpponent.year).slice(-2)}`}
          round={STAGE_DISPLAY[runState.matchIndex] ?? STAGE_LABELS[runState.stage]}
          tier={nextOpponent.tier}
          formation={nextOpponent.preferredFormation}
          blurb={nextOpponent.blurb}
          extra={nextOpponent.isChampion ? 'Champion' : undefined}
          cols={undefined}
          actions={
            <button
              type="button"
              className={`btn btn-big ${isFinalStage ? 'btn-gold' : 'btn-primary'}`}
              onClick={onPlayNext}
            >
              {isFinalStage ? 'Play the Final' : 'Play next match'}
            </button>
          }
        />
      )}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={onBack}
      >
        Abandon Run
      </button>
    </div>
  )
}
