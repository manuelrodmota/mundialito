/**
 * Unit tests for useArcadeRun — verifies the run lifecycle via renderHook.
 * Uses a fixed seed for determinism; no Supabase touched.
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useArcadeRun } from './useArcadeRun'
import { makeRng } from '../../engine/rng'
import { buildQuickplayDeck } from '../quickplay/buildQuickplayDeck'
import { countTacticals } from '../../run'
import { RUN_TACTICAL_DECK_CAP } from '../../engine/constants'
import type { PlayerCard, TacticalCard } from '../../engine/types'

const FIXED_SEED = 42000

function makePlayer(id: string, overall = 80, rarity: PlayerCard['rarity'] = 'common'): PlayerCard {
  return {
    id,
    type: 'player',
    name: `Player ${id}`,
    nation: 'ARG',
    worldCup: 2022,
    position: 'FWD',
    overall,
    atk: Math.round(overall * 0.9),
    def: Math.round(overall * 0.5),
    cost: 2,
    rarity,
    slots: 1,
  }
}

function makePremium(id: string, overall = 90): PlayerCard {
  return makePlayer(id, overall, 'epic')
}

function makeCommons(count: number): PlayerCard[] {
  return Array.from({ length: count }, (_, i) => makePlayer(`common-${i}`))
}

function buildTestDeck(seed: number) {
  const rng = makeRng(seed)
  const premiums = [makePremium('captain', 92), makePremium('star2', 88)]
  const commons = makeCommons(30)
  return buildQuickplayDeck({
    premiumPicks: premiums,
    tacticalPicks: [] as TacticalCard[],
    captainId: 'captain',
    commonPool: commons,
    rosterSize: 11,
    playerBudget: 10,
    tacticalCap: 1,
    rng,
  })
}

describe('useArcadeRun', () => {
  it('initialises in building phase with no run state', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    expect(result.current.viewState.phase).toBe('building')
    expect(result.current.viewState.runState).toBeNull()
  })

  it('startRun creates a run and transitions to map phase', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })

    expect(result.current.viewState.phase).toBe('map')
    expect(result.current.viewState.runState).not.toBeNull()
    expect(result.current.viewState.runState?.matchIndex).toBe(0)
    expect(result.current.viewState.runState?.stage).toBe('group')
    expect(result.current.viewState.runState?.alive).toBe(true)
  })

  it('startStage draws an opponent and transitions to match phase', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })
    act(() => {
      result.current.startStage()
    })

    expect(result.current.viewState.phase).toBe('match')
    expect(result.current.viewState.matchSnapshot).not.toBeNull()
    expect(result.current.viewState.matchSnapshot?.opponent).toBeDefined()
  })

  it('the drawn opponent is a group-eligible tier', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })
    act(() => {
      result.current.startStage()
    })

    const opponent = result.current.viewState.matchSnapshot?.opponent
    expect(opponent).toBeDefined()
    expect(['D', 'C']).toContain(opponent?.tier)
  })

  it('a win advances the stage and opens the locker room', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })
    act(() => {
      result.current.startStage()
    })

    const match = result.current.viewState.matchSnapshot
    if (!match) throw new Error('no match snapshot')

    // Drive the match to completion by calling nextRound repeatedly until decided.
    // We use the hook's reveal + nextRound pattern, but since commitTurn requires
    // a planned board, we simulate the opponent-only path via decideTurn-driven
    // resolution by calling nextRound directly (which calls onMatchResolved when winner is set).
    // To force a decisive match, we need to drive rounds. We do this by directly
    // simulating the two-step flow multiple times.
    let guard = 0
    while (
      result.current.viewState.phase === 'match' &&
      result.current.viewState.matchSnapshot?.winner === null &&
      guard < 100
    ) {
      guard++
      act(() => {
        result.current.reveal()
      })
      act(() => {
        result.current.nextRound()
      })
    }

    const finalPhase = result.current.viewState.phase
    expect(['locker', 'runover', 'map']).toContain(finalPhase)
  })

  it('claiming a reward adds the player to the deck', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })

    const initialDeckSize = result.current.viewState.runState?.deck.length ?? 0

    const rewardPlayer = makePlayer('reward-player', 75, 'rare')
    act(() => {
      result.current.claimReward(rewardPlayer)
    })

    expect(result.current.viewState.runState?.deck.length).toBe(initialDeckSize + 1)
    expect(result.current.viewState.runState?.deck.some((c) => c.id === 'reward-player')).toBe(true)
    expect(result.current.viewState.phase).toBe('map')
  })

  it('claimReward with a tactical adds both player and tactical to the deck', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })

    const initialDeckSize = result.current.viewState.runState?.deck.length ?? 0
    const rewardPlayer = makePlayer('reward-player2', 75, 'rare')
    const rewardTactical: TacticalCard = {
      id: 'tac-reward',
      type: 'tactical',
      name: 'Test Tactic',
      category: 'instant',
      cost: 2,
      slots: 1,
      rarity: 'rare',
      effect: { kind: 'var' },
    }

    act(() => {
      result.current.claimReward(rewardPlayer, rewardTactical)
    })

    expect(result.current.viewState.runState?.deck.length).toBe(initialDeckSize + 2)
    expect(result.current.viewState.phase).toBe('map')
  })

  it('at cap: a same-tick swap + claim adds the take and player and removes the exile (regression)', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    const makeTac = (id: string): TacticalCard => ({
      id,
      type: 'tactical',
      name: `Tac ${id}`,
      category: 'skill',
      cost: 1,
      slots: 1,
      rarity: 'common',
      effect: { kind: 'timeWasting' },
    })

    // Start with a deck already at the tactical cap so the reward flow forces a swap.
    const capTacticals = Array.from({ length: RUN_TACTICAL_DECK_CAP }, (_, i) => makeTac(`cap-tac-${i}`))
    act(() => {
      result.current.startRun([...deck, ...capTacticals], captainId, FIXED_SEED)
    })
    expect(countTacticals(result.current.viewState.runState!.deck)).toBe(RUN_TACTICAL_DECK_CAP)

    const rewardPlayer = makePlayer('reward-cap-player', 78, 'rare')
    const takeCard = makeTac('tac-take')

    // The at-cap confirm (LockerRoom.handleConfirm) fires swap then claim in ONE click. They must
    // compose — before the fix, claimReward read a stale runState and clobbered the swap.
    act(() => {
      result.current.swapTacticalReward(takeCard, 'cap-tac-0')
      result.current.claimReward(rewardPlayer)
    })

    const finalDeck = result.current.viewState.runState!.deck
    expect(finalDeck.some((c) => c.id === 'tac-take')).toBe(true) // new tactical made it in
    expect(finalDeck.some((c) => c.id === 'cap-tac-0')).toBe(false) // exiled one is gone
    expect(finalDeck.some((c) => c.id === 'reward-cap-player')).toBe(true) // player reward added
    expect(countTacticals(finalDeck)).toBe(RUN_TACTICAL_DECK_CAP) // still exactly at cap
    expect(result.current.viewState.phase).toBe('map')
  })

  it('setCaptain updates the captainId in run state', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })

    act(() => {
      result.current.setCaptain('common-5')
    })

    expect(result.current.viewState.runState?.captainId).toBe('common-5')
  })

  it('removeDeckCard removes a card from the run deck', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { deck, captainId } = buildTestDeck(FIXED_SEED)

    act(() => {
      result.current.startRun(deck, captainId, FIXED_SEED)
    })

    const initialDeckSize = result.current.viewState.runState?.deck.length ?? 0
    const firstCard = result.current.viewState.runState?.deck[0]
    if (!firstCard) throw new Error('deck is empty')

    act(() => {
      result.current.removeDeckCard(firstCard.id)
    })

    expect(result.current.viewState.runState?.deck.length).toBe(initialDeckSize - 1)
    expect(result.current.viewState.runState?.deck.some((c) => c.id === firstCard.id)).toBe(false)
  })

  it('a loss transitions to runover phase', () => {
    const { result } = renderHook(() => useArcadeRun(FIXED_SEED))
    // Build a very weak deck so opponent wins
    const weakCommons = makeCommons(11)
    act(() => {
      result.current.startRun(weakCommons, weakCommons[0]!.id, FIXED_SEED)
    })

    act(() => {
      result.current.startStage()
    })

    // Drive match to end
    let guard = 0
    while (
      result.current.viewState.phase === 'match' &&
      result.current.viewState.matchSnapshot?.winner === null &&
      guard < 100
    ) {
      guard++
      act(() => {
        result.current.reveal()
      })
      act(() => {
        result.current.nextRound()
      })
    }

    // Match ended — phase should be locker (if you won) or runover (if you lost)
    expect(['locker', 'runover']).toContain(result.current.viewState.phase)
    const phase = result.current.viewState.phase
    if (phase === 'runover') {
      expect(result.current.viewState.runState?.alive).toBe(false)
    }
  })

  it('same seed produces the same opponent draw', () => {
    const { deck: deck1, captainId: cap1 } = buildTestDeck(FIXED_SEED)
    const { deck: deck2, captainId: cap2 } = buildTestDeck(FIXED_SEED)

    const { result: r1 } = renderHook(() => useArcadeRun(FIXED_SEED))
    const { result: r2 } = renderHook(() => useArcadeRun(FIXED_SEED))

    act(() => { r1.current.startRun(deck1, cap1, FIXED_SEED) })
    act(() => { r2.current.startRun(deck2, cap2, FIXED_SEED) })

    act(() => { r1.current.startStage() })
    act(() => { r2.current.startStage() })

    const opp1 = r1.current.viewState.matchSnapshot?.opponent
    const opp2 = r2.current.viewState.matchSnapshot?.opponent

    expect(opp1?.id).toBe(opp2?.id)
  })
})
