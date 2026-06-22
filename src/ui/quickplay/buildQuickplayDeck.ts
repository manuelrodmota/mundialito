/**
 * Implements the §17 buildDeck contract as a pure UI-side helper.
 *
 * Engine does NOT export buildDeck — this module is the authoritative deck
 * assembly function for Quickplay (and the future run XI builder via the
 * exported parameter types).
 */

import type { Card, PlayerCard, TacticalCard } from '../../engine/types'
import type { Rng } from '../../engine/rng'
import { HAND_SIZE } from '../../engine/constants'

export interface BuildQuickplayDeckInput {
  /** Premium (non-common) player picks chosen by the user. */
  premiumPicks: PlayerCard[]
  /** Tactical picks chosen by the user. */
  tacticalPicks: TacticalCard[]
  captainId: string
  /** Common player pool to sample the bench from. */
  commonPool: PlayerCard[]
  /** Total roster size (premiums + commons). Default 16 for Quickplay. */
  rosterSize?: number
  /** Max premium slots. Default 20 for Quickplay. */
  playerBudget?: number
  /** Max tactical slots. Default 3 for Quickplay. */
  tacticalCap?: number
  rng: Rng
}

export interface BuildQuickplayDeckResult {
  deck: Card[]
  captainId: string
}

const DEFAULT_ROSTER_SIZE = 16
const DEFAULT_PLAYER_BUDGET = 20
const DEFAULT_TACTICAL_CAP = 3

/**
 * Minimum common ("gray") players in any deck. GDD §134/§139: commons are the *infinite
 * sustain engine* — premium players lock once-per-half, so once your stars are spent the hand
 * must still refill to HAND_SIZE (5) and field a lineup. The builder's old `rosterSize − premiums`
 * fill let a premium-heavy pick (e.g. the Run's 10-slot budget spent on 10 Rares) leave just 1
 * common, which broke two things the user hit: (1) opening hands were almost all stars — the
 * deck deals the whole star core before any grays — and (2) once those stars locked, the draw
 * pile couldn't reach 5, dealing short 4-card hands in the later rounds.
 *
 * We floor the bench at a full hand (HAND_SIZE) plus a 3-card reserve = 8. That guarantees a
 * gray can always be drawn alongside the stars (so you can build lane synergy from round 1) and
 * that the pile always refills to 5 even with every premium locked, while still leaving fielding
 * choices each round. For premium-heavy decks this pushes the deck a little past rosterSize — the
 * extra commons are bench depth, not part of the XI. It's a §15 tuning knob.
 */
const MIN_BENCH_COMMONS = HAND_SIZE + 3

/**
 * Assembles a Quickplay deck: validates premium picks against the budget,
 * samples random commons to fill remaining roster spots, appends tactical picks.
 *
 * Deterministic given the same Rng state — never calls Math.random().
 */
export function buildQuickplayDeck(input: BuildQuickplayDeckInput): BuildQuickplayDeckResult {
  const {
    premiumPicks,
    tacticalPicks,
    captainId,
    commonPool,
    rosterSize = DEFAULT_ROSTER_SIZE,
    playerBudget = DEFAULT_PLAYER_BUDGET,
    tacticalCap = DEFAULT_TACTICAL_CAP,
    rng,
  } = input

  const commonInPremiums = premiumPicks.find((c) => c.rarity === 'common')
  if (commonInPremiums) {
    throw new Error(
      `Common card "${commonInPremiums.id}" cannot be hand-picked as a premium pick`,
    )
  }

  const totalPremiumSlots = premiumPicks.reduce((sum, c) => sum + c.slots, 0)
  if (totalPremiumSlots > playerBudget) {
    throw new Error(
      `Premium picks exceed slot budget: ${totalPremiumSlots} > ${playerBudget}`,
    )
  }

  if (tacticalPicks.length > tacticalCap) {
    throw new Error(
      `Tactical picks exceed cap: ${tacticalPicks.length} > ${tacticalCap}`,
    )
  }

  const premiumIds = new Set(premiumPicks.map((c) => c.id))
  if (!premiumIds.has(captainId)) {
    const allIds = new Set([...premiumIds, ...commonPool.map((c) => c.id)])
    if (!allIds.has(captainId)) {
      throw new Error(`captainId "${captainId}" not found in any player pool`)
    }
  }

  const commonsNeeded = Math.max(MIN_BENCH_COMMONS, rosterSize - premiumPicks.length)
  const eligibleCommons = commonPool.filter((c) => c.rarity === 'common')
  const shuffledCommons = rng.shuffle(eligibleCommons)
  const benchCommons = shuffledCommons.slice(0, commonsNeeded)

  const deck: Card[] = [...premiumPicks, ...benchCommons, ...tacticalPicks]

  return { deck, captainId }
}
