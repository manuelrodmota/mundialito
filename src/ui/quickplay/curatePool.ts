/**
 * Assisted-mode helpers for the deck builder.
 *
 * The recommended position spread is NOT an arbitrary preference — it is derived
 * from the position synergies the match engine actually rewards
 * (`src/engine/synergies.ts` + the GK saveBonus in `effectiveStats.ts`):
 *
 *   GK  ≥ 1  → goalkeeper saveBonus suppresses opponent xG when fielded to defense
 *   DEF ≥ 3  → BACKLINE_BONUS_DEF  (+8 DEF)
 *   MID ≥ 2  → MIDFIELD_BONUS_STAMINA (+1 stamina)
 *   FWD ≥ 2  → STRIKE_BONUS_ATK   (+5 ATK)
 *
 * `SYNERGY_SPREAD` is therefore the smallest premium core whose positions unlock
 * every synergy at once (8 players). `recommendedSpread()` scales that baseline to
 * each mode's budget/roster so it works for Quickplay (20/16) and the leaner Arcade
 * Run XI builder (10/11) alike, degrading gracefully for any tighter parameters.
 */

import type { PlayerCard, Position } from '../../engine/types'

/** Premium-core position spread that unlocks every engine position synergy. */
export const SYNERGY_SPREAD: Record<Position, number> = {
  GK: 1,
  DEF: 3,
  MID: 2,
  FWD: 2,
}

/**
 * Order in which premium slots are allocated when the core is smaller than the
 * full synergy baseline. Tallies to exactly SYNERGY_SPREAD when fully consumed,
 * front-loading the highest-value foundations (a keeper, then a backline + strike
 * pairing) so a truncated core stays balanced rather than lopsided.
 */
const FILL_PRIORITY: Position[] = ['GK', 'DEF', 'FWD', 'DEF', 'MID', 'FWD', 'DEF', 'MID']

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD']

export interface SpreadParams {
  /** Total roster size including bench commons (premiums can't exceed this). */
  rosterSize: number
  /** Premium slot budget (each premium costs ≥1 slot, so this caps the core too). */
  playerBudget: number
}

/**
 * Recommended premium-core spread for the assisted builder, scaled to the mode.
 *
 * Returns counts per position summing to the affordable premium core. Capped at
 * the synergy baseline (8) because no engine synergy rewards going beyond it —
 * past the baseline the assisted view stops nagging and the player adds freely.
 */
export function recommendedSpread({ rosterSize, playerBudget }: SpreadParams): Record<Position, number> {
  const target = Math.max(0, Math.min(FILL_PRIORITY.length, rosterSize, playerBudget))
  const spread: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  for (let i = 0; i < target; i++) {
    spread[FILL_PRIORITY[i]]++
  }
  return spread
}

/**
 * Visual card tier by overall — MUST mirror colorTier() in the PlayerCard component
 * (gold ≥87 / purple 84-86 / blue ≤83). This is what the player actually sees as the
 * card colour, and it deliberately differs from the gameplay Rarity bands
 * (deriveRarity: epic ≥87 / rare ≥80). The assisted shortlist balances by what's on
 * screen — otherwise "rare" cards rated 84-86 read as purple and blue never surfaces.
 */
type VisualTier = 'gold' | 'purple' | 'blue'

function visualTier(overall: number): VisualTier {
  if (overall >= 87) return 'gold'
  if (overall >= 84) return 'purple'
  return 'blue'
}

/** Tiers richest-first (quota order) and cheapest-first (backfill, honouring "rest blue"). */
const TIER_ORDER: VisualTier[] = ['gold', 'purple', 'blue']
const BACKFILL_ORDER: VisualTier[] = ['blue', 'purple', 'gold']

/**
 * Target visual mix for a curated shortlist: a few gold, more purple, mostly blue
 * (~15% gold / ~35% purple / rest blue). Cheaper cards should dominate the suggestions
 * rather than a wall of unaffordable gold.
 */
const GOLD_SHARE = 0.15
const PURPLE_SHARE = 0.35

function valueCompare(a: PlayerCard, b: PlayerCard): number {
  return b.overall - a.overall || a.slots - b.slots || a.name.localeCompare(b.name)
}

/**
 * Curated candidates of a position, weighted toward cheaper (lower-rated) cards so the
 * shortlist reads ~1-2 gold, 3-4 purple, the rest blue rather than all gold. Buckets
 * are by VISUAL tier (card colour), each ranked by value; a per-tier quota guarantees
 * blue/purple a place, then leftover slots backfill cheapest-first. The final list is
 * value-sorted (best first). Pure + deterministic.
 */
export function curateByPosition(
  players: readonly PlayerCard[],
  position: Position,
  limit = 10,
): PlayerCard[] {
  const buckets: Record<VisualTier, PlayerCard[]> = { gold: [], purple: [], blue: [] }
  for (const p of players) {
    if (p.position === position) buckets[visualTier(p.overall)].push(p)
  }
  for (const t of TIER_ORDER) buckets[t].sort(valueCompare)

  // Quotas favouring cheaper tiers; blue absorbs the remainder ("rest blue").
  const goldQuota = Math.max(1, Math.round(limit * GOLD_SHARE))
  const purpleQuota = Math.max(1, Math.round(limit * PURPLE_SHARE))
  const quota: Record<VisualTier, number> = {
    gold: goldQuota,
    purple: purpleQuota,
    blue: Math.max(0, limit - goldQuota - purpleQuota),
  }

  const used: Record<VisualTier, number> = { gold: 0, purple: 0, blue: 0 }
  const result: PlayerCard[] = []

  // Fill each tier up to its quota.
  for (const t of TIER_ORDER) {
    while (used[t] < quota[t] && result.length < limit && buckets[t][used[t]]) {
      result.push(buckets[t][used[t]++])
    }
  }
  // Backfill leftover slots cheapest-first (a thin tier yields to more blue/purple).
  for (const t of BACKFILL_ORDER) {
    while (result.length < limit && buckets[t][used[t]]) {
      result.push(buckets[t][used[t]++])
    }
  }

  return result.sort(valueCompare)
}

export { POSITION_ORDER }
