/**
 * WCC-013 — Lane allocation, commit & simultaneous reveal (GDD v10 §10 / §15).
 *
 * Cards are committed face-down. At reveal, both sides flip simultaneously.
 * The Intent surface exposes only formation, face-up tacticals, card count,
 * and stamina spent — never card identities or stats.
 */

import type { Card, CardInPlay, Formation, PlayerState, TacticalCard } from "./types.ts";

/** Visible information about an opponent's committed board. GDD §15 Intent row, §10 lines 205-206. */
export interface Intent {
  formation: Formation;
  visibleTacticals: TacticalCard[];
  cardCount: number;
  /** How many cards the opponent committed to each lane (counts only — identities stay hidden). */
  attackCount: number;
  defenseCount: number;
  staminaSpent: number;
}

/**
 * Commits a card face-down to the player's attack or defense lane.
 * Tacticals are played face-up immediately. GDD §10 line 207.
 */
export function commitCard(
  state: PlayerState,
  card: Card,
  lane: "attack" | "defense",
): CardInPlay {
  const faceDown = card.type === "player";
  const cardInPlay: CardInPlay = {
    card,
    lane,
    statuses: [],
    faceDown,
  };

  if (lane === "attack") {
    state.board.attack.push(cardInPlay);
  } else {
    state.board.defense.push(cardInPlay);
  }

  const handIdx = state.hand.findIndex((c) => c.id === card.id);
  if (handIdx !== -1) {
    state.hand.splice(handIdx, 1);
  }

  return cardInPlay;
}

/**
 * Flips all face-down cards on both boards face-up simultaneously.
 * Called once per round after both sides have committed. GDD §10 line 208.
 */
export function revealBoards(a: PlayerState, b: PlayerState): void {
  for (const c of a.board.attack) c.faceDown = false;
  for (const c of a.board.defense) c.faceDown = false;
  for (const c of b.board.attack) c.faceDown = false;
  for (const c of b.board.defense) c.faceDown = false;
}

/**
 * Returns only the information an opponent is allowed to see.
 * Never exposes card identities or stats from face-down cards.
 * GDD §10 lines 205-206, §15 Intent row.
 */
export function intentOf(state: PlayerState): Intent {
  const visibleTacticals: TacticalCard[] = [];

  const allCards = [...state.board.attack, ...state.board.defense];
  for (const c of allCards) {
    if (!c.faceDown && c.card.type === "tactical") {
      visibleTacticals.push(c.card as TacticalCard);
    }
  }

  const staminaSpent =
    state.maxStamina - state.stamina + state.tacticBonus;

  return {
    formation: state.formation,
    visibleTacticals,
    cardCount: allCards.length,
    attackCount: state.board.attack.length,
    defenseCount: state.board.defense.length,
    staminaSpent,
  };
}

/** Clears both lanes of a player's board. Used at round cleanup. */
export function clearBoard(state: PlayerState): void {
  state.board.attack = [];
  state.board.defense = [];
}
