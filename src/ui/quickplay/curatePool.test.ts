import { describe, it, expect } from 'vitest'
import type { PlayerCard, Position } from '../../engine/types'
import { recommendedSpread, curateByPosition, SYNERGY_SPREAD } from './curatePool'

function player(over: Partial<PlayerCard> & { id: string; position: Position; overall: number }): PlayerCard {
  return {
    type: 'player',
    name: over.id,
    nation: 'Testland',
    worldCup: 2026,
    atk: over.overall,
    def: over.overall,
    cost: 2,
    rarity: 'rare',
    slots: 1,
    ...over,
  }
}

describe('recommendedSpread', () => {
  it('returns the full synergy baseline for Quickplay (20/16)', () => {
    expect(recommendedSpread({ rosterSize: 16, playerBudget: 20 })).toEqual(SYNERGY_SPREAD)
  })

  it('returns the full synergy baseline for the Arcade XI builder (10/11)', () => {
    // 8 premiums fit within both the 10-slot budget and the 11-man roster.
    expect(recommendedSpread({ rosterSize: 11, playerBudget: 10 })).toEqual(SYNERGY_SPREAD)
  })

  it('every position spread sums to a balanced core, never lopsided when truncated', () => {
    // Tight budget: should front-load keeper + backline/strike, not dump into one lane.
    const spread = recommendedSpread({ rosterSize: 3, playerBudget: 3 })
    expect(spread).toEqual({ GK: 1, DEF: 1, MID: 0, FWD: 1 })
  })

  it('always recommends a keeper first', () => {
    expect(recommendedSpread({ rosterSize: 1, playerBudget: 1 })).toEqual({ GK: 1, DEF: 0, MID: 0, FWD: 0 })
  })

  it('clamps to the tighter of roster size and budget', () => {
    const byRoster = recommendedSpread({ rosterSize: 2, playerBudget: 20 })
    const byBudget = recommendedSpread({ rosterSize: 20, playerBudget: 2 })
    expect(byRoster).toEqual(byBudget)
    expect(byRoster.GK + byRoster.DEF + byRoster.MID + byRoster.FWD).toBe(2)
  })

  it('never exceeds the synergy baseline even with huge budgets', () => {
    const spread = recommendedSpread({ rosterSize: 99, playerBudget: 99 })
    expect(spread).toEqual(SYNERGY_SPREAD)
  })

  it('handles zero gracefully', () => {
    expect(recommendedSpread({ rosterSize: 0, playerBudget: 0 })).toEqual({ GK: 0, DEF: 0, MID: 0, FWD: 0 })
  })
})

describe('curateByPosition', () => {
  // overall drives the VISUAL tier the player sees: gold >=87, purple 84-86, blue <=83.
  const tierOf = (o: number) => (o >= 87 ? 'gold' : o >= 84 ? 'purple' : 'blue')
  const p = (id: string, position: Position, overall: number) => player({ id, position, overall })

  it('filters to the requested position only', () => {
    const pool = [p('gk1', 'GK', 86), p('fwd1', 'FWD', 92)]
    expect(curateByPosition(pool, 'GK').map((c) => c.id)).toEqual(['gk1'])
  })

  it('surfaces one of each visual tier, not only top-overall gold cards', () => {
    // Three golds + a purple + a blue. Pure overall-sort would surface only golds;
    // tier-weighted curation guarantees a purple and a blue make the shortlist.
    const pool = [
      p('gold1', 'FWD', 91),
      p('gold2', 'FWD', 90),
      p('gold3', 'FWD', 89),
      p('purple1', 'FWD', 86),
      p('blue1', 'FWD', 82),
    ]
    const top3 = curateByPosition(pool, 'FWD', 3)
    expect(top3.map((c) => c.id)).toEqual(['gold1', 'purple1', 'blue1'])
  })

  it('weights the shortlist toward cheaper visual tiers (~1-2 gold, 3-4 purple, rest blue)', () => {
    const pool: PlayerCard[] = []
    ;[93, 92, 91, 90, 89, 88].forEach((o, i) => pool.push(p(`g${i}`, 'FWD', o)))
    ;[86, 86, 85, 85, 84, 84].forEach((o, i) => pool.push(p(`pp${i}`, 'FWD', o)))
    ;[83, 82, 81, 80, 80, 80].forEach((o, i) => pool.push(p(`b${i}`, 'FWD', o)))

    const shortlist = curateByPosition(pool, 'FWD', 10)
    const counts = { gold: 0, purple: 0, blue: 0 }
    for (const c of shortlist) counts[tierOf(c.overall)]++

    expect(shortlist).toHaveLength(10)
    expect(counts.gold).toBeGreaterThanOrEqual(1)
    expect(counts.gold).toBeLessThanOrEqual(2) // a few gold
    expect(counts.purple).toBeGreaterThanOrEqual(3) // more purple
    expect(counts.blue).toBeGreaterThanOrEqual(4) // mostly blue
  })

  it('ranks by overall desc within a tier', () => {
    const pool = [p('b-low', 'FWD', 82), p('b-high', 'FWD', 83)]
    expect(curateByPosition(pool, 'FWD').map((c) => c.id)).toEqual(['b-high', 'b-low'])
  })

  it('respects the limit', () => {
    const pool = [p('gold', 'GK', 90), p('purple', 'GK', 85)]
    expect(curateByPosition(pool, 'GK', 1).map((c) => c.id)).toEqual(['gold'])
  })

  it('returns an empty list for an absent position', () => {
    expect(curateByPosition([], 'MID')).toEqual([])
  })
})
