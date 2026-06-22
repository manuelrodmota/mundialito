import type { RunState } from '../../../engine/types'
import { Trophy } from '../../organisms/Trophy'
import { useLang } from '../../i18n'
import type { Translate } from '../../i18n'

const STAGE_LABEL_KEYS: Record<RunState['stage'], string> = {
  group: 'run.stageGroupLong',
  r16: 'run.stageR16Long',
  qf: 'run.stageQFLong',
  sf: 'run.stageSFLong',
  final: 'run.stageFinal',
}

const STAGE_ORDER: RunState['stage'][] = ['group', 'group', 'group', 'r16', 'qf', 'sf', 'final']
const MATCH_LABEL_KEYS = [
  'run.stageGroup1',
  'run.stageGroup2',
  'run.stageGroup3',
  'run.stageR16',
  'run.stageQF',
  'run.stageSF',
  'run.stageFinal',
]

interface RunSummaryProps {
  runState: RunState
  onRestart: () => void
  onHome: () => void
}

/** Derives a human-readable label for how far the player reached. */
function reachedLabel(runState: RunState, t: Translate): string {
  const { matchIndex, alive, stage } = runState

  if (alive && stage === 'final') return t('run.worldChampions')

  const labelIndex = alive ? matchIndex : matchIndex
  const stageLabel = t(MATCH_LABEL_KEYS[labelIndex] ?? STAGE_LABEL_KEYS[stage])
  return alive ? t('run.reachedThe', { stage: stageLabel }) : t('run.fellInThe', { stage: stageLabel })
}

/** End-of-run screen.
 * - Final win: renders Trophy + champion headline + run stats + Restart/Home.
 * - Loss (run over, not won): renders run summary + Restart/Home.
 * Prop-driven container; import type only from engine.
 */
export function RunSummary({ runState, onRestart, onHome }: RunSummaryProps) {
  const { t } = useLang()
  const isRunWon = runState.alive && runState.stage === 'final' && runState.matchIndex >= 6
  const stagesCleared = runState.defeated.length
  const reachedText = reachedLabel(runState, t)
  const matchesWonText =
    stagesCleared === 1
      ? t('run.matchesWonOne', { n: stagesCleared })
      : t('run.matchesWonMany', { n: stagesCleared })

  if (isRunWon) {
    return (
      <div className="screen menu">
        <div className="stadium-bg" />

        <div className="logo-block" style={{ alignItems: 'center' }}>
          <div className="kicker">World Cup Clash</div>
          <Trophy label={t('run.worldChampionsLabel')} />
          <h1 style={{ marginTop: 8 }}>{t('run.championsTitle')}</h1>
          <div className="sub">
            {t('run.championsSub')}
          </div>
        </div>

        <div className="run-list">
          {STAGE_ORDER.map((stage, i) => {
            const beaten = runState.defeated[i]
            if (!beaten) return null
            return (
              <div key={i} className="rrow">
                <span className="st">{t(MATCH_LABEL_KEYS[i] ?? STAGE_LABEL_KEYS[stage])}</span>
                <span className="nm">{beaten}</span>
                <span className="res w">{t('run.resultWin')}</span>
              </div>
            )
          })}
        </div>

        <div className="sub" style={{ fontSize: 13, color: 'var(--txt-dim)' }}>
          {matchesWonText}
        </div>

        <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
          <button type="button" className="btn btn-gold btn-big" onClick={onRestart}>
            {t('run.playAgain')}
          </button>
          <button type="button" className="btn btn-ghost btn-big" onClick={onHome}>
            {t('run.mainMenu')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen menu">
      <div className="stadium-bg" />

      <div className="logo-block">
        <div className="kicker">{t('run.runOver')}</div>
        <h1>{t('run.defeated')}</h1>
        <div className="sub">{reachedText}</div>
      </div>

      <div className="run-list">
        {STAGE_ORDER.map((stage, i) => {
          const beaten = runState.defeated[i]
          const isElimination = !runState.alive && i === runState.matchIndex && !beaten
          const label = t(MATCH_LABEL_KEYS[i] ?? STAGE_LABEL_KEYS[stage])

          if (beaten) {
            return (
              <div key={i} className="rrow">
                <span className="st">{label}</span>
                <span className="nm">{beaten}</span>
                <span className="res w">{t('run.resultWin')}</span>
              </div>
            )
          }

          if (isElimination) {
            return (
              <div key={i} className="rrow">
                <span className="st">{label}</span>
                <span className="nm">—</span>
                <span className="res l">{t('run.resultOut')}</span>
              </div>
            )
          }

          return null
        })}
      </div>

      <div className="sub" style={{ fontSize: 13, color: 'var(--txt-dim)' }}>
        {matchesWonText}
      </div>

      <div className="actions" style={{ flexDirection: 'row', width: 'auto' }}>
        <button type="button" className="btn btn-primary btn-big" onClick={onRestart}>
          {t('run.tryAgain')}
        </button>
        <button type="button" className="btn btn-ghost btn-big" onClick={onHome}>
          {t('run.mainMenu')}
        </button>
      </div>
    </div>
  )
}
