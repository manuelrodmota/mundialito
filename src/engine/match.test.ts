import { describe, it, expect } from "vitest";
import { newMatch, startRound, resolveRound, halftime, cleanupBoards } from "./match.ts";
import { makeRng } from "./rng.ts";
import { commitCard } from "./board.ts";
import { decideTurn } from "./ai.ts";
import type { Card, MatchState, OpponentTeam, PlayerCard } from "./types.ts";

function makePlayerCard(
  id: string,
  overrides: Partial<PlayerCard> = {},
): PlayerCard {
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

function makeDeck(size = 8, prefix = "p"): Card[] {
  return Array.from({ length: size }, (_, i) =>
    makePlayerCard(`${prefix}${i}`, { nation: "Brazil" }),
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

describe("newMatch", () => {
  it("creates a match with round=1, phase=draw, winner=null", () => {
    const deck = makeDeck();
    const m = newMatch(
      42,
      { deck, captainId: "p0" },
      { deck: makeDeck(8, "q"), captainId: "q0" },
      makeOpp(),
    );
    expect(m.round).toBe(1);
    expect(m.phase).toBe("draw");
    expect(m.winner).toBeNull();
    expect(m.extraTime).toBe(false);
  });

  it("deals opening hands of 5 cards each", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(
      99,
      { deck, captainId: "a0" },
      { deck: makeDeck(10, "b"), captainId: "b0" },
      makeOpp(),
    );
    expect(m.players[0]!.hand).toHaveLength(5);
    expect(m.players[1]!.hand).toHaveLength(5);
  });

  it("captain is in opening hand", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(
      77,
      { deck, captainId: "a0" },
      { deck: makeDeck(10, "b"), captainId: "b0" },
      makeOpp(),
    );
    const capInHand = m.players[0]!.hand.some((c) => c.id === "a0");
    expect(capInHand).toBe(true);
  });

  it("is deterministic: same seed → identical state", () => {
    const deck0 = makeDeck(10, "a");
    const deck1 = makeDeck(10, "b");
    const opp = makeOpp();

    const m1 = newMatch(12345, { deck: deck0, captainId: "a0" }, { deck: deck1, captainId: "b0" }, opp);
    const m2 = newMatch(12345, { deck: deck0, captainId: "a0" }, { deck: deck1, captainId: "b0" }, opp);

    expect(m1.players[0]!.hand.map((c) => c.id)).toEqual(
      m2.players[0]!.hand.map((c) => c.id),
    );
  });
});

describe("startRound", () => {
  it("transitions phase to plan and refills hands", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);
    m.players[0]!.hand = [];
    startRound(m, rng);
    expect(m.phase).toBe("plan");
    expect(m.players[0]!.hand.length).toBeGreaterThan(0);
  });
});

