/**
 * WCC-019 — Opponent AI heuristic (GDD v10 §18 / §17).
 *
 * Produces a legal move decision: formation, cards per lane, and which tacticals to play.
 * All decisions are deterministic given the seeded Rng. The AI commits first (MVP).
 * GDD §18 line 575 heuristic block.
 */

import type { Card, CardInPlay, Formation, MatchState, PlayerCard, PlayerState, TacticalCard } from "./types.ts";
import type { Rng } from "./rng.ts";
import { CARD_CAP, RARITY_MULT, XG_SLOPE } from "./constants.ts";
import { canPlayTactical, tacticalGatePassed } from "./tacticals.ts";
import { validLineup } from "./validateLineup.ts";

/** Rough xG-equivalent worth of each tactical, used to weigh it against the player slot it costs. */
const TACTICAL_VALUE: Record<string, number> = {
  handOfGod: 1.0, penalty: 0.85, longBall: 0.45, counterAttack: 0.4, offsideTrap: 0.35,
  nutmeg: 0.3, totalFootball: 0.3, talisman: 0.25, tikiTaka: 0.2, catenaccio: 0.2,
  var: 0.2, referee: 0.2, injury: 0.2, fortress: 0.18, highPress: 0.15,
  timeWasting: 0.12, substitution: 0.12, teamTalk: 0.12, waterBreak: 0.1,
};
function tacticalValue(t: TacticalCard): number {
  return TACTICAL_VALUE[t.effect.kind] ?? 0.15;
}

/** Approximate per-round xG a fielded player adds in its lane (stat × rarity ÷ slope). */
function playerXg(c: PlayerCard, lane: "attack" | "defense"): number {
  const stat = lane === "attack" ? c.atk : c.def;
  return (stat * RARITY_MULT[c.rarity]) / XG_SLOPE;
}

function mkCip(card: Card, lane: "attack" | "defense"): CardInPlay {
  return { card, lane, statuses: [], faceDown: card.type === "player" };
}

/** Weakest fielded player by lane-xG, never the lone attacker while a defender can be dropped instead
 *  (an empty attack lane scores nothing — §7 floor gate). Returns its lane + index, or null. */
function weakestPlayer(
  attack: PlayerCard[],
  defense: PlayerCard[],
): { lane: "attack" | "defense"; idx: number; val: number } | null {
  let best: { lane: "attack" | "defense"; idx: number; val: number } | null = null;
  const scan = (arr: PlayerCard[], lane: "attack" | "defense") => {
    for (let i = 0; i < arr.length; i++) {
      if (lane === "attack" && attack.length === 1 && defense.length > 0) continue;
      const val = playerXg(arr[i]!, lane);
      if (best === null || val < best.val) best = { lane, idx: i, val };
    }
  };
  scan(attack, "attack");
  scan(defense, "defense");
  return best;
}

/** Lowest-value tactical in the set, or null. */
function weakestTactical(tacs: TacticalCard[]): TacticalCard | null {
  let best: TacticalCard | null = null;
  for (const t of tacs) if (best === null || tacticalValue(t) < tacticalValue(best)) best = t;
  return best;
}

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
 * Defensive when fresh (<= 10 fatigue) and holding a comfortable (2+) lead.
 * Offensive when chasing or when fatigue is high (attack to rest backline).
 * While level, ALWAYS balanced — nobody parks the bus (or goes all-out) at 0–0
 * from kickoff. Team identity shows when protecting a lead / chasing and via
 * signature tacticals, not as a static formation from the opening whistle.
 * (Bunkering at 0–0 walled the opening Arcade match; over-attacking goalfested.)
 * GDD §18 AI heuristic.
 */
