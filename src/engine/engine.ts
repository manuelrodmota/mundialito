// Pure TypeScript port of design/js/engine8.js — GDD v8 §6, §7, §8, §10, §12, §14.
// All DOM/window globals removed; inject an Rng instance and caller-supplied decks instead.
// Where engine8.js and GDD §17 differ, engine8.js takes precedence; each divergence is noted.

import type { Rng } from "./rng.ts";
import type {
  Card,
  PlayerCard,
  TacticalCard,
  PlayerState,
  MatchState,
  SideTotals,
  BoardSnapshot,
  MatchEvent,
  Formation,
  Rarity,
  Tuning,
  OpponentTeam,
  GateSpec,
  TacticalKind,
} from "./types.ts";
import { DEFAULT_TUNING } from "./config.ts";

// ---- internal helpers ----

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function staminaFor(T: Tuning, round: number, extraTime: boolean): number {
  const base = T.staminaPerRound;
  if (extraTime) return base + 4;
  return round <= 5 ? base : round <= 8 ? base + 2 : base + 4;
}

export function cardCapFor(T: Tuning, round: number, extraTime: boolean): number {
  const base = T.cardCapBase;
  if (extraTime) return base + 2;
  return round <= 5 ? base : round <= 8 ? base + 1 : base + 2;
}

export function rarityMultOf(T: Tuning, rarity: Rarity): number {
  return T.rarityMult[rarity] ?? 1;
}

export function fmults(T: Tuning, f: Formation): { a: number; d: number } {
  const s = T.formationSwing / 100;
  if (f === "offensive") return { a: 1 + s, d: 1 - s };
  if (f === "defensive") return { a: 1 - s, d: 1 + s };
  return { a: 1, d: 1 };
}

// ---- player-gated tacticals ----

export const GATES: Partial<Record<TacticalKind, GateSpec>> = {
  offsideTrap: { pos: "DEF", n: 1, where: "lineup" },
  tikiTaka: { pos: "MID", n: 2, where: "lineup" },
  catenaccio: { pos: "DEF", n: 2, where: "lineup" },
  counterAttack: { pos: "FWD", n: 1, where: "lineup" },
  highPress: { pos: ["FWD", "MID"], n: 2, where: "lineup" },
  longBall: { pos: "FWD", n: 1, where: "attack" },
  nutmeg: { pos: "FWD", n: 1, where: "attack" },
  penalty: { pos: "FWD", n: 1, where: "attack" },
  handOfGod: { pos: "FWD", n: 1, where: "attack" },
};

export function gateText(g: GateSpec): string {
  const pos = Array.isArray(g.pos) ? g.pos.join("/") : g.pos;
  return (
    "Needs " +
    (g.n > 1 ? g.n + " " + pos : "a " + pos) +
    (g.where === "attack" ? " in your attack lane" : " in your lineup")
  );
}

export function gateMet(P: PlayerState, kind: TacticalKind): boolean {
  const g = GATES[kind];
  if (!g) return true;
  const pool: PlayerCard[] =
    g.where === "attack" ? P.board.attack : [...P.board.attack, ...P.board.defense];
  const posArr = Array.isArray(g.pos) ? g.pos : [g.pos];
  const n = pool.filter((c) => posArr.includes(c.position)).length;
  return n >= g.n;
}

export function canPlayTactic(
  state: MatchState,
  p: number,
  card: TacticalCard,
): { ok: boolean; why?: string } {
  const P = state.players[p];
  if (state.phase !== "plan") return { ok: false, why: "Planning is over" };
  if (card.effect.kind === "handOfGod" && P.hogUsed)
    return { ok: false, why: "Once per match — already used" };
  if (P.tacticsThisHalf >= state.T.tacticalsPerHalf)
    return {
      ok: false,
      why: "Tactical limit reached — " + state.T.tacticalsPerHalf + " per half",
    };
  if (P.stamina < card.cost) return { ok: false, why: "Not enough stamina" };
  const g = GATES[card.effect.kind];
  if (g && !gateMet(P, card.effect.kind))
    return { ok: false, why: gateText(g) };
  return { ok: true };
}

function newPlayer(cards: Card[], captainId: string, rng: Rng): PlayerState {
  const cap = cards.find((c) => c.id === captainId) as PlayerCard | undefined;
  return {
    goals: 0,
    xg: 0,
    xgTotal: 0,
    etXg: 0,
    fatigue: 0,
    scoredFirstAt: null,
    stamina: 0,
    maxStamina: 0,
    draw: rng.shuffle(cards),
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    board: { attack: [], defense: [] },
    tactics: [],
    powers: [],
    captainId,
    captainNation: cap && cap.type === "player" ? cap.nation : null,
    formation: "balanced",
    winStreak: 0,
    onFormNow: false,
    onFormNext: false,
    pressedNow: 0,
    pressedNext: 0,
    pressFatigueNext: 0,
    floorZeroNow: false,
    floorZeroNext: false,
    tacticsThisHalf: 0,
    drawPenaltyNext: 0,
    bonusStaminaNext: 0,
    cardStatus: {},
    hogUsed: false,
    hogActive: false,
    contrib: {},
  };
}

function cardStatus(P: PlayerState, c: PlayerCard) {
  if (!P.cardStatus[c.id]) {
    P.cardStatus[c.id] = { booked: false, injured: false, red: false };
  }
  return P.cardStatus[c.id]!;
}

