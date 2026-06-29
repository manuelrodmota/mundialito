/**
 * Box rolling engine (WCC-045). Pure + RNG-injected (pass `Math.random` in the app,
 * a seeded `makeRng(seed)` in tests). Ported from the design handoff `meta.jsx`.
 *
 * A box = 1 headliner + 4 filler, drawn against per-slot rarity tables (GDD §3).
 * The welcome Champions box forces a Legendary headliner AND offers pick-1-of-3.
 */

import type { PlayerCard, Rarity } from '../engine/types'
import type { Rng } from '../engine/rng'
import type { BoxTier } from './boxes'

type RarityOdds = Partial<Record<Rarity, number>>
interface BoxDrops {
  h: RarityOdds
  f: RarityOdds
}

/** Per-slot drop tables; each column sums to 100. */
export const DROP_TABLES: Record<BoxTier, BoxDrops> = {
  group: {
    h: { rare: 83, epic: 15, legendary: 2 },
    f: { common: 82, rare: 16, epic: 1.7, legendary: 0.3 },
  },
  knockout: {
    h: { rare: 58, epic: 37, legendary: 5 },
    f: { common: 57, rare: 33, epic: 9, legendary: 1 },
  },
  champions: {
    h: { epic: 72, legendary: 28 },
    f: { common: 26, rare: 42, epic: 28, legendary: 4 },
  },
  trophy: {
    h: { legendary: 100 },
    f: { common: 26, rare: 42, epic: 28, legendary: 4 },
  },
}

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary']

export type RarityBuckets = Record<Rarity, PlayerCard[]>

export interface OpenedBox {
  tier: BoxTier
  headlinerRarity: Rarity
  headliner: PlayerCard | null
  /** Present only for a pick-1-of-3 box (the welcome Champions box). */
  headlinerChoices: PlayerCard[] | null
  allowPick: boolean
  filler: PlayerCard[]
}

export interface OpenBoxOpts {
  forceLegendaryHeadliner?: boolean
}

function rollRarity(table: RarityOdds, rng: Rng): Rarity {
  const r = rng.next() * 100
  let acc = 0
  for (const k of RARITY_ORDER) {
    const v = table[k]
    if (v == null) continue
    acc += v
    if (r <= acc) return k
  }
  const defined = RARITY_ORDER.filter((k) => table[k] != null)
  return defined[defined.length - 1] ?? 'common'
}

/** Draw n distinct players of a rarity (falls back to commons / repeats for a tiny pool). */
function drawPlayers(
  buckets: RarityBuckets,
  rarity: Rarity,
  n: number,
  exclude: Set<number>,
  rng: Rng,
): PlayerCard[] {
  const bag = buckets[rarity]?.length ? buckets[rarity] : buckets.common
  const out: PlayerCard[] = []
  let guard = 0
  while (out.length < n && guard < 400) {
    guard++
    const p = bag[Math.floor(rng.next() * bag.length)]
    if (!p) break
    const id = p.cardId ?? -1
    if (exclude.has(id)) continue
    exclude.add(id)
    out.push(p)
  }
  while (out.length < n && bag.length) out.push(bag[Math.floor(rng.next() * bag.length)]) // tiny-pool fallback
  return out
}

/** Open one box → 1 headliner (or 3 choices) + 4 filler. */
export function openBox(
  tier: BoxTier,
  buckets: RarityBuckets,
  rng: Rng,
  opts: OpenBoxOpts = {},
): OpenedBox {
  const table = DROP_TABLES[tier] ?? DROP_TABLES.group
  const allowPick = !!opts.forceLegendaryHeadliner
  const headlinerRarity: Rarity = allowPick ? 'legendary' : rollRarity(table.h, rng)
  const exclude = new Set<number>()

  let headliner: PlayerCard | null = null
  let headlinerChoices: PlayerCard[] | null = null
  if (allowPick) {
    headlinerChoices = drawPlayers(buckets, headlinerRarity, 3, exclude, rng)
  } else {
    headliner = drawPlayers(buckets, headlinerRarity, 1, exclude, rng)[0] ?? null
  }

  const filler: PlayerCard[] = []
  for (let i = 0; i < 4; i++) {
    const fr = rollRarity(table.f, rng)
    const drawn = drawPlayers(buckets, fr, 1, exclude, rng)[0]
    if (drawn) filler.push(drawn)
  }

  return { tier, headlinerRarity, headliner, headlinerChoices, allowPick, filler }
}

/** Welcome bundle: 2 Group + 1 Knockout + 1 Champions (guaranteed-Legendary, pick-1-of-3). */
export interface WelcomeBoxSpec {
  tier: BoxTier
  forceLegendaryHeadliner?: boolean
}
export const WELCOME_BUNDLE: WelcomeBoxSpec[] = [
  { tier: 'group' },
  { tier: 'group' },
  { tier: 'knockout' },
  { tier: 'champions', forceLegendaryHeadliner: true },
]

export interface GrantResult {
  card: PlayerCard
  isNew: boolean
  copies: number
}

/** Annotate a set of pulled cards as new/duplicate against the owned counts (by cardId). */
export function grantCards(owned: Map<number, number>, cards: PlayerCard[]): GrantResult[] {
  const counts = new Map(owned)
  return cards.map((card) => {
    const id = card.cardId ?? -1
    const had = counts.get(id) ?? 0
    counts.set(id, had + 1)
    return { card, isNew: had === 0, copies: had + 1 }
  })
}
