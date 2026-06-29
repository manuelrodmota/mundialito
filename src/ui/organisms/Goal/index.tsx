import type { CSSProperties } from 'react'
import { GoalMouth, BlastBall, BootImg, GloveImg } from './scene'
import { useLang } from '../../i18n'

interface GoalProps {
  isYou: boolean
  scorer?: string
  /** Scoreline after this goal, [you, them]. */
  score?: readonly [number, number]
}

/**
 * GOAL cinematic — a boot strikes, the ball rockets into the top-right corner of the net, the
 * keeper dives a beat too late, then the big italic gold/red wordmark + scoreline slam in.
 * Motion is CSS-driven (keyframes in v9.css), so a single layer owns it and the
 * prefers-reduced-motion block snaps straight to the resolved end frame.
 * The root is pointer-events:none so the surrounding Overlay veil receives click-to-dismiss.
 */
export function Goal({ isYou, scorer, score }: GoalProps) {
  const { t } = useLang()
  const title = isYou
    ? t('match.goal.youScore')
    : scorer
      ? t('match.goal.scorerScores', { scorer: scorer.toUpperCase() })
      : t('match.goal.theyScore')
  const line = score ? `${title} · ${score[0]} – ${score[1]}` : title

  return (
    <div className={`goal-blast ${isYou ? 'you' : 'them'}`}>
      <div className="gb-net" />
      <div className="gb-pitch">
        <GoalMouth />
        <div className="gb-bulge" />
        <div className="gb-burst" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <i key={i} style={{ '--a': `${i * 40}deg` } as CSSProperties} />
          ))}
        </div>
        <span className="gb-ball">
          <BlastBall />
        </span>
        <span className="gb-glove gb-glove-miss">
          <GloveImg />
        </span>
        <span className="gb-boot">
          <BootImg />
        </span>
      </div>
      <div className="gb-text">{t('match.goal.word')}</div>
      <div className="gb-sub">{line}</div>
    </div>
  )
}
