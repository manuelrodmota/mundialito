import { describe, it, expect } from "vitest";
import { synthMatch, mapReveal } from "./synthMatch";
import type { PublicState, PrivateView, RoundResult } from "../../engine/multiplayer";
import type { CardInPlay, PlayerCard } from "../../engine/types";

function card(id: string): PlayerCard {
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
  };
}

function cip(id: string): CardInPlay {
  return { card: card(id), lane: "attack", statuses: [], faceDown: true };
}

const pub: PublicState = {
  status: "playing",
  round: 3,
  extraTime: false,
  phase: "plan",
  winner: null,
  goals: [1, 2],
  meters: [0.4, 0.7],
  fatigues: [5, 9],
  powers: [[], []],
  meta: [
    { displayName: "Ana", captainNation: "Brazil" },
    { displayName: "Beto", captainNation: "Italy" },
  ],
  plan: { lockedIn: [false, true], playedTacticals: [[], []], planDeadline: null },
};

const pv: PrivateView = {
  index: 1,
  round: 3,
  extraTime: false,
  hand: [card("h1"), card("h2")],
  drawPile: [card("d1")],
  discard: [],
  exiled: [],
  locked: [],
  powers: [],
  stamina: 8,
  maxStamina: 8,
  tacticalsThisHalf: 0,
  captainId: "h1",
  formation: "offensive",
};

describe("synthMatch perspective", () => {
  it("always places the local player at players[0] with their private hand", () => {
    const m = synthMatch(pub, pv, 1, false); // joiner is server index 1
    expect(m.players[0].hand.map((c) => c.id)).toEqual(["h1", "h2"]);
    expect(m.players[0].goals).toBe(pub.goals[1]); // self = index 1 → goals 2
    expect(m.players[0].formation).toBe("offensive");
    // Opponent (server index 0) carries no hidden cards.
    expect(m.players[1].hand).toEqual([]);
    expect(m.players[1].goals).toBe(pub.goals[0]); // them = index 0 → goals 1
    expect(m.opponent.name).toBe("Ana"); // opponent label = the OTHER player's meta
  });

  it("remaps the winner into the local perspective (self-win → 0)", () => {
    const won = { ...pub, winner: 1 as const };
    expect(synthMatch(won, pv, 1, false).winner).toBe(0); // server winner 1 == self → synthetic 0
    expect(synthMatch(won, pv, 0, false).winner).toBe(1); // from the other seat, it's a loss
  });

  it("uses the private view's round (the next round after a reveal)", () => {
    const nextRoundPv = { ...pv, round: 4 };
    const m = synthMatch(pub, nextRoundPv, 1, false);
    expect(m.round).toBe(4);
  });
});

describe("mapReveal perspective", () => {
  const result: RoundResult = {
    round: 3,
    extraTime: false,
    halftime: false,
    decided: false,
    winner: null,
    sides: [
      {
        goalsThisRound: 0,
        goalsTotal: 1,
        xg: 0.3,
        formation: "balanced",
        atkEff: 100,
        defEff: 80,
        atkMult: 1,
        defMult: 1,
        fatigue: 5,
        fatigueDefMult: 0.9,
        rarityBonus: 0,
        synAtk: 0,
        synDef: 0,
        pressureBefore: 0.1,
        pressureAfter: 0.4,
        board: { attack: [cip("a-p0")], defense: [] },
      },
      {
        goalsThisRound: 1,
        goalsTotal: 2,
        xg: 0.6,
        formation: "offensive",
        atkEff: 120,
        defEff: 60,
        atkMult: 1.25,
        defMult: 0.75,
        fatigue: 9,
        fatigueDefMult: 0.85,
        rarityBonus: 4,
        synAtk: 2,
        synDef: 0,
        pressureBefore: 0.5,
        pressureAfter: 0,
        board: { attack: [cip("a-p1")], defense: [] },
      },
    ],
  };

  it("maps neutral sides to you/them for the joiner (selfIdx 1) and reveals boards face-up", () => {
    const { revealBoards, roundReport } = mapReveal(result, 1);
    // self = side 1
    expect(roundReport.youGoalsThisRound).toBe(1);
    expect(roundReport.youGoalsTotal).toBe(2);
    expect(roundReport.themGoalsTotal).toBe(1);
    expect(roundReport.you.scored).toBe(true);
    expect(roundReport.them.scored).toBe(false);
    expect(revealBoards.you.attack[0].card.id).toBe("a-p1");
    expect(revealBoards.them.attack[0].card.id).toBe("a-p0");
    expect(revealBoards.you.attack[0].faceDown).toBe(false);
  });

  it("is mirror-symmetric: the creator (selfIdx 0) sees the opposite you/them", () => {
    const creator = mapReveal(result, 0);
    expect(creator.roundReport.youGoalsTotal).toBe(1);
    expect(creator.roundReport.themGoalsTotal).toBe(2);
    expect(creator.revealBoards.you.attack[0].card.id).toBe("a-p0");
  });
});
