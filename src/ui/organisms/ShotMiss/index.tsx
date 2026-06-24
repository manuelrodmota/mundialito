import { useLang } from '../../i18n'
import { GoalMouth, BlastBall, BootImg, GloveImg } from '../Goal/scene'

interface ShotMissProps {
  /**
   * True when it was YOUR shot that got saved (so THEY denied you); false when YOU saved theirs.
   * This is the attacker's side, the same as the Goal that would have played instead.
   */
  mine: boolean
  /** The attacker's shot probability (0–1), shown as a small "shot taken at X%" caption. */
  p: number
  /** Scoreline at this beat, [you, them]. Unchanged by a save, but shown for parity with GOAL. */
  score?: readonly [number, number]
}

/**
 * SAVE cinematic — the twin of the GOAL blast. The same shot flies to the corner, but the keeper
 * gets there in time and tips it wide. The keeper who saves decides the color: YOU saving
 * (mine=false) is the green "YOU DENY THEM"; THEM saving your shot (mine=true) is the red
 * "THEY DENY YOU". Motion is CSS-driven (keyframes in v9.css) and honors prefers-reduced-motion.
 * The root is pointer-events:none so the surrounding Overlay veil receives click-to-dismiss.
 */
export function ShotMiss({ mine, p, score }: ShotMissProps) {
  const { t } = useLang()
  // The keeper making the save is the OTHER side from whoever took the shot.
  const saver = mine ? 'them' : 'you'
  const deny = mine ? t('match.shot.theyDeny') : t('match.shot.youDeny')
  const line = score ? `${deny} · ${score[0]} – ${score[1]}` : deny

  return (
    <div className={`save-blast ${saver}`}>
      <div className="gb-net" />
      <div className="sb-pitch">
        <GoalMouth />
        <div className="sb-impact" aria-hidden="true" />
        <span className="sb-glove">
          <GloveImg />
        </span>
        <span className="sb-ball">
          <BlastBall />
        </span>
        <span className="gb-boot">
          <BootImg />
        </span>
      </div>
      <div className="sb-text">{t('match.shot.saved')}</div>
      <div className="sb-sub">{line}</div>
      <div className="sb-chance">{t('match.shot.atChance', { pct: Math.round(p * 100) })}</div>
    </div>
  )
}
