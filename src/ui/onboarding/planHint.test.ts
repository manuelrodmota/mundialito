import { describe, it, expect } from 'vitest'
import { planHint } from './planHint'
import type { PlanHintInput } from './planHint'

const base: PlanHintInput = {
  attackCount: 2,
  formation: 'balanced',
  opponentDefenseCount: 2,
  notLeading: true,
  canAddPlayer: true,
}

describe('planHint', () => {
  it('returns null for a healthy two-attacker lineup', () => {
    expect(planHint(base)).toBeNull()
  })

  it('warns when no one is up front', () => {
    expect(planHint({ ...base, attackCount: 0 })?.key).toBe('match.hint.noAttack')
  })

  it('warns about a lone striker vs a stacked defense', () => {
    const hint = planHint({ ...base, attackCount: 1, opponentDefenseCount: 3 })
    expect(hint?.key).toBe('match.hint.loneStriker')
    expect(hint?.vars).toEqual({ n: 3 })
  })

  it('does not warn about one striker when the opponent fields a thin defense', () => {
    expect(planHint({ ...base, attackCount: 1, opponentDefenseCount: 1 })).toBeNull()
  })

  it('warns when offensive is wasted on one attacker', () => {
    expect(
      planHint({ ...base, attackCount: 1, opponentDefenseCount: 1, formation: 'offensive' })?.key,
    ).toBe('match.hint.offensiveWaste')
  })

  it('stays silent while the player is leading (few attackers may be deliberate)', () => {
    expect(planHint({ ...base, attackCount: 0, notLeading: false })).toBeNull()
  })

  it('stays silent when there is no player left to add', () => {
    expect(planHint({ ...base, attackCount: 0, canAddPlayer: false })).toBeNull()
  })
})
