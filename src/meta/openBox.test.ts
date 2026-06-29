import { describe, it, expect } from 'vitest'
import { makeRng } from '../engine/rng'
import { DROP_TABLES, openBox, grantCards, WELCOME_BUNDLE, type RarityBuckets } from './openBox'
import type { PlayerCard, Rarity } from '../engine/types'

let nextId = 1
function card(rarity: Rarity): PlayerCard {
  const id = nextId++
  return {
    id: `c${id}`,
    cardId: id,
    type: 'player',
    name: `Player ${id}`,
    nation: 'Testland',
    worldCup: 2026,
    position: 'MID',
    overall: rarity === 'legendary' ? 94 : rarity === 'epic' ? 89 : rarity === 'rare' ? 83 : 72,
    atk: 80,
    def: 80,
    cost: 2,
    rarity,
    slots: 0,
  }
}

function buckets(): RarityBuckets {
  return {
    common: Array.from({ length: 40 }, () => card('common')),
    rare: Array.from({ length: 20 }, () => card('rare')),
    epic: Array.from({ length: 12 }, () => card('epic')),
    legendary: Array.from({ length: 8 }, () => card('legendary')),
  }
}

describe('drop tables', () => {
  it('every per-slot column sums to 100', () => {
    for (const [, drops] of Object.entries(DROP_TABLES)) {
      const sumH = Object.values(drops.h).reduce((a, b) => a + b, 0)
      const sumF = Object.values(drops.f).reduce((a, b) => a + b, 0)
      expect(sumH).toBeCloseTo(100, 5)
      expect(sumF).toBeCloseTo(100, 5)
    }
  })
})

describe('openBox', () => {
  it('returns 1 headliner + 4 distinct filler', () => {
    const opened = openBox('group', buckets(), makeRng(1))
    expect(opened.headliner).not.toBeNull()
    expect(opened.filler).toHaveLength(4)
    const ids = [opened.headliner!.cardId, ...opened.filler.map((c) => c.cardId)]
    expect(new Set(ids).size).toBe(ids.length) // all distinct
  })

  it('welcome Champions box forces a Legendary pick-1-of-3', () => {
    const opened = openBox('champions', buckets(), makeRng(2), { forceLegendaryHeadliner: true })
    expect(opened.allowPick).toBe(true)
    expect(opened.headliner).toBeNull()
    expect(opened.headlinerChoices).toHaveLength(3)
    expect(opened.headlinerChoices!.every((c) => c.rarity === 'legendary')).toBe(true)
    expect(opened.headlinerRarity).toBe('legendary')
  })

  it('trophy box headliner is always Legendary', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(openBox('trophy', buckets(), makeRng(seed)).headliner!.rarity).toBe('legendary')
    }
  })

  it('is deterministic for a given seed', () => {
    const bk = buckets()
    const a = openBox('knockout', bk, makeRng(7))
    const b = openBox('knockout', bk, makeRng(7))
    expect(a.headliner!.cardId).toBe(b.headliner!.cardId)
    expect(a.filler.map((c) => c.cardId)).toEqual(b.filler.map((c) => c.cardId))
  })

  it('welcome bundle is 2 Group + 1 Knockout + 1 Champions(forced)', () => {
    expect(WELCOME_BUNDLE.map((b) => b.tier)).toEqual(['group', 'group', 'knockout', 'champions'])
    expect(WELCOME_BUNDLE[3].forceLegendaryHeadliner).toBe(true)
  })
})

describe('grantCards', () => {
  it('annotates new vs duplicate with running copies', () => {
    const a = card('rare')
    const b = card('epic')
    const owned = new Map<number, number>([[a.cardId!, 1]])
    const results = grantCards(owned, [a, b, b])
    expect(results[0]).toMatchObject({ isNew: false, copies: 2 })
    expect(results[1]).toMatchObject({ isNew: true, copies: 1 })
    expect(results[2]).toMatchObject({ isNew: false, copies: 2 })
  })
})
