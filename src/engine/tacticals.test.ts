import { describe, it, expect } from "vitest";
import {
  canPlayTactical,
  playTactical,
  tacticalGatePassed,
  resolveInstants,
  applyTacticalXg,
  applyDefensiveTacticals,
  applyCatenaccio,
  applyHighPress,
  applyTimeWasting,
} from "./tacticals.ts";
import { routeCard } from "./cards.ts";
import { computeEffectiveStats, atkOf } from "./effectiveStats.ts";
import { makeRng } from "./rng.ts";
import type { CardInPlay, MatchState, PlayerCard, PlayerState, TacticalCard } from "./types.ts";

const rng = makeRng(1);

function makePlayerCard(
  id: string,
  position: PlayerCard["position"] = "MID",
  overrides: Partial<PlayerCard> = {},
): PlayerCard {
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
    ...overrides,
  };
}

function wrapPlayer(card: PlayerCard, lane: "attack" | "defense" = "attack"): CardInPlay {
  return { card, lane, statuses: [], faceDown: true };
}

function wrapTactical(card: TacticalCard): CardInPlay {
  return { card, lane: "attack", statuses: [], faceDown: false };
}

function tac(kind: TacticalCard["effect"]["kind"], effect: Partial<TacticalCard["effect"]> = {}, category: TacticalCard["category"] = "skill"): TacticalCard {
  return {
    id: `tac-${kind}`,
    type: "tactical",
    name: kind,
    category,
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind, ...effect },
  };
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
    injured: [],
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
    expect(canPlayTactical(makeState())).toBe(true);
  });

  it("allows second play (1 of 2)", () => {
    expect(canPlayTactical(makeState({ tacticalsThisHalf: 1 }))).toBe(true);
  });

  it("blocks third play (2 of 2 reached)", () => {
    expect(canPlayTactical(makeState({ tacticalsThisHalf: 2 }))).toBe(false);
  });

  it("increments counter when tactical is played", () => {
    const s = makeState();
    playTactical(s);
    expect(s.tacticalsThisHalf).toBe(1);
    playTactical(s);
    expect(s.tacticalsThisHalf).toBe(2);
  });
});

describe("tacticalGatePassed", () => {
  it("returns true when no gate required", () => {
    expect(tacticalGatePassed(makeState(), { kind: "var" })).toBe(true);
  });

  it("passes FWD gate when board has required FWD", () => {
    const s = makeState({ board: { attack: [wrapPlayer(makePlayerCard("fwd1", "FWD"))], defense: [] } });
    expect(tacticalGatePassed(s, { kind: "penalty", requiresPosition: "FWD", requiresCount: 1 })).toBe(true);
  });

  it("fails FWD gate when no FWD on board", () => {
    const s = makeState({ board: { attack: [wrapPlayer(makePlayerCard("mid1", "MID"))], defense: [] } });
    expect(tacticalGatePassed(s, { kind: "penalty", requiresPosition: "FWD", requiresCount: 1 })).toBe(false);
  });

  it("High Press gate: passes with 2+ FWD-or-MID", () => {
    const s = makeState({
      board: {
        attack: [wrapPlayer(makePlayerCard("fwd1", "FWD")), wrapPlayer(makePlayerCard("mid1", "MID"))],
        defense: [],
      },
    });
    expect(tacticalGatePassed(s, { kind: "highPress", requiresCount: 2 })).toBe(true);
  });

  it("High Press gate: fails with only 1 FWD", () => {
    const s = makeState({ board: { attack: [wrapPlayer(makePlayerCard("fwd1", "FWD"))], defense: [] } });
    expect(tacticalGatePassed(s, { kind: "highPress", requiresCount: 2 })).toBe(false);
  });
});

describe("resolveInstants — VAR", () => {
  it("VAR cancels the most-recent opponent tactical", () => {
    const p0 = makeState({ board: { attack: [wrapTactical(tac("var", {}, "instant"))], defense: [] } });
    const p1 = makeState({ board: { attack: [wrapTactical(tac("tikiTaka", { amount: 0.2 }))], defense: [] } });
    const m = makeMatch(p0, p1);

    resolveInstants(m, rng);

    expect(p1.board.attack.some((c) => c.card.type === "tactical")).toBe(false);
    expect(p1.exiled).toHaveLength(1);
  });
});

