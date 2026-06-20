/**
 * WCC-014 — Tactical resolution engine (GDD v10 §10 / §12 / §17).
 *
 * This module resolves tactical effects during a round. It is distinct from
 * `src/data/tacticals.ts` (the catalog of card definitions).
 *
 * Instant order: VAR → Offside → Referee → Injury. GDD §10 line 208, §12.
 * xG modifiers fold last, after formation + fatigue. GDD §17 line 508.
 * Single-use: skills/instants → exiled; powers persist in PlayerState.powers.
 */

import type {
  MatchState,
  PlayerState,
  CardInPlay,
  TacticalCard,
  TacticalEffect,
} from "./types.ts";
import {
  TACTICALS_PER_HALF,
  COUNTER_ATTACK_XG,
  MOMENTUM_XG,
} from "./constants.ts";
import { addStatus, applySecondBooking, isBooked, removeStatus } from "./status.ts";
import { resetFatigue } from "./fatigue.ts";

/** Returns the opponent's player-index for a given player index. */
function opponent(idx: 0 | 1): 0 | 1 {
  return idx === 0 ? 1 : 0;
}

/**
 * Whether a player can still play a tactical this half.
 * GDD §17 lines 483-486.
 */
export function canPlayTactical(state: PlayerState): boolean {
  return state.tacticalsThisHalf < TACTICALS_PER_HALF;
}

/**
 * Records that a tactical was played, incrementing the half counter.
 * GDD §17 line 485.
 */
export function playTactical(state: PlayerState): void {
  state.tacticalsThisHalf += 1;
}

/**
 * Checks whether a tactical's positional gate is satisfied by the board.
 * GDD §12 table, §14 AC.
 */
export function tacticalGatePassed(state: PlayerState, effect: TacticalEffect): boolean {
  if (effect.requiresCount === undefined) return true;

  const allCards = [...state.board.attack, ...state.board.defense];

  if (effect.kind === "highPress") {
    const count = allCards.filter(
      (c) => c.card.type === "player" &&
        (c.card.position === "FWD" || c.card.position === "MID"),
    ).length;
    return count >= effect.requiresCount;
  }

  if (effect.requiresPosition === undefined) return true;

  const pos = effect.requiresPosition;
  const count = allCards.filter(
    (c) => c.card.type === "player" && c.card.position === pos,
  ).length;
  return count >= effect.requiresCount;
}

/**
 * Resolves Instant tactical effects in strict order: VAR → Offside → Referee → Injury.
 * Edits boards before stat calculation. GDD §10 line 208, §12.
 */
export function resolveInstants(m: MatchState): void {
  const instants = collectInstants(m);

  const order: TacticalEffect["kind"][] = [
    "var",
    "offsideTrap",
    "referee",
    "injury",
    "waterBreak",
    "substitution",
    "teamTalk",
  ];

  for (const kind of order) {
    for (const { playerIdx, card } of instants) {
      if (card.effect.kind !== kind) continue;

      const self = m.players[playerIdx]!;
      const opp = m.players[opponent(playerIdx)]!;

      applyInstantEffect(m, self, opp, card.effect);
    }
  }
}

interface InstantEntry {
  playerIdx: 0 | 1;
  card: TacticalCard;
}

function collectInstants(m: MatchState): InstantEntry[] {
  const result: InstantEntry[] = [];
  for (const idx of [0, 1] as const) {
    const state = m.players[idx]!;
    for (const cip of [...state.board.attack, ...state.board.defense]) {
      if (cip.card.type !== "tactical") continue;
      const t = cip.card as TacticalCard;
      if (t.category === "instant" || t.category === "skill") {
        result.push({ playerIdx: idx, card: t });
      }
    }
  }
  return result;
}

function applyInstantEffect(
  m: MatchState,
  self: PlayerState,
  opp: PlayerState,
  effect: TacticalEffect,
): void {
  switch (effect.kind) {
    case "var": {
      cancelOpponentTactical(opp);
      break;
    }
    case "offsideTrap": {
      const fwd = getFirstFwd(opp.board.attack);
      if (fwd) {
        opp.board.attack = opp.board.attack.filter((c) => c !== fwd);
        opp.exiled.push(fwd.card);
      }
      break;
    }
    case "referee": {
      const bookedCard = getFirstBookedOnBoard(opp);
      if (bookedCard) {
        applySecondBooking(bookedCard);
        if (bookedCard.statuses.some((s) => s.kind === "red")) {
          removeCardFromBoard(opp, bookedCard);
          opp.exiled.push(bookedCard.card);
        }
      } else {
        bookRandomCard(opp);
      }
      break;
    }
    case "injury": {
      const target = getRandomPlayerOnBoard(opp);
      if (target) {
        addStatus(target, { kind: "injured", amount: effect.amount ?? 15 });
      }
      break;
    }
    case "waterBreak": {
      resetFatigue(self);
      self.tacticBonus += effect.amount ?? 2;
      break;
    }
    case "substitution": {
      self.tacticBonus += effect.amount ?? 8;
      break;
    }
    case "teamTalk": {
      self.fatigue = Math.max(0, Math.floor(self.fatigue / 2));
      self.tacticBonus += effect.amount ?? 5;
      break;
    }
    default:
      break;
  }
  void m;
}