function pickFormation(state: PlayerState, opp: PlayerState, m: MatchState): Formation {
  const goalLead = state.goals - opp.goals;
  const isFresh = state.fatigue <= 10;
  // Only park the bus on a comfortable (2+) lead — bunkering on a slim 1-goal
  // edge snowballs an early goal into an impenetrable wall (felt unfair in the
  // opening Arcade match). A 1-goal lead falls through to the neutral stance.
  const isHolding = goalLead >= 2;
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

  // Level (or a slim 1-goal edge): the sane neutral stance — neither bunker
  // nor all-out. Identity comes through when ahead/behind and via tacticals.
  return "balanced";
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

  // Always keep a real back line: never abandon defense to chase the formation
  // stance. The formation MULTIPLIER (×1.25 atk on offensive) supplies the
  // attacking bias; the lane split stays football-sane so the AI doesn't get
  // overrun. Floor ≈ 40% of the cap goes to defense.
  const defFloor = Math.max(1, Math.ceil(cap * 0.4));

  let atkTarget: number;
  let defTarget: number;

  switch (formation) {
    case "offensive":
      defTarget = defFloor;
      atkTarget = cap - defTarget;
      break;
    case "defensive":
      defTarget = Math.max(defFloor, Math.ceil(cap * 0.6));
      atkTarget = cap - defTarget;
      break;
    default:
      atkTarget = Math.floor(cap / 2);
      defTarget = cap - atkTarget;
  }

  // Sudden death while trailing: push the attack hard, but keep one at the back
  // (an empty defense just gifts the golden goal).
  if (isChasing && m.extraTime) {
    defTarget = 1;
    atkTarget = cap - 1;
  }

  // Field the best attackers up front and the best defenders at the back, so
  // premium DEF cards actually defend (they used to get dumped into attack).
  // rng tie-breaks keep variety without scrambling the position split.
  void premiums;
  void commons;
  // Precompute a per-card tie-break once (a comparator must be consistent —
  // calling rng.next() inside it would compare a pair differently each time).
  const jitter = new Map(available.map((c) => [c.id, rng.next()]));
  const tb = (c: PlayerCard) => jitter.get(c.id) ?? 0;
  const byAtk = [...available].sort((a, b) => b.atk - a.atk || tb(b) - tb(a));
  const attack = byAtk.slice(0, Math.max(0, atkTarget));
  const rest = available.filter((c) => !attack.includes(c));
  const byDef = rest.sort((a, b) => b.def - a.def || tb(b) - tb(a));
  const defense = byDef.slice(0, Math.max(0, defTarget));

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
  board: { attack: CardInPlay[]; defense: CardInPlay[] },
): TacticalCard[] {
  if (!canPlayTactical(state)) return [];

  // Gate against the lineup the AI intends to FIELD this round, not its (empty) board at decision
  // time. The old empty-board check meant position-gated signatures (Penalty/Long Ball/Tiki-Taka)
  // never fired for the AI. §12.
  const gateState = { ...state, board } as PlayerState;

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
    if (!tacticalGatePassed(gateState, tac.effect)) continue;

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

  // 1) Baseline lineup first — best players sized by formation, before any tacticals.
  const { attack, defense } = pickLanes(state, formation, m.round, oppState, rng, m);
  const finalAttack = [...attack];
  const finalDefense = [...defense];

  // 2) Candidate tacticals, gated against the lineup we intend to field.
  const finalTacticals = pickTacticals(state, tacticalCards(state.hand), m, {
    attack: finalAttack.map((c) => mkCip(c, "attack")),
    defense: finalDefense.map((c) => mkCip(c, "defense")),
  });

  // 3) Players and tacticals share the stamina pool (validLineup counts tactical cost). Trim to a
  //    legal lineup by repeatedly dropping the LEAST-VALUABLE card: a low-value tactical is dropped
  //    before a useful player, but a weak common is sacrificed for a high-value tactical (Penalty,
  //    Long Ball). Card cap counts players only, so an over-cap trim always drops a player.
  const tempState = { ...state, board: { attack: [], defense: [] } } as PlayerState;
  const syncTemp = () => {
    tempState.board.attack = [
      ...finalAttack.map((c) => mkCip(c, "attack")),
      ...finalTacticals.map((t) => mkCip(t, "attack")),
    ];
    tempState.board.defense = finalDefense.map((c) => mkCip(c, "defense"));
  };
  syncTemp();
  let trimGuard = 0;
  while (!validLineup(tempState, m.round) && trimGuard++ < 24) {
    const overCap = finalAttack.length + finalDefense.length > CARD_CAP(m.round);
    const wp = weakestPlayer(finalAttack, finalDefense);
    const wt = overCap ? null : weakestTactical(finalTacticals);
    if (wt && (!wp || tacticalValue(wt) < wp.val)) {
      finalTacticals.splice(finalTacticals.indexOf(wt), 1);
    } else if (wp) {
      (wp.lane === "attack" ? finalAttack : finalDefense).splice(wp.idx, 1);
    } else {
      break;
    }
    syncTemp();
  }

  commitAiCards(state, finalAttack, finalDefense, finalTacticals);

  return {
    formation,
    attack: finalAttack,
    defense: finalDefense,
    tacticals: finalTacticals,
  };
}
