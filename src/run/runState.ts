import type { Card, OpponentTeam, RunState } from "../engine";
import { tunable } from "../engine/constants";
import type { BoxTier } from "../meta/boxes";

/** Total number of matches in a run ladder (Group×3 + R16 + QF + SF + Final). */
const RUN_LENGTH = 7;

/** Index of the Final match in the ladder. */
const FINAL_INDEX = RUN_LENGTH - 1;

/**
 * Per-stage difficulty handicap — a multiplier on the AI opponent's effective ATK & DEF
 * (MatchState.aiStrengthMult). The ladder gets sharper as you advance: the group stage plays
 * straight (1.0) so the run opens fair, then the knockouts ramp. Tuned via scripts/arcadeSim.ts.
 * v12: the Final is 1.15 (1.125 → 1.15) alongside the champion strength-floor below, so it stays the
 * decisively hardest stage (~41% win vs SF ~50%). A 1.15 → 1.10 shave to recover the completion the
 * §19#5 xG tie-break cost was swept but reverted: below ~1.13 the Final plays EASIER than the SF
 * (re-inverting the curve), and completion can't be fully recovered without that regression.
 */
export const STAGE_AI_STRENGTH: Record<RunState["stage"], number> = {
  group: 0.95,
  r16: 1.0,
  qf: 1.025,
  sf: 1.075,
  final: tunable("SIM_FINAL_HANDICAP", 1.15),
};

/**
 * Target effective top-11 OVR a champion opponent is normalized UP to (v12 champion strength-floor).
 * The Tier-S champion pool spans ~80–88 top-11 OVR; the pre-1990 winners are weaker than the curated
 * Tier-A "all-time greats", so a uniform Final draw could land an opponent easier than the SF. The
 * floor lifts a weak champion's effective squad to this level (never weakens a strong one), so every
 * Final plays at champion strength regardless of which champion is drawn. Tuned via scripts/arcadeSim.ts.
 */
export const CHAMPION_STRENGTH_FLOOR = 86;

/** Mean of a squad's top-11 player overalls — the proxy the strength-floor normalizes against. */
function squadTop11Overall(squad: ReadonlyArray<{ overall: number }>): number {
  const top = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
  if (top.length === 0) return 0;
  return top.reduce((sum, c) => sum + c.overall, 0) / top.length;
}

/**
 * The AI strength multiplier for a match: the per-stage handicap, times a champion strength-floor
 * ratio that lifts a weak champion up to CHAMPION_STRENGTH_FLOOR (ratio ≥ 1, never weakens). Applied
 * to any champion opponent (so a champion drawn early via "tier-and-above" gating is floored too).
 * Used by both the live run (useArcadeRun) and scripts/arcadeSim.ts so they stay in sync.
 */
export function aiStrengthMultFor(stage: RunState["stage"], opponent: OpponentTeam): number {
  const stageMult = STAGE_AI_STRENGTH[stage];
  if (!opponent.isChampion) return stageMult;
  const t11 = squadTop11Overall(opponent.squad);
  const floorRatio = t11 > 0 ? Math.max(1, CHAMPION_STRENGTH_FLOOR / t11) : 1;
  return stageMult * floorRatio;
}

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

/**
 * Run-end reward boxes (economy spec §8): depth scales the reward, no run is wasted.
 * Final win → Champions-Trophy (guaranteed Legendary). Otherwise by how far you got.
 */
export function runEndReward(run: RunState): BoxTier[] {
  if (isRunWon(run)) return ["trophy"];
  switch (run.stage) {
    case "group":
      return ["group"];
    case "r16":
    case "qf":
      return ["group", "knockout"];
    case "sf":
    case "final":
      return ["knockout", "knockout"];
    default:
      return ["group"];
  }
}
