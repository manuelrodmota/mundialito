import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLang } from '../../i18n'
import { useAccount, type LevelUpItem } from '../../../account/AccountProvider'
import { RingProgress } from '../../atoms/RingProgress'
import { Pack } from '../BoxOpening/Pack'
import { BoxOpening, type BoxSpec } from '../BoxOpening'
import { BOX_TIERS } from '../../../meta/boxes'

const CONFETTI_COLORS = ['#7f56d9', '#b79bf0', '#e8c873', '#5aa7e8', '#3fbf6f']

// Deterministic pseudo-random scatter (no Math.random during render — purity rule).
function hash(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: hash(i, 1) * 100,
        bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: hash(i, 2) * 0.6,
        dur: 1.6 + hash(i, 3) * 1.4,
      })),
    [],
  )
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: `${p.left}%`,
              background: p.bg,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}

interface LevelUpProps {
  item: LevelUpItem
  onAddToLocker: () => void
  onOpenNow: () => void
}

/** Full-screen level-up moment: ring + level, reward box, Add to locker / Open now. */
export function LevelUp({ item, onAddToLocker, onOpenNow }: LevelUpProps) {
  const { t } = useLang()
  const tierMeta = BOX_TIERS[item.tier]
  return (
    <div className="levelup-veil">
      <Confetti />
      <div className="levelup-card">
        <div className="lu-kick">{t('levelUp.kicker')}</div>
        <RingProgress pct={1} size={120} stroke={6} color="var(--brand)">
          <span className="lu-num">{item.level}</span>
        </RingProgress>
        <h2>{t('levelUp.reached', { n: item.level })}</h2>
        <p>{t('levelUp.sub')}</p>
        <div className="lu-reward">
          <Pack tier={item.tier} size={64} />
          <div className="rt">
            <div className="a">{t('levelUp.reward')}</div>
            <div className="b">{t('levelUp.boxLabel', { tier: tierMeta.name })}</div>
          </div>
        </div>
        <div className="lu-actions">
          <button className="btn btn-ghost" type="button" onClick={onAddToLocker}>
            {t('levelUp.addToLocker')}
          </button>
          <button className="btn btn-gold" type="button" onClick={onOpenNow}>
            {t('levelUp.openNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Global host: shows queued level-up moments over everything; "Open now" rips the box. */
export function LevelUpHost() {
  const { levelUps, consumeLevelUp } = useAccount()
  const [opening, setOpening] = useState<BoxSpec[] | null>(null)

  if (opening) {
    return (
      <BoxOpening
        queue={opening}
        onDone={() => {
          setOpening(null)
          consumeLevelUp()
        }}
      />
    )
  }

  const item = levelUps[0]
  if (!item) return null

  return (
    <LevelUp
      item={item}
      onAddToLocker={consumeLevelUp}
      onOpenNow={() => setOpening([{ id: item.boxId, tier: item.tier, source: 'level' }])}
    />
  )
}
