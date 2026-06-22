import { useState, useEffect, useMemo, useRef } from 'react'
import type { PlayerCard, TacticalCard, Card } from '../../../engine/types'
import { makeRng } from '../../../engine'
import { fetchPlayers, fetchAvailableSeasons, fetchTeamsForSeason } from '../../../data/remote/players.repo'
import { getSupabaseClient } from '../../../data/remote/client'
import { tacticals } from '../../../data'
import { buildQuickplayDeck } from '../../quickplay/buildQuickplayDeck'
import { recommendedSpread, POSITION_ORDER } from '../../quickplay/curatePool'
import { Filters } from '../../organisms/Filters'
import { AssistedPool } from '../../organisms/AssistedPool'
import { PickRow, SlotMeter } from '../../molecules/PickRow'
import { CardDetailModal, TACTICAL_DESCRIPTION_KEYS } from '../../organisms/CardDetailModal'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { useLang } from '../../i18n'

interface DeckBuilderProps {
  onDeckReady: (deck: Card[], captainId: string) => void
  onBack: () => void
  /** Maximum premium player slots the user may spend. Defaults to 20 for Quickplay. */
  playerBudget?: number
  /** Maximum tactical card slots allowed. Defaults to 3 for Quickplay. */
  tacticalCap?: number
  /** Total roster size including bench commons. Defaults to 16 for Quickplay. */
  rosterSize?: number
}

type LoadState = 'loading' | 'error' | 'empty' | 'ready'

/** Full deck-builder screen. Loads the 2026 Supabase pool, splits it into
 *  premiums (hand-pickable) and commons (bench-fill only). Lets the user pick
 *  premium slots up to `playerBudget` + up to `tacticalCap` tacticals + a captain,
 *  then fills the bench with random commons on demand.
 *
 *  Defaults to Quickplay parameters (20/3/16) so existing callers are unaffected.
 *  The Arcade Run XI builder mounts with (10/1/11) for a lean starting squad.
 *
 *  Two-pane layout: pool pane (browse + filter) + picks pane (squad summary + confirm).
 */
