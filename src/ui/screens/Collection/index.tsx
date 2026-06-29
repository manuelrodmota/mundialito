import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n'
import { USE_STUB_AUTH, useAuth } from '../../../auth/AuthProvider'
import { useAccount } from '../../../account/AccountProvider'
import { TopBar } from '../../organisms/TopBar'
import { PlayerCard } from '../../molecules/PlayerCard'
import { Icon } from '../../atoms/Icon'
import { getCatalog, type Catalog } from '../../../data/remote/catalog.repo'
import { fetchOwnedCounts } from '../../../data/user/userCards.repo'
import type { PlayerCard as PlayerCardData, Rarity } from '../../../engine/types'

interface CollectionProps {
  onHome: () => void
  onBack: () => void
}

type View = 'owned' | 'all'
type RarityFilter = 'all' | 'rare' | 'epic' | 'legendary'

const RARITY_RANK: Record<Rarity, number> = { legendary: 3, epic: 2, rare: 1, common: 0 }
const RENDER_CAP = 160

/** Browse owned (and not-yet-owned) cards (WCC-052). */
export function Collection({ onHome, onBack }: CollectionProps) {
  const { t } = useLang()
  const { user } = useAuth()
  const { profile } = useAccount()

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [owned, setOwned] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(!USE_STUB_AUTH)

  const [view, setView] = useState<View>('owned')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (USE_STUB_AUTH) return
    let active = true
    Promise.all([getCatalog(), fetchOwnedCounts()])
      .then(([cat, own]) => {
        if (!active) return
        setCatalog(cat)
        setOwned(own)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const allCards = useMemo<PlayerCardData[]>(() => {
    if (!catalog) return []
    return [
      ...catalog.buckets.legendary,
      ...catalog.buckets.epic,
      ...catalog.buckets.rare,
      ...catalog.buckets.common,
    ]
  }, [catalog])

  const ownedDistinct = useMemo(() => {
    let n = 0
    for (const c of allCards) if ((owned.get(c.cardId ?? -1) ?? 0) > 0) n++
    return n
  }, [allCards, owned])

  const ownedByRarity = useMemo(() => {
    const by: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 }
    for (const c of allCards) if ((owned.get(c.cardId ?? -1) ?? 0) > 0) by[c.rarity]++
    return by
  }, [allCards, owned])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allCards.filter((c) => {
      const count = owned.get(c.cardId ?? -1) ?? 0
      if (view === 'owned' && count === 0) return false
      if (rarity !== 'all' && c.rarity !== rarity) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.nation.toLowerCase().includes(q)) return false
      return true
    })
    list.sort((a, b) => {
      if (view === 'all') {
        const ao = (owned.get(a.cardId ?? -1) ?? 0) > 0 ? 1 : 0
        const bo = (owned.get(b.cardId ?? -1) ?? 0) > 0 ? 1 : 0
        if (ao !== bo) return bo - ao
      }
      if (RARITY_RANK[a.rarity] !== RARITY_RANK[b.rarity]) return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]
      return b.overall - a.overall
    })
    return list
  }, [allCards, owned, view, rarity, search])

  const shown = filtered.slice(0, RENDER_CAP)
  const total = allCards.length
  const pct = total ? Math.round((ownedDistinct / total) * 1000) / 10 : 0
  const username = profile?.username ?? user?.displayName ?? 'Player'
  const level = profile?.level ?? 1

  const ownedEmpty = !loading && view === 'owned' && ownedDistinct === 0

  return (
    <div className="scroll-screen">
      <div className="stadium-bg" style={{ position: 'fixed' }} />
      <TopBar onBrand={onHome} username={username} level={level} avatarUrl={user?.avatarUrl} avatarColor={user?.avatarColor} />

      <div className="coll">
        <div className="coll-head">
          <button className="page-back" type="button" onClick={onBack}>
            <Icon name="back" size={16} /> {t('collection.backToAccount')}
          </button>
          <h2>{t('collection.title')}</h2>
          <div className="sub">
            {t('collection.summary', { owned: ownedDistinct, total, pct })}
            {' · '}
            {t('collection.rarityCounts', {
              leg: ownedByRarity.legendary,
              epic: ownedByRarity.epic,
              rare: ownedByRarity.rare,
            })}
          </div>
        </div>

        <div className="coll-filters">
          <input
            className="coll-search"
            value={search}
            placeholder={t('collection.searchPlaceholder')}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="seg">
            <button className={view === 'owned' ? 'on' : ''} onClick={() => setView('owned')} type="button">
              {t('collection.owned')}
            </button>
            <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')} type="button">
              {t('collection.all')}
            </button>
          </div>
          <div className="seg">
            {(['all', 'rare', 'epic', 'legendary'] as RarityFilter[]).map((r) => (
              <button
                key={r}
                data-r={r === 'all' ? undefined : r}
                className={rarity === r ? 'on' : ''}
                onClick={() => setRarity(r)}
                type="button"
              >
                {t(`collection.${r === 'all' ? 'rarityAll' : r}`)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="coll-grid">
            <div className="coll-empty">{t('collection.loading')}</div>
          </div>
        ) : ownedEmpty ? (
          <div className="coll-empty-state">
            <div className="ce-icon">
              <Icon name="collection" size={40} />
            </div>
            <h3>{t('collection.empty')}</h3>
            <p>{t('collection.emptySub')}</p>
            <button className="btn btn-gold" type="button" onClick={onBack}>
              {t('collection.emptyCta')}
            </button>
          </div>
        ) : (
          <>
            <div className="coll-grid">
              {shown.map((c) => {
                const count = owned.get(c.cardId ?? -1) ?? 0
                const locked = count === 0
                return (
                  <div key={c.cardId} className={`coll-cell${locked ? ' locked' : ''}`}>
                    {count > 1 && <span className="copies">×{count}</span>}
                    <PlayerCard card={c} size={132} />
                    {locked && (
                      <span className="miss">
                        <Icon name="lock" size={26} />
                      </span>
                    )}
                  </div>
                )
              })}
              {shown.length === 0 && <div className="coll-empty">{t('collection.noMatches')}</div>}
            </div>
            {filtered.length > RENDER_CAP && (
              <div className="coll-cap-note">{t('collection.capNote', { n: RENDER_CAP })}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