function drawCards(state: MatchState, p: number, n: number, rng: Rng, ev?: MatchEvent[]): void {
  const P = state.players[p];
  for (let i = 0; i < n; i++) {
    if (!P.draw.length) {
      if (!P.discard.length) return;
      P.draw = rng.shuffle(P.discard);
      P.discard = [];
      ev?.push({
        t: "note",
        text: (p === 0 ? "Your" : "Their") + " discard pile shuffles back into the deck",
      });
    }
    const c = P.draw.shift()!;
    if (P.hand.length >= state.T.handCap) {
      P.discard.push(c);
      ev?.push({
        t: "note",
        text: (p === 0 ? "Your hand is full — " : "Their hand is full — ") + c.name + " goes to the discard",
      });
    } else {
      P.hand.push(c);
    }
  }
}

function laneCards(P: PlayerState): PlayerCard[] {
  return [...P.board.attack, ...P.board.defense];
}

function removeFromLanes(P: PlayerState, card: PlayerCard): void {
  P.board.attack = P.board.attack.filter((c) => c !== card);
  P.board.defense = P.board.defense.filter((c) => c !== card);
}

// ---- match / round ----

export interface NewMatchOptions {
  playerCards: Card[];
  captainId: string;
  opponent: OpponentTeam;
  rng: Rng;
  tuning?: Partial<Tuning>;
}

/**
 * Creates a fresh MatchState and runs startRound(1) so the match is ready for planning.
 * Replaces engine8.js::newMatch; caller supplies the opponent deck instead of engine3.
 */
export function newMatch(opts: NewMatchOptions): MatchState {
  const T: Tuning = Object.assign({}, DEFAULT_TUNING, opts.tuning ?? {});
  const { playerCards, captainId, opponent, rng } = opts;
  const aiCards = opponent.cards;
  const state: MatchState = {
    T,
    round: 0,
    phase: "plan",
    winner: null,
    capReason: null,
    extraTime: false,
    etRound: 0,
    justEnteredET: false,
    opponent,
    players: [
      newPlayer(playerCards, captainId, rng),
      newPlayer(aiCards, opponent.captainId, rng),
    ],
    aiIntent: null,
    reactions: [],
    lastEvents: [],
    lastBoards: null,
    lastTotals: null,
    offsideZeroed: [null, null],
    prev: { xg: [0, 0], goals: [0, 0], fatigue: [0, 0] },
    roundXg: [0, 0],
    roundGoals: [0, 0],
  };
  state.players[1].formation = opponent.preferredFormation;
  startRound(state, rng);
  return state;
}

/**
 * Decides the winner when extra time ends level after etRoundCap rounds.
 * Safety: higher accumulated ET xG wins; tiebreak on first-scorer.
 */
export function decideExtraTime(state: MatchState): void {
  const [A, B] = state.players;
  if (A.etXg !== B.etXg) {
    state.winner = A.etXg > B.etXg ? 0 : 1;
    state.capReason =
      "extra time stays level — decided on the run of play (" +
      r2(A.etXg) +
      " vs " +
      r2(B.etXg) +
      " xG)";
  } else {
    state.winner = (A.scoredFirstAt ?? 99) <= (B.scoredFirstAt ?? 99) ? 0 : 1;
    state.capReason = "dead level after extra time — the first goal of the night decides it";
  }
}

/**
 * Transitions the match into golden-goal extra time: meters reset, locked stars + fatigue refreshed.
 */
export function beginExtraTime(state: MatchState, rng: Rng): void {
  state.extraTime = true;
  state.etRound = 0;
  state.justEnteredET = true;
  state.players.forEach((P) => {
    P.xg = 0;
    P.etXg = 0;
    P.fatigue = 0;
    P.tacticsThisHalf = 0;
    P.draw = rng.shuffle([...P.draw, ...P.locked]);
    P.locked = [];
  });
}

/**
 * Starts the next round: increments round counter, resets per-round fields, draws cards, runs AI plan.
 */
export function startRound(state: MatchState, rng: Rng): void {
  if (state.winner != null) return;
  const T = state.T;
  state.justEnteredET = false;
  if (state.extraTime) state.etRound++;
  else state.round++;
  state.roundXg = [0, 0];
  state.roundGoals = [0, 0];
  state.reactions = [];
  state.offsideZeroed = [null, null];
  state.players.forEach((P, idx) => {
    P.board = { attack: [], defense: [] };
    P.tactics = [];
    P.pressedNow = P.pressedNext;
    P.pressedNext = 0;
    if (P.pressFatigueNext) {
      P.fatigue = clamp(P.fatigue + P.pressFatigueNext, 0, T.fatigueMax);
      P.pressFatigueNext = 0;
    }
    P.onFormNow = P.onFormNext;
    P.onFormNext = false;
    P.floorZeroNow = P.floorZeroNext;
    P.floorZeroNext = false;
    P.maxStamina = staminaFor(T, state.round, state.extraTime);
    P.stamina = P.maxStamina + P.bonusStaminaNext;
    P.bonusStaminaNext = 0;
    if (state.round === 1 && !state.extraTime) {
      const ci = P.draw.findIndex((c) => c.id === P.captainId);
      if (ci >= 0) P.hand.push(P.draw.splice(ci, 1)[0]!);
      drawCards(state, idx, T.openingHand - P.hand.length, rng);
    } else {
      drawCards(
        state,
        idx,
        Math.max(0, T.handSize - P.hand.length - P.drawPenaltyNext),
        rng,
      );
      P.drawPenaltyNext = 0;
    }
  });
  aiPlan(state, rng);
  state.phase = "plan";
}

// ---- player (p0) actions ----

export function setFormation(state: MatchState, f: Formation): void {
  if (state.phase !== "plan") return;
  if (!["offensive", "balanced", "defensive"].includes(f)) return;
  state.players[0].formation = f;
}

function laneCount(P: PlayerState): number {
  return P.board.attack.length + P.board.defense.length;
}

