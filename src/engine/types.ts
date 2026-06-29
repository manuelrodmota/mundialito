// GDD v10 §17 canonical data model — fresh from the GDD, not ported from design/.

export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Lane = "attack" | "defense";
export type Formation = "offensive" | "balanced" | "defensive";
export type TacticalCat = "instant" | "skill" | "power";
export type Tier = "S" | "A" | "B" | "C" | "D";

export interface TacticalEffect {
  kind:
    | "var"
    | "offsideTrap"
    | "referee"
    | "injury"
    | "waterBreak"
    | "substitution"
    | "tikiTaka"
    | "catenaccio"
    | "counterAttack"
    | "highPress"
    | "longBall"
    | "nutmeg"
    | "penalty"
    | "teamTalk"
    | "timeWasting"
    | "handOfGod"
    | "fortress"
    | "talisman"
    | "totalFootball";
  amount?: number;
  requiresPosition?: Position;
  requiresCount?: number;
  duration?: number;
}

export interface PlayerCard {
  id: string;
  /** Durable collection identity = player_ratings.id. Present on cards built from the DB catalog. */
  cardId?: number;
  type: "player";
  name: string;
  nation: string;
  worldCup: number;
  club?: string;
  position: Position;
  overall: number;
  atk: number;
  def: number;
  /** GK xG-suppression bonus applied to opponent xG calculation. */
  saveBonus?: number;
  cost: number;
  rarity: Rarity;
  slots: number;
  ability?: TacticalEffect;
}

export interface TacticalCard {
  id: string;
  type: "tactical";
  name: string;
  category: TacticalCat;
  cost: number;
  slots: number;
  rarity: Rarity;
  effect: TacticalEffect;
}

export type Card = PlayerCard | TacticalCard;

export type StatusKind = "booked" | "red" | "pressed" | "injured" | "onform" | "offside";

export interface Status {
  kind: StatusKind;
  amount?: number;
  duration?: number;
}

export interface CardInPlay {
  card: Card;
  lane?: Lane;
  statuses: Status[];
  faceDown: boolean;
}

export interface OpponentTeam {
  id: string;
  name: string;
  nation: string;
  year: number;
  tier: Tier;
  strength: number;
  squad: PlayerCard[];
  signatureTactical?: TacticalCard[];
  preferredFormation: Formation;
  isChampion: boolean;
  blurb?: string;
}

export interface PlayerState {
  goals: number;
  xg: number;
  fatigue: number;
  scoredFirstAt: number | null;
  maxStamina: number;
  stamina: number;
  drawPile: Card[];
  hand: Card[];
  discard: Card[];
  locked: Card[];
  exiled: Card[];
  tacticalsThisHalf: number;
  tacticSpent: number;
  tacticBonus: number;
  /**
   * Card ids carrying a match-long Injury (−15 ATK/DEF, GDD §11). Unlike round-scoped statuses,
   * injuries must survive the card cycling out of play, so they live here and are re-stamped onto
   * the freshly-built CardInPlay each round in computeEffectiveStats. Optional for back-compat.
   */
  injured?: string[];
  /**
   * Set by the opponent's Time Wasting: this player's xG floor is 0 for their NEXT round (no
   * open-play baseline that round). Captured and cleared at the top of resolveRound. §12. Optional.
   */
  xgFloorSuppressed?: boolean;
  board: { attack: CardInPlay[]; defense: CardInPlay[] };
  formation: Formation;
  powers: TacticalCard[];
  captainId: string;
  momentum: number;
  handOfGodUsed: boolean;
  /** v11 finishing: consecutive missed shots (drives the pity conversion bonus). Optional. */
  missStreak?: number;
  /** v11 finishing: this round's shot outcome, for the reveal UI. Optional. */
  lastShot?: ShotResult;
  /** v11 finishing: the xG (pressure) this player built this round, for the report UI. Optional. */
  lastFill?: number;
}

/** Outcome of a single shot attempt (v11 probabilistic finishing). */
export interface ShotResult {
  /** Whether a shot was attempted this round (meter full or a forced tactical). */
  took: boolean;
  /** Whether it converted to a goal. */
  scored: boolean;
  /** The conversion probability the shot was taken at (0 when no shot). */
  p: number;
}

export interface MatchState {
  round: number;
  extraTime: boolean;
  etRound: number;
  players: [PlayerState, PlayerState];
  opponent: OpponentTeam;
  phase: "draw" | "plan" | "reveal" | "resolve" | "end";
  winner: 0 | 1 | null;
  /**
   * Difficulty handicap: multiplier on the AI opponent's (player index 1) effective ATK & DEF.
   * The Arcade run sets it per ladder stage so later rounds are sharper; defaults to 1 (off).
   */
  aiStrengthMult?: number;
}

export interface RunState {
  matchIndex: number;
  stage: "group" | "r16" | "qf" | "sf" | "final";
  deck: Card[];
  captainId: string;
  defeated: string[];
  alive: boolean;
}
