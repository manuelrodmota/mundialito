/**
 * WCC-014 — Tactical resolution engine (GDD v10 §10 / §12 / §17).
 *
 * This module resolves tactical effects during a round. It is distinct from
 * `src/data/tacticals.ts` (the catalog of card definitions).
 *
 * Instant order: VAR → Offside → Referee → Injury. GDD §10 line 208, §12.
 * xG modifiers fold last, after formation + fatigue. GDD §17 line 508.
 * Single-use: skills/instants → exiled; powers persist in PlayerState.powers.
 *
 * Where each effect lives:
 *   - Stat-fold powers (Talisman, Total Football) fold into computeEffectiveStats.
 *   - Persistent DEF (Fortress) folds in applyDefensiveTacticals.
 *   - Catenaccio multiplies the opponent's final round xG (applyCatenaccio).
 *   - Per-round xG skills/powers (Tiki-Taka, Long Ball, Penalty, Counter, Nutmeg,
 *     Hand of God, On Form) fold in applyTacticalXg.
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
  XG_SLOPE,
  DEF_COEFF,
  FATIGUE_MAX,
  PRESSED_DEF,
  HIGH_PRESS_FATIGUE,
  SUBSTITUTION_FATIGUE,
  SUBSTITUTION_DRAW,
  TEAM_TALK_DRAW,
} from "./constants.ts";
import { addStatus, applySecondBooking, isBooked, removeStatus } from "./status.ts";
import { resetFatigue } from "./fatigue.ts";
import { drawExtra } from "./cards.ts";
import { atkOf } from "./effectiveStats.ts";
import type { Rng } from "./rng.ts";

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
 * Resolves Instant + Skill tactical effects in strict order:
 *   VAR → Offside → Referee → Injury → Water Break → Substitution → Team Talk.
 * Edits boards / fatigue / hands before stat calculation. GDD §10 line 208, §12.
 */