/**
 * Fix 1 — star synergy: stamina cost to place `card` into `lane` for `side`, right now.
 * Off (default) → returns card.cost (baseline). On → if the lane ALREADY contains a
 * premium (non-common) card, this card is a discounted supporting card
 * (max(synergyMinCost, floor(cost × synergyDiscount))); the first premium placed pays full
 * (it is the anchor), and a lane with no premium pays full. Must be evaluated BEFORE the
 * card is pushed into the lane so the anchor doesn't discount itself. With the policies'
 * highest-stat-first placement, the highest-cost premium lands first → it is the anchor,
 * matching the spec's lane-anchor (argmax-cost) rule.
 */
export function placementCost(
  state: MatchState,
  side: number,
  card: PlayerCard,
  lane: "attack" | "defense",
): number {
  const T = state.T;
  // Gentle curve: per-round base cost from rarity map when set, else the card's own cost.
  const base = T.costByRarity ? T.costByRarity[card.rarity] : card.cost;
  if (!T.starSynergyDiscount) return base;
  const lanePremium = state.players[side].board[lane].some((c) => c.rarity !== "common");
  if (!lanePremium) return base;
  return Math.max(T.synergyMinCost, Math.floor(base * T.synergyDiscount));
}

export function canPlace(state: MatchState, card: Card, lane: "attack" | "defense"): boolean {
  const P = state.players[0];
  if (laneCount(P) >= cardCapFor(state.T, state.round, state.extraTime)) return false;
  if (state.phase !== "plan" || card.type !== "player" || !P.hand.includes(card)) return false;
  if (card.position === "GK" && lane === "attack") return false;
  return P.stamina >= placementCost(state, 0, card, lane);
}

export function place(state: MatchState, card: Card, lane: "attack" | "defense"): boolean {
  if (!canPlace(state, card, lane)) return false;
  if (card.type !== "player") return false;
  const P = state.players[0];
  const cost = placementCost(state, 0, card, lane); // before push — anchor pays full
  P.hand = P.hand.filter((c) => c !== card);
  P.board[lane].push(card);
  P.stamina -= cost;
  return true;
}

export function recall(state: MatchState, card: Card): void {
  if (state.phase !== "plan") return;
  const P = state.players[0];
  if (card.type === "player" && laneCards(P).includes(card)) {
    removeFromLanes(P, card);
    P.hand.push(card);
    // note (Fix 1): refunds nominal cost; not reconciled with the star-synergy discount.
    // The sim never recalls, so this is a UI-only concern (the future board UI must track
    // the actual stamina charged per card if it allows un-placing).
    P.stamina += card.cost;
  } else if (card.type === "tactical" && P.tactics.includes(card)) {
    P.tactics = P.tactics.filter((c) => c !== card);
    P.hand.push(card);
    P.stamina += card.cost;
  }
}

export function playTactic(
  state: MatchState,
  card: Card,
  rng: Rng,
  opts?: { discardIds?: string[] },
): boolean {
  const P = state.players[0];
  // divergence: engine8.js checks card.type === "tactic"; we use "tactical" (§17 canonical)
  if (card.type !== "tactical" || !P.hand.includes(card)) return false;
  const chk = canPlayTactic(state, 0, card);
  if (!chk.ok) return false;
  const k = card.effect.kind;
  P.stamina -= card.cost;
  P.hand = P.hand.filter((c) => c !== card);
  P.tacticsThisHalf += 1;
  if (k === "waterBreak") {
    P.fatigue = 0;
    P.stamina += 2;
    P.exiled.push(card);
    return true;
  }
  if (k === "substitution") {
    const ids = opts?.discardIds ?? [];
    const toss = P.hand.filter((c) => ids.includes(c.id)).slice(0, 2);
    toss.forEach((c) => {
      P.hand = P.hand.filter((x) => x !== c);
      P.discard.push(c);
    });
    drawCards(state, 0, toss.length + 1, rng);
    P.fatigue = clamp(P.fatigue - 8, 0, state.T.fatigueMax);
    P.exiled.push(card);
    return true;
  }
  if (k === "handOfGod") P.hogUsed = true;
  P.tactics.push(card);
  aiReact(state, card);
  return true;
}

function aiReact(state: MatchState, card: TacticalCard): void {
  const A = state.players[1];
  const big =
    card.slots >= 2 ||
    (["penalty", "offsideTrap", "catenaccio", "nutmeg"] as TacticalKind[]).includes(
      card.effect.kind,
    );
  if (!big) return;
  if (A.tactics.some((t) => t.effect.kind === "var")) return;
  const varCard = A.hand.find((c) => c.type === "tactical" && c.effect.kind === "var") as
    | TacticalCard
    | undefined;
  if (!varCard || A.stamina < varCard.cost) return;
  A.stamina -= varCard.cost;
  A.hand = A.hand.filter((c) => c !== varCard);
  A.tactics.push(varCard);
  state.reactions.push("They answer your " + card.name + " with VAR Review");
  if (state.aiIntent) {
    state.aiIntent.cards += 1;
    state.aiIntent.stamina += varCard.cost;
  }
}

// ---- effective stats ----

export function chemNations(P: PlayerState): Set<string> {
  const cnt: Record<string, number> = {};
  laneCards(P).forEach((c) => (cnt[c.nation] = (cnt[c.nation] ?? 0) + 1));
  return new Set(Object.keys(cnt).filter((n) => cnt[n]! >= 3));
}

export function effStats(
  state: MatchState,
  p: number,
  card: PlayerCard,
  chem: Set<string>,
): { a: number; d: number } {
  const P = state.players[p];
  const T = state.T;
  const st = P.cardStatus[card.id] ?? { booked: false, injured: false, red: false };
  let a = card.atk;
  let d = card.def;
  if (st.injured) {
    a -= 15;
    d -= 15;
  }
  const rm = rarityMultOf(T, card.rarity);
  a *= rm;
  d *= rm;
  let b = 0;
  if (card.nation === P.captainNation) b += T.prideBonus;
  if (P.powers.some((t) => t.effect.kind === "talisman") && card.nation === P.captainNation)
    b += 3;
  if (chem.has(card.nation)) b += T.chemBonus;
  if (card.position !== "GK") a += b;
  d += b;
  return { a: Math.max(0, a), d: Math.max(0, d) };
}

