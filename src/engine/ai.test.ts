import { describe, it, expect } from "vitest";
import { decideTurn } from "./ai.ts";
import { newMatch, startRound, resolveRound } from "./match.ts";
import { makeRng } from "./rng.ts";
import { validLineup } from "./validateLineup.ts";
import type { Card, MatchState, OpponentTeam, PlayerCard } from "./types.ts";

function makePlayerCard(id: string, overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    id,
    type: "player",
    name: id,
    nation: "Brazil",
    worldCup: 2022,
    position: "MID",
    overall: 80,
    atk: 70,
    def: 70,
    cost: 2,
    rarity: "common",
    slots: 1,
    ...overrides,
  };
}

function makeDeck(size = 10, prefix = "p"): Card[] {
  return Array.from({ length: size }, (_, i) =>
    makePlayerCard(`${prefix}${i}`),
  );
}

function makeOpp(): OpponentTeam {
  return {
    id: "opp",
    name: "Test Opponent",
    nation: "Germany",
    year: 2022,
    tier: "B",
    strength: 70,
    squad: [],
    preferredFormation: "balanced",
    isChampion: false,
  };
}

describe("decideTurn — produces legal lineups", () => {
  it("AI decision always passes validLineup", () => {
    const rng = makeRng(42);
    const m = newMatch(42, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    decideTurn(m, 1, rng);

    expect(validLineup(m.players[1]!, m.round)).toBe(true);
  });

  it("AI produces a result with formation set", () => {
    const rng = makeRng(123);
    const m = newMatch(123, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    const decision = decideTurn(m, 1, rng);
    expect(["offensive", "balanced", "defensive"]).toContain(decision.formation);
  });
});

describe("decideTurn — formation strategy", () => {
  it("picks defensive formation when AI is fresh (fatigue<=10) and leading", () => {
    const rng = makeRng(42);
    const m = newMatch(42, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    m.players[1]!.goals = 2;
    m.players[0]!.goals = 0;
    m.players[1]!.fatigue = 5;

    const decision = decideTurn(m, 1, rng);
    expect(decision.formation).toBe("defensive");
  });

  it("picks offensive formation when chasing (AI trailing)", () => {
    const rng = makeRng(99);
    const m = newMatch(99, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    m.players[1]!.goals = 0;
    m.players[0]!.goals = 2;
    m.players[1]!.fatigue = 5;

    const decision = decideTurn(m, 1, rng);
    expect(decision.formation).toBe("offensive");
  });

  it("picks offensive in ET (push for golden goal)", () => {
    const rng = makeRng(55);
    const m = newMatch(55, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    m.extraTime = true;
    m.players[1]!.goals = 2;
    m.players[0]!.goals = 2;

    const decision = decideTurn(m, 1, rng);
    expect(decision.formation).toBe("offensive");
  });
});

describe("decideTurn — tactical safety", () => {
  it("never plays more than 2 tacticals per half", () => {
    const rng = makeRng(42);
    const m = newMatch(42, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    const decision = decideTurn(m, 1, rng);
    expect(decision.tacticals.length).toBeLessThanOrEqual(2);
  });

  it("blocked from 3rd play when already at cap", () => {
    const rng = makeRng(77);
    const m = newMatch(77, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    startRound(m, rng);

    m.players[1]!.tacticalsThisHalf = 2;
    const decision = decideTurn(m, 1, rng);
    expect(decision.tacticals).toHaveLength(0);
  });
});

describe("AI-vs-AI full match", () => {
  function runAiVsAi(seed: number): MatchState {
    const rng = makeRng(seed);
    const m = newMatch(seed, { deck: makeDeck(10, "a"), captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());

    let iterations = 0;
    while (m.winner === null && iterations < 200) {
      startRound(m, rng);
      decideTurn(m, 0, rng);
      decideTurn(m, 1, rng);
      resolveRound(m, rng);
      iterations++;
    }

    return m;
  }

  it("AI-vs-AI always completes with a winner", () => {
    const m = runAiVsAi(12345);
    expect(m.winner).not.toBeNull();
  });

  it("AI-vs-AI match including potential ET produces a winner", () => {
    let foundEt = false;
    for (let seed = 100; seed < 120; seed++) {
      const m = runAiVsAi(seed);
      if (m.extraTime) foundEt = true;
      expect(m.winner).not.toBeNull();
    }
    void foundEt;
  });

  it("AI-vs-AI is deterministic: same seed → same final state", () => {
    const m1 = runAiVsAi(42);
    const m2 = runAiVsAi(42);
    expect(m1.winner).toBe(m2.winner);
    expect(m1.players[0]!.goals).toBe(m2.players[0]!.goals);
    expect(m1.players[1]!.goals).toBe(m2.players[1]!.goals);
    expect(m1.round).toBe(m2.round);
  });
});
