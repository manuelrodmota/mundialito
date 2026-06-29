import { describe, it, expect } from "vitest";
import type { Card, PlayerCard, TacticalCard } from "../types.ts";
import { resolvePending, replayMoves } from "./replay.ts";
import { validateCommit, applyCommit } from "./applyCommit.ts";
import { buildMatch } from "./replay.ts";
import { publicPlanState, privateView, placeholderOpponent, EMPTY_PENDING } from "./views.ts";
import type { Commit, MatchInputs } from "./types.ts";

function player(id: string, o: Partial<PlayerCard> = {}): PlayerCard {
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
    ...o,
  };
}

function deck(prefix: string, size = 12): Card[] {
  return Array.from({ length: size }, (_, i) => player(`${prefix}${i}`));
}

const inputs: MatchInputs = {
  seed: 1234,
  in0: { deck: deck("a"), captainId: "a0" },
  in1: { deck: deck("b"), captainId: "b0" },
};
const opp = placeholderOpponent();

/** Field the first two hand cards into attack, balanced formation. */
function commitFromHand(handIds: string[]): Commit {
  return { formation: "balanced", attackIds: handIds.slice(0, 2), defenseIds: [], tacticalIds: [] };
}

describe("multiplayer replay determinism", () => {
  it("two independent replays of the same inputs+moves yield identical state", () => {
    const a = buildMatch(inputs, opp);
    const b = buildMatch(inputs, opp);
    const c0 = commitFromHand(a.match.players[0]!.hand.map((c) => c.id));
    const c1 = commitFromHand(a.match.players[1]!.hand.map((c) => c.id));

    const ra = resolvePending(inputs, opp, [], c0, c1);
    const rb = resolvePending(inputs, opp, [], c0, c1);

    expect(rb.result).toEqual(ra.result);
    expect(rb.match.players[0]!.goals).toBe(ra.match.players[0]!.goals);
    expect(rb.match.players[1]!.xg).toBe(ra.match.players[1]!.xg);
    // The whole post-resolve state matches (proves RNG is reconstructed identically).
    expect(JSON.stringify(rb.match)).toBe(JSON.stringify(ra.match));
    expect(b).toBeDefined();
  });

  it("replaying the persisted move log reproduces the live state", () => {
    const start = buildMatch(inputs, opp);
    const c0 = commitFromHand(start.match.players[0]!.hand.map((c) => c.id));
    const c1 = commitFromHand(start.match.players[1]!.hand.map((c) => c.id));
    const out = resolvePending(inputs, opp, [], c0, c1);

    // Rebuild from just (inputs + move log) — the server's source of truth.
    const replayed = replayMoves(inputs, opp, out.moves);
    expect(JSON.stringify(replayed.match)).toBe(JSON.stringify(out.match));
  });

  it("advances the round and deals a fresh hand when the match continues", () => {
    const start = buildMatch(inputs, opp);
    const c0 = commitFromHand(start.match.players[0]!.hand.map((c) => c.id));
    const c1 = commitFromHand(start.match.players[1]!.hand.map((c) => c.id));
    const out = resolvePending(inputs, opp, [], c0, c1);

    if (out.result.winner === null) {
      expect(out.match.round).toBe(2);
      expect(out.match.phase).toBe("plan");
      expect(out.match.players[0]!.hand.length).toBeGreaterThan(0);
    }
  });
});

describe("validateCommit (server anti-cheat)", () => {
  it("accepts a legal lineup", () => {
    const { match } = buildMatch(inputs, opp);
    const handIds = match.players[0]!.hand.map((c) => c.id);
    const ok = validateCommit(match.players[0]!, commitFromHand(handIds), 1);
    expect(ok.ok).toBe(true);
  });

  it("rejects a commit referencing cards not in hand", () => {
    const { match } = buildMatch(inputs, opp);
    const bad: Commit = {
      formation: "balanced",
      attackIds: ["not-in-hand-1", "not-in-hand-2"],
      defenseIds: [],
      tacticalIds: [],
    };
    const res = validateCommit(match.players[0]!, bad, 1);
    expect(res.ok).toBe(false);
  });

  it("rejects a lineup that exceeds the card cap", () => {
    // Hand of 5 commons all fielded → 5 player cards > CARD_CAP(round 1) = 4.
    const { match } = buildMatch(inputs, opp);
    const handIds = match.players[0]!.hand.map((c) => c.id);
    const tooMany: Commit = {
      formation: "balanced",
      attackIds: handIds.slice(0, 5),
      defenseIds: [],
      tacticalIds: [],
    };
    const res = validateCommit(match.players[0]!, tooMany, 1);
    expect(res.ok).toBe(false);
  });

  it("validateCommit does not mutate the passed-in state", () => {
    const { match } = buildMatch(inputs, opp);
    const before = JSON.stringify(match.players[0]!);
    validateCommit(match.players[0]!, commitFromHand(match.players[0]!.hand.map((c) => c.id)), 1);
    expect(JSON.stringify(match.players[0]!)).toBe(before);
  });
});

