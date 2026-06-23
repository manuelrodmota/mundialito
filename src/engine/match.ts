/**
 * WCC-018 — Match state machine + resolveRound (GDD v10 §10 / §14 / §17).
 *
 * Orchestrates the full round pipeline in strict v10 order:
 *   instants → laneStack (with STACK_WEIGHTS) → synergies/Powers/Captain →
 *   formation → fatigue → compute+add xG → (goals) → update fatigue →
 *   halftime@R5 → cleanup → checkWin.
 *
 * ET sudden death: both sides compute xG (×2), but ONLY the higher-round-xG
 * side banks the goal (GDD §14 line 284, §17 lines 512-519).
 */

import type { Card, MatchState, OpponentTeam, PlayerState } from "./types.ts";
import type { Rng } from "./rng.ts";
import { makeRng } from "./rng.ts";
import { HALFTIME_ROUND, ET_XG_MULT, STAMINA, DEF_COEFF, XG_FLOOR } from "./constants.ts";
import type { ShotResult } from "./types.ts";
import { buildOpeningHand, drawToHand, returnLockedToDrawPile, routeCard } from "./cards.ts";
import { xgAdd, addPressure, takeShot } from "./xg.ts";
import { computeEffectiveStats } from "./effectiveStats.ts";
import { updateFatigue, resetFatigue } from "./fatigue.ts";
import { checkWin } from "./checkWin.ts";
import { resolveInstants, resetTacticalCounters, applyTacticalXg, applyDefensiveTacticals, applyCatenaccio, applyHighPress, applyTimeWasting, shotModifiers } from "./tacticals.ts";
import { tickStatuses } from "./status.ts";
import { updateMomentum, resetMomentum } from "./momentum.ts";

export interface NewMatchInput {
  deck: Card[];
  captainId: string;
  stamina?: number;
}

/**
 * Creates a new MatchState from two pre-built decks and an opponent.
 * GDD §17 `newMatch`. Decks are shuffled and opening hands are dealt.
 */
export function newMatch(
  seed: number,
  youInput: NewMatchInput,
  themInput: NewMatchInput,
  opp: OpponentTeam,
  mode?: "quickplay" | "run",
): MatchState {
  const rng = makeRng(seed);

  const p0 = buildPlayerState(youInput, rng);
  const p1 = buildPlayerState(themInput, rng);

  const m: MatchState = {
    round: 1,
    extraTime: false,
    etRound: 0,
    players: [p0, p1],
    opponent: opp,
    phase: "draw",
    winner: null,
  };

  void mode;
  return m;
}

function buildPlayerState(input: NewMatchInput, rng: Rng): PlayerState {
  const shuffled = rng.shuffle(input.deck);
  const state: PlayerState = {
    goals: 0,
    xg: 0,
    fatigue: 0,
    scoredFirstAt: null,
    maxStamina: STAMINA(1),
    stamina: STAMINA(1),
    drawPile: shuffled,
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
    captainId: input.captainId,
    momentum: 0,
    handOfGodUsed: false,
  };

  buildOpeningHand(state, rng);
  return state;
}

/**
 * Starts a new round: refills hands to HAND_SIZE and refreshes stamina.
 * GDD §10 line 204, §17.
 */
export function startRound(m: MatchState, rng: Rng): MatchState {
  for (const p of m.players) {
    p.maxStamina = STAMINA(m.round);
    p.stamina = STAMINA(m.round) + p.tacticBonus;
    p.tacticBonus = 0;
    drawToHand(p, rng);
  }
  m.phase = "plan";
  return m;
}

/**
 * Applies the halftime reset at R5:
 *   locked → drawPile, fatigue = 0, tactical counters reset for both players.
 * GDD §6 / §17.
 */
export function halftime(m: MatchState, rng: Rng): void {
  for (const p of m.players) {
    returnLockedToDrawPile(p, rng);
    resetFatigue(p);
    resetMomentum(p);
  }
  resetTacticalCounters(m);
}

/**
 * Cleans up board cards after a round by routing each to its correct pile.
 * GDD §10 line 208, §17 line 525.
 */
export function cleanupBoards(m: MatchState): void {
  for (const p of m.players) {
    const allCips = [...p.board.attack, ...p.board.defense];
    for (const cip of allCips) {
      tickStatuses(cip);
      routeCard(p, cip.card);
    }
    p.board.attack = [];
    p.board.defense = [];
  }
}

/**
 * Adds this round's fill xG to a side's pressure meter (or records 0 fill when it can't threaten).
 * Stores the fill on `lastFill` for the report UI. v11 §14.
 */
function fillPressure(m: MatchState, idx: 0 | 1, fillXg: number, hasAtk: boolean): void {
  const pl = m.players[idx]!;
  pl.lastFill = hasAtk ? fillXg : 0;
  if (hasAtk) addPressure(pl, fillXg);
}

/**
 * Resolves one side's shot for the round: rolls conversion if the meter is full (or a tactical
 * forces it), consumes Hand of God, and records the outcome on `lastShot`. v11 §14.
 */
function resolveSideShot(m: MatchState, idx: 0 | 1, hasAtk: boolean, rng: Rng): ShotResult {
  const pl = m.players[idx]!;
  if (!hasAtk) {
    pl.lastShot = { took: false, scored: false, p: 0 };
    return pl.lastShot;
  }
  const mods = shotModifiers(pl);
  const shot = takeShot(pl, {
    round: m.round,
    rng,
    forceShot: mods.forceShot,
    convFloor: mods.convFloor,
  });
  if (shot.took && mods.handOfGod) pl.handOfGodUsed = true;
  pl.lastShot = shot;
  return shot;
}

