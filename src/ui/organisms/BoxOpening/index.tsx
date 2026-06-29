import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useLang } from '../../i18n'
import { PlayerCard } from '../../molecules/PlayerCard'
import { Pack } from './Pack'
import { BOX_TIERS, type BoxTier } from '../../../meta/boxes'
import { openBox, type OpenedBox } from '../../../meta/openBox'
import { getCatalog } from '../../../data/remote/catalog.repo'
import { fetchOwnedCounts } from '../../../data/user/userCards.repo'
import { persistOpenBox } from '../../../data/user/userBoxes.repo'
import { makeRng } from '../../../engine/rng'
import type { PlayerCard as PlayerCardData, Rarity } from '../../../engine/types'
import type { RarityBuckets } from '../../../meta/openBox'

export interface BoxSpec {
  id: number
  tier: BoxTier
  source: string
}

const SUSPENSE_MS: Record<Rarity, number> = { common: 0, rare: 750, epic: 1000, legendary: 1350 }

/** One flip card: face-down front, real player card rear (2D scaleX split-flip via CSS). */
function Flipper({
  card,
  up,
  shake,
  charging,
  onFlip,
  size,
}: {
  card: PlayerCardData
  up: boolean
  shake: boolean
  charging: boolean
  onFlip?: () => void
  size: number
}) {
  return (
    <div
      className={`flipper entered${up ? ' up' : ''}${shake ? ' shake' : ''}${charging ? ' charging' : ''}`}
      onClick={onFlip}
    >
      <div className="fc">
        <div className="face flip-front">
          <PlayerCard card={card} faceDown size={size} />
          <span className="charge-shimmer" />
        </div>
        <div className="face flip-rear">
          <PlayerCard card={card} size={size} />
        </div>
      </div>
    </div>
  )
}

function RevealCell({
  card,
  isNew,
  up,
  shake,
  charging,
  onFlip,
  size,
}: {
  card: PlayerCardData
  isNew: boolean
  up: boolean
  shake: boolean
  charging: boolean
  onFlip?: () => void
  size: number
}) {
  const { t } = useLang()
  const r = card.rarity
  return (
    <div className={`reveal-cell${up ? ' shown' : ''}${charging ? ' charging' : ''}`} data-r={r}>
      <div className="halo" />
      <Flipper card={card} up={up} shake={shake} charging={charging} onFlip={onFlip} size={size} />
      {up &&
        (isNew ? (
          <span className={`nb ${r === 'legendary' ? 'leg' : 'new'}`}>
            {r === 'legendary' ? t('box.legendaryNew') : t('box.new')}
          </span>
        ) : (
          <span className="nb dupe">{t('box.duplicate')}</span>
        ))}
    </div>
  )
}

/** New/duplicate annotation for a card against a snapshot of owned counts + in-box repeats. */
function annotate(cards: PlayerCardData[], owned: Map<number, number>) {
  const seen = new Map<number, number>()
  return cards.map((card) => {
    const id = card.cardId ?? -1
    const had = (owned.get(id) ?? 0) + (seen.get(id) ?? 0)
    seen.set(id, (seen.get(id) ?? 0) + 1)
    return { card, isNew: had === 0 }
  })
}

type Phase = 'sealed' | 'filler' | 'headliner' | 'summary'

