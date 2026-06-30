/**
 * WCC-017 — Win condition checker (GDD v10 §14 / §17).
 *
 * Called after each full round resolves.
 * Regulation: mercy (3-goal lead) → full-time leader → level → ET.
 * ET: true sudden death (first goal decides); scoreless-ET safety at etRound 5.
 */

import type { MatchState } from "./types.ts";
import { MERCY_LEAD, ROUND_CAP, ET_ROUND_CAP, XG_TIEBREAK_GAP } from "./constants.ts";
import { resetFatigue } from "./fatigue.ts";
import { returnLockedToDrawPile } from "./cards.ts";
import { resetTacticalCounters } from "./tacticals.ts";
import type { Rng } from "./rng.ts";

/**
 * Transitions the match into extra time.
 * Meters reset to 0, goals carry, locked → drawPile, fatigue cleared, tactical counters reset.
 * GDD §14 line 284, §17 lines 533-538.
 */
export function beginExtraTime(m: MatchState, rng: Rng): void {
  m.extraTime = true;
  m.etRound = 0;

  for (const p of m.players) {
    p.xg = 0;
    returnLockedToDrawPile(p, rng);
    resetFatigue(p);
  }

  resetTacticalCounters(m);
}

/**
 * Evaluates the win condition after the current round.
 * Sets `m.winner` when a winner is found.
 * GDD §17 `checkWin` lines 540-550.
 */
export function checkWin(m: MatchState, rng: Rng): void {
  const [p0, p1] = m.players;
  const g0 = p0!.goals;
  const g1 = p1!.goals;

  if (!m.extraTime) {
    if (g0 - g1 >= MERCY_LEAD) {
      m.winner = 0;
      m.phase = "end";
      return;
    }
    if (g1 - g0 >= MERCY_LEAD) {
      m.winner = 1;
      m.phase = "end";
      return;
    }

    if (m.round < ROUND_CAP) return;

    if (g0 > g1) {
      m.winner = 0;
      m.phase = "end";
      return;
    }
    if (g1 > g0) {
      m.winner = 1;
      m.phase = "end";
      return;
    }

    // v12 §19#5(b): partial xG tie-break — a level-on-goals game with a CLEAR accumulated-xG edge is
    // decided outright (the side that created the better chances wins); only genuinely-even games
    // (xG gap < XG_TIEBREAK_GAP) go to golden-goal ET. Lowers the structural ~34% ET rate to target.
    const a0 = p0!.xgAccum ?? 0;
    const a1 = p1!.xgAccum ?? 0;
    if (Math.abs(a0 - a1) >= XG_TIEBREAK_GAP) {
      const w = a0 > a1 ? 0 : 1;
      // The deciding chance goes in: award the winner a goal so the result reads as a scoreline
      // (e.g. 2–2 → 3–2) and the reveal plays a goal animation, instead of a silent xG verdict.
      m.players[w]!.goals += 1;
      m.winner = w;
      m.decidedByTieBreak = true;
      m.phase = "end";
      return;
    }

    beginExtraTime(m, rng);
    return;
  }

  if (g0 !== g1) {
    m.winner = g0 > g1 ? 0 : 1;
    m.phase = "end";
    return;
  }

  if (m.etRound >= ET_ROUND_CAP) {
    const w = p0!.xg >= p1!.xg ? 0 : 1;
    // Golden chance converts — same dramatization as the regulation tie-break, so a scoreless ET
    // still ends on a visible goal rather than a silent xG verdict.
    m.players[w]!.goals += 1;
    m.winner = w;
    m.decidedByTieBreak = true;
    m.phase = "end";
  }
}
