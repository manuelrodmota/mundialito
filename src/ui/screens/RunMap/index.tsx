import type { RunState, OpponentTeam } from '../../../engine/types'
import type { RunNodeData } from '../../organisms/Ladder'
import { Ladder } from '../../organisms/Ladder'
import { NextPanel } from '../../organisms/NextPanel'
import { opponents } from '../../../data'
import { teamBadge } from '../../data/nations'
import { useLang } from '../../i18n'
import type { Translate } from '../../i18n'

/** Opponent lookup by id — `runState.defeated` stores ids, so resolve them to nation + crest. */
const OPPONENT_BY_ID = new Map(opponents.map((o) => [o.id, o]))

interface RunMapProps {
  runState: RunState
  nextOpponent: OpponentTeam | null
  onPlayNext: () => void
  onBack: () => void
}

const STAGE_LABEL_KEYS: Record<RunState['stage'], string> = {
  group: 'run.stageGroupLong',
  r16: 'run.stageR16',
  qf: 'run.stageQF',
  sf: 'run.stageSF',
  final: 'run.stageFinal',
}

const STAGE_ORDER: RunState['stage'][] = ['group', 'group', 'group', 'r16', 'qf', 'sf', 'final']

const STAGE_DISPLAY_KEYS: string[] = [
  'run.stageGroup1',
  'run.stageGroup2',
  'run.stageGroup3',
  'run.stageR16',
  'run.stageQF',
  'run.stageSF',
  'run.stageFinal',
]

/** Maps the linear 7-match run into bracket ladder nodes.
 *
 * Each stage node carries done/now/final state derived from matchIndex + alive. A finished
 * stage shows the beaten opponent's crest + name in its circle; the active stage shows the
 * next opponent's crest. Future stages stay a mystery (just the number).
 */
function buildLadderNodes(
  runState: RunState,
  nextOpponent: OpponentTeam | null,
  t: Translate,
): RunNodeData[] {
  const { matchIndex, defeated, alive } = runState

  return STAGE_ORDER.map((stage, i) => {
    const isDone = i < matchIndex || (!alive && i === matchIndex)
    const isNow = i === matchIndex && alive
    const isFinal = stage === 'final'

    const beatenOpp = isDone ? OPPONENT_BY_ID.get(defeated[i] ?? '') : undefined
    const crest = isDone
      ? (beatenOpp ? teamBadge(beatenOpp.nation) : null)
      : isNow && nextOpponent
        ? teamBadge(nextOpponent.nation)
        : null

    return {
      stage: t(STAGE_DISPLAY_KEYS[i] ?? STAGE_LABEL_KEYS[stage]),
      number: i + 1,
      done: isDone,
      now: isNow,
      final: isFinal,
      beaten: isDone ? (beatenOpp?.nation ?? defeated[i]) : undefined,
      crest: crest ?? undefined,
    }
  })
}

/** Run Map screen — shows the 7-stop bracket ladder and next opponent preview.
 *  Prop-driven container: receives slices from useArcadeRun and fires callbacks up.
 */
export function RunMap({ runState, nextOpponent, onPlayNext, onBack }: RunMapProps) {
  const { t } = useLang()
  const nodes = buildLadderNodes(runState, nextOpponent, t)
  const isFinalStage = runState.stage === 'final'
  const currentStageLabel = t(STAGE_DISPLAY_KEYS[runState.matchIndex] ?? STAGE_LABEL_KEYS[runState.stage])

  return (
    <div className="screen bracket-screen">
      <div className="stadium-bg" />

      <div className="bracket-head">
        <div className="kicker">{t('run.arcadeRun')}</div>
        <h2>{t('run.nextMatch')}</h2>
        {nextOpponent && (
          <div className="sub">
            {currentStageLabel}
          </div>
        )}
      </div>

      <Ladder nodes={nodes} />

      {nextOpponent && (
        <NextPanel
          name={nextOpponent.name}
          nation={nextOpponent.nation}
          year={`'${String(nextOpponent.year).slice(-2)}`}
          round={currentStageLabel}
          tier={nextOpponent.tier}
          formation={nextOpponent.preferredFormation}
          blurb={nextOpponent.blurb}
          extra={nextOpponent.isChampion ? t('run.champion') : undefined}
          cols={undefined}
          actions={
            <button
              type="button"
              className={`btn btn-big ${isFinalStage ? 'btn-gold' : 'btn-primary'}`}
              onClick={onPlayNext}
            >
              {isFinalStage ? t('run.playTheFinal') : t('run.playNextMatch')}
            </button>
          }
        />
      )}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={onBack}
      >
        {t('run.abandonRun')}
      </button>
    </div>
  )
}