describe("resolveInstants — Offside Trap (contributes 0, not exile)", () => {
  it("silences the opponent's highest-ATK attacker for the round", () => {
    const star = makePlayerCard("star", "FWD", { atk: 95, rarity: "legendary" });
    const scrub = makePlayerCard("scrub", "FWD", { atk: 50 });
    const p0 = makeState({ board: { attack: [wrapTactical(tac("offsideTrap", { requiresPosition: "DEF", requiresCount: 1 }, "instant"))], defense: [] } });
    const p1 = makeState({ board: { attack: [wrapPlayer(scrub), wrapPlayer(star)], defense: [] } });
    const m = makeMatch(p0, p1);

    resolveInstants(m, rng);

    const starCip = p1.board.attack.find((c) => c.card.id === "star")!;
    expect(starCip.statuses.some((s) => s.kind === "offside")).toBe(true);
    expect(atkOf(starCip)).toBe(0);
    // It is silenced, not removed/exiled.
    expect(p1.board.attack).toHaveLength(2);
    expect(p1.exiled).toHaveLength(0);
  });
});

describe("resolveInstants — Injury persists for the match", () => {
  it("records the injured card id so it re-applies after the card cycles", () => {
    const target = makePlayerCard("inj", "FWD");
    const p0 = makeState({ board: { attack: [wrapTactical(tac("injury", { amount: 15 }, "instant"))], defense: [] } });
    const p1 = makeState({ board: { attack: [wrapPlayer(target)], defense: [] } });
    const m = makeMatch(p0, p1);

    resolveInstants(m, rng);
    expect(p1.injured).toContain("inj");

    // Next round the card is fielded fresh (no statuses). computeEffectiveStats re-stamps the injury.
    const fresh: CardInPlay = { card: target, lane: "attack", statuses: [], faceDown: true };
    const p1Next = makeState({ injured: ["inj"], board: { attack: [fresh], defense: [] } });
    computeEffectiveStats(p1Next);
    expect(fresh.statuses.some((s) => s.kind === "injured")).toBe(true);
  });
});

describe("resolveInstants — Water Break", () => {
  it("resets fatigue to 0 and does NOT leak stamina to next round", () => {
    const p0 = makeState({ fatigue: 18, board: { attack: [wrapTactical(tac("waterBreak", { amount: 2 }))], defense: [] } });
    const m = makeMatch(p0, makeState());

    resolveInstants(m, rng);

    expect(p0.fatigue).toBe(0);
    expect(p0.tacticBonus).toBe(0); // +2 stamina is a planning-budget effect, not a next-round leak.
  });
});

describe("resolveInstants — Substitution", () => {
  it("reduces fatigue by 8 and draws a card; no stamina leak", () => {
    const drawCard = makePlayerCard("d1");
    const p0 = makeState({ fatigue: 20, drawPile: [drawCard], board: { attack: [wrapTactical(tac("substitution", { amount: 8 }))], defense: [] } });
    const m = makeMatch(p0, makeState());

    resolveInstants(m, rng);

    expect(p0.fatigue).toBe(12);
    expect(p0.hand.some((c) => c.id === "d1")).toBe(true);
    expect(p0.tacticBonus).toBe(0);
  });
});

describe("resolveInstants — Team Talk", () => {
  it("clears fatigue, removes debuffs, and draws 2", () => {
    const debuffed = wrapPlayer(makePlayerCard("hurt"));
    debuffed.statuses.push({ kind: "pressed", amount: 10 });
    const p0 = makeState({
      fatigue: 22,
      drawPile: [makePlayerCard("d1"), makePlayerCard("d2")],
      board: { attack: [wrapTactical(tac("teamTalk")), debuffed], defense: [] },
    });
    const m = makeMatch(p0, makeState());

    resolveInstants(m, rng);

    expect(p0.fatigue).toBe(0);
    expect(debuffed.statuses.some((s) => s.kind === "pressed")).toBe(false);
    expect(p0.hand).toHaveLength(2);
    expect(p0.tacticBonus).toBe(0);
  });
});

