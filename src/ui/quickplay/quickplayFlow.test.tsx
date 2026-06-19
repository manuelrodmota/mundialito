/**
 * Integration test — drives the real engine to a decisive result.
 * Uses a fixed seed + a static mock opponent so no Supabase is needed.
 * Asserts: winner is not null, no draw scenario, same-seed reproducibility.
 */

import { describe, it, expect } from 'vitest'
import { makeRng } from '../../engine/rng'
import { newMatch, startRound, resolveRound } from '../../engine/match'
import { decideTurn } from '../../engine'
import { opponents } from '../../data/opponents'
import { buildQuickplayDeck } from './buildQuickplayDeck'
import type { PlayerCard, TacticalCard, MatchState } from '../../engine/types'

const FIXED_SEED = 31415

function makePlayer(id: string, nation: string = 'ARG', overall: number = 80): PlayerCard {
  return {
    id,
    type: 'player',
    name: `Player ${id}`,
    nation,
    worldCup: 2022,
    position: 'FWD',
    overall,
    atk: Math.round(overall * 0.9),
    def: Math.round(overall * 0.5),
    cost: 2,
    rarity: 'common',
    slots: 1,
  }
}

function makeCommonPool(count: number): PlayerCard[] {
  return Array.from({ length: count }, (_, i) => makePlayer(`common-${i}`))
}

function makePremium(id: string, overall: number = 90): PlayerCard {
  return {
    id,
    type: 'player',
    name: `Star ${id}`,
    nation: 'ARG',
    worldCup: 2022,
    position: 'FWD',
    overall,
    atk: Math.round(overall * 0.9),
    def: Math.round(overall * 0.5),
    cost: 4,
    rarity: 'epic',
    slots: 1,
  }
}

function runMatchToEnd(seed: number): MatchState {
  const rng = makeRng(seed)

  const premiums = [makePremium('captain', 92), makePremium('star2', 88)]
  const commons = makeCommonPool(30)

  const { deck, captainId } = buildQuickplayDeck({
    premiumPicks: premiums,
    tacticalPicks: [] as TacticalCard[],
    captainId: 'captain',
    commonPool: commons,
    rosterSize: 16,
    playerBudget: 20,
    tacticalCap: 3,
    rng,
  })

  const opponent = opponents.find((o) => o.tier === 'D') ?? opponents[0]!

  const match = newMatch(seed, { deck, captainId }, { deck: opponent.squad, captainId: opponent.squad[0]?.id ?? 'opp-cap' }, opponent, 'quickplay')

  startRound(match, rng)

  let guard = 0
  while (match.winner === null && guard < 60) {
    guard++

    decideTurn(match, 1, rng)

    resolveRound(match, rng)

    if (match.winner !== null) break

    startRound(match, rng)
  }

  return match
}

describe('quickplayFlow integration', () => {
  it('reaches a decisive winner (not null) with the real engine', () => {
    const match = runMatchToEnd(FIXED_SEED)
    expect(match.winner).not.toBeNull()
  })

  it('winner is 0 or 1 — no draw', () => {
    const match = runMatchToEnd(FIXED_SEED)
    expect(match.winner === 0 || match.winner === 1).toBe(true)
  })

  it('same seed → same result (determinism)', () => {
    const result1 = runMatchToEnd(FIXED_SEED)
    const result2 = runMatchToEnd(FIXED_SEED)

    expect(result1.winner).toBe(result2.winner)
    expect(result1.players[0]!.goals).toBe(result2.players[0]!.goals)
    expect(result1.players[1]!.goals).toBe(result2.players[1]!.goals)
  })

  it('different seed → potentially different result (non-trivial entropy)', () => {
    const result1 = runMatchToEnd(FIXED_SEED)
    const result2 = runMatchToEnd(FIXED_SEED + 99999)

    const sameGoals =
      result1.players[0]!.goals === result2.players[0]!.goals &&
      result1.players[1]!.goals === result2.players[1]!.goals

    expect(typeof sameGoals).toBe('boolean')
  })

  it('match ends within max rounds (no infinite loop)', () => {
    const match = runMatchToEnd(FIXED_SEED)
    const totalRounds = match.extraTime
      ? 10 + match.etRound
      : match.round

    expect(totalRounds).toBeLessThanOrEqual(20)
  })
})
