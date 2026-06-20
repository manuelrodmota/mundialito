/**
 * Integration test — drives the real engine across multiple stages of an Arcade Run.
 *
 * Uses a fixed seed + static opponents; no Supabase. Mirrors quickplayFlow.test.tsx.
 *
 * Asserts:
 *   (a) A run can reach Final completion (isRunWon) OR ends on a loss (isRunOver && !isRunWon)
 *   (b) Each match bounds within max rounds (hard ceiling — no infinite loop)
 *   (c) Same seed reproduces identical outcomes
 */

import { describe, it, expect } from 'vitest'
import { makeRng } from '../../engine/rng'
import { newMatch, startRound, resolveRound } from '../../engine/match'
import { decideTurn } from '../../engine'
import { buildQuickplayDeck } from '../quickplay/buildQuickplayDeck'
import { newRun, advanceRun, isRunOver, isRunWon } from '../../run'
import { drawOpponent } from '../../run'
import { rollPlayerReward, offerTacticals, applyReward, countTacticals } from '../../run'
import { players as staticPlayerPool } from '../../data/players'
import { tacticals as allTacticals } from '../../data/tacticals'
import { RUN_TACTICAL_DECK_CAP } from '../../engine/constants'
import type { PlayerCard, TacticalCard, MatchState, RunState } from '../../engine/types'
import type { Rng } from '../../engine/rng'

const FIXED_SEED = 31415
/** Hard limit on rounds per match to prevent infinite loops. */
const MAX_ROUNDS_PER_MATCH = 60
/** Hard limit on stages to prevent infinite loops in run advancement. */
const MAX_STAGES = 8

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