describe("applyTacticalXg — Counter-Attack (your DEF >= their ATK)", () => {
  it("fires when own DEF_eff >= opponent ATK_eff, not otherwise", () => {
    const p0 = makeState({ board: { attack: [wrapTactical(tac("counterAttack", { amount: 0.4 }))], defense: [] } });
    const m = makeMatch(p0, makeState());

    // signature: (m, idx, baseXg, oppDefEff, ownAtkEff, ownDefEff, oppAtkEff)
    const fires = applyTacticalXg(m, 0, 0.1, 0, 0, /* ownDef */ 100, /* oppAtk */ 50);
    expect(fires).toBeCloseTo(0.5, 5);

    const noFire = applyTacticalXg(m, 0, 0.1, 0, 0, /* ownDef */ 40, /* oppAtk */ 100);
    expect(noFire).toBeCloseTo(0.1, 5);
  });
});

describe("applyTacticalXg — Penalty / Tiki-Taka / Long Ball", () => {
  it("adds the card's xG amount", () => {
    const pen = makeMatch(makeState({ board: { attack: [wrapTactical(tac("penalty", { amount: 0.6 }))], defense: [] } }), makeState());
    expect(applyTacticalXg(pen, 0, 0.1, 50, 50)).toBeCloseTo(0.7, 5);

    const tiki = makeMatch(makeState({ board: { attack: [wrapTactical(tac("tikiTaka", { amount: 0.2 }))], defense: [] } }), makeState());
    expect(applyTacticalXg(tiki, 0, 0.1, 50, 50)).toBeCloseTo(0.3, 5);

    const lb = makeMatch(makeState({ board: { attack: [wrapTactical(tac("longBall", { amount: 0.45 }))], defense: [] } }), makeState());
    expect(applyTacticalXg(lb, 0, 0.1, 50, 50)).toBeCloseTo(0.55, 5);
  });
});

describe("applyTacticalXg — Nutmeg (forward ignores defense)", () => {
  it("gives back the suppressed xG, capped at the forward's ATK", () => {
    const fwd = makePlayerCard("f", "FWD", { atk: 70 }); // atkOf = 70 (common)
    const p0 = makeState({ board: { attack: [wrapTactical(tac("nutmeg")), wrapPlayer(fwd)], defense: [] } });
    const m = makeMatch(p0, makeState());

    // oppDefEff = 100 → 100 * DEF_COEFF(0.9) = 90; min(70, 90) = 70; /XG_SLOPE(180).
    const result = applyTacticalXg(m, 0, 0.1, 100, 50);
    expect(result).toBeCloseTo(0.1 + 70 / 180, 5);
  });
});

describe("applyTacticalXg — Hand of God (Power, once per match)", () => {
  it("adds its amount once from powers[] and sets the used flag", () => {
    const hog = tac("handOfGod", { amount: 0.8 }, "power");
    const p0 = makeState({ powers: [hog] });
    const m = makeMatch(p0, makeState());

    const first = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(first).toBeCloseTo(0.9, 5);
    expect(m.players[0]!.handOfGodUsed).toBe(true);

    const second = applyTacticalXg(m, 0, 0.1, 50, 50);
    expect(second).toBeCloseTo(0.1, 5);
  });

  it("does not fire when already used", () => {
    const p0 = makeState({ powers: [tac("handOfGod", { amount: 0.8 }, "power")], handOfGodUsed: true });
    const m = makeMatch(p0, makeState());
    expect(applyTacticalXg(m, 0, 0.1, 50, 50)).toBeCloseTo(0.1, 5);
  });
});

describe("applyDefensiveTacticals — Fortress (Power)", () => {
  it("adds Fortress DEF every round it is held", () => {
    const p0 = makeState({ powers: [tac("fortress", { amount: 8 }, "power")] });
    const m = makeMatch(p0, makeState());
    expect(applyDefensiveTacticals(m, 0, 50)).toBe(58);
  });

  it("Catenaccio is NOT a flat DEF buff anymore", () => {
    const p0 = makeState({ board: { attack: [], defense: [wrapTactical(tac("catenaccio", { amount: 0.5 }))] } });
    const m = makeMatch(p0, makeState());
    expect(applyDefensiveTacticals(m, 0, 50)).toBe(50);
  });
});

