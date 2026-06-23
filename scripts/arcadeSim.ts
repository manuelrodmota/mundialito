/**
 * Arcade-run Monte-Carlo — checks the 7-match ladder is still beatable + fair after the
 * opponent-deck rebuild (common bench + signature tacticals), the xG-floor attacker gate,
 * and the powers/gate changes.
 *
 * Faithful to the real run: uses the run module (newRun → drawOpponent → advanceRun →
 * reward growth) and the SAME opponent deck build as useArcadeRun.startStage. Both sides
 * play via the engine AI (decideTurn) — so the win rate is a LOWER BOUND on a skilled human,
 * who optimises better than the heuristic. Permadeath ends a run on the first loss.
 *
 * Run: npx tsx scripts/arcadeSim.ts [numRuns]
 */

import {
  newMatch,
  startRound,
  decideTurn,
  resolveRound,
  makeRng,
  type Rng,
  type PlayerCard,
  type OpponentTeam,
  type RunState,
} from "../src/engine/index.ts";
import { newRun, drawOpponent, advanceRun, isRunWon, stageForIndex, rollPlayerReward, applyReward, STAGE_AI_STRENGTH } from "../src/run/index.ts";
import { players as staticPlayerPool } from "../src/data/players.ts";
import { tacticals as ALL_TACTICALS } from "../src/data/tacticals.ts";
import { buildQuickplayDeck } from "../src/ui/quickplay/buildQuickplayDeck.ts";

const PREMIUMS = staticPlayerPool.filter((p) => p.rarity !== "common");
const COMMONS = staticPlayerPool.filter((p) => p.rarity === "common");

/** A representative starting deck: ~12 premium slots + a common bench + 3 tacticals (like the
 *  human, who also fields tacticals — without them the sim under-represents the player). */
function buildPlayerDeck(rng: Rng): { deck: ReturnType<typeof buildQuickplayDeck>["deck"]; captainId: string } {
  const shuffled = rng.shuffle([...PREMIUMS]);
  const picks: PlayerCard[] = [];
  let slots = 0;
  for (const p of shuffled) {
    if (picks.length >= 6 || slots + p.slots > 12) continue;
    picks.push(p);
    slots += p.slots;
  }
  const captainId = picks[0]?.id ?? COMMONS[0]!.id;
  const tacticalPicks = rng.shuffle([...ALL_TACTICALS]).slice(0, 3);
  const { deck } = buildQuickplayDeck({
    premiumPicks: picks,
    tacticalPicks,
    captainId,
    commonPool: COMMONS,
    rng,
  });
  return { deck, captainId };
}

/** Builds the opponent deck exactly like useArcadeRun.startStage (premiums + common bench + tacticals). */
function buildOpponentDeck(opponent: OpponentTeam, rng: Rng): { deck: PlayerCard[] | ReturnType<typeof buildQuickplayDeck>["deck"]; captainId: string } {
  const oppPremiums: PlayerCard[] = [];
  let oppSlots = 0;
  for (const c of opponent.squad.filter((p) => p.rarity !== "common")) {
    if (oppPremiums.length >= 10 || oppSlots + c.slots > 20) continue;
    oppPremiums.push(c);
    oppSlots += c.slots;
  }
  const oppCaptain = oppPremiums[0] ?? opponent.squad[0];
  const squadCommons = opponent.squad.filter((c) => c.rarity === "common");
  const commonPool = [...COMMONS, ...squadCommons];
  return buildQuickplayDeck({
    premiumPicks: oppPremiums,
    tacticalPicks: (opponent.signatureTactical ?? []).slice(0, 3),
    captainId: oppCaptain?.id ?? "",
    commonPool,
    rosterSize: 16,
    playerBudget: 20,
    tacticalCap: 3,
    rng,
  });
}