/** The sealed → filler → headliner → summary flow for ONE box. */
function SingleBoxOpen({
  box,
  opened,
  owned,
  isLast,
  seqLabel,
  onSave,
}: {
  box: BoxSpec
  opened: OpenedBox
  owned: Map<number, number>
  isLast: boolean
  seqLabel: string | null
  onSave: (cards: PlayerCardData[]) => void
}) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const tierMeta = BOX_TIERS[box.tier]

  const [phase, setPhase] = useState<Phase>('sealed')
  const [tearing, setTearing] = useState(false)
  const [flash, setFlash] = useState(false)
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})
  const [charging, setCharging] = useState<number | 'hl' | null>(null)
  const [shakeIdx, setShakeIdx] = useState<number | null>(null)
  const [hlUp, setHlUp] = useState(false)
  const [chosen, setChosen] = useState<PlayerCardData | null>(null)

  const filler = opened.filler
  const fillerEntries = useMemo(() => annotate(filler, owned), [filler, owned])
  const allUp = filler.every((_, i) => flipped[i])

  const triggerFlash = (color: string) => {
    if (reduce) return
    document.documentElement.style.setProperty('--flash', color)
    setFlash(true)
    setTimeout(() => setFlash(false), 700)
  }

  const openPack = () => {
    setTearing(true)
    triggerFlash(tierMeta.accent)
    setTimeout(() => setPhase('filler'), reduce ? 150 : 560)
  }

  const doFlip = (i: number, r: Rarity) => {
    setFlipped((f) => ({ ...f, [i]: true }))
    if (r !== 'common') {
      setShakeIdx(i)
      setTimeout(() => setShakeIdx(null), 460)
      if (r === 'legendary') triggerFlash('#e8c873')
    }
  }

  const flipFiller = (i: number) => {
    if (flipped[i] || charging !== null) return
    const r = filler[i].rarity
    if (r !== 'common' && !reduce) {
      setCharging(i)
      setTimeout(() => {
        setCharging(null)
        doFlip(i, r)
      }, SUSPENSE_MS[r])
    } else {
      doFlip(i, r)
    }
  }

  const flipAll = () => filler.forEach((c, i) => !flipped[i] && doFlip(i, c.rarity))

  const revealHeadliner = () => {
    if (hlUp || charging === 'hl' || !opened.headliner) return
    const r = opened.headlinerRarity
    const flashColor = r === 'legendary' ? '#e8c873' : tierMeta.accent
    if (r !== 'common' && !reduce) {
      setCharging('hl')
      setTimeout(() => {
        setCharging(null)
        setHlUp(true)
        triggerFlash(flashColor)
      }, SUSPENSE_MS[r])
    } else {
      setHlUp(true)
      triggerFlash(flashColor)
    }
  }

  const headlinerLabel = box.tier === 'trophy' ? 'Champions — Trophy' : tierMeta.name

  // Summary: annotate all 5, place the headliner in the middle (2 filler each side).
  const summaryEntries = chosen ? annotate([...filler, chosen], owned) : []
  const newCount = summaryEntries.filter((e) => e.isNew).length
  const orderedSummary: { card: PlayerCardData; isNew: boolean; head?: boolean }[] = chosen
    ? [
        summaryEntries[0],
        summaryEntries[1],
        { card: chosen, isNew: summaryEntries[4]?.isNew ?? true, head: true },
        summaryEntries[2],
        summaryEntries[3],
      ]
    : []

  return (
    <div className="open-stage" style={{ '--acc': tierMeta.accent } as React.CSSProperties}>
      <div className="stage-kick">
        <div className="k">{t('box.boxLabel', { name: headlinerLabel })}</div>
        {seqLabel && <div className="seq">{seqLabel}</div>}
      </div>

      {flash && <div className="flash go" />}

      {phase === 'sealed' && (
        <div className="bigpack-wrap">
          <div className="stage-h">{t('box.aBoxToOpen')}</div>
          <div className={`bigpack${tearing ? ' tearing' : ''}`}>
            <Pack tier={box.tier} big onClick={openPack} />
          </div>
          {!tearing && <div className="tap-open">{t('box.tapToOpen')}</div>}
        </div>
      )}

      {phase === 'filler' && (
        <>
          <div className="stage-h">{t('box.yourPulls')}</div>
          <div className="reveal-row">
            {fillerEntries.map((entry, i) => (
              <RevealCell
                key={i}
                card={entry.card}
                isNew={entry.isNew}
                up={!!flipped[i]}
                charging={charging === i}
                shake={shakeIdx === i}
                onFlip={() => flipFiller(i)}
                size={150}
              />
            ))}
          </div>
          <div className="open-foot">
            {allUp ? (
              <button className="btn btn-gold btn-big" type="button" onClick={() => setPhase('headliner')}>
                {t('box.continueHeadliner')}
              </button>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={flipAll}>
                {t('box.revealAll')}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'headliner' && opened.allowPick && opened.headlinerChoices && (
        <div className="pick-stage">
          <div className="pick-title">
            <div className="k">{t('box.headliner')}</div>
            <h2>{t('box.choose1of3')}</h2>
            <p>{t('box.pickLede')}</p>
          </div>
          <div className="pick-row">
            {opened.headlinerChoices.map((c, i) => (
              <div
                key={i}
                className="pick-opt"
                data-r={c.rarity}
                onClick={() => {
                  setChosen(c)
                  triggerFlash(c.rarity === 'legendary' ? '#e8c873' : tierMeta.accent)
                  setTimeout(() => setPhase('summary'), 360)
                }}
              >
                <PlayerCard card={c} size={180} />
                <button className="pick-btn" type="button">
                  {t('box.pick', { name: c.name.split(' ').slice(-1)[0] })}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'headliner' && !opened.allowPick && opened.headliner && (
        <>
          <div className="pick-stage">
            <div className="pick-title">
              <div className="k">{t('box.headliner')}</div>
              <h2>{hlUp ? opened.headliner.name : t('box.tapToReveal')}</h2>
            </div>
            <RevealCell
              card={opened.headliner}
              isNew={(owned.get(opened.headliner.cardId ?? -1) ?? 0) === 0}
              up={hlUp}
              charging={charging === 'hl'}
              shake={false}
              onFlip={revealHeadliner}
              size={200}
            />
          </div>
          <div className="open-foot">
            {hlUp ? (
              <button
                className="btn btn-gold"
                type="button"
                onClick={() => {
                  setChosen(opened.headliner)
                  setPhase('summary')
                }}
              >
                {t('box.continue')}
              </button>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={revealHeadliner}>
                {t('box.reveal')}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'summary' && chosen && (
        <>
          <div className="stage-h">{t('box.your5cards')}</div>
          <div className="summary-grid">
            {orderedSummary.map((entry, i) => (
              <div
                key={i}
                className={`reveal-cell shown sum-cell${entry.head ? ' is-headliner' : ''}`}
                data-r={entry.card.rarity}
              >
                {entry.head && <span className="sum-tag">{t('box.headliner')}</span>}
                <div className="halo" />
                <PlayerCard card={entry.card} size={entry.head ? 168 : 132} />
                {entry.isNew ? (
                  <span className={`nb ${entry.card.rarity === 'legendary' ? 'leg' : 'new'}`}>
                    {entry.card.rarity === 'legendary' ? t('box.legendaryNew') : t('box.new')}
                  </span>
                ) : (
                  <span className="nb dupe">{t('box.duplicate')}</span>
                )}
              </div>
            ))}
          </div>
          <div className="sum-foot">
            <div className="reveal-summary">
              <span className="sc">{t('box.newCount', { n: newCount, d: 5 - newCount })}</span>
            </div>
            <button className="btn btn-gold btn-big" type="button" onClick={() => onSave([...filler, chosen])}>
              {isLast ? t('box.saveToCollection') : t('box.saveAndNext')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface BoxOpeningProps {
  queue: BoxSpec[]
  onDone: () => void
}

/** Opens a queue of boxes back-to-back, persisting each to the collection on save. */
export function BoxOpening({ queue, onDone }: BoxOpeningProps) {
  const { t } = useLang()
  const [data, setData] = useState<{ buckets: RarityBuckets; owned: Map<number, number> } | null>(null)
  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([getCatalog(), fetchOwnedCounts()])
      .then(([cat, owned]) => {
        if (active) setData({ buckets: cat.buckets, owned })
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [])

  const box = queue[index]
  const opened = useMemo(
    () =>
      data && box
        ? openBox(box.tier, data.buckets, makeRng(box.id), {
            forceLegendaryHeadliner: box.source === 'welcome' && box.tier === 'champions',
          })
        : null,
    [data, box],
  )

  if (failed) {
    return (
      <div className="open-stage">
        <div className="stage-h">{t('box.loadError')}</div>
        <div className="open-foot">
          <button className="btn btn-ghost" type="button" onClick={onDone}>
            {t('box.close')}
          </button>
        </div>
      </div>
    )
  }

  if (!data || !box || !opened) {
    return (
      <div className="open-stage">
        <div className="stage-h">{t('box.opening')}</div>
      </div>
    )
  }

  const isLast = index === queue.length - 1
  const seqLabel = queue.length > 1 ? t('box.seq', { i: index + 1, n: queue.length }) : null

  const handleSave = async (cards: PlayerCardData[]) => {
    const ids = cards.map((c) => c.cardId).filter((x): x is number => x != null)
    try {
      await persistOpenBox(box.id, ids)
    } catch {
      /* surfaced via the locker not refreshing; keep the flow moving */
    }
    if (isLast) {
      onDone()
      return
    }
    const nextOwned = new Map(data.owned)
    for (const id of ids) nextOwned.set(id, (nextOwned.get(id) ?? 0) + 1)
    setData({ buckets: data.buckets, owned: nextOwned })
    setIndex((i) => i + 1)
  }

  return (
    <SingleBoxOpen
      key={box.id}
      box={box}
      opened={opened}
      owned={data.owned}
      isLast={isLast}
      seqLabel={seqLabel}
      onSave={handleSave}
    />
  )
}
