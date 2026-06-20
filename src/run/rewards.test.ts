import { describe, it, expect } from "vitest";
import {
  rollPlayerReward,
  offerTacticals,
  applyReward,
  swapTactical,
  removeCard,
  countTacticals,
} from "./rewards.ts";
import { makeRng } from "../engine/rng.ts";
import { players } from "../data/players.ts";
import { tacticals } from "../data/tacticals.ts";
import { newRun } from "./runState.ts";
import { RUN_TACTICAL_DECK_CAP } from "../engine/constants.ts";
import type { TacticalCard, RunState } from "../engine/types.ts";

const commonPlayers = players.filter((p) => p.rarity === "common");
const epicPlayers = players.filter((p) => p.rarity === "epic");

/** Build a minimal RunState with an 11-player deck and the given tacticals. */
function makeRun(tacCards: TacticalCard[] = []): RunState {
  const deckPlayers = commonPlayers.slice(0, 11);
  const deck = [...deckPlayers, ...tacCards];
  return newRun(deck, deckPlayers[0]!.id);
}

describe("countTacticals", () => {
  it("returns 0 for a deck with no tacticals", () => {
    const deck = commonPlayers.slice(0, 5);
    expect(countTacticals(deck)).toBe(0);
  });

  it("counts only tactical cards, not player cards", () => {
    const deck = [...commonPlayers.slice(0, 3), tacticals[0]!, tacticals[1]!];
    expect(countTacticals(deck)).toBe(2);
  });
});

describe("rollPlayerReward", () => {
  it("returns a player from the pool", () => {
    const result = rollPlayerReward("group", players, makeRng(1));
    expect(result.type).toBe("player");
    expect(players.some((p) => p.id === result.id)).toBe(true);
  });

  it("is deterministic given the same seed", () => {
    const r1 = rollPlayerReward("group", players, makeRng(42));
    const r2 = rollPlayerReward("group", players, makeRng(42));
    expect(r1.id).toBe(r2.id);
  });

  it("group stage predominantly rewards common/rare players", () => {
    const rarities = new Map<string, number>();
    for (let seed = 0; seed < 200; seed++) {
      const p = rollPlayerReward("group", players, makeRng(seed));
      rarities.set(p.rarity, (rarities.get(p.rarity) ?? 0) + 1);
    }
    const commonCount = rarities.get("common") ?? 0;
    const rareCount = rarities.get("rare") ?? 0;
    const epicCount = rarities.get("epic") ?? 0;
    const legendaryCount = rarities.get("legendary") ?? 0;
    expect(commonCount + rareCount).toBeGreaterThan(epicCount + legendaryCount);
  });

  it("final stage rewards higher rarity than group stage on average", () => {
    const RARITY_SCORE: Record<string, number> = {
      common: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
    };

    function avgScore(stage: RunState["stage"]): number {
      let total = 0;
      for (let seed = 0; seed < 200; seed++) {
        const p = rollPlayerReward(stage, players, makeRng(seed));
        total += RARITY_SCORE[p.rarity] ?? 1;
      }
      return total / 200;
    }

    expect(avgScore("final")).toBeGreaterThan(avgScore("group"));
  });

  it("falls back to any pool card if no card of the rolled rarity exists", () => {
    const onlyEpic = epicPlayers.slice(0, 3);
    const result = rollPlayerReward("group", onlyEpic, makeRng(1));
    expect(onlyEpic.some((p) => p.id === result.id)).toBe(true);
  });

  it("later stages produce more legendary rewards than group stage (full pool)", () => {
    function legendaryRate(stage: RunState["stage"]): number {
      let count = 0;
      for (let seed = 0; seed < 400; seed++) {
        const p = rollPlayerReward(stage, players, makeRng(seed));
        if (p.rarity === "legendary") count++;
      }
      return count / 400;
    }
    expect(legendaryRate("final")).toBeGreaterThan(legendaryRate("group"));
  });
});

describe("offerTacticals", () => {
  it("returns at most 3 distinct tactical cards", () => {
    const offers = offerTacticals(tacticals, makeRng(7));
    expect(offers.length).toBeLessThanOrEqual(3);
    const ids = offers.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns fewer than 3 cards when the pool has fewer than 3", () => {
    const smallPool = tacticals.slice(0, 2);
    const offers = offerTacticals(smallPool, makeRng(1));
    expect(offers.length).toBe(2);
  });

  it("is deterministic given the same seed", () => {
    const o1 = offerTacticals(tacticals, makeRng(55));
    const o2 = offerTacticals(tacticals, makeRng(55));
    expect(o1.map((t) => t.id)).toEqual(o2.map((t) => t.id));
  });

  it("returns different offers for different seeds", () => {
    const o1 = offerTacticals(tacticals, makeRng(1));
    const o2 = offerTacticals(tacticals, makeRng(2));
    expect(o1.map((t) => t.id)).not.toEqual(o2.map((t) => t.id));
  });
});

