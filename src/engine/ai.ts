/**
 * WCC-019 — Opponent AI heuristic (GDD v10 §18 / §17).
 *
 * Produces a legal move decision: formation, cards per lane, and which tacticals to play.
 * All decisions are deterministic given the seeded Rng. The AI commits first (MVP).
 * GDD §18 line 575 heuristic block.
 */

import type { Card, CardInPlay, Formation, MatchState, PlayerCard, PlayerState, TacticalCard } from "./types.ts";
import type { Rng } from "./rng.ts";
import { CARD_CAP } from "./constants.ts";
import { canPlayTactical, tacticalGatePassed } from "./tacticals.ts";
import { validLineup } from "./validateLineup.ts";

export interface AiDecision {
  formation: Formation;
  attack: Card[];
  defense: Card[];
  tacticals: TacticalCard[];
}

/**
 * Returns the player index that the AI controls.
 * In MVP the AI always controls player index 1.
 */
function aiPlayer(aiIdx: 0 | 1): 0 | 1 {
  return aiIdx;
}

function playerCards(hand: Card[]): PlayerCard[] {
  return hand.filter((c): c is PlayerCard => c.type === "player");
}

function tacticalCards(hand: Card[]): TacticalCard[] {
  return hand.filter((c): c is TacticalCard => c.type === "tactical");
}

/**
 * Picks the formation based on game state.
 * Defensive when fresh (<= 10 fatigue) and holding a lead.
 * Offensive when chasing or when fatigue is high (attack to rest backline).
 * GDD §18 AI heuristic; biases toward opponent.preferredFormation.
 */
function pickFormation(state: PlayerState, opp: PlayerState, m: MatchState): Formation {
  const goalLead = state.goals - opp.goals;
  const isFresh = state.fatigue <= 10;
  const isHolding = goalLead > 0;
  const isChasing = goalLead < 0;
  const highFatigue = state.fatigue >= 20;

  if (m.extraTime) {
    return "offensive";
  }

  if (isHolding && isFresh) {
    return "defensive";
  }

  if (isChasing || highFatigue) {
    return "offensive";
  }

  return m.opponent.preferredFormation;
}

/**
 * Determines which player cards to place in each lane, respecting card cap + stamina.
 * Distributes premium cards as anchors; fills remaining slots with commons.
 * GDD §18: balance fill vs exposure within CARD_CAP + stamina.
 */
function pickLanes(
  state: PlayerState,
  formation: Formation,
  round: number,
  opp: PlayerState,
  rng: Rng,
  m: MatchState,
): { attack: PlayerCard[]; defense: PlayerCard[] } {
  const available = playerCards(state.hand);
  const cap = CARD_CAP(round);

  const goalLead = state.goals - opp.goals;
  const isChasing = goalLead < 0;

  const premiums = available.filter((c) => c.rarity !== "common");
  const commons = available.filter((c) => c.rarity === "common");

  let atkTarget: number;
  let defTarget: number;

  switch (formation) {
    case "offensive":
      atkTarget = Math.ceil(cap * 0.65);
      defTarget = cap - atkTarget;
      break;
    case "defensive":
      defTarget = Math.ceil(cap * 0.65);
      atkTarget = cap - defTarget;
      break;
    default:
      atkTarget = Math.floor(cap / 2);
      defTarget = cap - atkTarget;
  }

  if (isChasing && m.extraTime) {
    atkTarget = cap;
    defTarget = 0;
  }

  const shuffledPremiums = rng.shuffle(premiums);
  const shuffledCommons = rng.shuffle(commons);

  const attack: PlayerCard[] = [];
  const defense: PlayerCard[] = [];
  const pool = [...shuffledPremiums, ...shuffledCommons];

  for (const card of pool) {
    if (attack.length < atkTarget) {
      attack.push(card);
    } else if (defense.length < defTarget) {
      defense.push(card);
    } else {
      break;
    }
  }

  return { attack, defense };
}

/**
 * Picks valid tacticals to play, respecting the per-half cap and gate requirements.
 * Rationing strategy: hold Penalty/Hand of God for high-value moments;
 * use VAR/Offside reactively; Water Break only when high fatigue.
 * Signature tactics for the opponent team are prioritised when held and gate-passed.
 * GDD §18 AI heuristic, §9 signature team behaviour.
 */
