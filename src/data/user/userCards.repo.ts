/** Collection repository (WCC-044/052) — owned cards + summary stats. */

import { getSupabaseClient } from '../remote/client'

export interface CollectionStats {
  total: number
  legendaries: number
}

/** Distinct owned players + how many are legendary (overall ≥ 92). */
export async function fetchCollectionStats(): Promise<CollectionStats> {
  const sb = getSupabaseClient()

  const { count: total, error: totalErr } = await sb
    .from('user_cards')
    .select('card_id', { count: 'exact', head: true })
  if (totalErr) throw totalErr

  const { count: legendaries, error: legErr } = await sb
    .from('user_cards')
    .select('card_id, player_ratings!inner(overall)', { count: 'exact', head: true })
    .gte('player_ratings.overall', 92)
  if (legErr) throw legErr

  return { total: total ?? 0, legendaries: legendaries ?? 0 }
}

/** Owned card counts keyed by cardId (= player_ratings.id) — for new/duplicate annotation. */
export async function fetchOwnedCounts(): Promise<Map<number, number>> {
  const { data, error } = await getSupabaseClient().from('user_cards').select('card_id, count')
  if (error) throw error
  const map = new Map<number, number>()
  for (const row of data ?? []) map.set(row.card_id, row.count)
  return map
}
