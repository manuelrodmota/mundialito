import { describe, it, expect } from 'vitest'
import { buildQuickplayDeck } from './buildQuickplayDeck'
import { makeRng } from '../../engine/rng'
import type { PlayerCard, TacticalCard } from '../../engine/types'

function makePlayer(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    id: 'p1',
    type: 'player',
    name: 'Test Player',
    nation: 'BRA',
    worldCup: 2026,
    position: 'FWD',
    overall: 85,
    atk: 80,
    def: 40,
    cost: 3,
    rarity: 'rare',
    slots: 1,
    ...overrides,
  }
}

function makeTactical(overrides: Partial<TacticalCard> = {}): TacticalCard {
  return {
    id: 'tac-1',
    type: 'tactical',
    name: 'VAR',
    category: 'instant',
    cost: 2,
    slots: 1,
    rarity: 'rare',
    effect: { kind: 'var' },
    ...overrides,
  }
}

function makeCommonPool(count: number): PlayerCard[] {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({ id: `common-${i}`, rarity: 'common', name: `Common ${i}` }),
  )
}

describe('buildQuickplayDeck', () => {
  it('assembles a deck with premiums + random commons + tacticals', () => {
    const rng = makeRng(42)
    const captain = makePlayer({ id: 'captain', rarity: 'legendary' })
    const premium2 = makePlayer({ id: 'premium2', rarity: 'epic' })
    const commons = makeCommonPool(20)
    const tac = makeTactical()

    const { deck, captainId } = buildQuickplayDeck({
      premiumPicks: [captain, premium2],
      tacticalPicks: [tac],
      captainId: 'captain',
      commonPool: commons,
      rosterSize: 16,
      playerBudget: 20,
      tacticalCap: 3,
      rng,
    })

    expect(captainId).toBe('captain')
    expect(deck.filter((c) => c.type === 'player')).toHaveLength(16)
    expect(deck.filter((c) => c.type === 'tactical')).toHaveLength(1)
  })

  it('enforces that commons are not in the premium picks', () => {
    const rng = makeRng(42)
    const commonCard = makePlayer({ id: 'common-pick', rarity: 'common' })

    expect(() =>
      buildQuickplayDeck({
        premiumPicks: [commonCard],
        tacticalPicks: [],
        captainId: 'common-pick',
        commonPool: [],
        rng,
      }),
    ).toThrow()
  })

  it('throws when premium slots exceed budget', () => {
    const rng = makeRng(42)
    const bigCard = makePlayer({ id: 'big', rarity: 'legendary', slots: 2 })

    expect(() =>
      buildQuickplayDeck({
        premiumPicks: [bigCard],
        tacticalPicks: [],
        captainId: 'big',
        commonPool: [],
        playerBudget: 1,
        rng,
      }),
    ).toThrow(/exceed slot budget/)
  })

  it('throws when tactical picks exceed cap', () => {
    const rng = makeRng(42)
    const captain = makePlayer({ id: 'cap' })
    const tacs = [
      makeTactical({ id: 't1' }),
      makeTactical({ id: 't2' }),
      makeTactical({ id: 't3' }),
      makeTactical({ id: 't4' }),
    ]

    expect(() =>
      buildQuickplayDeck({
        premiumPicks: [captain],
        tacticalPicks: tacs,
        captainId: 'cap',
        commonPool: [],
        tacticalCap: 3,
        rng,
      }),
    ).toThrow(/exceed cap/)
  })

  it('includes the captain in the deck', () => {
    const rng = makeRng(42)
    const captain = makePlayer({ id: 'captain', rarity: 'epic' })
    const commons = makeCommonPool(20)

    const { deck } = buildQuickplayDeck({
      premiumPicks: [captain],
      tacticalPicks: [],
      captainId: 'captain',
      commonPool: commons,
      rng,
    })

    expect(deck.some((c) => c.id === 'captain')).toBe(true)
  })

  it('produces identical bench with the same seed', () => {
    const commons = makeCommonPool(20)
    const captain = makePlayer({ id: 'captain', rarity: 'epic' })

    const result1 = buildQuickplayDeck({
      premiumPicks: [captain],
      tacticalPicks: [],
      captainId: 'captain',
      commonPool: commons,
      rng: makeRng(123),
    })

    const result2 = buildQuickplayDeck({
      premiumPicks: [captain],
      tacticalPicks: [],
      captainId: 'captain',
      commonPool: commons,
      rng: makeRng(123),
    })

    expect(result1.deck.map((c) => c.id)).toEqual(result2.deck.map((c) => c.id))
  })

  it('fills bench with only common cards', () => {
    const rng = makeRng(42)
    const captain = makePlayer({ id: 'captain', rarity: 'epic' })
    const commons = makeCommonPool(20)
    const mixedPool = [
      ...commons,
      makePlayer({ id: 'rare-in-pool', rarity: 'rare' }),
    ]

    const { deck } = buildQuickplayDeck({
      premiumPicks: [captain],
      tacticalPicks: [],
      captainId: 'captain',
      commonPool: mixedPool,
      rosterSize: 16,
      rng,
    })

    const benchCards = deck.filter(
      (c) => c.type === 'player' && c.id !== 'captain',
    ) as PlayerCard[]
    expect(benchCards.every((c) => c.rarity === 'common')).toBe(true)
  })
})
