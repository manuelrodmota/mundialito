/**
 * Account XP / leveling math (WCC-045/050). Pure functions. Mirrors economy spec §7.
 *
 * XP to advance FROM level L = min(25·L, 300): front-loaded (level 2 after ~one match),
 * then a flat 300/level plateau so high levels stay reachable (level 50 ≈ 23 runs).
 */

import type { BoxTier } from './boxes'

/** Flat plateau the per-level XP cost ramps up to (economy §7). */
export const XP_PLATEAU = 300

/** XP needed to advance from a given level to the next: min(25·level, 300). */
export function xpForLevel(level: number): number {
  return Math.min(25 * level, XP_PLATEAU)
}

/** The reward box a level-up grants — best milestone the level hits (econ §7). */
export function levelBox(level: number): BoxTier {
  if (level % 10 === 0) return 'champions'
  if (level % 5 === 0) return 'knockout'
  return 'group'
}

export interface LevelGain {
  level: number
  tier: BoxTier
}

export interface XpResult {
  level: number
  xp: number
  /** One entry per level crossed, each with the box tier it grants. */
  gained: LevelGain[]
}

/** Apply XP, rolling over levels. Returns the new level/xp + the boxes earned. */
export function applyXp(level: number, xp: number, amount: number): XpResult {
  let lv = level
  let x = xp + Math.max(0, amount)
  const gained: LevelGain[] = []
  let need = xpForLevel(lv)
  while (x >= need) {
    x -= need
    lv += 1
    gained.push({ level: lv, tier: levelBox(lv) })
    need = xpForLevel(lv)
  }
  return { level: lv, xp: x, gained }
}