function pickTacticals(
  state: PlayerState,
  tacticals: TacticalCard[],
  m: MatchState,
): TacticalCard[] {
  if (!canPlayTactical(state)) return [];

  const signatureIds = new Set(
    (m.opponent.signatureTactical ?? []).map((t) => t.id),
  );

  const sortedCandidates = [
    ...tacticals.filter((t) => signatureIds.has(t.id)),
    ...tacticals.filter((t) => !signatureIds.has(t.id)),
  ];

  const chosen: TacticalCard[] = [];

  for (const tac of sortedCandidates) {
    if (chosen.length >= 2) break;
    if (!canPlayTactical({ ...state, tacticalsThisHalf: state.tacticalsThisHalf + chosen.length })) break;
    if (!tacticalGatePassed(state, tac.effect)) continue;

    const kind = tac.effect.kind;
    const goalLead = state.goals - m.players.find((p) => p !== state)!.goals;

    if (kind === "penalty" || kind === "handOfGod") {
      if (state.handOfGodUsed && kind === "handOfGod") continue;
      if (goalLead < 0 || m.extraTime) {
        chosen.push(tac);
      }
      continue;
    }

    if (kind === "waterBreak") {
      if (state.fatigue >= 20) {
        chosen.push(tac);
      }
      continue;
    }

    if (kind === "var" || kind === "offsideTrap") {
      chosen.push(tac);
      continue;
    }

    chosen.push(tac);
  }

  return chosen;
}

/**
 * AI commits cards to the board state in place, simulating a human player.
 * Only called with aiIdx = 1 in MVP; both indices supported for AI-vs-AI tests.
 */
function commitAiCards(
  state: PlayerState,
  attack: PlayerCard[],
  defense: PlayerCard[],
  tacticalList: TacticalCard[],
): void {
  for (const card of attack) {
    const handIdx = state.hand.findIndex((c) => c.id === card.id);
    if (handIdx === -1) continue;
    const [removed] = state.hand.splice(handIdx, 1);
    if (removed) {
      const cip: CardInPlay = { card: removed, lane: "attack", statuses: [], faceDown: true };
      state.board.attack.push(cip);
    }
  }

  for (const card of defense) {
    const handIdx = state.hand.findIndex((c) => c.id === card.id);
    if (handIdx === -1) continue;
    const [removed] = state.hand.splice(handIdx, 1);
    if (removed) {
      const cip: CardInPlay = { card: removed, lane: "defense", statuses: [], faceDown: true };
      state.board.defense.push(cip);
    }
  }

  for (const tac of tacticalList) {
    const handIdx = state.hand.findIndex((c) => c.id === tac.id);
    if (handIdx === -1) continue;
    const [removed] = state.hand.splice(handIdx, 1);
    if (removed) {
      const cip: CardInPlay = { card: removed, lane: "attack", statuses: [], faceDown: false };
      state.board.attack.push(cip);
      state.tacticalsThisHalf += 1;
    }
  }
}

/**
 * Produces a legal turn decision for the AI player and commits it to the board.
 * GDD §18 heuristic: formation → lane split → tacticals.
 * Returns the decision for inspection/testing.
 */
export function decideTurn(m: MatchState, aiIdx: 0 | 1, rng: Rng): AiDecision {
  const idx = aiPlayer(aiIdx);
  const state = m.players[idx]!;
  const oppState = m.players[idx === 0 ? 1 : 0]!;

  const formation = pickFormation(state, oppState, m);
  state.formation = formation;

  const tacs = tacticalCards(state.hand);
  const chosenTacticals = pickTacticals(state, tacs, m);

  const { attack, defense } = pickLanes(state, formation, m.round, oppState, rng, m);

  const tempState = {
    ...state,
    board: { attack: [], defense: [] },
  } as PlayerState;

  for (const card of attack) {
    tempState.board.attack.push({ card, lane: "attack", statuses: [], faceDown: true });
  }
  for (const card of defense) {
    tempState.board.defense.push({ card, lane: "defense", statuses: [], faceDown: true });
  }

  let finalAttack = attack;
  let finalDefense = defense;

  if (!validLineup(tempState, m.round)) {
    finalAttack = attack.slice(0, 1);
    finalDefense = [];
    tempState.board.attack = finalAttack.map((c) => ({ card: c, lane: "attack" as const, statuses: [], faceDown: true }));
    tempState.board.defense = [];
    if (!validLineup(tempState, m.round)) {
      finalAttack = [];
      finalDefense = [];
    }
  }

  commitAiCards(state, finalAttack, finalDefense, chosenTacticals);

  return {
    formation,
    attack: finalAttack,
    defense: finalDefense,
    tacticals: chosenTacticals,
  };
}
