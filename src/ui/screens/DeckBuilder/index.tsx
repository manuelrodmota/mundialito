import { useState, useEffect, useMemo, useRef } from 'react'
import type { PlayerCard, TacticalCard, Card } from '../../../engine/types'
import { makeRng } from '../../../engine'
import { fetchPlayers } from '../../../data/remote/players.repo'
import { getSupabaseClient } from '../../../data/remote/client'
import { tacticals } from '../../../data'
import { buildQuickplayDeck } from '../../quickplay/buildQuickplayDeck'
import { Filters } from '../../organisms/Filters'
import { PickRow, SlotMeter } from '../../molecules/PickRow'
import { CardDetailModal } from '../../organisms/CardDetailModal'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'

const PLAYER_BUDGET = 20
const TACTICAL_CAP = 3
const ROSTER_SIZE = 16

interface DeckBuilderProps {
  onDeckReady: (deck: Card[], captainId: string) => void
  onBack: () => void
}

type LoadState = 'loading' | 'error' | 'empty' | 'ready'

/** Full deck-builder screen. Loads the 2026 Supabase premium pool, lets the user pick
 *  up to 20 premium slots + 3 tacticals + a captain, then auto-fills commons on confirm.
 *  Two-pane layout: pool pane (browse + filter) + picks pane (squad summary + confirm).
 */