/**
 * Fix 2 — diminishing returns on stacked lane contributions. When `weights` is set,
 * the per-card contributions are sorted descending and each multiplied by its weight
 * (index 0 = top contributor; the last weight repeats for any overflow), so additional
 * cards in a lane add less. When `weights` is null/empty, this is a plain flat sum —
 * byte-identical to the pre-fix behavior.
 */
function laneAccumulate(values: number[], weights: number[] | null): number {
  if (!weights || weights.length === 0) {
    return values.reduce((s, v) => s + v, 0);
  }
  const sorted = [...values].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i]! * weights[Math.min(i, weights.length - 1)]!;
  }
  return total;
}

export function sideTotals(
  state: MatchState,
  p: number,
  queue: Array<{ p: number; card: TacticalCard; cancelled: boolean; wasted: boolean }>,
  nutmegCard: PlayerCard | null,
): SideTotals {
  const P = state.players[p];
  const T = state.T;
  const notes: string[] = [];
  const chem = chemNations(P);
  const has = (k: TacticalKind) =>
    queue.some((q) => q.p === p && !q.cancelled && !q.wasted && q.card.effect.kind === k);
  const tf = P.powers.some((t) => t.effect.kind === "totalFootball");
  const zeroId = state.offsideZeroed[p];
  let atk = 0;
  let def = 0;
  let rarityUpA = 0;
  let rarityUpD = 0;
  const atkContribs: number[] = [];
  const defContribs: number[] = [];
  P.board.attack.forEach((c) => {
    if (c.id === zeroId || c === nutmegCard) return;
    const e = effStats(state, p, c, chem);
    atkContribs.push(e.a);
    rarityUpA += c.atk * (rarityMultOf(T, c.rarity) - 1);
    if (tf) def += Math.round(e.d / 2);
  });
  P.board.defense.forEach((c) => {
    const e = effStats(state, p, c, chem);
    defContribs.push(e.d);
    rarityUpD += c.def * (rarityMultOf(T, c.rarity) - 1);
    if (tf) atk += Math.round(e.a / 2);
  });
  // Fix 2: per-lane contributions are flat-summed (baseline) or diminishing-weighted.
  atk += laneAccumulate(atkContribs, T.stackWeights);
  def += laneAccumulate(defContribs, T.stackWeights);
  if (tf) notes.push("Total Football: cross-lane spillover");
  if (rarityUpA >= 1 || rarityUpD >= 1) {
    const bits: string[] = [];
    if (rarityUpA >= 1) bits.push("+" + Math.round(rarityUpA) + " ATK");
    if (rarityUpD >= 1) bits.push("+" + Math.round(rarityUpD) + " DEF");
    notes.push("Star quality (rarity): " + bits.join(" / "));
  }
  if (chem.size) notes.push("Chemistry +" + T.chemBonus + "/+" + T.chemBonus + " (" + [...chem].join(", ") + ")");
  const fwds = P.board.attack.filter((c) => c.position === "FWD" && c.id !== zeroId).length;
  if (fwds >= 2) {
    atk += 5;
    notes.push("Strike partnership +5 ATK");
  }
  const defs = P.board.defense.filter((c) => c.position === "DEF").length;
  if (defs >= 3) {
    def += 8;
    notes.push("Back line +8 DEF");
  }
  const mids = laneCards(P).filter((c) => c.position === "MID").length;
  if (mids >= 2) {
    P.bonusStaminaNext += 1;
    notes.push("Midfield engine: +1 stamina next round");
  }
  if (P.powers.some((t) => t.effect.kind === "fortress")) {
    def += T.fortressDef;
    notes.push("Fortress +" + T.fortressDef + " DEF");
  }
  if (P.pressedNow) {
    def = Math.max(0, def - P.pressedNow);
    notes.push("Pressed −" + P.pressedNow + " DEF");
  }
  const f = fmults(T, P.formation);
  if (P.formation !== "balanced")
    notes.push(P.formation + ": ATK ×" + f.a.toFixed(2) + " · DEF ×" + f.d.toFixed(2));
  const atkEff = Math.round(atk * f.a);
  let defEff = Math.round(def * f.d);
  if (P.fatigue > 0) {
    const mult = 1 - P.fatigue / T.fatigueDiv;
    defEff = Math.round(defEff * mult);
    notes.push("Fatigue " + P.fatigue + ": DEF ×" + mult.toFixed(2));
  }
  const gks = P.board.defense.filter((c) => c.position === "GK").length;
  const gkSave = r2(gks * T.gkSaveXg);
  if (gks) notes.push("Keeper: −" + gkSave.toFixed(2) + " opponent xG");

  // suppress the has() unused warning — it is used in sideTotals callers via queue inspection
  void has;

  return { atk: atkEff, def: defEff, gkSave, formation: P.formation, notes };
}

// ---- reveal & resolve ----

type QueueEntry = { p: number; card: TacticalCard; cancelled: boolean; wasted: boolean };

/**
 * Resolves one round: processes tactical queue, computes xG, scores goals, applies fatigue,
 * checks win conditions, returns the event log.
 */
