/**
 * WCC-011 — Stamina & card flow (GDD v10 §6 / §17).
 *
 * Manages the draw/discard/locked/exiled pile transitions, draw-to-5
 * with mid-draw gray reshuffle, stamina ramp, and tactical-cap scaffolding.
 *
 * Card routing rules (GDD §6 lines 135-138):
 *   - Common players → discard pile (recycle)
 *   - Premium players (rare/epic/legendary) → locked pile (once-per-half)
 *   - Tactical skills & instants → exiled (single-use)
 *   - Power tacticals → stay in powers list
 */

import type { Card, PlayerCard, PlayerState, TacticalCard } from "./types.ts";
import type { Rng } from "./rng.ts";
import { HAND_SIZE, STAMINA } from "./constants.ts";

/** Whether a card is a premium (rare, epic, or legendary) player. */
export function isPremium(card: Card): boolean {
  return card.type === "player" && card.rarity !== "common";
}

/** Whether a card is a common player (cycles to discard). */
export function isCommonPlayer(card: Card): boolean {
  return card.type === "player" && card.rarity === "common";
}

/** Whether a card is a tactical (power, skill, or instant). */
export function isTactical(card: Card): boolean {
  return card.type === "tactical";
}

/**
 * Draws cards until the hand reaches HAND_SIZE.
 * If the draw pile is empty but the discard pile is non-empty,
 * the discard pile is reshuffled into the draw pile (gray reshuffle).
 * Only common players live in the discard pile and participate in reshuffles.
 * GDD §6 line 134, §17 `drawToHand` lines 474-480.
 */
export function drawToHand(state: PlayerState, rng: Rng): void {
  while (state.hand.length < HAND_SIZE) {
    if (state.drawPile.length === 0) {
      if (state.discard.length === 0) break;
      state.drawPile = rng.shuffle(state.discard);
      state.discard = [];
    }
    const card = state.drawPile.shift();
    if (card !== undefined) {
      state.hand.push(card);
    }
  }
}

/**
 * Refreshes a player's stamina for the given round.
 * Water Break adds a temporary bonus on top (managed in tacticals.ts).
 * GDD §6 line 140, §17.
 */
export function refreshStamina(state: PlayerState, round: number): void {
  const base = STAMINA(round);
  state.maxStamina = base;
  state.stamina = base + state.tacticBonus;
  state.tacticBonus = 0;
}

/**
 * Routes a played card to its correct pile after a round.
 * Called by `cleanupBoards` in match.ts after resolveRound.
 * GDD §6 lines 135-138.
 */
export function routeCard(state: PlayerState, card: Card): void {
  if (card.type === "player") {
    const p = card as PlayerCard;
    if (p.rarity === "common") {
      state.discard.push(card);
    } else {
      state.locked.push(card);
    }
  } else {
    const t = card as TacticalCard;
    if (t.category === "power") {
      state.powers.push(t);
    } else {
      state.exiled.push(card);
    }
  }
}

/**
 * Returns locked (premium) cards to the draw pile at halftime or ET entry.
 * The pile is reshuffled so the return order is random.
 * GDD §6 / §17 halftime semantics.
 */
export function returnLockedToDrawPile(state: PlayerState, rng: Rng): void {
  if (state.locked.length === 0) return;
  state.drawPile = rng.shuffle([...state.drawPile, ...state.locked]);
  state.locked = [];
}

/**
 * Builds the opening hand: draws until HAND_SIZE, then guarantees the captain
 * is in the first hand by swapping it from wherever it landed.
 * GDD §6 line 134.
 */
export function buildOpeningHand(state: PlayerState, rng: Rng): void {
  drawToHand(state, rng);

  const capIdx = state.hand.findIndex((c) => c.id === state.captainId);
  if (capIdx !== -1) return;

  const capInDraw = state.drawPile.findIndex((c) => c.id === state.captainId);
  if (capInDraw !== -1) {
    const [swappedOut] = state.hand.splice(
      Math.floor(rng.next() * state.hand.length),
      1,
    );
    if (swappedOut !== undefined) {
      state.drawPile.push(swappedOut);
    }
    const [captain] = state.drawPile.splice(capInDraw, 1);
    if (captain !== undefined) {
      state.hand.unshift(captain);
    }
  }
}