export function DeckBuilder({ onDeckReady, onBack }: DeckBuilderProps) {
  const [allPlayers, setAllPlayers] = useState<PlayerCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [picks, setPicks] = useState<PlayerCard[]>([])
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [tacPicks, setTacPicks] = useState<TacticalCard[]>([])
  const [fillSeed, setFillSeed] = useState(1)
  const [modalCard, setModalCard] = useState<PlayerCard | TacticalCard | null>(null)

  const [searchValue, setSearchValue] = useState('')
  const [positionValue, setPositionValue] = useState('all')
  const [rarityValue, setRarityValue] = useState('all')
  const [ratingMin, setRatingMin] = useState(60)

  const scrollRef = useRef<HTMLDivElement>(null)
  const tacticsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const client = getSupabaseClient()
    fetchPlayers({ season: 2026, limit: 200 }, client)
      .then((players) => {
        const premiums = players.filter((p) => p.rarity !== 'common')
        if (premiums.length === 0) setLoadState('empty')
        else {
          setAllPlayers(premiums)
          setLoadState('ready')
        }
      })
      .catch(() => setLoadState('error'))
  }, [])

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      if (searchValue && !p.name.toLowerCase().includes(searchValue.toLowerCase())) return false
      if (positionValue !== 'all' && p.position !== positionValue) return false
      if (rarityValue !== 'all' && p.rarity.toLowerCase() !== rarityValue.toLowerCase()) return false
      if (p.overall < ratingMin) return false
      return true
    })
  }, [allPlayers, searchValue, positionValue, rarityValue, ratingMin])

  const slotsUsed = picks.reduce((sum, p) => sum + p.slots, 0)
  const isOverBudget = slotsUsed > PLAYER_BUDGET
  const hasCaptain = captainId !== null
  const tacSlotsUsed = tacPicks.reduce((sum, t) => sum + t.slots, 0)

  function handleAddPlayer(player: PlayerCard) {
    if (picks.some((p) => p.id === player.id)) return
    if (slotsUsed + player.slots > PLAYER_BUDGET) return
    setPicks((prev) => [...prev, player])
    if (!captainId) setCaptainId(player.id)
  }

  function handleRemovePlayer(player: PlayerCard) {
    setPicks((prev) => prev.filter((p) => p.id !== player.id))
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
    if (tacSlotsUsed + tac.slots > TACTICAL_CAP) return
    setTacPicks((prev) => [...prev, tac])
  }

  function handleRemoveTactical(tac: TacticalCard) {
    setTacPicks((prev) => prev.filter((t) => t.id !== tac.id))
  }

  function handleFillCommons() {
    setFillSeed((s) => s + 1)
  }

  function handleConfirm() {
    if (!captainId || isOverBudget || picks.length === 0) return

    const commonPool = allPlayers.filter((p) => p.rarity === 'common')
    const rng = makeRng(fillSeed * 31337)

    const { deck } = buildQuickplayDeck({
      premiumPicks: picks,
      tacticalPicks: tacPicks,
      captainId,
      commonPool,
      rosterSize: ROSTER_SIZE,
      playerBudget: PLAYER_BUDGET,
      tacticalCap: TACTICAL_CAP,
      rng,
    })

    onDeckReady(deck, captainId)
  }

  if (loadState === 'loading') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <p style={{ padding: 40, textAlign: 'center' }}>Loading players…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>Failed to load players. Please check your connection.</p>
          <button className="btn btn-ghost" onClick={onBack}>Menu</button>
        </div>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="screen builder">
        <div className="stadium-bg" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>No players available for the 2026 season.</p>
          <button className="btn btn-ghost" onClick={onBack}>Menu</button>
        </div>
      </div>
    )
  }

  const canConfirm = hasCaptain && !isOverBudget && picks.length > 0

  const gks = picks.filter((p) => p.position === 'GK').length
  const avg = (k: 'atk' | 'def') =>
    picks.length ? Math.round(picks.reduce((s, p) => s + p[k], 0) / picks.length) : 0

  const confirmLabel = canConfirm
    ? 'Confirm squad'
    : `${picks.length} picks · ${slotsUsed}/20 slots${hasCaptain ? '' : ' · pick a captain'}`

  const groups: [string, (PlayerCard | TacticalCard)[]][] = [
    ['Legendaries', picks.filter((p) => p.rarity === 'legendary')],
    ['Epics', picks.filter((p) => p.rarity === 'epic')],
    ['Rares', picks.filter((p) => p.rarity === 'rare')],
    ['Tactical cards', tacPicks],
  ]

  return (
    <div className="screen builder">
      <div className="stadium-bg" />
      <div className="builder-head">
        <div>
          <h2>Build Your Squad</h2>
          <div className="hint">
            Spend a 20-slot budget on a premium core (rares, epics, legendaries) + up to 3 tactical
            cards. The bench auto-fills with random commons — you can&apos;t hand-pick them. Crown a
            captain.
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>Menu</button>
      </div>

      <div className="builder-body">
        <div className="pool-pane">
          <Filters
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            positionValue={positionValue}
            onPositionChange={setPositionValue}
            rarityValue={rarityValue}
            onRarityChange={setRarityValue}
            rarityAllLabel="All premiums"
            rarityOptions={['Legendary', 'Epic', 'Rare']}
            ratingMin={ratingMin}
            onRatingMinChange={setRatingMin}
          />
          <div className="pool-scroll" ref={scrollRef}>
            <div className="pool-grid2">
              {filteredPlayers.map((player) => {
                const isPicked = picks.some((p) => p.id === player.id)
                const wouldExceed = !isPicked && slotsUsed + player.slots > PLAYER_BUDGET
                return (
                  <div key={player.id} style={{ position: 'relative' }}>
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
                      className="btn btn-ghost"
                      style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); setModalCard(player) }}
                    >
                      ℹ
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="pool-divider" ref={tacticsRef}>
              <span>Tactical cards · up to 3</span>
            </div>

            <div className="pool-grid2">
              {tacticals.map((tac) => {
                const isPicked = tacPicks.some((t) => t.id === tac.id)
                const wouldExceed = !isPicked && tacSlotsUsed + tac.slots > TACTICAL_CAP
                return (
                  <div key={tac.id} style={{ position: 'relative' }}>
                    <TacticCard
                      card={tac}
                      size={150}
                      showSlots
                      className={isPicked ? 'selected' : wouldExceed ? 'unaffordable' : ''}
                      onClick={() => {
                        if (isPicked) handleRemoveTactical(tac)
                        else handleAddTactical(tac)
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', fontSize: 11 }}
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
          <SlotMeter used={slotsUsed} cap={PLAYER_BUDGET} />
          <div className="slot-meter">
            <div className="row">
              <span>Picks</span>
              <b>{picks.length}</b>
            </div>
            <div className="track">
              <i style={{ width: Math.min(100, Math.round((picks.length / ROSTER_SIZE) * 100)) + '%' }} />
            </div>
          </div>

          <div className="hint">
            ⚔ avg {avg('atk')} · ⛨ avg {avg('def')} · {tacPicks.length} tactical card{tacPicks.length !== 1 ? 's' : ''} · {gks} GK
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '9px 10px', fontSize: 13 }} onClick={handleFillCommons}>
              Fill bench (random)
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: '9px 12px', fontSize: 13 }}
              onClick={() => { setPicks([]); setTacPicks([]); setCaptainId(null) }}
            >
              Clear
            </button>
          </div>

          <div className="pick-rows" style={{ overflowY: 'auto', flex: 1 }}>
            {groups.map(([label, cards]) =>
              cards.length ? (
                <div key={label}>
                  <div className="group-h">{label} · {cards.length}</div>
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