function cancelOpponentTactical(opp: PlayerState): void {
  const allCards = [...opp.board.attack, ...opp.board.defense];
  for (let i = allCards.length - 1; i >= 0; i--) {
    const c = allCards[i]!;
    if (c.card.type === "tactical") {
      removeCardFromBoard(opp, c);
      opp.exiled.push(c.card);
      return;
    }
  }
}

function getFirstFwd(lane: CardInPlay[]): CardInPlay | undefined {
  return lane.find((c) => c.card.type === "player" && c.card.position === "FWD");
}

function getFirstBookedOnBoard(state: PlayerState): CardInPlay | undefined {
  const all = [...state.board.attack, ...state.board.defense];
  return all.find((c) => isBooked(c));
}

function bookRandomCard(state: PlayerState): void {
  const all = [...state.board.attack, ...state.board.defense];
  const players = all.filter((c) => c.card.type === "player");
  if (players.length === 0) return;
  const target = players[0]!;
  addStatus(target, { kind: "booked" });
}

function removeCardFromBoard(state: PlayerState, card: CardInPlay): void {
  state.board.attack = state.board.attack.filter((c) => c !== card);
  state.board.defense = state.board.defense.filter((c) => c !== card);
}

function getRandomPlayerOnBoard(state: PlayerState): CardInPlay | undefined {
  const all = [...state.board.attack, ...state.board.defense];
  return all.find((c) => c.card.type === "player");
}

/**
 * Computes the xG bonus from active tactical/power effects for the given player.
 * Applied after formation and fatigue, folding last into the xG pipeline.
 * GDD §12 table lines 235-253, §17 line 508.
 */
export function applyTacticalXg(
  m: MatchState,
  scorerIdx: 0 | 1,
  baseXg: number,
  oppDefEff: number,
  ownAtkEff: number,
): number {
  const self = m.players[scorerIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];

  let bonus = 0;
  let longBallActive = false;
  let nutmegActive = false;

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;

    switch (t.effect.kind) {
      case "tikiTaka":
        bonus += t.effect.amount ?? 0.2;
        break;
      case "longBall":
        longBallActive = true;
        break;
      case "penalty":
        bonus += t.effect.amount ?? 0.85;
        break;
      case "counterAttack":
        if (oppDefEff >= ownAtkEff) {
          bonus += Math.min(t.effect.amount ?? COUNTER_ATTACK_XG, COUNTER_ATTACK_XG);
        }
        break;
      case "nutmeg":
        nutmegActive = true;
        break;
      case "handOfGod":
        if (!self.handOfGodUsed) {
          bonus += t.effect.amount ?? 1.0;
          self.handOfGodUsed = true;
        }
        break;
      default:
        break;
    }
  }

  for (const power of self.powers) {
    switch (power.effect.kind) {
      case "talisman":
        bonus += power.effect.amount ?? 0;
        break;
      case "totalFootball":
        bonus += 0.1;
        break;
      default:
        break;
    }
  }

  for (const cip of allCards) {
    if (cip.card.type === "player") {
      const onFormBonus = cip.statuses.find((s) => s.kind === "onform");
      if (onFormBonus) {
        bonus += onFormBonus.amount ?? MOMENTUM_XG;
        removeStatus(cip, "onform");
      }
    }
  }

  if (longBallActive) {
    return baseXg + bonus + (0.45);
  }

  if (nutmegActive) {
    return baseXg + bonus;
  }

  return baseXg + bonus;
}

/**
 * Applies Catenaccio and Fortress defensive power effects.
 * These modify the opponent's ATK or the player's DEF.
 */
export function applyDefensiveTacticals(
  m: MatchState,
  defenderIdx: 0 | 1,
  defEff: number,
): number {
  const self = m.players[defenderIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];
  let bonus = 0;

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;
    if (t.effect.kind === "catenaccio") {
      bonus += 10;
    }
  }

  for (const power of self.powers) {
    if (power.effect.kind === "fortress") {
      bonus += power.effect.amount ?? 8;
    }
  }

  return defEff + bonus;
}

/**
 * Applies High Press: targets the opponent's DEF, adding Pressed status.
 */
export function applyHighPress(m: MatchState, attackerIdx: 0 | 1): void {
  const self = m.players[attackerIdx]!;
  const opp = m.players[opponent(attackerIdx)]!;
  const allCards = [...self.board.attack, ...self.board.defense];

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;
    if (t.effect.kind === "highPress") {
      const targetDefCard = opp.board.defense[0];
      if (targetDefCard) {
        addStatus(targetDefCard, { kind: "pressed", amount: 10, duration: 1 });
      }
    }
  }
}

/**
 * Applies Time Wasting: reduces the opponent's effective fatigue recovery (adds fatigue).
 */
export function applyTimeWasting(m: MatchState, attackerIdx: 0 | 1): void {
  const opp = m.players[opponent(attackerIdx)]!;
  const self = m.players[attackerIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;
    if (t.effect.kind === "timeWasting") {
      opp.fatigue = Math.min(30, opp.fatigue + 3);
    }
  }
}

/**
 * Resets the tactical-play counters for both players at halftime or ET.
 * GDD §6 / §17.
 */
export function resetTacticalCounters(m: MatchState): void {
  m.players[0]!.tacticalsThisHalf = 0;
  m.players[1]!.tacticalsThisHalf = 0;
}