export function resolveInstants(m: MatchState, rng: Rng): void {
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

      applyInstantEffect(self, opp, card.effect, rng);
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
  self: PlayerState,
  opp: PlayerState,
  effect: TacticalEffect,
  rng: Rng,
): void {
  switch (effect.kind) {
    case "var": {
      cancelOpponentTactical(opp);
      break;
    }
    case "offsideTrap": {
      // The opponent's highest-ATK attacker contributes 0 to their xG this round (GDD §12).
      // We don't exile it — it returns to its pile normally; it's just silenced for the round.
      const target = getHighestAtkAttacker(opp.board.attack);
      if (target) {
        addStatus(target, { kind: "offside", duration: 1 });
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
        // Persist the injury for the rest of the match — statuses on the per-round CardInPlay are
        // lost when the card cycles out, so the registry re-stamps it each round it's fielded. §11.
        (opp.injured ??= []).push(target.card.id);
      }
      break;
    }
    case "waterBreak": {
      // Fatigue reset lands THIS round (resolveInstants runs before computeEffectiveStats). The
      // +2 stamina is a planning-phase budget lever applied in the match board UI when the card is
      // staged (so you can field an extra player the round you play it); it is intentionally NOT
      // added to next round's stamina here — that was the old one-round-late bug. §12.
      resetFatigue(self);
      break;
    }
    case "substitution": {
      // Fresh legs: reduce fatigue and cycle a card. §12.
      self.fatigue = Math.max(0, self.fatigue - (effect.amount ?? SUBSTITUTION_FATIGUE));
      drawExtra(self, SUBSTITUTION_DRAW, rng);
      break;
    }
    case "teamTalk": {
      // Remove all debuffs from your fielded cards, clear fatigue, draw 2. §12.
      for (const cip of [...self.board.attack, ...self.board.defense]) {
        removeStatus(cip, "pressed");
        removeStatus(cip, "injured");
        removeStatus(cip, "booked");
        removeStatus(cip, "offside");
      }
      self.injured = [];
      resetFatigue(self);
      drawExtra(self, TEAM_TALK_DRAW, rng);
      break;
    }
    default:
      break;
  }
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

/** The opponent's strongest attacker by raw ATK contribution (rarity-adjusted). */
function getHighestAtkAttacker(lane: CardInPlay[]): CardInPlay | undefined {
  let best: CardInPlay | undefined;
  for (const c of lane) {
    if (c.card.type !== "player") continue;
    if (!best || atkOf(c) > atkOf(best)) best = c;
  }
  return best;
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
 * Computes the per-round xG bonus from active tactical/power effects for the given player.
 * Applied after formation and fatigue, folding last into the xG pipeline.
 * GDD §12 table lines 235-253, §17 line 508.
 *
 * @param oppDefEff opponent's effective DEF (pre-DEF_COEFF) — used by Nutmeg.
 * @param ownDefEff scorer's own effective DEF — used by Counter-Attack's trigger.
 * @param oppAtkEff opponent's effective ATK — used by Counter-Attack's trigger.
 */
export function applyTacticalXg(
  m: MatchState,
  scorerIdx: 0 | 1,
  baseXg: number,
  oppDefEff: number,
  ownAtkEff: number,
  ownDefEff = 0,
  oppAtkEff = 0,
): number {
  void ownAtkEff;
  const self = m.players[scorerIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];

  let bonus = 0;
  let nutmegActive = false;

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;

    switch (t.effect.kind) {
      case "tikiTaka":
        bonus += t.effect.amount ?? 0.2;
        break;
      case "longBall":
        // A direct chance that bypasses the back line — a flat add, unaffected by opp DEF. §12.
        bonus += t.effect.amount ?? 0.45;
        break;
      case "penalty":
        bonus += t.effect.amount ?? 0.6;
        break;
      case "counterAttack":
        // GDD §12: if YOUR DEF_eff ≥ THEIR ATK_eff this round, add +0.40 (capped) on the break.
        if (ownDefEff >= oppAtkEff) {
          bonus += Math.min(t.effect.amount ?? COUNTER_ATTACK_XG, COUNTER_ATTACK_XG);
        }
        break;
      case "nutmeg":
        nutmegActive = true;
        break;
      default:
        break;
    }
  }

  // Hand of God is a Power (lives in powers[]): once per match, instantly +amount xG. §12.
  for (const power of self.powers) {
    if (power.effect.kind === "handOfGod" && !self.handOfGodUsed) {
      bonus += power.effect.amount ?? 0.8;
      self.handOfGodUsed = true;
    }
  }

  // Nutmeg: your best forward ignores the opponent's defense — give back the xG that the back line
  // was suppressing on that one forward (capped at its own ATK). §12.
  if (nutmegActive) {
    const bestFwd = getHighestAtkAttacker(self.board.attack);
    if (bestFwd) {
      bonus += Math.min(atkOf(bestFwd), oppDefEff * DEF_COEFF) / XG_SLOPE;
    }
  }

  // On Form (momentum) bonus from a fielded player, consumed on use. §11 / §16.
  for (const cip of allCards) {
    if (cip.card.type === "player") {
      const onFormBonus = cip.statuses.find((s) => s.kind === "onform");
      if (onFormBonus) {
        bonus += onFormBonus.amount ?? MOMENTUM_XG;
        removeStatus(cip, "onform");
      }
    }
  }

  return baseXg + bonus;
}

/**
 * Applies the Fortress Power to the player's DEF_eff (persistent +amount every round).
 * Catenaccio is no longer a DEF buff — it multiplies the opponent's xG (see applyCatenaccio). §12.
 */
export function applyDefensiveTacticals(
  m: MatchState,
  defenderIdx: 0 | 1,
  defEff: number,
): number {
  const self = m.players[defenderIdx]!;
  let bonus = 0;

  for (const power of self.powers) {
    if (power.effect.kind === "fortress") {
      bonus += power.effect.amount ?? 8;
    }
  }

  return defEff + bonus;
}

/**
 * Catenaccio: halve (×amount) the opponent's xG against you this round. The defender holds the
 * skill on their board; it scales the attacker's final round xG. GDD §12.
 */
export function applyCatenaccio(m: MatchState, defenderIdx: 0 | 1, oppXg: number): number {
  const self = m.players[defenderIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];
  let xg = oppXg;
  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;
    if (t.effect.kind === "catenaccio") {
      xg *= t.effect.amount ?? 0.5;
    }
  }
  return xg;
}

/**
 * Applies High Press: the opponent's lead defender is Pressed (DEF −PRESSED_DEF this round) and the
 * opponent gains fatigue that carries into the next round. GDD §11 / §12.
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
        addStatus(targetDefCard, { kind: "pressed", amount: PRESSED_DEF, duration: 1 });
      }
      opp.fatigue = Math.min(FATIGUE_MAX, opp.fatigue + HIGH_PRESS_FATIGUE);
    }
  }
}

/**
 * Applies Time Wasting: the opponent's xG floor drops to 0 for their NEXT round — no open-play
 * baseline, so an idle attack generates nothing. The flag is consumed at the top of resolveRound. §12.
 */
export function applyTimeWasting(m: MatchState, attackerIdx: 0 | 1): void {
  const opp = m.players[opponent(attackerIdx)]!;
  const self = m.players[attackerIdx]!;
  const allCards = [...self.board.attack, ...self.board.defense];

  for (const cip of allCards) {
    if (cip.card.type !== "tactical") continue;
    const t = cip.card as TacticalCard;
    if (t.effect.kind === "timeWasting") {
      opp.xgFloorSuppressed = true;
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