export function DeckBuilder({
  onDeckReady,
  onBack,
  playerBudget = 20,
  tacticalCap = 3,
  rosterSize = 16,
}: DeckBuilderProps) {
  const { t } = useLang()
  const [premiums, setPremiums] = useState<PlayerCard[]>([])
  // Commons for the browsed edition. Hidden by default (the grid shows premiums only,
  // to avoid loading thousands of low-tier cards), but surfaced when a country filter is
  // set so small nations with no premiums (e.g. Curaçao) still show their full squad.
  const [editionCommons, setEditionCommons] = useState<PlayerCard[]>([])
  const [commonPool, setCommonPool] = useState<PlayerCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [picks, setPicks] = useState<PlayerCard[]>([])
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [tacPicks, setTacPicks] = useState<TacticalCard[]>([])
  const [benchCommons, setBenchCommons] = useState<PlayerCard[]>([])
  const [fillSeed, setFillSeed] = useState(1)
  const [modalCard, setModalCard] = useState<PlayerCard | TacticalCard | null>(null)
  // Assisted = position-guided sections that nudge toward a balanced core; free = the
  // full flat grid. Both share the same picks/captain/slots state, so toggling never
  // loses a selection. Default to assisted so newcomers get the guided path first.
  const [mode, setMode] = useState<'assisted' | 'free'>('assisted')

  const [searchValue, setSearchValue] = useState('')
  const [positionValue, setPositionValue] = useState('all')
  const [rarityValue, setRarityValue] = useState('all')
  const [ratingMin, setRatingMin] = useState(60)
  const [seasonValue, setSeasonValue] = useState(2026)
  const [countryValue, setCountryValue] = useState('all')
  const [seasons, setSeasons] = useState<number[]>([2026])
  const [countries, setCountries] = useState<string[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const tacticsRef = useRef<HTMLDivElement>(null)

  // Distinct WC editions, loaded once (drives the edition selector).
  useEffect(() => {
    fetchAvailableSeasons(getSupabaseClient())
      .then((list) => { if (list.length > 0) setSeasons(list) })
      .catch(() => { /* keep the 2026 default */ })
  }, [])

  // Stable bench common pool, loaded once from the plentiful default WC 2026 edition
  // (~1000 commons). The bench auto-fills with random commons, but some editions are
  // common-sparse (WC 1950 has a single common), so tying the bench to the browsed
  // edition would leave the deck with no cycling pile. This pool is edition-independent.
  useEffect(() => {
    fetchPlayers({ season: 2026, limit: 2000 }, getSupabaseClient())
      .then((players) => setCommonPool(players.filter((p) => p.rarity === 'common')))
      .catch(() => { /* bench fill will be limited if this fails */ })
  }, [])

  // Players + country list for the selected WC edition. Re-runs when the edition changes.
  // (loadState is reset to 'loading' by the season-change handler, not synchronously here.)
  useEffect(() => {
    const client = getSupabaseClient()
    let cancelled = false
    Promise.all([
      fetchPlayers({ season: seasonValue, limit: 2000 }, client),
      fetchTeamsForSeason(seasonValue, client).catch(() => [] as string[]),
    ])
      .then(([players, teamList]) => {
        if (cancelled) return
        const premiumList = players.filter((p) => p.rarity !== 'common')
        setCountries(teamList)
        setEditionCommons(players.filter((p) => p.rarity === 'common'))
        if (premiumList.length === 0) {
          setLoadState('empty')
        } else {
          // Only the premium grid is edition-specific; the bench common pool is loaded
          // once above (edition-independent) so sparse editions still fill the bench.
          setPremiums(premiumList)
          setLoadState('ready')
        }
      })
      .catch(() => { if (!cancelled) setLoadState('error') })
    return () => { cancelled = true }
  }, [seasonValue])

  const filteredPlayers = useMemo(() => {
    // A country filter surfaces that nation's commons too, so small squads aren't empty;
    // the default (no country) view stays premium-only.
    const base = countryValue !== 'all' ? [...premiums, ...editionCommons] : premiums
    return base.filter((p) => {
      if (searchValue && !p.name.toLowerCase().includes(searchValue.toLowerCase())) return false
      if (countryValue !== 'all' && p.nation !== countryValue) return false
      if (positionValue !== 'all' && p.position !== positionValue) return false
      if (rarityValue !== 'all' && p.rarity.toLowerCase() !== rarityValue.toLowerCase()) return false
      if (p.overall < ratingMin) return false
      return true
    })
  }, [premiums, editionCommons, searchValue, countryValue, positionValue, rarityValue, ratingMin])

  const slotsUsed = picks.reduce((sum, p) => sum + p.slots, 0)
  const isOverBudget = slotsUsed > playerBudget
  const hasCaptain = captainId !== null
  const tacSlotsUsed = tacPicks.reduce((sum, t) => sum + t.slots, 0)

  // Recommended balanced core, derived from engine position synergies and scaled to
  // this mode's budget/roster (Quickplay 20/16 vs Arcade XI 10/11). Drives the
  // assisted view's per-position "need" indicators.
  const recommended = useMemo(
    () => recommendedSpread({ rosterSize, playerBudget }),
    [rosterSize, playerBudget],
  )

  function handleAddPlayer(player: PlayerCard) {
    if (picks.some((p) => p.id === player.id)) return
    if (picks.length >= rosterSize) return
    if (slotsUsed + player.slots > playerBudget) return
    setPicks((prev) => [...prev, player])
    setBenchCommons([]) // picks changed — invalidate the rolled bench (re-roll via Fill bench)
    if (!captainId) setCaptainId(player.id)
  }

  function handleRemovePlayer(player: PlayerCard) {
    setPicks((prev) => prev.filter((p) => p.id !== player.id))
    setBenchCommons([]) // picks changed — invalidate the rolled bench
    if (captainId === player.id) {
      const remaining = picks.filter((p) => p.id !== player.id)
      setCaptainId(remaining[0]?.id ?? null)
    }
  }

  function handleToggleCaptain(player: PlayerCard) {
    setCaptainId(player.id)
  }

  function handleAddTactical(tac: TacticalCard) {
    if (tacPicks.some((t) => t.id === tac.id)) return
    if (tacSlotsUsed + tac.slots > tacticalCap) return
    setTacPicks((prev) => [...prev, tac])
  }

  function handleRemoveTactical(tac: TacticalCard) {
    setTacPicks((prev) => prev.filter((t) => t.id !== tac.id))
  }

  function handleRemoveBenchCommon(player: PlayerCard) {
    setBenchCommons((prev) => prev.filter((p) => p.id !== player.id))
  }

  function handleFillCommons() {
    if (commonPool.length === 0) return
    const needed = Math.max(0, rosterSize - picks.length)
    if (needed === 0) return
    const rng = makeRng(fillSeed * 31337)
    const shuffled = rng.shuffle([...commonPool])
    setBenchCommons(shuffled.slice(0, needed))
    setFillSeed((s) => s + 1)
  }

  function handleConfirm() {
    if (!captainId || isOverBudget || picks.length === 0) return

    const rng = makeRng(fillSeed * 31337)

    const { deck } = buildQuickplayDeck({
      premiumPicks: picks,
      tacticalPicks: tacPicks,
      captainId,
      commonPool,
      rosterSize,
      playerBudget,
      tacticalCap,
      rng,
    })

    onDeckReady(deck, captainId)
  }

  if (loadState === 'loading') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <div className="builder-loading">
          <div className="loader-ring" aria-hidden="true" />
          <p>{t('builder.loading')}</p>
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>{t('builder.errorLoad')}</p>
          <button className="btn btn-ghost" onClick={onBack}>{t('builder.menu')}</button>
        </div>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>{t('builder.empty')}</p>
          <button className="btn btn-ghost" onClick={onBack}>{t('builder.menu')}</button>
        </div>
      </div>
    )
  }

  const canConfirm = hasCaptain && !isOverBudget && picks.length > 0
  const totalPicks = picks.length + benchCommons.length

  const gks = picks.filter((p) => p.position === 'GK').length
  const avg = (k: 'atk' | 'def') =>
    picks.length ? Math.round(picks.reduce((s, p) => s + p[k], 0) / picks.length) : 0

  const confirmLabel = canConfirm
    ? t('builder.confirm')
    : t('builder.confirmFallback', { picks: picks.length, used: slotsUsed, budget: playerBudget }) +
      (hasCaptain ? '' : t('builder.confirmNeedCaptain'))

  const groups: [string, (PlayerCard | TacticalCard)[]][] = [
    [t('builder.groupLegendaries'), picks.filter((p) => p.rarity === 'legendary')],
    [t('builder.groupEpics'), picks.filter((p) => p.rarity === 'epic')],
    [t('builder.groupRares'), picks.filter((p) => p.rarity === 'rare')],
    [t('builder.groupTactical'), tacPicks],
  ]

  return (
    <div className="screen builder">
      <div className="stadium-bg" />
      <div className="builder-head">
        <div>
          <h2>{t('builder.title')}</h2>
          <div className="hint">
            {t('builder.hint', { budget: playerBudget, tac: tacticalCap, tacPlural: tacticalCap !== 1 ? 's' : '' })}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>{t('builder.menu')}</button>
      </div>

      <div className="builder-body">
        <div className="pool-pane">
          <div className="builder-tabs builder-mode-tabs" role="tablist" aria-label={t('builder.selectionModeLabel')}>
            <button
              role="tab"
              aria-selected={mode === 'assisted'}
              className={mode === 'assisted' ? 'on' : ''}
              onClick={() => setMode('assisted')}
            >
              {t('builder.modeRecommended')}
            </button>
            <button
              role="tab"
              aria-selected={mode === 'free'}
              className={mode === 'free' ? 'on' : ''}
              onClick={() => setMode('free')}
            >
              {t('builder.modeAllPlayers')}
            </button>
          </div>
          <Filters
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            seasonValue={seasonValue}
            onSeasonChange={(s) => { setLoadState('loading'); setSeasonValue(s); setCountryValue('all') }}
            seasonOptions={seasons}
            countryValue={countryValue}
            onCountryChange={setCountryValue}
            countryOptions={countries}
            positionValue={positionValue}
            onPositionChange={setPositionValue}
            rarityValue={rarityValue}
            onRarityChange={setRarityValue}
            rarityAllLabel={t('builder.allPremiums')}
            rarityOptions={['Legendary', 'Epic', 'Rare']}
            ratingMin={ratingMin}
            onRatingMinChange={setRatingMin}
          />
          <div className="pool-scroll" ref={scrollRef}>
            {mode === 'assisted' ? (
              <AssistedPool
                players={filteredPlayers}
                picks={picks}
                slotsUsed={slotsUsed}
                playerBudget={playerBudget}
                captainId={captainId}
                recommended={recommended}
                onAdd={handleAddPlayer}
                onRemove={handleRemovePlayer}
                onInfo={(player) => setModalCard(player)}
              />
            ) : (
              <div className="pool-grid2">
                {filteredPlayers.map((player) => {
                  const isPicked = picks.some((p) => p.id === player.id)
                  const wouldExceed = !isPicked && slotsUsed + player.slots > playerBudget
                  return (
                    <div key={player.id} className="pool-cell">
                      <PlayerCardComponent
                        card={player}
                        size={150}
                        isCaptain={captainId === player.id}
                        selected={isPicked}
                        unaffordable={wouldExceed}
                        showSlots
                        onClick={() => {
                          if (isPicked) handleRemovePlayer(player)
                          else handleAddPlayer(player)
                        }}
                      />
                      <button
                        type="button"
                        className="card-info-btn"
                        onClick={(e) => { e.stopPropagation(); setModalCard(player) }}
                      >
                        ℹ
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pool-divider" ref={tacticsRef}>
              <span>{t('builder.tacticalDivider', { tac: tacticalCap })}</span>
            </div>

            <div className="pool-grid2">
              {tacticals.map((tac) => {
                const isPicked = tacPicks.some((t) => t.id === tac.id)
                const wouldExceed = !isPicked && tacSlotsUsed + tac.slots > tacticalCap
                return (
                  <div key={tac.id} className="pool-cell">
                    <TacticCard
                      card={tac}
                      size={150}
                      showSlots
                      description={
                        TACTICAL_DESCRIPTION_KEYS[tac.effect.kind]
                          ? t(TACTICAL_DESCRIPTION_KEYS[tac.effect.kind])
                          : t('builder.tacNoDescription', { name: tac.name })
                      }
                      className={isPicked ? 'selected' : wouldExceed ? 'unaffordable' : ''}
                      onClick={() => {
                        if (isPicked) handleRemoveTactical(tac)
                        else handleAddTactical(tac)
                      }}
                    />
                    <button
                      type="button"
                      className="card-info-btn"
                      onClick={(e) => { e.stopPropagation(); setModalCard(tac) }}
                    >
                      ℹ
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="picks-pane" style={{ width: 340 }}>
          <SlotMeter used={slotsUsed} cap={playerBudget} />
          <div className="slot-meter">
            <div className="row">
              <span>{t('builder.picks')}</span>
              <b>{totalPicks}</b>
            </div>
            <div className="track">
              <i style={{ width: Math.min(100, Math.round((totalPicks / rosterSize) * 100)) + '%' }} />
            </div>
          </div>

          <div className="hint">
            {t('builder.summary', {
              atk: avg('atk'),
              def: avg('def'),
              tac: tacPicks.length,
              tacPlural: tacPicks.length !== 1 ? 's' : '',
              gk: gks,
            })}
          </div>

          {mode === 'assisted' && (
            <div className="squad-needs" aria-label={t('builder.recommendedBalance')}>
              {POSITION_ORDER.map((pos) => {
                const have = picks.filter((p) => p.position === pos).length
                const need = recommended[pos]
                const met = have >= need
                return (
                  <span key={pos} className={`need-chip ${met ? 'met' : 'unmet'}`}>
                    {met ? '✓' : '⚠'} {pos} {have}/{need}
                  </span>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13 }}
              onClick={handleFillCommons}
              disabled={commonPool.length === 0}
            >
              {t('builder.fillBench')}
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: '9px 12px', fontSize: 13 }}
              onClick={() => { setPicks([]); setTacPicks([]); setCaptainId(null); setBenchCommons([]) }}
            >
              {t('builder.clear')}
            </button>
          </div>

          <div className="pick-rows" style={{ overflowY: 'auto', flex: 1 }}>
            {groups.map(([label, cards]) =>
              cards.length ? (
                <div key={label}>
                  <div className="group-h">{t('builder.groupHeader', { label, n: cards.length })}</div>
                  {cards.map((c) => {
                    if (c.type === 'tactical') {
                      return (
                        <PickRow
                          key={c.id}
                          rating={c.cost}
                          name={c.name}
                          slots={c.slots}
                          isTactic
                          onRemove={() => handleRemoveTactical(c as TacticalCard)}
                        />
                      )
                    }
                    const player = c as PlayerCard
                    return (
                      <PickRow
                        key={player.id}
                        rating={player.overall}
                        name={player.name}
                        slots={player.slots}
                        isCaptain={captainId === player.id}
                        onCaptainToggle={() => handleToggleCaptain(player)}
                        onRemove={() => handleRemovePlayer(player)}
                      />
                    )
                  })}
                </div>
              ) : null
            )}

            {benchCommons.length > 0 && (
              <div>
                <div className="group-h">{t('builder.benchHeader', { n: benchCommons.length })}</div>
                {benchCommons.map((player) => (
                  <PickRow
                    key={player.id}
                    rating={player.overall}
                    name={player.name}
                    slots={player.slots}
                    onRemove={() => handleRemoveBenchCommon(player)}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-gold btn-big"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <CardDetailModal
        card={modalCard}
        open={modalCard !== null}
        onClose={() => setModalCard(null)}
        isCaptain={modalCard?.type === 'player' && modalCard.id === captainId}
        showMult={modalCard?.type === 'player' && modalCard.rarity !== 'common'}
      />
    </div>
  )
}
