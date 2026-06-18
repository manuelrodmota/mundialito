// Fixed-seed reproducibility self-check.
// Runs the same match twice and asserts byte-identical results + stable RNG sequence.
// Exit code 0 = pass, non-zero = failure.

import assert from "node:assert/strict";
import { makeRng } from "../engine/rng.ts";
import { newMatch, reveal, startRound } from "../engine/engine.ts";
import type { MatchState } from "../engine/types.ts";
import { baselinePolicy } from "./policies.ts";
import { balancedCards, balancedCaptain, midOpponent } from "./rosters.ts";

const FIXED_SEED = 0xdeadbeef;

interface RunTrace {
  seed: number;
  goalsHome: number;
  goalsAway: number;
  endType: string;
  rounds: number;
  etRounds: number;
  winner: number | null;
  xgHomeTotal: number;
  xgAwayTotal: number;
  rngSamples: number[];
}

function extractEndType(state: MatchState): string {
  if (state.extraTime) return "extratime";
  const reason = state.capReason ?? "";
  if (reason.includes("mercy")) return "mercy";
  return "fulltime";
}

function runOnce(seed: number): RunTrace {
  const rngSamples: number[] = [];
  const baseRng = makeRng(seed);
  const rng = {
    next(): number {
      const v = baseRng.next();
      if (rngSamples.length < 50) rngSamples.push(v);
      return v;
    },
    shuffle<T>(arr: readonly T[]): T[] {
      return baseRng.shuffle(arr);
    },
  };

  const state = newMatch({
    playerCards: balancedCards,
    captainId: balancedCaptain,
    opponent: midOpponent,
    rng,
  });

  while (state.winner == null) {
    baselinePolicy.plan(state, 0, rng);
    reveal(state, rng);
    if (state.winner == null) startRound(state, rng);
  }

  return {
    seed,
    goalsHome: state.players[0].goals,
    goalsAway: state.players[1].goals,
    endType: extractEndType(state),
    rounds: state.round,
    etRounds: state.etRound,
    winner: state.winner,
    xgHomeTotal: state.players[0].xgTotal,
    xgAwayTotal: state.players[1].xgTotal,
    rngSamples,
  };
}

function assertTraceEqual(a: RunTrace, b: RunTrace): void {
  assert.strictEqual(a.goalsHome, b.goalsHome, "goalsHome mismatch");
  assert.strictEqual(a.goalsAway, b.goalsAway, "goalsAway mismatch");
  assert.strictEqual(a.endType, b.endType, "endType mismatch");
  assert.strictEqual(a.rounds, b.rounds, "rounds mismatch");
  assert.strictEqual(a.etRounds, b.etRounds, "etRounds mismatch");
  assert.strictEqual(a.winner, b.winner, "winner mismatch");
  assert.strictEqual(a.xgHomeTotal, b.xgHomeTotal, "xgHomeTotal mismatch");
  assert.strictEqual(a.xgAwayTotal, b.xgAwayTotal, "xgAwayTotal mismatch");
  assert.deepStrictEqual(a.rngSamples, b.rngSamples, "RNG sequence mismatch");
}

function main(): void {
  console.log("Running reproducibility self-check …");

  // Run 1
  const run1 = runOnce(FIXED_SEED);
  // Run 2 — identical seed, must produce identical output
  const run2 = runOnce(FIXED_SEED);

  try {
    assertTraceEqual(run1, run2);
  } catch (err) {
    console.error("FAIL — runs diverged:");
    console.error("  Run 1:", JSON.stringify(run1, null, 2));
    console.error("  Run 2:", JSON.stringify(run2, null, 2));
    console.error(err);
    process.exit(1);
  }

  // Also check a batch of seeds for stability
  const seeds = [1, 2, 3, 100, 0xfeedface];
  seeds.forEach((s) => {
    const a = runOnce(s);
    const b = runOnce(s);
    try {
      assertTraceEqual(a, b);
    } catch (err) {
      console.error(`FAIL — seed ${s} diverged:`);
      console.error(err);
      process.exit(1);
    }
  });

  console.log(
    `PASS — ${seeds.length + 1} seeds verified reproducible.`,
  );
  console.log(
    `  Result for seed 0x${FIXED_SEED.toString(16)}: ${run1.goalsHome}-${run1.goalsAway} (${run1.endType}, ${run1.rounds} rounds, winner=${run1.winner})`,
  );
}

main();
