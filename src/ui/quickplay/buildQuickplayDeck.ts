/**
 * Implements the §17 buildDeck contract as a pure UI-side helper.
 *
 * Engine does NOT export buildDeck — this module is the authoritative deck
 * assembly function for Quickplay (and the future run XI builder via the
 * exported parameter types).
 */

import type { Card, PlayerCard, TacticalCard } from '../../engine/types'
import type { Rng } from '../../engine/rng'

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

  const commonsNeeded = Math.max(0, rosterSize - premiumPicks.length)
  const eligibleCommons = commonPool.filter((c) => c.rarity === 'common')
  const shuffledCommons = rng.shuffle(eligibleCommons)
  const benchCommons = shuffledCommons.slice(0, commonsNeeded)

  const deck: Card[] = [...premiumPicks, ...benchCommons, ...tacticalPicks]

  return { deck, captainId }
}
