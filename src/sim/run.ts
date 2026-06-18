// Node-only Monte-Carlo runner. Execute via: npm run sim
// Writes src/sim/out/results.csv and src/sim/out/summary.json.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRng } from "../engine/rng.ts";
import { newMatch, reveal, startRound } from "../engine/engine.ts";
import type { MatchState, Tuning } from "../engine/types.ts";
import { baselinePolicy } from "./policies.ts";
import { DECKS, OPPONENTS } from "./rosters.ts";
import type { DeckName } from "./rosters.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- configuration ----

const BASE_SEED = 42;
const N_PER_CELL = parseInt(process.env["SIM_N"] ?? "1000", 10);
const OUT_DIR = process.env["SIM_OUT"] ?? join(__dirname, "out");

// Experimental balance configs (see "Balance Fix Spec — Diminishing Returns + Star Synergy").
// Each is a tuning override layered over DEFAULT_TUNING; baseline = {} reproduces prior output.
// Override the set with SIM_CONFIGS=baseline,fix2,fix12 (default: all three).
interface SimConfig {
  name: string;
  tuning: Partial<Tuning>;
}

// v10 is now the shipping default (DEFAULT_TUNING in src/engine/config.ts): diminishing returns,
// star-core discount, gentle field-cost curve, xG /210 cap 0.50, sudden-death ET. The sim
// validates it and, for contrast, can re-run the original pre-v10 baseline (all fixes off + the
// old /150, 0.60 curve) to show the balance flip the v10 pass produced.
const PRE_V10: Partial<Tuning> = {
  stackWeights: null,
  starSynergyDiscount: false,
  costByRarity: null,
  xgFloor: 0.05,
  xgSlope: 150,
  xgCap: 0.6,
};

const ALL_CONFIGS: SimConfig[] = [
  { name: "v10", tuning: {} }, // = DEFAULT_TUNING (locked v10)
  { name: "pre-v10", tuning: PRE_V10 }, // original baseline, for before/after contrast
];

// Default sweep = v10 (canonical, mirrored to results.csv/summary.json) + the pre-v10 baseline.
// Override with e.g. SIM_CONFIGS=v10.
const DEFAULT_CONFIG_NAMES = ["v10", "pre-v10"];

const CONFIGS: SimConfig[] = (() => {
  const sel = process.env["SIM_CONFIGS"];
  const wanted = sel ? sel.split(",").map((s) => s.trim()) : DEFAULT_CONFIG_NAMES;
  return ALL_CONFIGS.filter((c) => wanted.includes(c.name));
})();

// ---- result row ----

interface MatchResult {
  matchId: number;
  seed: number;
  playerDeck: DeckName;
  opponentTier: string;
  goalsHome: number;
  goalsAway: number;
  endType: "mercy" | "fulltime" | "extratime";
  endRound: number;
  etRounds: number;
  winner: "home" | "away";
  finalXgHome: number;
  finalXgAway: number;
  tacticalsHome: number;
  tacticalsAway: number;
}

function endType(state: MatchState): "mercy" | "fulltime" | "extratime" {
  if (state.extraTime) return "extratime";
  const reason = state.capReason ?? "";
  if (reason.includes("mercy")) return "mercy";
  return "fulltime";
}

function countTacticals(state: MatchState, side: 0 | 1): number {
  return state.players[side].exiled.filter((c) => c.type === "tactical").length;
}

function runMatch(
  playerCards: import("../engine/types.ts").Card[],
  captainId: string,
  opponent: import("../engine/types.ts").OpponentTeam,
  seed: number,
  matchId: number,
  playerDeck: DeckName,
  tuning: Partial<Tuning>,
): MatchResult {
  const rng = makeRng(seed);
  const state = newMatch({ playerCards, captainId, opponent, rng, tuning });

  while (state.winner == null) {
    baselinePolicy.plan(state, 0, rng);
    reveal(state, rng);
    if (state.winner == null) startRound(state, rng);
  }

  const [home, away] = state.players;
  return {
    matchId,
    seed,
    playerDeck,
    opponentTier: opponent.tier,
    goalsHome: home.goals,
    goalsAway: away.goals,
    endType: endType(state),
    endRound: state.extraTime ? state.T.roundCap : state.round,
    etRounds: state.etRound,
    winner: state.winner === 0 ? "home" : "away",
    finalXgHome: home.xgTotal,
    finalXgAway: away.xgTotal,
    tacticalsHome: countTacticals(state, 0),
    tacticalsAway: countTacticals(state, 1),
  };
}

