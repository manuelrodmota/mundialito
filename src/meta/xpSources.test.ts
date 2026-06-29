import { describe, it, expect } from 'vitest'
import { quickplayMatchXp, arcadeMatchXp } from './xpSources'

describe('xpSources', () => {
  it('Quickplay: 25 on a win, 10 on a loss', () => {
    expect(quickplayMatchXp(true)).toBe(25)
    expect(quickplayMatchXp(false)).toBe(10)
  })

  it('Arcade: early group win ≈ 35, loss = 10 participation', () => {
    expect(arcadeMatchXp(true, 'group', false)).toBe(35) // 10 + 15 + 10
    expect(arcadeMatchXp(false, 'group', false)).toBe(10)
  })

  it('Arcade Final win = 115 (without run bonus), 265 with it', () => {
    expect(arcadeMatchXp(true, 'final', false)).toBe(115) // 10 + 15 + 90
    expect(arcadeMatchXp(true, 'final', true)).toBe(265) // + 150 run win
  })

  it('a full winning run totals ≈ 570', () => {
    const total =
      3 * arcadeMatchXp(true, 'group', false) +
      arcadeMatchXp(true, 'r16', false) +
      arcadeMatchXp(true, 'qf', false) +
      arcadeMatchXp(true, 'sf', false) +
      arcadeMatchXp(true, 'final', true)
    expect(total).toBe(570)
  })
})
