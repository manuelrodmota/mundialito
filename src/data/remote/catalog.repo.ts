/**
 * Collectible catalog (WCC-044/045). Loads every player as a PlayerCard carrying its
 * durable `cardId` (= player_ratings.id), bucketed by rarity and indexed by id. Cached
 * for the session — the box engine draws from the buckets; the collection reads byId.
 */

import { getSupabaseClient } from './client'
import { ratingRowToPlayerCard } from './mappers'
import type { PlayerCard, Rarity } from '../../engine/types'

export interface Catalog {
  byId: Map<number, PlayerCard>
  buckets: Record<Rarity, PlayerCard[]>
}

const PAGE = 1000

async function loadCatalog(): Promise<Catalog> {
  const sb = getSupabaseClient()
  const byId = new Map<number, PlayerCard>()
  const buckets: Record<Rarity, PlayerCard[]> = { common: [], rare: [], epic: [], legendary: [] }
  const seen = new Map<string, number>()

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('player_ratings')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      const card = ratingRowToPlayerCard(row, seen)
      if (card.cardId == null) continue
      byId.set(card.cardId, card)
      buckets[card.rarity].push(card)
    }
    if (data.length < PAGE) break
  }

  return { byId, buckets }
}

let cache: Promise<Catalog> | null = null

/** The full catalog, loaded once and cached for the session. */
export function getCatalog(): Promise<Catalog> {
  if (!cache) {
    cache = loadCatalog().catch((err) => {
      cache = null // allow retry after a failed load
      throw err
    })
  }
  return cache
}