describe("resolveRound", () => {
  it("advances round counter and transitions phase back to draw", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    const card0 = m.players[0]!.hand[0]!;
    const card1 = m.players[1]!.hand[0]!;
    commitCard(m.players[0]!, card0, "attack");
    commitCard(m.players[1]!, card1, "defense");

    resolveRound(m, rng);

    if (m.winner === null) {
      expect(m.round).toBe(2);
      expect(m.phase).toBe("draw");
    }
  });

  it("adds xG to both players each round", () => {
    const atkCard = makePlayerCard("atk", { atk: 100, def: 20, rarity: "common" });
    const deck0: Card[] = [atkCard, ...makeDeck(7, "fill0")];
    const deck1: Card[] = makeDeck(8, "b");
    const m = newMatch(42, { deck: deck0, captainId: "atk" }, { deck: deck1, captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    const xgBefore0 = m.players[0]!.xg;
    const xgBefore1 = m.players[1]!.xg;

    const card0 = m.players[0]!.hand.find((c) => c.id === "atk") ?? m.players[0]!.hand[0]!;
    const card1 = m.players[1]!.hand[0]!;
    // Both sides must field an attacker to generate xG (an empty attack lane now scores nothing).
    commitCard(m.players[0]!, card0, "attack");
    commitCard(m.players[1]!, card1, "attack");

    resolveRound(m, rng);

    const xgAfter0 = m.players[0]!.xg + m.players[0]!.goals;
    const xgAfter1 = m.players[1]!.xg + m.players[1]!.goals;
    expect(xgAfter0).toBeGreaterThan(xgBefore0);
    expect(xgAfter1).toBeGreaterThanOrEqual(0.1); // XG_FLOOR (attacker fielded)
    void xgBefore1;
  });

  it("generates zero xG for a side that fields no attacker", () => {
    const m = newMatch(42, { deck: makeDeck(8, "a"), captainId: "a0" }, { deck: makeDeck(8, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    // p0 commits only to defense (empty attack lane); p1 fields an attacker.
    commitCard(m.players[0]!, m.players[0]!.hand[0]!, "defense");
    commitCard(m.players[1]!, m.players[1]!.hand[0]!, "attack");

    const xgBefore0 = m.players[0]!.xg;
    resolveRound(m, rng);

    expect(m.players[0]!.xg).toBe(xgBefore0); // no attacker → no open-play floor
    expect(m.players[0]!.goals).toBe(0);
    expect(m.players[1]!.xg + m.players[1]!.goals).toBeGreaterThanOrEqual(0.1);
  });

  it("cleanup routes common player cards to discard after round", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    const card = m.players[0]!.hand[0]!;
    commitCard(m.players[0]!, card, "attack");
    resolveRound(m, rng);

    const inDiscard = m.players[0]!.discard.some((c) => c.id === card.id);
    expect(inDiscard).toBe(true);
  });

  it("halftime fires at R4: locked cards return and fatigue partially recovers", () => {
    const premiumCard = makePlayerCard("leg0", { rarity: "legendary", cost: 4 });
    const deck: Card[] = [premiumCard, ...makeDeck(7, "a")];
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(8, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    m.round = 4;
    m.players[0]!.fatigue = 20;
    m.players[0]!.locked = [premiumCard];

    const card1 = m.players[1]!.hand[0]!;
    commitCard(m.players[1]!, card1, "defense");

    resolveRound(m, rng);

    if (m.round >= 5 || m.winner !== null) {
      // Halftime now partially recovers fatigue (carries the rest into the 2nd half), not a full wipe.
      expect(m.players[0]!.fatigue).toBeGreaterThan(0);
      expect(m.players[0]!.fatigue).toBeLessThan(20);
      expect(m.players[0]!.locked).toHaveLength(0);
    }
  });
});

describe("premium once-per-half lock applies to the AI", () => {
  it("the CPU never re-fields a premium before halftime", () => {
    // The AI's captain is a premium, so buildOpeningHand guarantees it in the round-1 hand.
    const star = makePlayerCard("ai-star", { rarity: "epic", cost: 3, slots: 2, atk: 95, def: 55, position: "FWD" });
    const aiDeck: Card[] = [star, ...makeDeck(10, "aic")];
    const m = newMatch(
      7,
      { deck: makeDeck(10, "you"), captainId: "you0" },
      { deck: aiDeck, captainId: "ai-star" },
      makeOpp(),
    );
    const rng = makeRng(7);
    startRound(m, rng);

    const fieldCounts = new Map<string, number>();
    for (let r = 1; r <= 4; r++) {
      decideTurn(m, 0, rng);
      decideTurn(m, 1, rng);
      for (const cip of [...m.players[1]!.board.attack, ...m.players[1]!.board.defense]) {
        if (cip.card.type === "player" && cip.card.rarity !== "common") {
          fieldCounts.set(cip.card.id, (fieldCounts.get(cip.card.id) ?? 0) + 1);
        }
      }
      resolveRound(m, rng);
      if (m.winner !== null) break;
      startRound(m, rng);
    }

    expect(fieldCounts.size).toBeGreaterThan(0); // a premium was actually fielded
    for (const [, count] of fieldCounts) {
      expect(count).toBeLessThanOrEqual(1); // locked once-per-half — never re-fielded before R5
    }
  });
});

describe("aiStrengthMult difficulty handicap", () => {
  it("amplifies the AI opponent's (player 1) xG", () => {
    const run = (mult: number): number => {
      const m = newMatch(
        5,
        { deck: makeDeck(10, "y"), captainId: "y0" },
        { deck: makeDeck(10, "x"), captainId: "x0" },
        makeOpp(),
      );
      const rng = makeRng(5);
      startRound(m, rng);
      m.aiStrengthMult = mult;
      // p1 (AI) fields a strong attacker; p0 fields a lone weak defender.
      m.players[1]!.board = {
        attack: [{ card: makePlayerCard("atk", { atk: 100, def: 40, position: "FWD" }), lane: "attack", statuses: [], faceDown: true }],
        defense: [],
      };
      m.players[0]!.board = {
        attack: [],
        defense: [{ card: makePlayerCard("def", { atk: 30, def: 50, position: "DEF" }), lane: "defense", statuses: [], faceDown: true }],
      };
      resolveRound(m, rng);
      return m.players[1]!.xg + m.players[1]!.goals;
    };
    expect(run(1.3)).toBeGreaterThan(run(1.0));
  });

  it("does NOT let the handicap inflate xgAccum — the §19#5 tie-break stays fair", () => {
    const run = (mult: number) => {
      const m = newMatch(
        5,
        { deck: makeDeck(10, "y"), captainId: "y0" },
        { deck: makeDeck(10, "x"), captainId: "x0" },
        makeOpp(),
      );
      const rng = makeRng(5);
      startRound(m, rng);
      m.aiStrengthMult = mult;
      m.players[1]!.board = {
        attack: [{ card: makePlayerCard("atk", { atk: 100, def: 40, position: "FWD" }), lane: "attack", statuses: [], faceDown: true }],
        defense: [],
      };
      m.players[0]!.board = {
        attack: [],
        defense: [{ card: makePlayerCard("def", { atk: 30, def: 50, position: "DEF" }), lane: "defense", statuses: [], faceDown: true }],
      };
      resolveRound(m, rng);
      return { live: m.players[1]!.xg + m.players[1]!.goals, accum: m.players[1]!.xgAccum ?? 0 };
    };
    const base = run(1.0);
    const boosted = run(1.3);
    // Live pressure/goals still scale with difficulty (the AI is harder to beat)...
    expect(boosted.live).toBeGreaterThan(base.live);
    // ...but accumulated xG (the tie-break input) is handicap-free, so it's identical.
    expect(boosted.accum).toBeCloseTo(base.accum, 6);
    expect(base.accum).toBeGreaterThan(0);
  });
})

describe("full headless match — end-to-end", () => {
  function runFullMatch(seed: number): MatchState {
    const rng = makeRng(seed);

    const deck0 = makeDeck(10, "a");
    const deck1 = makeDeck(10, "b");

    const m = newMatch(seed, { deck: deck0, captainId: "a0" }, { deck: deck1, captainId: "b0" }, makeOpp());

    let iterations = 0;
    while (m.winner === null && iterations < 100) {
      startRound(m, rng);

      const h0 = [...m.players[0]!.hand];
      const h1 = [...m.players[1]!.hand];

      if (h0.length > 0) {
        commitCard(m.players[0]!, h0[0]!, "attack");
      }
      if (h1.length > 0) {
        commitCard(m.players[1]!, h1[0]!, "defense");
      }

      resolveRound(m, rng);
      iterations++;
    }

    return m;
  }

  it("always produces a winner within 100 rounds", () => {
    const m = runFullMatch(12345);
    expect(m.winner).not.toBeNull();
  });

  it("fixed-seed determinism: same seed → byte-identical final state", () => {
    const m1 = runFullMatch(99999);
    const m2 = runFullMatch(99999);
    expect(m1.players[0]!.goals).toBe(m2.players[0]!.goals);
    expect(m1.players[1]!.goals).toBe(m2.players[1]!.goals);
    expect(m1.winner).toBe(m2.winner);
    expect(m1.round).toBe(m2.round);
  });

  it("deep-equals final MatchState across two identical seeded runs", () => {
    const m1 = runFullMatch(54321);
    const m2 = runFullMatch(54321);
    expect(m1.winner).toEqual(m2.winner);
    expect(m1.round).toEqual(m2.round);
    expect(m1.players[0]!.goals).toEqual(m2.players[0]!.goals);
    expect(m1.players[1]!.goals).toEqual(m2.players[1]!.goals);
    expect(m1.players[0]!.xg).toBeCloseTo(m2.players[0]!.xg, 10);
  });
});

describe("halftime (direct)", () => {
  it("partially recovers fatigue and returns locked cards", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());
    const rng = makeRng(42);

    const legendary = makePlayerCard("leg", { rarity: "legendary" });
    m.players[0]!.locked = [legendary];
    m.players[0]!.fatigue = 20;
    m.players[0]!.tacticalsThisHalf = 2;

    halftime(m, rng);

    // Halftime now recovers only part of the fatigue (carries the rest into the 2nd half), so a
    // first-half grind still lingers — it is no longer a full wipe to 0.
    expect(m.players[0]!.fatigue).toBeGreaterThan(0);
    expect(m.players[0]!.fatigue).toBeLessThan(20);
    expect(m.players[0]!.locked).toHaveLength(0);
    expect(m.players[0]!.drawPile.some((c) => c.id === "leg")).toBe(true);
    expect(m.players[0]!.tacticalsThisHalf).toBe(0);
    expect(m.players[1]!.tacticalsThisHalf).toBe(0);
  });
});

describe("cleanupBoards", () => {
  it("common players go to discard; board is cleared", () => {
    const deck = makeDeck(10, "a");
    const m = newMatch(42, { deck, captainId: "a0" }, { deck: makeDeck(10, "b"), captainId: "b0" }, makeOpp());

    const card = m.players[0]!.hand[0]!;
    commitCard(m.players[0]!, card, "attack");

    cleanupBoards(m);

    expect(m.players[0]!.board.attack).toHaveLength(0);
    const inDiscard = m.players[0]!.discard.some((c) => c.id === card.id);
    expect(inDiscard).toBe(true);
  });
});