// ---- statistics helpers ----

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---- summary aggregation ----

function buildSummary(results: MatchResult[]) {
  const total = results.length;

  // scoreline distribution
  const scorelines: Record<string, number> = {};
  results.forEach((r) => {
    const key = `${r.goalsHome}-${r.goalsAway}`;
    scorelines[key] = (scorelines[key] ?? 0) + 1;
  });

  // end-type split
  const endTypeCounts = { mercy: 0, fulltime: 0, extratime: 0 };
  results.forEach((r) => endTypeCounts[r.endType]++);
  const endTypeSplit = {
    mercyPct: round2((endTypeCounts.mercy / total) * 100),
    fulltimePct: round2((endTypeCounts.fulltime / total) * 100),
    extratimePct: round2((endTypeCounts.extratime / total) * 100),
  };

  // mercy timing histogram
  const mercyTiming: Record<number, number> = {};
  results
    .filter((r) => r.endType === "mercy")
    .forEach((r) => {
      const rd = r.endRound;
      mercyTiming[rd] = (mercyTiming[rd] ?? 0) + 1;
    });

  // extra-time length histogram (golden-goal-fix diagnostic: should be unimodal near 1)
  const etRoundsHistogram: Record<number, number> = {};
  results
    .filter((r) => r.endType === "extratime")
    .forEach((r) => {
      etRoundsHistogram[r.etRounds] = (etRoundsHistogram[r.etRounds] ?? 0) + 1;
    });

  // full-time margin histogram + the share decided by exactly 1 goal (rhythm sanity check)
  const fulltimeMargins: Record<number, number> = {};
  let fulltimeCount = 0;
  results
    .filter((r) => r.endType === "fulltime")
    .forEach((r) => {
      const m = Math.abs(r.goalsHome - r.goalsAway);
      fulltimeMargins[m] = (fulltimeMargins[m] ?? 0) + 1;
      fulltimeCount++;
    });
  const fulltimeOneGoalPct = fulltimeCount
    ? round2(((fulltimeMargins[1] ?? 0) / fulltimeCount) * 100)
    : 0;

  // goals per match
  const goalTotals = results.map((r) => r.goalsHome + r.goalsAway);
  const goalStats = {
    mean: round2(mean(goalTotals)),
    stdev: round2(stdev(goalTotals)),
  };

  // defense impact — compare defense-heavy vs all-common against same tier
  const defenseImpact: Record<string, { defenseHeavy: number; allCommon: number; delta: number }> = {};
  OPPONENTS.forEach((opp) => {
    const defRows = results.filter(
      (r) => r.playerDeck === "defense-heavy" && r.opponentTier === opp.tier,
    );
    const commonRows = results.filter(
      (r) => r.playerDeck === "all-common" && r.opponentTier === opp.tier,
    );
    if (defRows.length && commonRows.length) {
      const defConceded = round2(mean(defRows.map((r) => r.goalsAway)));
      const commonConceded = round2(mean(commonRows.map((r) => r.goalsAway)));
      defenseImpact[opp.tier] = {
        defenseHeavy: defConceded,
        allCommon: commonConceded,
        delta: round2(commonConceded - defConceded),
      };
    }
  });

  // star impact — win rate: star-heavy vs all-common
  const starImpact: Record<string, { starHeavyWinPct: number; allCommonWinPct: number }> = {};
  OPPONENTS.forEach((opp) => {
    const starRows = results.filter(
      (r) => r.playerDeck === "star-heavy" && r.opponentTier === opp.tier,
    );
    const commonRows = results.filter(
      (r) => r.playerDeck === "all-common" && r.opponentTier === opp.tier,
    );
    if (starRows.length && commonRows.length) {
      const starWin = round2((starRows.filter((r) => r.winner === "home").length / starRows.length) * 100);
      const commonWin = round2((commonRows.filter((r) => r.winner === "home").length / commonRows.length) * 100);
      starImpact[opp.tier] = { starHeavyWinPct: starWin, allCommonWinPct: commonWin };
    }
  });

  // tactical impact — with (all-common-tactics) vs without (all-common)
  const tacticalImpact: Record<
    string,
    { withTacticsWinPct: number; withoutTacticsWinPct: number; goalDelta: number }
  > = {};
  OPPONENTS.forEach((opp) => {
    const withRows = results.filter(
      (r) => r.playerDeck === "all-common-tactics" && r.opponentTier === opp.tier,
    );
    const withoutRows = results.filter(
      (r) => r.playerDeck === "all-common" && r.opponentTier === opp.tier,
    );
    if (withRows.length && withoutRows.length) {
      const withWin = round2(
        (withRows.filter((r) => r.winner === "home").length / withRows.length) * 100,
      );
      const withoutWin = round2(
        (withoutRows.filter((r) => r.winner === "home").length / withoutRows.length) * 100,
      );
      const withGoals = round2(mean(withRows.map((r) => r.goalsHome)));
      const withoutGoals = round2(mean(withoutRows.map((r) => r.goalsHome)));
      tacticalImpact[opp.tier] = {
        withTacticsWinPct: withWin,
        withoutTacticsWinPct: withoutWin,
        goalDelta: round2(withGoals - withoutGoals),
      };
    }
  });

  // per-deck win rate vs each tier (player = home) — the headline ranking signal
  const deckWinRates: Record<string, Record<string, number>> = {};
  DECKS.forEach((d) => {
    OPPONENTS.forEach((opp) => {
      const rows = results.filter((r) => r.playerDeck === d.name && r.opponentTier === opp.tier);
      if (rows.length) {
        (deckWinRates[d.name] ??= {})[opp.tier] = round2(
          (rows.filter((r) => r.winner === "home").length / rows.length) * 100,
        );
      }
    });
  });

  return {
    totalMatches: total,
    nPerCell: N_PER_CELL,
    scorelines,
    endTypeSplit,
    mercyTiming,
    etRoundsHistogram,
    fulltimeMargins,
    fulltimeOneGoalPct,
    goalStats,
    deckWinRates,
    defenseImpact,
    starImpact,
    tacticalImpact,
  };
}

