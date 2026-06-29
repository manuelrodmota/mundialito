import { describe, it, expect } from 'vitest'
import { xpForLevel, levelBox, applyXp } from './leveling'

describe('leveling', () => {
  it('xpForLevel = min(25·level, 300) — front-loaded then flat', () => {
    expect(xpForLevel(1)).toBe(25)
    expect(xpForLevel(5)).toBe(125)
    expect(xpForLevel(10)).toBe(250)
    expect(xpForLevel(12)).toBe(300)
    expect(xpForLevel(20)).toBe(300)
    expect(xpForLevel(50)).toBe(300)
  })

  it('cumulative XP matches the economy §7 table', () => {
    const totalToReach = (n: number) => {
      let sum = 0
      for (let l = 1; l < n; l++) sum += xpForLevel(l)
      return sum
    }
    expect(totalToReach(5)).toBe(250)
    expect(totalToReach(10)).toBe(1125)
  })

  it('levelBox milestones: Champions every 10th, Knockout every 5th, else Group', () => {
    expect(levelBox(10)).toBe('champions')
    expect(levelBox(20)).toBe('champions')
    expect(levelBox(5)).toBe('knockout')
    expect(levelBox(15)).toBe('knockout')
    expect(levelBox(2)).toBe('group')
    expect(levelBox(9)).toBe('group')
  })

  describe('applyXp', () => {
    it('no level-up when below the threshold', () => {
      const r = applyXp(1, 0, 10)
      expect(r).toEqual({ level: 1, xp: 10, gained: [] })
    })

    it('single level-up grants the next level box', () => {
      const r = applyXp(1, 0, 25) // level 1 needs 25
      expect(r.level).toBe(2)
      expect(r.xp).toBe(0)
      expect(r.gained).toEqual([{ level: 2, tier: 'group' }])
    })

    it('rolls multiple levels and accumulates boxes (incl. milestones)', () => {
      // From level 4 with a big chunk → crosses level 5 (Knockout) etc.
      const r = applyXp(4, 0, 1000)
      expect(r.level).toBeGreaterThan(5)
      expect(r.gained.some((g) => g.level === 5 && g.tier === 'knockout')).toBe(true)
    })
  })
})
