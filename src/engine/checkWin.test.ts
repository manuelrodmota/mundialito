import { describe, it, expect } from "vitest";
import { checkWin, beginExtraTime } from "./checkWin.ts";
import { makeRng } from "./rng.ts";
import { XG_TIEBREAK_GAP } from "./constants.ts";
import type { MatchState, PlayerState } from "./types.ts";

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    goals: 0,
    xg: 0,
    fatigue: 10,
    scoredFirstAt: null,
    maxStamina: 8,
    stamina: 8,
    drawPile: [],
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    tacticalsThisHalf: 1,
    tacticSpent: 0,
    tacticBonus: 0,
    board: { attack: [], defense: [] },
    formation: "balanced",
    powers: [],
    captainId: "",
    momentum: 0,
    handOfGodUsed: false,
    ...overrides,
  };
}

function makeMatch(
  g0: number,
  g1: number,
  round = 5,
  extraTime = false,
  etRound = 0,
  xg0 = 0,
  xg1 = 0,
): MatchState {
  return {
    round,
    extraTime,
    etRound,
    players: [
      makePlayerState({ goals: g0, xg: xg0 }),
      makePlayerState({ goals: g1, xg: xg1 }),
    ],
    opponent: {
      id: "opp",
      name: "Opponent",
      nation: "Germany",
      year: 2022,
      tier: "A",
      strength: 80,
      squad: [],
      preferredFormation: "balanced",
      isChampion: false,
    },
    phase: "resolve",
    winner: null,
  };
}

describe("checkWin — regulation mercy rule", () => {
  it("mercy rule triggers at 3–0 mid-match", () => {
    const m = makeMatch(3, 0, 4);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
    expect(m.phase).toBe("end");
  });

  it("mercy rule triggers for player 1 at 0–3", () => {
    const m = makeMatch(0, 3, 4);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(1);
  });

  it("5–2 triggers mercy (lead=3)", () => {
    const m = makeMatch(5, 2, 7);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
  });

  it("2–0 does NOT trigger mercy mid-match", () => {
    const m = makeMatch(2, 0, 4);
    checkWin(m, makeRng(42));
    expect(m.winner).toBeNull();
    expect(m.phase).toBe("resolve");
  });
});

describe("checkWin — regulation full time (R10)", () => {
  it("3–2 at R10: player 0 wins", () => {
    const m = makeMatch(3, 2, 10);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
    expect(m.phase).toBe("end");
  });

  it("2–3 at R10: player 1 wins", () => {
    const m = makeMatch(2, 3, 10);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(1);
  });

  it("2–2 at R10: transitions to ET (no winner yet)", () => {
    const m = makeMatch(2, 2, 10);
    checkWin(m, makeRng(42));
    expect(m.winner).toBeNull();
    expect(m.extraTime).toBe(true);
    expect(m.etRound).toBe(0);
  });
});

describe("checkWin — partial xG tie-break (v12 §19#5)", () => {
  it("level on goals at full time + a clear xG edge → that side wins outright, no ET", () => {
    const m = makeMatch(2, 2, 8);
    m.players[0]!.xgAccum = 2.0;
    m.players[1]!.xgAccum = 2.0 - (XG_TIEBREAK_GAP + 0.1); // gap ≥ threshold
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
    expect(m.decidedByTieBreak).toBe(true);
    expect(m.extraTime).toBe(false);
    expect(m.phase).toBe("end");
  });

  it("player 1's clear xG edge wins the tie-break", () => {
    const m = makeMatch(1, 1, 8);
    m.players[0]!.xgAccum = 1.2;
    m.players[1]!.xgAccum = 1.2 + (XG_TIEBREAK_GAP + 0.05);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(1);
    expect(m.decidedByTieBreak).toBe(true);
  });

  it("a narrow xG gap (< threshold) still goes to golden-goal ET", () => {
    const m = makeMatch(2, 2, 8);
    m.players[0]!.xgAccum = 1.5;
    m.players[1]!.xgAccum = 1.5 - (XG_TIEBREAK_GAP - 0.1); // gap just under threshold
    checkWin(m, makeRng(42));
    expect(m.winner).toBeNull();
    expect(m.extraTime).toBe(true);
    expect(m.decidedByTieBreak).toBeFalsy();
  });
});

describe("beginExtraTime", () => {
  it("resets xg meters to 0 but carries goals forward", () => {
    const m = makeMatch(2, 2, 10, false, 0, 0.7, 0.4);
    m.players[0]!.goals = 2;
    m.players[1]!.goals = 2;
    beginExtraTime(m, makeRng(42));
    expect(m.players[0]!.xg).toBe(0);
    expect(m.players[1]!.xg).toBe(0);
    expect(m.players[0]!.goals).toBe(2);
    expect(m.players[1]!.goals).toBe(2);
  });

  it("sets extraTime=true and etRound=0", () => {
    const m = makeMatch(2, 2, 10);
    beginExtraTime(m, makeRng(42));
    expect(m.extraTime).toBe(true);
    expect(m.etRound).toBe(0);
  });

  it("clears fatigue for both players", () => {
    const m = makeMatch(2, 2, 10);
    m.players[0]!.fatigue = 25;
    m.players[1]!.fatigue = 20;
    beginExtraTime(m, makeRng(42));
    expect(m.players[0]!.fatigue).toBe(0);
    expect(m.players[1]!.fatigue).toBe(0);
  });

  it("resets tactical counters for both players", () => {
    const m = makeMatch(2, 2, 10);
    m.players[0]!.tacticalsThisHalf = 2;
    m.players[1]!.tacticalsThisHalf = 1;
    beginExtraTime(m, makeRng(42));
    expect(m.players[0]!.tacticalsThisHalf).toBe(0);
    expect(m.players[1]!.tacticalsThisHalf).toBe(0);
  });
});

describe("checkWin — ET golden goal", () => {
  it("ET: player 0 scores first → wins immediately", () => {
    const m = makeMatch(3, 2, 10, true, 1);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
    expect(m.phase).toBe("end");
  });

  it("ET: player 1 scores first → wins immediately", () => {
    const m = makeMatch(2, 3, 10, true, 1);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(1);
  });

  it("ET: no goal scored yet → match continues", () => {
    const m = makeMatch(2, 2, 10, true, 1);
    checkWin(m, makeRng(42));
    expect(m.winner).toBeNull();
  });

  it("ET safety at etRound=5 with no goals: higher accumulated xG wins", () => {
    const m = makeMatch(2, 2, 10, true, 5, 0.7, 0.3);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(0);
    expect(m.phase).toBe("end");
  });

  it("ET safety at etRound=5: player 1 wins with higher xG", () => {
    const m = makeMatch(2, 2, 10, true, 5, 0.2, 0.8);
    checkWin(m, makeRng(42));
    expect(m.winner).toBe(1);
  });
});
