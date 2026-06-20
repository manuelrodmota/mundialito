import { MiniCrest, PlayerCrest } from '../../atoms/Crest'
import { crestSrc } from '../../data/nations'

interface XGRailProps {
  code: string
  themXg: number
  themHeat: 0 | 1 | 2 | 3
  youXg: number
  youClose?: boolean
}

interface ScoreboardProps {
  them: number
  you: number
  /** Opponent nation code label (e.g. "ARG"). */
  code?: string
  /** Opponent full nation name used to resolve the real crest asset. */
  nation?: string
  /** Opponent nation flag bands for the crest fallback. */
  themCols?: [string, string, string]
  minute?: string
  phase?: string
  mercy?: string
  mercyHot?: boolean
  et?: boolean
  xg?: XGRailProps
}

/** Live scoreboard with numeric score, match clock, mercy marker, and optional xG rail. */
export function Scoreboard({
  them = 1,
  you = 2,
  code = 'OPP',
  nation,
  themCols = ['#74ACDF', '#fff', '#74ACDF'],
  minute = "63'",
  phase = '2ND HALF',
  mercy,
  mercyHot,
  et,
  xg,
}: ScoreboardProps) {
  const crest = nation ? crestSrc(nation) : null

  return (
    <div className={`scoreboard7${et ? ' et' : ''}`} style={{ position: 'static', transform: 'none' }}>
      <div className="sb-main">
        <div className="sb-team them">
          {crest ? (
            <span className="flag crest-on">
              <img src={crest} alt={nation} style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </span>
          ) : (
            <MiniCrest cols={themCols} size={30} />
          )}
          <span className="sb-code">{code}</span>
        </div>
        <div className="sb-score">
          <span className="sb-g them">{them}</span>
          <span className="sb-dash">–</span>
          <span className="sb-g you">{you}</span>
        </div>
        <div className="sb-team you">
          <div className="sb-youcrest">
            <PlayerCrest variant="you" />
          </div>
          <span className="sb-code">YOU</span>
        </div>
      </div>
      <div className="sb-clock">
        <span className="sb-min">{minute}</span>
        <span className={`sb-phase${et ? ' et' : ''}`}>{phase}</span>
      </div>
      {mercy !== undefined && (
        <div className={`sb-mercy${mercyHot ? ' hot' : ''}`}>{mercy}</div>
      )}
      {xg && (
        <div className="cb-xg">
          <div className="cbxg them" data-heat={xg.themHeat}>
            <span className="cbxg-lab">{xg.code}</span>
            <div className="cbxg-track">
              <i style={{ width: Math.round(xg.themXg * 100) + '%' }} />
              <span className="cbxg-val">{xg.themXg.toFixed(2)} xG</span>
            </div>
            <span className="cbxg-heat" data-heat={xg.themHeat}>
              ●{Math.round(xg.themXg * 100)}
            </span>
          </div>
          <div className="cbxg you">
            <span className="cbxg-lab">YOU</span>
            <div className="cbxg-track">
              <i style={{ width: Math.round(xg.youXg * 100) + '%' }} />
              <span className="cbxg-val">{xg.youXg.toFixed(2)} xG</span>
            </div>
            {xg.youClose && (
              <span className="cbxg-ball close" aria-hidden="true">
                ⚽
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