/** Plays one full match (both sides AI) and returns the winner index + final goals. */
function simMatch(
  playerDeck: PlayerCard[] | ReturnType<typeof buildQuickplayDeck>["deck"],
  playerCaptain: string,
  opponent: OpponentTeam,
  stage: keyof typeof STAGE_AI_STRENGTH,
  scale: number,
  rng: Rng,
): { winner: 0 | 1; you: number; them: number; et: boolean } {
  const oppDeck = buildOpponentDeck(opponent, rng);
  const matchSeed = Math.floor(rng.next() * 2 ** 32);
  const m = newMatch(
    matchSeed,
    { deck: playerDeck, captainId: playerCaptain },
    { deck: oppDeck.deck, captainId: oppDeck.captainId },
    opponent,
    "run",
  );
  // Per-stage AI handicap, scaled for sweeping (scale=1 → the shipped curve).
  m.aiStrengthMult = 1 + (STAGE_AI_STRENGTH[stage] - 1) * scale;

  startRound(m, rng);
  let guard = 0;
  while (m.winner === null && guard++ < 60) {
    decideTurn(m, 0, rng);
    decideTurn(m, 1, rng);
    resolveRound(m, rng);
    if (m.winner === null) startRound(m, rng);
  }
  const p0 = m.players[0]!;
  const p1 = m.players[1]!;
  const winner = m.winner ?? (p0.goals >= p1.goals ? 0 : 1);
  return { winner, you: p0.goals, them: p1.goals, et: m.extraTime };
}

interface StageStat {
  played: number;
  won: number;
}

function run(numRuns: number, scale: number) {
  const stages = ["group", "r16", "qf", "sf", "final"] as const;
  const stat: Record<string, StageStat> = {};
  for (const s of stages) stat[s] = { played: 0, won: 0 };

  let completions = 0;
  let totalGoalsYou = 0;
  let totalGoalsThem = 0;
  let totalMatches = 0;
  let etMatches = 0;
  const reachedStage: Record<string, number> = { group: 0, r16: 0, qf: 0, sf: 0, final: 0 };

  for (let i = 0; i < numRuns; i++) {
    const rng = makeRng(1000 + i);
    const { deck, captainId } = buildPlayerDeck(rng);
    let runState: RunState = newRun(deck, captainId);

    while (runState.alive && !isRunWon(runState)) {
      const stage = stageForIndex(runState.matchIndex);
      reachedStage[stage] = (reachedStage[stage] ?? 0) + 1;
      let opponent: OpponentTeam;
      try {
        opponent = drawOpponent(stage, runState.defeated, rng);
      } catch {
        break; // pool exhausted (shouldn't happen in a single run)
      }

      const res = simMatch(runState.deck as PlayerCard[], runState.captainId, opponent, stage, scale, rng);
      const won = res.winner === 0;
      stat[stage]!.played++;
      if (won) stat[stage]!.won++;
      totalMatches++;
      totalGoalsYou += res.you;
      totalGoalsThem += res.them;
      if (res.et) etMatches++;

      runState = advanceRun(runState, won, opponent.id);
      if (won && !isRunWon(runState)) {
        // Reward growth: a rolled premium joins the deck, like the real LockerRoom.
        const reward = rollPlayerReward(stageForIndex(runState.matchIndex - 1), PREMIUMS, rng);
        runState = applyReward(runState, reward);
      }
    }

    if (isRunWon(runState)) completions++;
  }

  const pct = (n: number, d: number) => (d === 0 ? "—" : `${((100 * n) / d).toFixed(1)}%`);
  console.log(`\nArcade Monte-Carlo — ${numRuns} runs (both sides = engine AI; permadeath; handicap scale ${scale})\n`);
  console.log("Per-stage win rate (when the stage is reached):");
  for (const s of stages) {
    console.log(`  ${s.padEnd(6)}  win ${pct(stat[s]!.won, stat[s]!.played).padStart(6)}   (reached ${reachedStage[s]})`);
  }
  console.log(`\nFull-run completion (won the Final): ${pct(completions, numRuns)}  (${completions}/${numRuns})`);
  console.log(`Avg goals/match:  you ${(totalGoalsYou / totalMatches).toFixed(2)}  ·  them ${(totalGoalsThem / totalMatches).toFixed(2)}`);
  console.log(`Matches to extra time: ${pct(etMatches, totalMatches)}`);
}

const n = Number(process.argv[2] ?? 3000);
const handicapScale = Number(process.argv[3] ?? 1);
run(n, handicapScale);