describe("a-ciegas public projection", () => {
  it("the planning public state never leaks the opponent's hand or lineup", () => {
    const { match } = buildMatch(inputs, opp);
    const meta = [
      { displayName: "A", captainNation: "Brazil" },
      { displayName: "B", captainNation: "Brazil" },
    ] as [{ displayName: string; captainNation: string }, { displayName: string; captainNation: string }];
    const pub = publicPlanState(match, meta, [EMPTY_PENDING, EMPTY_PENDING], Date.now() + 60000);

    const serialized = JSON.stringify(pub);
    // None of either player's actual hand card ids appear in the public planning surface.
    for (const p of match.players) {
      for (const c of p.hand) {
        expect(serialized).not.toContain(c.id);
      }
    }
    expect(pub.plan?.lockedIn).toEqual([false, false]);
  });

  it("a private view exposes only that player's own hand", () => {
    const { match } = buildMatch(inputs, opp);
    const pv0 = privateView(match, 0);
    const own = new Set(match.players[0]!.hand.map((c) => c.id));
    expect(pv0.hand.every((c) => own.has(c.id))).toBe(true);
    // It must not contain any of player 1's cards.
    const oppIds = new Set(match.players[1]!.hand.map((c) => c.id));
    expect(pv0.hand.some((c) => oppIds.has(c.id))).toBe(false);
  });
});

describe("played tacticals surface in the plan view", () => {
  it("shows a committed tactical face-up to both sides", () => {
    // Give player 0 a tactical in hand by seeding a deck with one and replaying to find it.
    const tac: TacticalCard = {
      id: "tac-tiki",
      type: "tactical",
      name: "Tiki-Taka",
      category: "skill",
      cost: 1,
      slots: 1,
      rarity: "rare",
      effect: { kind: "tikiTaka", amount: 0.2, requiresPosition: "MID", requiresCount: 2 },
    };
    const tInputs: MatchInputs = {
      seed: 7,
      in0: { deck: [...deck("a", 8), tac], captainId: "a0" },
      in1: { deck: deck("b"), captainId: "b0" },
    };
    const { match } = buildMatch(tInputs, opp);
    // Only assert projection mechanics if the tactical landed in the opening hand.
    const inHand = match.players[0]!.hand.some((c) => c.id === tac.id);
    if (!inHand) return;
    const pending = { ...EMPTY_PENDING, tacticalIds: [tac.id] };
    const meta = [
      { displayName: "A", captainNation: "" },
      { displayName: "B", captainNation: "" },
    ] as [{ displayName: string; captainNation: string }, { displayName: string; captainNation: string }];
    const pub = publicPlanState(match, meta, [pending, EMPTY_PENDING], null);
    expect(pub.plan?.playedTacticals[0].map((c) => c.id)).toContain(tac.id);
  });
});

describe("applyCommit mirrors the SP commit path", () => {
  it("fields players face-down and removes them from hand", () => {
    const { match } = buildMatch(inputs, opp);
    const p = match.players[0]!;
    const ids = p.hand.slice(0, 2).map((c) => c.id);
    const before = p.hand.length;
    const res = applyCommit(p, { formation: "offensive", attackIds: ids, defenseIds: [], tacticalIds: [] });
    expect(res.committedPlayers).toBe(2);
    expect(res.skipped).toBe(0);
    expect(p.board.attack.length).toBe(2);
    expect(p.board.attack.every((c) => c.faceDown)).toBe(true);
    expect(p.hand.length).toBe(before - 2);
    expect(p.formation).toBe("offensive");
  });
});
