import { describe, it, expect } from "vitest";
import {
  canPlayTactical,
  playTactical,
  tacticalGatePassed,
  resolveInstants,
  applyTacticalXg,
  applyDefensiveTacticals,
} from "./tacticals.ts";
import { routeCard } from "./cards.ts";
import type { CardInPlay, MatchState, PlayerCard, PlayerState, TacticalCard } from "./types.ts";

function makePlayerCard(id: string, position: PlayerCard["position"] = "MID"): PlayerCard {
  return {
    id,
    type: "player",
    name: id,
    nation: "Brazil",
    worldCup: 2022,
    position,
    overall: 80,
    atk: 70,
    def: 70,
    cost: 2,
    rarity: "common",
    slots: 1,
  };
}

function wrapPlayer(card: PlayerCard, lane: "attack" | "defense" = "attack"): CardInPlay {
  return { card, lane, statuses: [], faceDown: true };
}

function wrapTactical(card: TacticalCard): CardInPlay {
  return { card, lane: "attack", statuses: [], faceDown: false };
}

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    goals: 0,
    xg: 0,
    fatigue: 0,
    scoredFirstAt: null,
    maxStamina: 8,
    stamina: 8,
    drawPile: [],
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    tacticalsThisHalf: 0,
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

function makeMatch(p0: PlayerState, p1: PlayerState): MatchState {
  return {
    round: 1,
    extraTime: false,
    etRound: 0,
    players: [p0, p1],
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

describe("canPlayTactical / playTactical", () => {
  it("allows play when under limit (0 of 2)", () => {
    const s = makeState();
    expect(canPlayTactical(s)).toBe(true);
  });

  it("allows second play (1 of 2)", () => {
    const s = makeState({ tacticalsThisHalf: 1 });
    expect(canPlayTactical(s)).toBe(true);
  });

  it("blocks third play (2 of 2 reached)", () => {
    const s = makeState({ tacticalsThisHalf: 2 });
    expect(canPlayTactical(s)).toBe(false);
  });

  it("increments counter when tactical is played", () => {
    const s = makeState();
    playTactical(s);
    expect(s.tacticalsThisHalf).toBe(1);
    playTactical(s);
    expect(s.tacticalsThisHalf).toBe(2);
  });

  it("blocks both sides: separate counters per PlayerState", () => {
    const s0 = makeState({ tacticalsThisHalf: 2 });
    const s1 = makeState({ tacticalsThisHalf: 0 });
    expect(canPlayTactical(s0)).toBe(false);
    expect(canPlayTactical(s1)).toBe(true);
  });
});

describe("tacticalGatePassed", () => {
  it("returns true when no gate required", () => {
    const s = makeState();
    expect(tacticalGatePassed(s, { kind: "var" })).toBe(true);
  });

  it("passes FWD gate when board has required FWD", () => {
    const s = makeState({
      board: {
        attack: [wrapPlayer(makePlayerCard("fwd1", "FWD"))],
        defense: [],
      },
    });
    expect(tacticalGatePassed(s, { kind: "penalty", requiresPosition: "FWD", requiresCount: 1 })).toBe(true);
  });

  it("fails FWD gate when no FWD on board", () => {
    const s = makeState({
      board: {
        attack: [wrapPlayer(makePlayerCard("mid1", "MID"))],
        defense: [],
      },
    });
    expect(tacticalGatePassed(s, { kind: "penalty", requiresPosition: "FWD", requiresCount: 1 })).toBe(false);
  });

  it("High Press gate: passes with 2+ FWD-or-MID", () => {
    const s = makeState({
      board: {
        attack: [
          wrapPlayer(makePlayerCard("fwd1", "FWD")),
          wrapPlayer(makePlayerCard("mid1", "MID")),
        ],
        defense: [],
      },
    });
    expect(tacticalGatePassed(s, { kind: "highPress", requiresCount: 2 })).toBe(true);
  });

  it("High Press gate: fails with only 1 FWD", () => {
    const s = makeState({
      board: {
        attack: [wrapPlayer(makePlayerCard("fwd1", "FWD"))],
        defense: [],
      },
    });
    expect(tacticalGatePassed(s, { kind: "highPress", requiresCount: 2 })).toBe(false);
  });
});

describe("resolveInstants — VAR", () => {
  it("VAR cancels the most-recent opponent tactical", () => {
    const oppTac: TacticalCard = {
      id: "tac-tiki",
      type: "tactical",
      name: "Tiki-Taka",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "epic",
      effect: { kind: "tikiTaka", amount: 0.2 },
    };
    const varCard: TacticalCard = {
      id: "tac-var",
      type: "tactical",
      name: "VAR",
      category: "instant",
      cost: 2,
      slots: 1,
      rarity: "rare",
      effect: { kind: "var" },
    };
    const p0 = makeState({ board: { attack: [wrapTactical(varCard)], defense: [] } });
    const p1 = makeState({ board: { attack: [wrapTactical(oppTac)], defense: [] } });
    const m = makeMatch(p0, p1);

    resolveInstants(m);

    expect(p1.board.attack.some((c) => c.card.id === "tac-tiki")).toBe(false);
    expect(p1.exiled.some((c) => c.id === "tac-tiki")).toBe(true);
  });
});

describe("applyTacticalXg — Counter-Attack", () => {
  it("Counter-Attack fires only when oppDefEff >= ownAtkEff", () => {
    const caTac: TacticalCard = {
      id: "tac-ca",
      type: "tactical",
      name: "Counter-Attack",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "rare",
      effect: { kind: "counterAttack", amount: 0.4 },
    };
    const p0 = makeState({ board: { attack: [wrapTactical(caTac)], defense: [] } });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const baseXg = 0.1;
    const resultFires = applyTacticalXg(m, 0, baseXg, 100, 50);
    expect(resultFires).toBeCloseTo(baseXg + 0.4, 5);

    const resultNoFire = applyTacticalXg(m, 0, baseXg, 40, 100);
    expect(resultNoFire).toBeCloseTo(baseXg, 5);
  });
});

describe("applyTacticalXg — Penalty", () => {
  it("Penalty adds 0.85 to base xG", () => {
    const penTac: TacticalCard = {
      id: "tac-pen",
      type: "tactical",
      name: "Penalty Kick",
      category: "skill",
      cost: 2,
      slots: 1,
      rarity: "epic",
      effect: { kind: "penalty", amount: 0.85 },
    };
    const p0 = makeState({ board: { attack: [wrapTactical(penTac)], defense: [] } });
    const p1 = makeState();
    const m = makeMatch(p0, p1);
    const result = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(result).toBeCloseTo(0.1 + 0.85, 5);
  });
});

describe("applyTacticalXg — Hand of God (once per match)", () => {
  it("Hand of God adds 1.0 once and sets handOfGodUsed", () => {
    const hogTac: TacticalCard = {
      id: "tac-hog",
      type: "tactical",
      name: "Hand of God",
      category: "power",
      cost: 3,
      slots: 2,
      rarity: "legendary",
      effect: { kind: "handOfGod", amount: 1.0 },
    };
    const p0 = makeState({ board: { attack: [wrapTactical(hogTac)], defense: [] } });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const first = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(first).toBeCloseTo(1.1, 5);
    expect(m.players[0]!.handOfGodUsed).toBe(true);

    const second = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(second).toBeCloseTo(0.1, 5);
  });
});

describe("applyTacticalXg — Tiki-Taka", () => {
  it("Tiki-Taka adds 0.20 to base xG", () => {
    const tikiTac: TacticalCard = {
      id: "tac-tt",
      type: "tactical",
      name: "Tiki-Taka",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "epic",
      effect: { kind: "tikiTaka", amount: 0.2 },
    };
    const p0 = makeState({ board: { attack: [wrapTactical(tikiTac)], defense: [] } });
    const p1 = makeState();
    const m = makeMatch(p0, p1);
    const result = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(result).toBeCloseTo(0.3, 5);
  });
});

describe("resolveInstants — Team Talk (skill)", () => {
  it("halves fatigue and adds tacticBonus", () => {
    const teamTalkCard: TacticalCard = {
      id: "tac-team-talk",
      type: "tactical",
      name: "Halftime Team Talk",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "rare",
      effect: { kind: "teamTalk" },
    };
    const p0 = makeState({
      fatigue: 20,
      board: { attack: [wrapTactical(teamTalkCard)], defense: [] },
    });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    resolveInstants(m);

    expect(p0.fatigue).toBe(10);
    expect(p0.tacticBonus).toBe(5);
  });

  it("does not affect opponent state", () => {
    const teamTalkCard: TacticalCard = {
      id: "tac-team-talk",
      type: "tactical",
      name: "Halftime Team Talk",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "rare",
      effect: { kind: "teamTalk" },
    };
    const p0 = makeState({
      fatigue: 18,
      board: { attack: [wrapTactical(teamTalkCard)], defense: [] },
    });
    const p1 = makeState({ fatigue: 15 });
    const m = makeMatch(p0, p1);

    resolveInstants(m);

    expect(p1.fatigue).toBe(15);
    expect(p1.tacticBonus).toBe(0);
  });
});

describe("resolveInstants — Substitution (skill)", () => {
  it("adds stamina bonus (tacticBonus) to the player", () => {
    const subCard: TacticalCard = {
      id: "tac-substitution",
      type: "tactical",
      name: "Substitution",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "common",
      effect: { kind: "substitution", amount: 8 },
    };
    const p0 = makeState({
      board: { attack: [wrapTactical(subCard)], defense: [] },
    });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    resolveInstants(m);

    expect(p0.tacticBonus).toBe(8);
  });
});

describe("resolveInstants — Water Break (skill)", () => {
  it("resets fatigue to 0 and adds tacticBonus", () => {
    const wbCard: TacticalCard = {
      id: "tac-water-break",
      type: "tactical",
      name: "Water Break",
      category: "skill",
      cost: 0,
      slots: 1,
      rarity: "common",
      effect: { kind: "waterBreak", amount: 2 },
    };
    const p0 = makeState({
      fatigue: 18,
      board: { attack: [wrapTactical(wbCard)], defense: [] },
    });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    resolveInstants(m);

    expect(p0.fatigue).toBe(0);
    expect(p0.tacticBonus).toBe(2);
  });
});

describe("single-use lifecycle", () => {
  it("skill card (Team Talk) is exiled after routeCard (not returned to discard)", () => {
    const teamTalkCard: TacticalCard = {
      id: "tac-team-talk",
      type: "tactical",
      name: "Halftime Team Talk",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "rare",
      effect: { kind: "teamTalk" },
    };
    const p0 = makeState();

    routeCard(p0, teamTalkCard);

    expect(p0.exiled).toHaveLength(1);
    expect(p0.exiled[0]!.id).toBe("tac-team-talk");
    expect(p0.discard).toHaveLength(0);
  });

  it("instant card (VAR) is exiled after routeCard", () => {
    const varCard: TacticalCard = {
      id: "tac-var",
      type: "tactical",
      name: "VAR Review",
      category: "instant",
      cost: 2,
      slots: 1,
      rarity: "rare",
      effect: { kind: "var" },
    };
    const p0 = makeState();

    routeCard(p0, varCard);

    expect(p0.exiled).toHaveLength(1);
    expect(p0.exiled[0]!.id).toBe("tac-var");
  });

  it("power card (Fortress) goes into player powers list after routeCard", () => {
    const fortressCard: TacticalCard = {
      id: "tac-fortress",
      type: "tactical",
      name: "Fortress",
      category: "power",
      cost: 3,
      slots: 1,
      rarity: "legendary",
      effect: { kind: "fortress", amount: 8 },
    };
    const p0 = makeState();

    routeCard(p0, fortressCard);

    expect(p0.powers).toHaveLength(1);
    expect(p0.powers[0]!.id).toBe("tac-fortress");
    expect(p0.exiled).toHaveLength(0);
  });

  it("Hand of God is blocked on second use (handOfGodUsed flag)", () => {
    const hogCard: TacticalCard = {
      id: "tac-hog",
      type: "tactical",
      name: "Hand of God",
      category: "power",
      cost: 3,
      slots: 2,
      rarity: "legendary",
      effect: { kind: "handOfGod", amount: 1.0 },
    };
    const p0 = makeState({
      handOfGodUsed: true,
      board: { attack: [wrapTactical(hogCard)], defense: [] },
    });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const result = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(result).toBeCloseTo(0.1, 5);
    expect(p0.handOfGodUsed).toBe(true);
  });
});

describe("applyDefensiveTacticals — Fortress persistence", () => {
  it("Fortress in powers increases defEff every round it is held", () => {
    const fortressCard: TacticalCard = {
      id: "tac-fortress",
      type: "tactical",
      name: "Fortress",
      category: "power",
      cost: 3,
      slots: 1,
      rarity: "legendary",
      effect: { kind: "fortress", amount: 8 },
    };
    const p0 = makeState({ powers: [fortressCard] });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const baseDefEff = 50;
    const result = applyDefensiveTacticals(m, 0, baseDefEff);
    expect(result).toBe(baseDefEff + 8);
  });

  it("Catenaccio adds flat +10 defEff when on the board", () => {
    const catenaccioCard: TacticalCard = {
      id: "tac-catenaccio",
      type: "tactical",
      name: "Catenaccio",
      category: "skill",
      cost: 2,
      slots: 1,
      rarity: "epic",
      effect: { kind: "catenaccio", requiresPosition: "DEF", requiresCount: 2 },
    };
    const p0 = makeState({
      board: { attack: [], defense: [wrapTactical(catenaccioCard)] },
    });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const result = applyDefensiveTacticals(m, 0, 50);
    expect(result).toBe(60);
  });
});

describe("applyTacticalXg — Total Football", () => {
  it("Total Football power adds +0.1 xG bonus per round it persists", () => {
    const tfCard: TacticalCard = {
      id: "tac-total-football",
      type: "tactical",
      name: "Total Football",
      category: "power",
      cost: 3,
      slots: 2,
      rarity: "legendary",
      effect: { kind: "totalFootball" },
    };
    const p0 = makeState({ powers: [tfCard] });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const result = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(result).toBeCloseTo(0.2, 5);
  });
});

describe("applyTacticalXg — Talisman", () => {
  it("Talisman power adds its amount to xG each round", () => {
    const talismanCard: TacticalCard = {
      id: "tac-talisman",
      type: "tactical",
      name: "Talisman",
      category: "power",
      cost: 2,
      slots: 1,
      rarity: "epic",
      effect: { kind: "talisman", amount: 3 },
    };
    const p0 = makeState({ powers: [talismanCard] });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    const result = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(result).toBeCloseTo(3.1, 5);
  });
});