describe("applyReward", () => {
  it("adds the player card to the deck", () => {
    const run = makeRun();
    const player = players.find((p) => p.rarity === "rare")!;
    const updated = applyReward(run, player);
    expect(updated.deck.some((c) => c.id === player.id)).toBe(true);
    expect(updated.deck.length).toBe(run.deck.length + 1);
  });

  it("adds a tactical card when below the cap", () => {
    const run = makeRun([tacticals[0]!]);
    const player = commonPlayers[0]!;
    const tac = tacticals[1]!;
    const updated = applyReward(run, player, tac);
    expect(updated.deck.filter((c) => c.type === "tactical").length).toBe(2);
  });

  it("does not add a tactical card when already at the cap", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    const player = commonPlayers[0]!;
    const extraTac = tacticals[RUN_TACTICAL_DECK_CAP]!;
    const updated = applyReward(run, player, extraTac);
    expect(countTacticals(updated.deck)).toBe(RUN_TACTICAL_DECK_CAP);
  });

  it("returns a new RunState without mutating the original", () => {
    const run = makeRun();
    const originalLength = run.deck.length;
    const player = commonPlayers[0]!;
    applyReward(run, player);
    expect(run.deck.length).toBe(originalLength);
  });
});

describe("swapTactical", () => {
  it("adds the new tactical and removes the exiled one", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    const incoming = tacticals[RUN_TACTICAL_DECK_CAP]!;
    const exileTarget = tacSet[0]!;

    const updated = swapTactical(run, incoming, exileTarget.id);

    expect(countTacticals(updated.deck)).toBe(RUN_TACTICAL_DECK_CAP);
    expect(updated.deck.some((c) => c.id === incoming.id)).toBe(true);
    expect(updated.deck.some((c) => c.id === exileTarget.id)).toBe(false);
  });

  it("never exceeds RUN_TACTICAL_DECK_CAP after a swap", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    const incoming = tacticals[RUN_TACTICAL_DECK_CAP]!;
    const updated = swapTactical(run, incoming, tacSet[0]!.id);
    expect(countTacticals(updated.deck)).toBeLessThanOrEqual(RUN_TACTICAL_DECK_CAP);
  });

  it("throws when deck is below the cap", () => {
    const run = makeRun([tacticals[0]!]);
    expect(() => swapTactical(run, tacticals[1]!, tacticals[0]!.id)).toThrow(
      "swapTactical called but deck has",
    );
  });

  it("throws when exile target is not found", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    expect(() => swapTactical(run, tacticals[RUN_TACTICAL_DECK_CAP]!, "non-existent-id")).toThrow(
      'Exile target "non-existent-id" not found',
    );
  });

  it("throws when exile target is a player card, not a tactical", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    const playerCardId = run.deck.find((c) => c.type === "player")!.id;
    expect(() =>
      swapTactical(run, tacticals[RUN_TACTICAL_DECK_CAP]!, playerCardId),
    ).toThrow("is not a tactical card");
  });

  it("returns a new RunState without mutating the original", () => {
    const tacSet = tacticals.slice(0, RUN_TACTICAL_DECK_CAP);
    const run = makeRun(tacSet);
    const originalDeck = [...run.deck];
    swapTactical(run, tacticals[RUN_TACTICAL_DECK_CAP]!, tacSet[0]!.id);
    expect(run.deck.map((c) => c.id)).toEqual(originalDeck.map((c) => c.id));
  });
});

describe("removeCard", () => {
  it("removes the card by id", () => {
    const tac = tacticals[0]!;
    const run = makeRun([tac]);
    const updated = removeCard(run, tac.id);
    expect(updated.deck.some((c) => c.id === tac.id)).toBe(false);
    expect(updated.deck.length).toBe(run.deck.length - 1);
  });

  it("removes a player card by id", () => {
    const run = makeRun();
    const playerToRemove = run.deck.find((c) => c.type === "player")!;
    const updated = removeCard(run, playerToRemove.id);
    expect(updated.deck.some((c) => c.id === playerToRemove.id)).toBe(false);
  });

  it("throws when the card is not found", () => {
    const run = makeRun();
    expect(() => removeCard(run, "non-existent-id")).toThrow(
      'removeCard: card "non-existent-id" not found',
    );
  });

  it("returns a new RunState without mutating the original", () => {
    const tac = tacticals[0]!;
    const run = makeRun([tac]);
    const originalLength = run.deck.length;
    removeCard(run, tac.id);
    expect(run.deck.length).toBe(originalLength);
  });
});
