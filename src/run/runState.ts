import type { Card, RunState } from "../engine";

/** Total number of matches in a run ladder (Group×3 + R16 + QF + SF + Final). */
const RUN_LENGTH = 7;

/** Index of the Final match in the ladder. */
const FINAL_INDEX = RUN_LENGTH - 1;

/**
 * Per-stage difficulty handicap — a multiplier on the AI opponent's effective ATK & DEF
 * (MatchState.aiStrengthMult). The ladder gets sharper as you advance: the group stage plays
 * straight (1.0) so the run opens fair, then the knockouts ramp. Tuned via scripts/arcadeSim.ts.
 */
export const STAGE_AI_STRENGTH: Record<RunState["stage"], number> = {
  group: 0.95,
  r16: 1.0,
  qf: 1.025,
  sf: 1.075,
  final: 1.125,
};

/** Maps a zero-based match index to the corresponding bracket stage label. */
export function stageForIndex(matchIndex: number): RunState["stage"] {
  if (matchIndex <= 2) return "group";
  if (matchIndex === 3) return "r16";
  if (matchIndex === 4) return "qf";
  if (matchIndex === 5) return "sf";
  return "final";
}

/** Creates a fresh run at the start of the Group stage with no matches played. */
export function newRun(deck: Card[], captainId: string): RunState {
  return {
    matchIndex: 0,
    stage: stageForIndex(0),
    deck,
    captainId,
    defeated: [],
    alive: true,
  };
}

/**
 * Advances the run after a match result.
 *
 * On a win the beaten opponent is recorded, the match index increments, and the
 * stage label is recomputed. On a loss the run ends with permadeath (alive=false).
 * Returns a new object; the input run is never mutated.
 */
export function advanceRun(
  run: RunState,
  won: boolean,
  beatenOpponentId: string,
): RunState {
  if (!won) {
    return { ...run, alive: false };
  }

  const defeated = [...run.defeated, beatenOpponentId];
  const matchIndex = run.matchIndex + 1;
  const stage = stageForIndex(matchIndex);

  return { ...run, defeated, matchIndex, stage };
}

/** Returns true when the run is over — either via permadeath or after the Final is won. */
export function isRunOver(run: RunState): boolean {
  return !run.alive || isRunWon(run);
}

/**
 * Returns true when the player has won the Final, completing the run.
 *
 * A Final win is detected by the player having beaten an opponent in the Final
 * stage, meaning matchIndex has advanced past the Final index.
 */
export function isRunWon(run: RunState): boolean {
  return run.alive && run.matchIndex > FINAL_INDEX;
}
