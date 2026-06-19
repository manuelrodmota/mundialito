import { useState, useEffect, useMemo } from 'react'
import type { PlayerCard, TacticalCard, Card } from '../../../engine/types'
import { makeRng } from '../../../engine'
import { fetchPlayers } from '../../../data/remote/players.repo'
import { getSupabaseClient } from '../../../data/remote/client'
import { tacticals } from '../../../data'
import { buildQuickplayDeck } from '../../quickplay/buildQuickplayDeck'
import { Filters } from '../../organisms/Filters'
import { PickRow, SlotMeter } from '../../molecules/PickRow'
import { FillWithCommons } from '../../organisms/FillWithCommons'
import { CardDetailModal } from '../../organisms/CardDetailModal'
import { Button } from '../../atoms/Button'
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
      <div className="deck-builder loading">
        <p>Loading players…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="deck-builder error">
        <p>Failed to load players. Please check your connection.</p>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="deck-builder empty">
        <p>No players available for the 2026 season.</p>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    )
  }

  const canConfirm = hasCaptain && !isOverBudget && picks.length > 0

  return (
    <div className="deck-builder">
      <div className="db-header">
        <h2>Build Your Squad</h2>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>

      <SlotMeter used={slotsUsed} cap={PLAYER_BUDGET} />

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

      <div className="db-pool">
        {filteredPlayers.map((player) => {
          const isPicked = picks.some((p) => p.id === player.id)
          const wouldExceed = !isPicked && slotsUsed + player.slots > PLAYER_BUDGET

          return (
            <div key={player.id} className="db-player-entry">
              <PlayerCardComponent
                card={player}
                size={100}
                isCaptain={captainId === player.id}
                selected={isPicked}
                unaffordable={wouldExceed}
                onClick={() => {
                  if (isPicked) handleRemovePlayer(player)
                  else handleAddPlayer(player)
                }}
              />
              <button
                type="button"
                className="db-info-btn"
                onClick={(e) => { e.stopPropagation(); setModalCard(player) }}
              >
                ℹ
              </button>
            </div>
          )
        })}
      </div>

      {picks.length > 0 && (
        <div className="db-picks">
          <h3>Selected ({picks.length})</h3>
          {picks.map((p) => (
            <PickRow
              key={p.id}
              rating={p.overall}
              name={p.name}
              slots={p.slots}
              isCaptain={captainId === p.id}
              onCaptainToggle={() => handleToggleCaptain(p)}
              onRemove={() => handleRemovePlayer(p)}
            />
          ))}
        </div>
      )}

      <div className="db-tacticals">
        <h3>Tacticals ({tacSlotsUsed}/{TACTICAL_CAP})</h3>
        <div className="tac-pool">
          {tacticals.map((tac) => {
            const isPicked = tacPicks.some((t) => t.id === tac.id)
            const wouldExceed = !isPicked && tacSlotsUsed + tac.slots > TACTICAL_CAP
            return (
              <div key={tac.id} className="db-tac-entry">
                <TacticCard
                  card={tac}
                  size={80}
                  onClick={() => {
                    if (isPicked) handleRemoveTactical(tac)
                    else handleAddTactical(tac)
                  }}
                  className={isPicked ? 'selected' : wouldExceed ? 'unaffordable' : ''}
                />
                <button
                  type="button"
                  className="db-info-btn"
                  onClick={(e) => { e.stopPropagation(); setModalCard(tac) }}
                >
                  ℹ
                </button>
              </div>
            )
          })}
        </div>
        {tacPicks.length > 0 && (
          <div className="db-tac-picks">
            {tacPicks.map((t) => (
              <PickRow
                key={t.id}
                rating={t.cost}
                name={t.name}
                slots={t.slots}
                isTactic
                onRemove={() => handleRemoveTactical(t)}
              />
            ))}
          </div>
        )}
      </div>

      <FillWithCommons onFill={handleFillCommons} disabled={picks.length === 0} />

      <Button
        variant="gold"
        size="big"
        onClick={handleConfirm}
        disabled={!canConfirm}
      >
        {isOverBudget ? 'Over budget!' : `Confirm Squad (${picks.length} picks)`}
      </Button>

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
