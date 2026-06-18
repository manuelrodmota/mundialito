// GDD v10 §17 data model — ported from engine9.js into pure TypeScript.
// Card.type uses "tactical" (§17 canonical); engine9.js uses "tactic" — noted where checked.

export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Lane = "attack" | "defense";
export type Formation = "offensive" | "balanced" | "defensive";
export type TacticalCategory = "instant" | "skill" | "power";

export type TacticalKind =
  | "var"
  | "offsideTrap"
  | "tikiTaka"
  | "catenaccio"
  | "counterAttack"
  | "highPress"
  | "longBall"
  | "nutmeg"
  | "penalty"
  | "handOfGod"
  | "waterBreak"
  | "substitution"
  | "teamTalk"
  | "fortress"
  | "talisman"
  | "totalFootball"
  | "referee"
  | "injury"
  | "timeWasting"
  | "momentum";

export type Tier = "weak" | "mid" | "champion";

export interface TacticalEffect {
  kind: TacticalKind;
}

export interface PlayerCard {
  id: string;
  type: "player";
  name: string;
  position: Position;
  rarity: Rarity;
  nation: string;
  atk: number;
  def: number;
  overall: number;
  cost: number;
}

export interface TacticalCard {
  id: string;
  // §17 uses "tactical"; engine9.js uses "tactic" — we canonicalize to "tactical" here
  type: "tactical";
  name: string;
  category: TacticalCategory;
  effect: TacticalEffect;
  slots: number;
  cost: number;
}

export type Card = PlayerCard | TacticalCard;

export interface CardStatus {
  booked: boolean;
  injured: boolean;
  red: boolean;
}

/** One side of a match in progress. */
export interface PlayerState {
  goals: number;
  xg: number;
  xgTotal: number;
  etXg: number;
  fatigue: number;
  scoredFirstAt: number | null;
  stamina: number;
  maxStamina: number;

  draw: Card[];
  hand: Card[];
  discard: Card[];
  locked: Card[];
  exiled: Card[];

  board: { attack: PlayerCard[]; defense: PlayerCard[] };
  tactics: TacticalCard[];
  powers: TacticalCard[];

  captainId: string;
  captainNation: string | null;
  formation: Formation;

  winStreak: number;
  onFormNow: boolean;
  onFormNext: boolean;

  pressedNow: number;
  pressedNext: number;
  pressFatigueNext: number;

  floorZeroNow: boolean;
  floorZeroNext: boolean;

  tacticsThisHalf: number;
  drawPenaltyNext: number;
  bonusStaminaNext: number;

  cardStatus: Record<string, CardStatus>;
  hogUsed: boolean;
  hogActive: boolean;

  contrib: Record<string, number>;
}

/** Snapshot of previous-round values used for fatigue delta tracking. */
export interface PrevSnapshot {
  xg: [number, number];
  goals: [number, number];
  fatigue: [number, number];
}

/** Full match state — passed to every engine function. */
export interface MatchState {
  T: Tuning;
  round: number;
  phase: "plan" | "roundEnd" | "end";
  winner: number | null;
  capReason: string | null;
  extraTime: boolean;
  etRound: number;
  justEnteredET: boolean;
  opponent: OpponentTeam | null;
  players: [PlayerState, PlayerState];
  reactions: string[];
  lastEvents: MatchEvent[];
  lastBoards: BoardSnapshot[] | null;
  lastTotals: SideTotals[] | null;
  offsideZeroed: [string | null, string | null];
  prev: PrevSnapshot;
  roundXg: [number, number];
  roundGoals: [number, number];
  aiIntent: AiIntent | null;
}

/** Per-team effective-stat snapshot produced by sideTotals(). */
export interface SideTotals {
  atk: number;
  def: number;
  gkSave: number;
  formation: Formation;
  notes: string[];
}

/** Board state captured at reveal for the UI (or sim logging). */
export interface BoardSnapshot {
  attack: PlayerCard[];
  defense: PlayerCard[];
  tactics: { card: TacticalCard; cancelled: boolean }[];
  formation: Formation;
  offsideId: string | null;
}

export interface AiIntent {
  cards: number;
  stamina: number;
  formation: Formation;
}

/** Typed union for events emitted by reveal(). */
export type MatchEvent =
  | { t: "note"; text: string }
  | { t: "instant"; who?: number; text: string; red?: boolean }
  | { t: "totals"; tot: SideTotals[] }
  | { t: "xg"; who: number; amount: number; parts: XgPart[] }
  | { t: "goal"; who: number; score: [number, number] }
  | { t: "halftime" }
  | { t: "extratime" };

export interface XgPart {
  label: string;
  amt: number | null;
}

/** Gate definition for a player-gated tactical. */
export interface GateSpec {
  pos: Position | Position[];
  n: number;
  where: "lineup" | "attack";
}

/** An opponent team supplied to newMatch() by the sim or game. */
export interface OpponentTeam {
  id: string;
  name: string;
  tier: Tier;
  preferredFormation: Formation;
  cards: Card[];
  captainId: string;
}

/** All engine tuning knobs — every magic number lives here. */
export interface Tuning {
  mercyLead: number;
  roundCap: number;
  halftimeRound: number;
  etRoundCap: number;
  etXgMult: number;
  xgFloor: number;
  xgSlope: number;
  xgCap: number;
  openingHand: number;
  handSize: number;
  handCap: number;
  tacticalsPerHalf: number;
  staminaPerRound: number;
  slotBudget: number;
  cardCapBase: number;
  rarityMult: Record<Rarity, number>;
  prideBonus: number;
  chemBonus: number;
  formationSwing: number;
  fatigueMax: number;
  fatigueDiv: number;
  fatigueRate: number;
  pressFatigue: number;
  pressDef: number;
  counterXg: number;
  momentumXg: number;
  tikiTakaXg: number;
  longBallXg: number;
  penaltyXg: number;
  hogXg: number;
  fortressDef: number;
  gkSaveXg: number;
  intent: boolean;

  // --- Experimental balance fixes (OFF by default → baseline behavior unchanged).
  //     See the "Balance Fix Spec — Diminishing Returns + Star Synergy". ---
  // Fix 2 (resolve): diminishing returns on stacked lane contributions. When set,
  // each lane's per-card contributions are sorted descending and multiplied by these
  // weights (index 0 = top contributor). null = flat sum (baseline).
  stackWeights: number[] | null;
  // Fix 1 (plan): star synergy stamina discount. When true, in a lane containing >=1
  // premium (non-common) the highest-cost card is the full-price anchor and every other
  // card is discounted (regardless of tier). A lane with no premium gets no discount.
  starSynergyDiscount: boolean;
  synergyDiscount: number; // non-anchor cost multiplier (e.g. 0.5)
  synergyMinCost: number; // floor for a discounted card's stamina cost
  // Experiment: gentle per-round stamina cost curve. When set, a PLAYER card's per-round
  // stamina cost is taken from this rarity→cost map instead of card.cost (the synergy discount
  // then applies on top). null = use card.cost (baseline). Deck-build slot costs are unaffected;
  // tactical cards always use their own card.cost.
  costByRarity: Record<Rarity, number> | null;
}