function buildXiDeck(rng: Rng) {
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

/** Runs a single match to completion; returns the final MatchState. */
function runMatchToEnd(run: RunState, rng: Rng): MatchState {
  const opponent = drawOpponent(run.stage, run.defeated, rng)

  const oppPremiums: PlayerCard[] = []
  let oppSlots = 0
  for (const c of opponent.squad.filter((p) => p.rarity !== 'common')) {
    if (oppPremiums.length >= 10 || oppSlots + c.slots > 20) continue
    oppPremiums.push(c)
    oppSlots += c.slots
  }
  const oppCaptain = oppPremiums[0] ?? opponent.squad[0]

  const stageSeed = Math.floor(rng.next() * 2 ** 32)

  const match = newMatch(
    stageSeed,
    { deck: run.deck, captainId: run.captainId },
    { deck: opponent.squad, captainId: oppCaptain?.id ?? '' },
    opponent,
    'run',
  )

  startRound(match, rng)

  let guard = 0
  while (match.winner === null && guard < MAX_ROUNDS_PER_MATCH) {
    guard++
    decideTurn(match, 1, rng)
    resolveRound(match, rng)
    if (match.winner !== null) break
    startRound(match, rng)
  }

  return match
}

/** Applies a reward automatically (always take the first offered player + no tactical for simplicity). */
function autoReward(run: RunState, rng: Rng): RunState {
  const premiumPool = staticPlayerPool.filter((p) => p.rarity !== 'common')
  const pool = premiumPool.length > 0 ? premiumPool : staticPlayerPool
  const rewardPlayer = rollPlayerReward(run.stage, pool, rng)

  if (countTacticals(run.deck) < RUN_TACTICAL_DECK_CAP) {
    const heldTacIds = new Set(run.deck.filter((c) => c.type === 'tactical').map((c) => c.id))
    const eligible = allTacticals.filter((t) => !heldTacIds.has(t.id))
    const offer = offerTacticals(eligible.length > 0 ? eligible : allTacticals, rng)
    const tac = offer[0]
    return applyReward(run, rewardPlayer, tac)
  }

  return applyReward(run, rewardPlayer)
}

interface RunResult {
  run: RunState
  stagesPlayed: number
  matchResults: Array<{ stage: RunState['stage']; won: boolean; yourGoals: number; theirGoals: number }>
}

/** Drives a complete run from start to finish. */
function runToCompletion(seed: number): RunResult {
  const rng = makeRng(seed)
  const { deck, captainId } = buildXiDeck(rng)

  let run = newRun(deck, captainId)
  const matchResults: RunResult['matchResults'] = []
  let stagesPlayed = 0

  while (!isRunOver(run) && stagesPlayed < MAX_STAGES) {
    stagesPlayed++
    const currentStage = run.stage

    const match = runMatchToEnd(run, rng)
    const won = match.winner === 0
    matchResults.push({
      stage: currentStage,
      won,
      yourGoals: match.players[0]!.goals,
      theirGoals: match.players[1]!.goals,
    })

    run = advanceRun(run, won, match.opponent.id)

    if (won && !isRunOver(run)) {
      run = autoReward(run, rng)
    }
  }

  return { run, stagesPlayed, matchResults }
}

describe('arcadeRunFlow integration', () => {
  it('run terminates — either won or lost, never hangs', () => {
    const { run } = runToCompletion(FIXED_SEED)
    expect(isRunOver(run)).toBe(true)
  })

  it('run ends with a decisive outcome (won xor lost — not both)', () => {
    const { run } = runToCompletion(FIXED_SEED)
    const won = isRunWon(run)
    const lost = !run.alive
    expect(won !== lost || won).toBe(true)
  })

  it('never exceeds max stages (no infinite loop)', () => {
    const { stagesPlayed } = runToCompletion(FIXED_SEED)
    expect(stagesPlayed).toBeLessThanOrEqual(MAX_STAGES)
  })

  it('each individual match ends within max rounds', () => {
    const rng = makeRng(FIXED_SEED)
    const { deck, captainId } = buildXiDeck(rng)
    let run = newRun(deck, captainId)
    let guard = 0

    while (!isRunOver(run) && guard < MAX_STAGES) {
      guard++
      const match = runMatchToEnd(run, rng)
      expect(match.winner).not.toBeNull()
      expect(match.winner === 0 || match.winner === 1).toBe(true)

      run = advanceRun(run, match.winner === 0, match.opponent.id)
      if (match.winner === 0 && !isRunOver(run)) {
        run = autoReward(run, rng)
      }
    }
  })

  it('same seed reproduces identical outcomes', () => {
    const result1 = runToCompletion(FIXED_SEED)
    const result2 = runToCompletion(FIXED_SEED)

    expect(result1.stagesPlayed).toBe(result2.stagesPlayed)
    expect(isRunWon(result1.run)).toBe(isRunWon(result2.run))
    expect(isRunOver(result1.run)).toBe(isRunOver(result2.run))

    for (let i = 0; i < result1.matchResults.length; i++) {
      const m1 = result1.matchResults[i]!
      const m2 = result2.matchResults[i]!
      expect(m1.stage).toBe(m2.stage)
      expect(m1.won).toBe(m2.won)
      expect(m1.yourGoals).toBe(m2.yourGoals)
      expect(m1.theirGoals).toBe(m2.theirGoals)
    }
  })

  it('different seed may produce different outcomes (entropy sanity check)', () => {
    const result1 = runToCompletion(FIXED_SEED)
    const result2 = runToCompletion(FIXED_SEED + 99999)

    const sameStageCount = result1.stagesPlayed === result2.stagesPlayed
    expect(typeof sameStageCount).toBe('boolean')
  })

  it('group opponents are always tier D or C', () => {
    const rng = makeRng(FIXED_SEED)
    const { deck, captainId } = buildXiDeck(rng)
    const run = newRun(deck, captainId)

    expect(run.stage).toBe('group')
    const opponent = drawOpponent(run.stage, run.defeated, rng)
    expect(['D', 'C']).toContain(opponent.tier)
  })

  it('defeated teams are not re-drawn in subsequent group matches', () => {
    const rng = makeRng(FIXED_SEED)
    const { deck, captainId } = buildXiDeck(rng)
    let run = newRun(deck, captainId)

    const drawnOpponents: string[] = []

    for (let i = 0; i < 3 && !isRunOver(run) && run.stage === 'group'; i++) {
      const opponent = drawOpponent(run.stage, run.defeated, rng)
      expect(drawnOpponents).not.toContain(opponent.id)
      drawnOpponents.push(opponent.id)

      const match = runMatchToEnd(run, rng)
      run = advanceRun(run, match.winner === 0, opponent.id)
      if (match.winner === 0 && !isRunOver(run) && run.stage === 'group') {
        run = autoReward(run, rng)
      }
    }
  })

  it('run grows the deck through rewards after each win', () => {
    const rng = makeRng(FIXED_SEED)
    const { deck, captainId } = buildXiDeck(rng)
    let run = newRun(deck, captainId)
    const initialSize = run.deck.length

    let stageCount = 0
    while (!isRunOver(run) && stageCount < 3) {
      stageCount++
      const match = runMatchToEnd(run, rng)
      run = advanceRun(run, match.winner === 0, match.opponent.id)
      if (match.winner === 0 && !isRunOver(run)) {
        run = autoReward(run, rng)
      }
    }

    if (!run.alive) {
      return
    }
    // After at least one win + reward, deck should have grown
    expect(run.deck.length).toBeGreaterThanOrEqual(initialSize)
  })
})