export function reveal(state: MatchState, rng: Rng): MatchEvent[] {
  if (state.phase !== "plan") return [];
  const T = state.T;
  const P = state.players;
  const ev: MatchEvent[] = [];
  state.prev = {
    xg: [P[0].xg, P[1].xg],
    goals: [P[0].goals, P[1].goals],
    fatigue: [P[0].fatigue, P[1].fatigue],
  };
  const queue: QueueEntry[] = [];
  [0, 1].forEach((p) =>
    P[p].tactics.forEach((c) => queue.push({ p, card: c, cancelled: false, wasted: false })),
  );
  const live = (p: number, k: TacticalKind) =>
    queue.filter((q) => q.p === p && !q.cancelled && !q.wasted && q.card.effect.kind === k);

  queue.forEach((q) => {
    if (!gateMet(P[q.p], q.card.effect.kind)) {
      q.wasted = true;
      const g = GATES[q.card.effect.kind];
      ev.push({
        t: "note",
        text:
          (q.p === 0 ? "Your " : "Their ") +
          q.card.name +
          " is wasted — " +
          (g ? gateText(g).toLowerCase() : "gate not met"),
      });
    }
  });

  // 1. VAR
  const v: [QueueEntry | undefined, QueueEntry | undefined] = [live(0, "var")[0], live(1, "var")[0]];
  if (v[0] && v[1]) {
    v[0].cancelled = v[1].cancelled = true;
    ev.push({ t: "instant", text: "Both VAR reviews cancel each other out" });
  } else {
    [0, 1].forEach((p) => {
      const q = v[p];
      if (!q) return;
      const o = 1 - p;
      const tg = queue
        .filter((x) => x.p === o && !x.cancelled && !x.wasted)
        .sort((a, b) => b.card.slots - a.card.slots)[0];
      if (tg) {
        tg.cancelled = true;
        ev.push({ t: "instant", who: p, text: "VAR review overturns " + tg.card.name });
      } else {
        ev.push({ t: "instant", who: p, text: "VAR finds nothing to overturn" });
      }
    });
  }

  // 2. Offside trap
  [0, 1].forEach((p) =>
    live(p, "offsideTrap").forEach(() => {
      const o = 1 - p;
      const tg = P[o].board.attack.slice().sort((a, b) => b.atk - a.atk)[0];
      if (tg) {
        state.offsideZeroed[o] = tg.id;
        ev.push({
          t: "instant",
          who: p,
          text: "Offside trap — " + tg.name + " is flagged, no xG from him this round",
        });
      } else {
        ev.push({ t: "instant", who: p, text: "Offside trap snaps shut on an empty attack" });
      }
    }),
  );

  // 3. Referee
  [0, 1].forEach((p) =>
    live(p, "referee").forEach(() => {
      const o = 1 - p;
      const tg = laneCards(P[o])
        .slice()
        .sort((a, b) => b.overall - a.overall)[0];
      if (!tg) {
        ev.push({ t: "instant", who: p, text: "The referee waves play on" });
        return;
      }
      const st = cardStatus(P[o], tg);
      if (st.booked) {
        st.red = true;
        removeFromLanes(P[o], tg);
        P[o].exiled.push(tg);
        ev.push({
          t: "instant",
          who: p,
          red: true,
          text: "RED CARD — " + tg.name + " is sent off for the rest of the match",
        });
      } else {
        st.booked = true;
        ev.push({ t: "instant", who: p, text: tg.name + " goes into the book (yellow)" });
      }
    }),
  );

  // 4. Injury
  [0, 1].forEach((p) =>
    live(p, "injury").forEach(() => {
      const o = 1 - p;
      const tg = laneCards(P[o])
        .slice()
        .sort((a, b) => b.overall - a.overall)[0];
      if (tg) {
        cardStatus(P[o], tg).injured = true;
        ev.push({
          t: "instant",
          who: p,
          text: tg.name + " pulls up injured — −15 ATK/DEF for the match",
        });
      }
    }),
  );

  // 5. Team talk
  [0, 1].forEach((p) =>
    live(p, "teamTalk").forEach(() => {
      Object.values(P[p].cardStatus).forEach((s) => (s.injured = false));
      P[p].pressedNow = 0;
      P[p].fatigue = 0;
      drawCards(state, p, 2, rng, ev);
      ev.push({
        t: "instant",
        who: p,
        text:
          (p === 0 ? "Your" : "Their") +
          " team talk — debuffs cleared, fresh legs, 2 cards drawn",
      });
    }),
  );

  // 6. Powers attach
  queue.forEach((q) => {
    if (q.cancelled || q.wasted || q.card.category !== "power") return;
    const k = q.card.effect.kind;
    if (k === "handOfGod") P[q.p].hogActive = true;
    else if (!P[q.p].powers.some((t) => t.id === q.card.id)) P[q.p].powers.push(q.card);
  });

  // 7. Nutmeg targets
  const nut: [PlayerCard | null, PlayerCard | null] = [null, null];
  [0, 1].forEach((p) => {
    if (live(p, "nutmeg").length) {
      const chem = chemNations(P[p]);
      nut[p] =
        P[p].board.attack
          .filter((c) => c.position === "FWD" && c.id !== state.offsideZeroed[p])
          .sort(
            (a, b) => effStats(state, p, b, chem).a - effStats(state, p, a, chem).a,
          )[0] ?? null;
    }
  });

  // snapshot boards
  state.lastBoards = [0, 1].map((p): BoardSnapshot => ({
    attack: P[p].board.attack.slice(),
    defense: P[p].board.defense.slice(),
    tactics: queue
      .filter((q) => q.p === p)
      .map((q) => ({ card: q.card, cancelled: q.cancelled || q.wasted })),
    formation: P[p].formation,
    offsideId: state.offsideZeroed[p],
  }));

  // 8. Effective totals
  const tot: [SideTotals, SideTotals] = [
    sideTotals(state, 0, queue, nut[0]),
    sideTotals(state, 1, queue, nut[1]),
  ];
  state.lastTotals = tot as SideTotals[];
  ev.push({ t: "totals", tot: tot as SideTotals[] });

  // 9. xG step
  const adds = [0, 1].map((s) => {
    const o = 1 - s;
    const parts: Array<{ label: string; amt: number | null }> = [];
    const floor = P[s].floorZeroNow ? 0 : T.xgFloor;
    if (P[s].floorZeroNow) parts.push({ label: "Time-wasted: no xG floor", amt: 0 });
    const delta = tot[s].atk - tot[o].def;
    let open = clamp(floor + Math.max(0, delta) / T.xgSlope, 0, T.xgCap);
    if (tot[o].gkSave > 0) {
      const before = open;
      open = Math.max(0, r2(open - tot[o].gkSave));
      parts.push({
        label:
          "Open play (ATK " +
          tot[s].atk +
          " vs DEF " +
          tot[o].def +
          "), keeper saves −" +
          (before - open).toFixed(2),
        amt: open,
      });
    } else {
      parts.push({
        label: "Open play — ATK " + tot[s].atk + " vs DEF " + tot[o].def,
        amt: open,
      });
    }
    let sum = open;
    if (live(s, "tikiTaka").length) {
      sum += T.tikiTakaXg;
      parts.push({ label: "Tiki-Taka", amt: T.tikiTakaXg });
    }
    if (P[s].onFormNow) {
      sum += T.momentumXg;
      parts.push({ label: "On Form", amt: T.momentumXg });
    }
    if (live(s, "counterAttack").length) {
      if (tot[s].def >= tot[o].atk) {
        const add = r2(Math.min(T.counterXg, 0.1 + (tot[s].def - tot[o].atk) / T.xgSlope));
        sum += add;
        parts.push({ label: "Counter-attack on the break", amt: add });
      } else {
        ev.push({
          t: "note",
          text: (s === 0 ? "Your" : "Their") + " counter-attack fizzles — the defense didn't hold",
        });
      }
    }
    if (nut[s]) {
      const e = effStats(state, s, nut[s]!, chemNations(P[s]));
      const add = r2(clamp(e.a / T.xgSlope, 0, T.xgCap));
      sum += add;
      parts.push({ label: "Nutmeg — " + nut[s]!.name + " goes straight through", amt: add });
    }
    if (live(s, "longBall").length) {
      sum += T.longBallXg;
      parts.push({ label: "Long ball over the top", amt: T.longBallXg });
    }
    if (live(s, "penalty").length) {
      sum += T.penaltyXg;
      parts.push({ label: "PENALTY KICK", amt: T.penaltyXg });
    }
    if (live(o, "catenaccio").length && sum > 0) {
      sum = r2(sum * 0.5);
      parts.push({ label: "Their Catenaccio halves it", amt: null });
    }
    if (P[s].hogActive) {
      sum += T.hogXg;
      parts.push({ label: "HAND OF GOD — a goal from nowhere", amt: T.hogXg });
    }
    if (state.extraTime) {
      const before = r2(sum);
      sum = r2(sum * T.etXgMult);
      if (sum > before)
        parts.push({ label: "Extra time — xG ×" + T.etXgMult, amt: r2(sum - before) });
    }
    return { sum: r2(sum), parts };
  });

  if (!state.extraTime) {
    // Regulation: both sides accumulate; each banks every goal its meter crosses this round.
    [0, 1].forEach((s) => {
      const A = P[s];
      const amt = adds[s]!.sum;
      state.roundXg[s] = amt;
      A.xg = r2(A.xg + amt);
      A.xgTotal = r2(A.xgTotal + amt);
      ev.push({ t: "xg", who: s, amount: amt, parts: adds[s]!.parts });
      while (A.xg >= 1) {
        A.xg = r2(A.xg - 1);
        A.goals++;
        state.roundGoals[s]++;
        if (A.scoredFirstAt == null) A.scoredFirstAt = state.round;
        ev.push({ t: "goal", who: s, score: [P[0].goals, P[1].goals] });
      }
    });
  } else {
    // v10 golden goal — true sudden death (GDD §14/§17): ONLY the side that created the bigger
    // chance this passage banks xG; the trailing side adds nothing. So both can't score the
    // same round and ET settles in a round or two. Ties on round xG fall to accumulated ET xG.
    const lead =
      adds[0]!.sum > adds[1]!.sum ? 0 : adds[1]!.sum > adds[0]!.sum ? 1 : P[0].etXg >= P[1].etXg ? 0 : 1;
    const A = P[lead];
    const amt = adds[lead]!.sum;
    state.roundXg[0] = lead === 0 ? amt : 0;
    state.roundXg[1] = lead === 1 ? amt : 0;
    A.xg = r2(A.xg + amt);
    A.xgTotal = r2(A.xgTotal + amt);
    A.etXg = r2(A.etXg + amt);
    ev.push({ t: "xg", who: lead, amount: amt, parts: adds[lead]!.parts });
    if (A.xg >= 1) {
      A.xg = r2(A.xg - 1);
      A.goals++;
      state.roundGoals[lead]++;
      if (A.scoredFirstAt == null) A.scoredFirstAt = state.round;
      ev.push({ t: "goal", who: lead, score: [P[0].goals, P[1].goals] });
    }
  }

  // 10. Utility skills
  [0, 1].forEach((p) => {
    const o = 1 - p;
    live(p, "highPress").forEach(() => {
      P[o].pressedNext = T.pressDef;
      P[o].pressFatigueNext = T.pressFatigue;
      ev.push({
        t: "note",
        text:
          "High press — " +
          (o === 0 ? "you are" : "they are") +
          " Pressed next round (−" +
          T.pressDef +
          " DEF, +" +
          T.pressFatigue +
          " fatigue)",
      });
    });
    live(p, "timeWasting").forEach(() => {
      P[o].drawPenaltyNext = 1;
      P[o].floorZeroNext = true;
      ev.push({
        t: "note",
        text:
          (p === 0 ? "You waste" : "They waste") +
          " time — opponent draws 1 fewer and loses the xG floor next round",
      });
    });
  });

  // 11. Momentum
  [0, 1].forEach((p) => {
    if (state.roundGoals[p] > 0) {
      P[p].onFormNext = true;
      P[p].winStreak = 0;
      ev.push({
        t: "note",
        text: (p === 0 ? "You are" : "They are") + " ON FORM — +" + T.momentumXg.toFixed(2) + " xG next round",
      });
    } else if (state.roundXg[p] >= 0.3) {
      P[p].winStreak++;
      if (P[p].winStreak >= 3) {
        P[p].winStreak = 0;
        P[p].onFormNext = true;
        ev.push({
          t: "note",
          text:
            (p === 0 ? "You are" : "They are") +
            " ON FORM — sustained pressure pays: +" +
            T.momentumXg.toFixed(2) +
            " xG next round",
        });
      }
    } else {
      P[p].winStreak = 0;
    }
  });

  // 12. MVP contribution
  [0, 1].forEach((p) => {
    if (state.roundXg[p] > T.xgFloor) {
      const chem = chemNations(P[p]);
      P[p].board.attack.forEach((c) => {
        if (c.id === state.offsideZeroed[p]) return;
        P[p].contrib[c.id] = (P[p].contrib[c.id] ?? 0) + effStats(state, p, c, chem).a;
      });
    }
  });

  // 13. Fatigue
  [0, 1].forEach((p) => {
    const dAtk = P[p].board.attack.length;
    const dDef = P[p].board.defense.length;
    const delta = (dDef - dAtk) * T.fatigueRate;
    if (delta !== 0) {
      P[p].fatigue = clamp(P[p].fatigue + delta, 0, T.fatigueMax);
    }
  });
  if (state.round === T.halftimeRound && !state.extraTime) {
    P[0].fatigue = 0;
    P[1].fatigue = 0;
    P[0].tacticsThisHalf = 0;
    P[1].tacticsThisHalf = 0;
    ev.push({ t: "halftime" });
  }

  // 14. Cleanup
  [0, 1].forEach((p) => {
    laneCards(P[p]).forEach((c) => {
      if (c.rarity === "common") P[p].discard.push(c);
      else P[p].locked.push(c);
    });
    P[p].board = { attack: [], defense: [] };
    queue
      .filter((q) => q.p === p)
      .forEach((q) => {
        const isActivePower =
          q.card.category === "power" &&
          !q.cancelled &&
          !q.wasted &&
          q.card.effect.kind !== "handOfGod";
        if (!isActivePower) P[p].exiled.push(q.card);
      });
    P[p].tactics = [];
    P[p].hogActive = false;
    P[p].pressedNow = 0;
    P[p].floorZeroNow = false;
  });
  if (state.round === T.halftimeRound && !state.extraTime) {
    [0, 1].forEach((p) => {
      if (P[p].locked.length) {
        P[p].draw = rng.shuffle([...P[p].draw, ...P[p].locked]);
        P[p].locked = [];
      }
    });
  }

  // 15. Win check
  const [A, B] = P;
  if (!state.extraTime) {
    if (A.goals - B.goals >= T.mercyLead) {
      state.winner = 0;
      state.capReason = "mercy rule — a " + T.mercyLead + "-goal lead ends it early";
    } else if (B.goals - A.goals >= T.mercyLead) {
      state.winner = 1;
      state.capReason = "mercy rule — a " + T.mercyLead + "-goal lead ends it early";
    } else if (state.round >= T.roundCap) {
      if (A.goals !== B.goals) {
        state.winner = A.goals > B.goals ? 0 : 1;
        state.capReason = "full time — the lead holds up";
      } else {
        beginExtraTime(state, rng);
        ev.push({ t: "extratime" });
      }
    }
  } else {
    if (A.goals !== B.goals) {
      state.winner = A.goals > B.goals ? 0 : 1;
      state.capReason = "golden goal in extra time";
    } else if (state.etRound >= T.etRoundCap) {
      decideExtraTime(state);
    }
  }
  state.phase = state.winner != null ? "end" : "roundEnd";
  state.lastEvents = ev;
  return ev;
}