describe("applyCatenaccio — halves opponent xG", () => {
  it("multiplies the opponent's round xG by the card amount", () => {
    const p0 = makeState({ board: { attack: [], defense: [wrapTactical(tac("catenaccio", { amount: 0.5 }))] } });
    const m = makeMatch(p0, makeState());
    expect(applyCatenaccio(m, 0, 0.4)).toBeCloseTo(0.2, 5);
  });

  it("no-op when the defender holds no Catenaccio", () => {
    const m = makeMatch(makeState(), makeState());
    expect(applyCatenaccio(m, 0, 0.4)).toBeCloseTo(0.4, 5);
  });
});

describe("applyHighPress — DEF debuff + carried fatigue", () => {
  it("presses the opponent's lead defender and adds fatigue", () => {
    const p0 = makeState({ board: { attack: [wrapTactical(tac("highPress", { requiresCount: 2 }))], defense: [] } });
    const def = wrapPlayer(makePlayerCard("d", "DEF"), "defense");
    const p1 = makeState({ board: { attack: [], defense: [def] } });
    const m = makeMatch(p0, p1);

    applyHighPress(m, 0);

    expect(def.statuses.some((s) => s.kind === "pressed")).toBe(true);
    expect(p1.fatigue).toBe(6);
  });
});

describe("applyTimeWasting — suppresses opponent xG floor next round", () => {
  it("sets the opponent's floor-suppression flag", () => {
    const p0 = makeState({ board: { attack: [wrapTactical(tac("timeWasting"))], defense: [] } });
    const p1 = makeState();
    const m = makeMatch(p0, p1);

    applyTimeWasting(m, 0);
    expect(p1.xgFloorSuppressed).toBe(true);
  });
});

describe("computeEffectiveStats — Talisman (Power, captain-nation stat fold)", () => {
  it("adds +amount per captain-nation card in the matching lane", () => {
    const cap = makePlayerCard("cap", "FWD", { nation: "Argentina" });
    const friend = makePlayerCard("friend", "FWD", { nation: "Argentina" });
    const foreigner = makePlayerCard("foreigner", "FWD", { nation: "Brazil" });
    const board = { attack: [wrapPlayer(cap), wrapPlayer(friend), wrapPlayer(foreigner)], defense: [] };

    const without = computeEffectiveStats(makeState({ captainId: "cap", board: { attack: board.attack.map((c) => ({ ...c, statuses: [] })), defense: [] } }));
    const withTalisman = computeEffectiveStats(makeState({
      captainId: "cap",
      hand: [cap, friend, foreigner],
      powers: [tac("talisman", { amount: 3 }, "power")],
      board: { attack: board.attack.map((c) => ({ ...c, statuses: [] })), defense: [] },
    }));

    // 2 Argentina attackers → +3 × 2 = +6 ATK.
    expect(withTalisman.atkEff - without.atkEff).toBeCloseTo(6, 5);
  });
});

describe("computeEffectiveStats — Total Football (Power, cross-lane fold)", () => {
  it("lends a share of each player's other stat to the opposite lane", () => {
    const attacker = makePlayerCard("a", "FWD", { atk: 70, def: 70 });
    const defender = makePlayerCard("d", "DEF", { atk: 70, def: 70 });
    const mkBoard = () => ({ attack: [wrapPlayer(attacker)], defense: [wrapPlayer(defender, "defense")] });

    const without = computeEffectiveStats(makeState({ board: mkBoard() }));
    const withTf = computeEffectiveStats(makeState({ powers: [tac("totalFootball", { amount: 0.5 }, "power")], board: mkBoard() }));

    // defender lends 0.5 × atk(70) = 35 to attack; attacker lends 0.5 × def(70) = 35 to defense.
    expect(withTf.atkEff - without.atkEff).toBeCloseTo(35, 5);
    expect(withTf.defEff - without.defEff).toBeCloseTo(35, 5);
  });
});

describe("single-use lifecycle (routeCard)", () => {
  it("skill is exiled, instant is exiled, power persists in powers[]", () => {
    const p = makeState();
    routeCard(p, tac("teamTalk"));
    routeCard(p, tac("var", {}, "instant"));
    routeCard(p, tac("fortress", { amount: 8 }, "power"));

    expect(p.exiled).toHaveLength(2);
    expect(p.powers).toHaveLength(1);
    expect(p.powers[0]!.effect.kind).toBe("fortress");
  });
});