/**
 * Full round resolution pipeline in strict v10 order. GDD §10 line 208, §17 lines 488-526.
 * Returns the updated MatchState (mutated in place; returned for convenience).
 */
export function resolveRound(m: MatchState, rng: Rng): MatchState {
  m.phase = "resolve";

  // Consume any Time Wasting floor-suppression set last round (cleared before this round can set a
  // new one for next round). A suppressed side has no open-play xG floor this round. §12.
  const floor0 = m.players[0]!.xgFloorSuppressed ? 0 : XG_FLOOR;
  const floor1 = m.players[1]!.xgFloorSuppressed ? 0 : XG_FLOOR;
  m.players[0]!.xgFloorSuppressed = false;
  m.players[1]!.xgFloorSuppressed = false;

  resolveInstants(m, rng);
  applyHighPress(m, 0);
  applyHighPress(m, 1);
  applyTimeWasting(m, 0);
  applyTimeWasting(m, 1);

  const stats0 = computeEffectiveStats(m.players[0]!);
  const stats1 = computeEffectiveStats(m.players[1]!);

  // Difficulty handicap: the AI opponent (player 1) sharpens by a per-stage multiplier set by the
  // Arcade run. Defaults to 1 (off) — Quickplay and AI-vs-AI tests are unaffected.
  const aiMult = m.aiStrengthMult ?? 1;
  if (aiMult !== 1) {
    stats1.atkEff *= aiMult;
    stats1.defEff *= aiMult;
  }

  const defEff0 = applyDefensiveTacticals(m, 0, stats0.defEff);
  const defEff1 = applyDefensiveTacticals(m, 1, stats1.defEff);

  // You must field at least one attacker to threaten the goal. Measured AFTER instants so an
  // Offside Trap that strips the lone forward also kills the threat. (Any attacking tactical
  // already requires a forward, so an empty attack lane can carry no legal bonus either.)
  const hasAtk0 = m.players[0]!.board.attack.some((c) => c.card.type === "player");
  const hasAtk1 = m.players[1]!.board.attack.some((c) => c.card.type === "player");

  // v10.1: DEF_COEFF (<1) keeps a stacked back line from out-suppressing attack
  // into a 0–0 grind — defense still suppresses, just not to a standstill (§7/§19.9).
  let xg0 = xgAdd(stats0.atkEff, defEff1 * DEF_COEFF, floor0);
  let xg1 = xgAdd(stats1.atkEff, defEff0 * DEF_COEFF, floor1);

  if (m.extraTime) {
    xg0 *= ET_XG_MULT;
    xg1 *= ET_XG_MULT;
  }

  // Counter-Attack's trigger compares your own DEF_eff against the opponent's ATK_eff, so both are
  // threaded in alongside the opponent DEF that Nutmeg needs. §12.
  xg0 = applyTacticalXg(m, 0, xg0, defEff1, stats0.atkEff, defEff0, stats1.atkEff);
  xg1 = applyTacticalXg(m, 1, xg1, defEff0, stats1.atkEff, defEff1, stats0.atkEff);

  // Catenaccio: a defender holding it halves the attacker's final round xG. §12.
  xg0 = applyCatenaccio(m, 1, xg0);
  xg1 = applyCatenaccio(m, 0, xg1);

  // An empty attack lane generates no xG at all — no open-play floor, no bonuses.
  if (!hasAtk0) xg0 = 0;
  if (!hasAtk1) xg1 = 0;

  if (m.extraTime) {
    // Sudden death: both sides build pressure, then the higher-pressure side shoots first; the
    // first goal ends the passage (only one side can score per ET round). §14.
    fillPressure(m, 0, xg0, hasAtk0);
    fillPressure(m, 1, xg1, hasAtk1);

    const order: (0 | 1)[] = m.players[0]!.xg >= m.players[1]!.xg ? [0, 1] : [1, 0];
    for (const idx of order) {
      const hasAtk = idx === 0 ? hasAtk0 : hasAtk1;
      const shot = resolveSideShot(m, idx, hasAtk, rng);
      if (shot.scored) break;
    }

    updateMomentum(m.players[0]!, m.players[0]!.lastShot?.scored ?? false);
    updateMomentum(m.players[1]!, m.players[1]!.lastShot?.scored ?? false);

    updateFatigue(m.players[0]!);
    updateFatigue(m.players[1]!);

    m.etRound += 1;
  } else {
    fillPressure(m, 0, xg0, hasAtk0);
    fillPressure(m, 1, xg1, hasAtk1);

    const shot0 = resolveSideShot(m, 0, hasAtk0, rng);
    const shot1 = resolveSideShot(m, 1, hasAtk1, rng);

    updateMomentum(m.players[0]!, shot0.scored);
    updateMomentum(m.players[1]!, shot1.scored);

    updateFatigue(m.players[0]!);
    updateFatigue(m.players[1]!);

    if (m.round === HALFTIME_ROUND) {
      halftime(m, rng);
    }
  }

  cleanupBoards(m);

  checkWin(m, rng);

  if (m.winner === null) {
    m.round += 1;
    m.phase = "draw";
  }

  return m;
}