// ---- CSV serialization ----

const CSV_HEADER =
  "matchId,seed,playerDeck,opponentTier,goalsHome,goalsAway,endType,endRound,etRounds,winner,finalXgHome,finalXgAway,tacticalsHome,tacticalsAway\n";

function toCSVRow(r: MatchResult): string {
  return [
    r.matchId,
    r.seed,
    r.playerDeck,
    r.opponentTier,
    r.goalsHome,
    r.goalsAway,
    r.endType,
    r.endRound,
    r.etRounds,
    r.winner,
    r.finalXgHome,
    r.finalXgAway,
    r.tacticalsHome,
    r.tacticalsAway,
  ].join(",");
}

// ---- console summary ----

function printSummary(summary: ReturnType<typeof buildSummary>): void {
  console.log("\n=== World Cup Clash v8 — Monte-Carlo Simulation Summary ===");
  console.log(`Total matches: ${summary.totalMatches}  (${summary.nPerCell}/cell)\n`);

  console.log("End-type split:");
  console.log(`  Mercy:      ${summary.endTypeSplit.mercyPct}%`);
  console.log(`  Full time:  ${summary.endTypeSplit.fulltimePct}%`);
  console.log(`  Extra time: ${summary.endTypeSplit.extratimePct}%\n`);

  console.log("Goals/match:");
  console.log(`  Mean:  ${summary.goalStats.mean}`);
  console.log(`  Stdev: ${summary.goalStats.stdev}\n`);

  console.log("Mercy timing (round → count):");
  const rounds = Object.keys(summary.mercyTiming)
    .map(Number)
    .sort((a, b) => a - b);
  if (rounds.length) {
    rounds.forEach((r) => console.log(`  Round ${r}: ${summary.mercyTiming[r]}`));
  } else {
    console.log("  (no mercy endings)");
  }
  console.log();

  console.log("Top scorelines:");
  const top = Object.entries(summary.scorelines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  top.forEach(([sl, cnt]) =>
    console.log(`  ${sl.padEnd(6)} → ${cnt} (${round2((cnt / summary.totalMatches) * 100)}%)`),
  );
  console.log();

  console.log("Defense impact (goals conceded vs tier):");
  Object.entries(summary.defenseImpact).forEach(([tier, imp]) =>
    console.log(
      `  ${tier.padEnd(9)} defense-heavy: ${imp.defenseHeavy}  all-common: ${imp.allCommon}  delta: ${imp.delta}`,
    ),
  );
  console.log();

  console.log("Star impact (win % vs tier):");
  Object.entries(summary.starImpact).forEach(([tier, imp]) =>
    console.log(
      `  ${tier.padEnd(9)} star-heavy: ${imp.starHeavyWinPct}%  all-common: ${imp.allCommonWinPct}%`,
    ),
  );
  console.log();

  console.log("Tactical impact (with vs without, all-common base):");
  Object.entries(summary.tacticalImpact).forEach(([tier, imp]) =>
    console.log(
      `  ${tier.padEnd(9)} with: ${imp.withTacticsWinPct}%  without: ${imp.withoutTacticsWinPct}%  goal-delta: +${imp.goalDelta}`,
    ),
  );
  console.log();
}

// ---- main ----

/** Run the full deck×tier matrix once for a given tuning config. Seeding is config-independent
 *  (depends only on cell + match index) so every config replays the same seeded matchups. */
function runMatrix(tuning: Partial<Tuning>): MatchResult[] {
  const results: MatchResult[] = [];
  let matchId = 1;
  DECKS.forEach((deck, deckIdx) => {
    OPPONENTS.forEach((opp, oppIdx) => {
      const cellIndex = deckIdx * OPPONENTS.length + oppIdx;
      for (let i = 0; i < N_PER_CELL; i++) {
        const seed = (BASE_SEED ^ ((cellIndex + 1) * 1000)) + i;
        results.push(runMatch(deck.cards, deck.captainId, opp, seed, matchId++, deck.name, tuning));
      }
    });
  });
  return results;
}

type Summary = ReturnType<typeof buildSummary>;

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

/** Cross-config side-by-side on the metrics the balance spec asks to compare. */
function printComparison(summaries: { name: string; summary: Summary }[]): void {
  const names = summaries.map((s) => s.name);
  const col = (vals: (string | number)[]) => vals.map((v) => pad(String(v), 14)).join("");

  console.log("\n========================================================");
  console.log("  CONFIG COMPARISON");
  console.log("========================================================\n");

  console.log(pad("Metric", 30) + col(names));
  console.log("-".repeat(30 + 14 * names.length));

  const line = (label: string, pick: (s: Summary) => string | number) =>
    console.log(pad(label, 30) + col(summaries.map((s) => pick(s.summary))));

  const etDragPct = (s: Summary): string | number => {
    const h = s.etRoundsHistogram;
    const total = Object.values(h).reduce((a, b) => a + b, 0);
    if (!total) return "-";
    const drag = Object.entries(h)
      .filter(([k]) => Number(k) >= 4)
      .reduce((a, [, v]) => a + v, 0);
    return Math.round((drag / total) * 1000) / 10;
  };

  line("end: mercy %", (s) => s.endTypeSplit.mercyPct);
  line("end: fulltime %", (s) => s.endTypeSplit.fulltimePct);
  line("end: extratime %", (s) => s.endTypeSplit.extratimePct);
  line("goals/match mean", (s) => s.goalStats.mean);
  line("goals/match stdev", (s) => s.goalStats.stdev);
  line("full-time 1-goal %", (s) => s.fulltimeOneGoalPct);
  line("ET games >=4 rounds %", etDragPct);

  console.log("\n  Player win % by deck × tier (home = player):");
  const tiers = OPPONENTS.map((o) => o.tier);
  DECKS.forEach((d) => {
    tiers.forEach((t) => {
      line(
        `  ${d.name} vs ${t}`,
        (s) => s.deckWinRates[d.name]?.[t] ?? "-",
      );
    });
  });

  console.log("\n  Defense impact — goals conceded (defense-heavy / all-common; +delta = defends better):");
  tiers.forEach((t) => {
    line(`  ${t} delta`, (s) => s.defenseImpact[t]?.delta ?? "-");
  });

  console.log("\n  Star impact — star-heavy win % (vs all-common in parens per config json):");
  tiers.forEach((t) => {
    line(`  ${t} star-heavy win%`, (s) => s.starImpact[t]?.starHeavyWinPct ?? "-");
  });

  console.log("\n  Tactical impact — with-tactics win % and goal delta:");
  tiers.forEach((t) => {
    line(`  ${t} with-tactics win%`, (s) => s.tacticalImpact[t]?.withTacticsWinPct ?? "-");
    line(`  ${t} goal delta`, (s) => s.tacticalImpact[t]?.goalDelta ?? "-");
  });
  console.log();
}

function main(): void {
  console.log(`Running Monte-Carlo sim: N=${N_PER_CELL}/cell, seed base=${BASE_SEED}`);
  console.log(`Matrix: ${DECKS.length} decks × ${OPPONENTS.length} tiers`);
  console.log(`Configs: ${CONFIGS.map((c) => c.name).join(", ")}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const summaries: { name: string; summary: Summary }[] = [];

  CONFIGS.forEach((cfg, idx) => {
    process.stdout.write(`[${cfg.name}] running ${DECKS.length * OPPONENTS.length} cells … `);
    const results = runMatrix(cfg.tuning);
    console.log(`${results.length} matches done`);

    const csvPath = join(OUT_DIR, `results.${cfg.name}.csv`);
    const jsonPath = join(OUT_DIR, `summary.${cfg.name}.json`);
    writeFileSync(csvPath, CSV_HEADER + results.map(toCSVRow).join("\n") + "\n");
    const summary = buildSummary(results);
    writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + "\n");

    // Continuity: mirror the FIRST config of the sweep to the canonical file names (METRICS.md).
    if (idx === 0) {
      writeFileSync(join(OUT_DIR, "results.csv"), CSV_HEADER + results.map(toCSVRow).join("\n") + "\n");
      writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    }

    summaries.push({ name: cfg.name, summary });
  });

  // Per-config console summaries
  summaries.forEach(({ name, summary }) => {
    console.log(`\n### Config: ${name} ###`);
    printSummary(summary);
  });

  // Cross-config comparison + machine-readable comparison.json
  if (summaries.length > 1) printComparison(summaries);

  const comparison = {
    nPerCell: N_PER_CELL,
    baseSeed: BASE_SEED,
    configs: summaries.map(({ name, summary }) => ({
      name,
      endTypeSplit: summary.endTypeSplit,
      goalStats: summary.goalStats,
      fulltimeOneGoalPct: summary.fulltimeOneGoalPct,
      etRoundsHistogram: summary.etRoundsHistogram,
      deckWinRates: summary.deckWinRates,
      defenseImpact: summary.defenseImpact,
      starImpact: summary.starImpact,
      tacticalImpact: summary.tacticalImpact,
    })),
  };
  const cmpPath = join(OUT_DIR, "comparison.json");
  writeFileSync(cmpPath, JSON.stringify(comparison, null, 2) + "\n");

  console.log(`\nWrote per-config results.<config>.csv + summary.<config>.json to ${OUT_DIR}`);
  console.log(`Wrote: ${cmpPath}`);
}

main();