// ---- AI (GDD §18) ----

function aiPlan(state: MatchState, rng: Rng): void {
  const T = state.T;
  const P = state.players[1];
  const Y = state.players[0];
  let spent = 0;
  const aff = (c: { cost: number }) => P.stamina >= c.cost;
  const find = (k: TacticalKind) =>
    P.hand.find((c) => c.type === "tactical" && c.effect.kind === k) as TacticalCard | undefined;
  const gateOkAI = (k: TacticalKind) => gateMet(P, k);
  const playT = (c: TacticalCard) => {
    if (P.tacticsThisHalf >= T.tacticalsPerHalf) return;
    P.tacticsThisHalf += 1;
    P.stamina -= c.cost;
    spent += c.cost;
    P.hand = P.hand.filter((x) => x !== c);
    const k = c.effect.kind;
    if (k === "waterBreak") {
      P.fatigue = 0;
      P.stamina += 2;
      P.exiled.push(c);
    } else if (k === "substitution") {
      const toss = P.hand
        .filter((x) => x.type === "player" && x.rarity === "common")
        .sort((a, b) => a.cost - b.cost)
        .slice(0, 2);
      toss.forEach((x) => {
        P.hand = P.hand.filter((h) => h !== x);
        P.discard.push(x);
      });
      drawCards(state, 1, toss.length + 1, rng);
      P.fatigue = clamp(P.fatigue - 8, 0, T.fatigueMax);
      P.exiled.push(c);
    } else {
      if (k === "handOfGod") P.hogUsed = true;
      P.tactics.push(c);
    }
  };
  const placeAI = (c: PlayerCard, lane: "attack" | "defense") => {
    const cost = placementCost(state, 1, c, lane); // before push — anchor pays full (Fix 1)
    P.stamina -= cost;
    spent += cost;
    P.hand = P.hand.filter((x) => x !== c);
    P.board[lane].push(c);
  };

  // 0. Formation
  const lead = P.goals - Y.goals;
  let form: Formation = state.opponent ? state.opponent.preferredFormation : "balanced";
  if (lead < 0 || P.fatigue >= 16 || Y.goals >= T.mercyLead - 1) form = "offensive";
  else if (lead > 0 && P.fatigue < 10 && Y.xg < 0.65) form = "defensive";
  P.formation = form;

  // 1. Fresh legs
  const wb = find("waterBreak");
  if (wb && P.fatigue >= 14) playT(wb);

  // 2. Substitution
  const sub = find("substitution");
  if (
    sub &&
    aff(sub) &&
    (P.hand.filter((c) => c.type === "player").length <= 2 || P.fatigue >= 20)
  )
    playT(sub);

  // 3. Early powers
  if (state.round <= 4)
    (["fortress", "talisman", "totalFootball"] as TacticalKind[]).forEach((k) => {
      const c = find(k);
      if (c && aff(c) && P.stamina >= c.cost + 2) playT(c);
    });

  // 4. Stamina split
  const mode = form === "offensive" ? 0.7 : form === "defensive" ? 0.4 : 0.55;
  const hasInstants = P.hand.some((c) => c.type === "tactical" && c.category === "instant");
  const reserve = state.round >= 3 && hasInstants ? 2 : 0;
  const cap = cardCapFor(T, state.round, state.extraTime);
  const atCap = () => laneCards(P).length >= cap;

  // 5. Fill attack then defense
  const atkBudget = Math.round((P.stamina - reserve) * mode);
  let spentA = 0;
  P.hand
    .filter((c) => c.type === "player" && c.position !== "GK")
    .sort((a, b) => (b as PlayerCard).atk - (a as PlayerCard).atk)
    .forEach((c) => {
      const pc = c as PlayerCard;
      const cost = placementCost(state, 1, pc, "attack");
      if (!atCap() && P.hand.includes(c) && spentA + cost <= atkBudget && P.stamina >= cost) {
        placeAI(pc, "attack");
        spentA += cost;
      }
    });
  P.hand
    .filter((c) => c.type === "player")
    .sort((a, b) => (b as PlayerCard).def - (a as PlayerCard).def)
    .forEach((c) => {
      const pc = c as PlayerCard;
      const cost = placementCost(state, 1, pc, "defense");
      if (!atCap() && P.hand.includes(c) && P.stamina >= cost && P.stamina - cost >= reserve)
        placeAI(pc, "defense");
    });

  // 6. Gated swings
  const pen = find("penalty");
  if (pen && aff(pen) && gateOkAI("penalty") && (P.xg >= 0.35 || lead < 0 || state.round >= 7))
    playT(pen);
  const hog = find("handOfGod");
  if (
    hog &&
    aff(hog) &&
    !P.hogUsed &&
    gateOkAI("handOfGod") &&
    (Y.goals >= T.mercyLead - 1 || (lead < 0 && state.round >= 6))
  )
    playT(hog);
  const lb = find("longBall");
  if (lb && aff(lb) && gateOkAI("longBall") && lead < 0) playT(lb);
  const nutT = find("nutmeg");
  if (
    nutT &&
    aff(nutT) &&
    gateOkAI("nutmeg") &&
    P.board.attack.some((c) => c.position === "FWD" && c.atk >= 85)
  )
    playT(nutT);
  const tt = find("tikiTaka");
  if (tt && aff(tt) && gateOkAI("tikiTaka") && P.board.attack.length >= 2) playT(tt);
  const cat = find("catenaccio");
  if (cat && aff(cat) && gateOkAI("catenaccio") && (Y.xg >= 0.55 || (lead > 0 && mode <= 0.45)))
    playT(cat);
  const ca = find("counterAttack");
  if (ca && aff(ca) && gateOkAI("counterAttack") && mode <= 0.45) playT(ca);
  const off = find("offsideTrap");
  if (off && aff(off) && gateOkAI("offsideTrap") && state.round >= 2 && mode <= 0.55) playT(off);
  const hp = find("highPress");
  if (
    hp &&
    aff(hp) &&
    gateOkAI("highPress") &&
    state.round >= 2 &&
    Y.fatigue < T.fatigueMax - 4
  )
    playT(hp);
  if (state.round >= 3) {
    const rf = find("referee");
    if (rf && aff(rf)) playT(rf);
  }
  if (state.round >= 4) {
    const inj = find("injury");
    if (inj && aff(inj)) playT(inj);
  }
  const tw = find("timeWasting");
  if (tw && aff(tw) && lead > 0 && state.round >= 6) playT(tw);

  state.aiIntent = {
    cards: laneCards(P).length + P.tactics.length,
    stamina: spent,
    formation: form,
  };
}

/**
 * Convenience driver: plans p0 via a policy callback, then calls reveal.
 * The policy receives the state before planning and must call place/playTactic/setFormation directly.
 */
export function planAndResolveRound(
  state: MatchState,
  p0Plan: (state: MatchState, rng: Rng) => void,
  rng: Rng,
): MatchEvent[] {
  if (state.phase !== "plan" || state.winner != null) return [];
  p0Plan(state, rng);
  const ev = reveal(state, rng);
  if (state.winner == null) startRound(state, rng);
  return ev;
}
