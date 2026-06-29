/** Box locker repository (WCC-051) — the user's unopened boxes + opened count. */

import { getSupabaseClient } from '../remote/client'
import type { BoxTier } from '../../meta/boxes'

export interface UnopenedBox {
  id: number
  tier: BoxTier
  source: string
}

/** The signed-in user's unopened boxes, oldest first. */
export async function fetchUnopenedBoxes(): Promise<UnopenedBox[]> {
  const { data, error } = await getSupabaseClient()
    .from('user_boxes')
    .select('id, tier, source')
    .eq('opened', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, tier: r.tier as BoxTier, source: r.source }))
}

/** Total boxes the user has opened (a profile stat). */
export async function countOpenedBoxes(): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from('user_boxes')
    .select('id', { count: 'exact', head: true })
    .eq('opened', true)
  if (error) throw error
  return count ?? 0
}

/** Grant boxes to the user's locker (e.g. run-end rewards). Returns the created rows. */
export async function addBoxes(
  tiers: BoxTier[],
  source: 'welcome' | 'level' | 'run',
): Promise<UnopenedBox[]> {
  if (tiers.length === 0) return []
  const sb = getSupabaseClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []
  const rows = tiers.map((tier) => ({ user_id: user.id, tier, source }))
  const { data, error } = await sb.from('user_boxes').insert(rows).select('id, tier, source')
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, tier: r.tier as BoxTier, source: r.source }))
}

/** Mark a box opened and grant its cards (atomic, via the open_box RPC). */
export async function persistOpenBox(boxId: number, cardIds: number[]): Promise<void> {
  const { error } = await getSupabaseClient().rpc('open_box', {
    p_box_id: boxId,
    p_card_ids: cardIds,
  })
  if (error) throw error
}
