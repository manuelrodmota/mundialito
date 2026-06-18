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

export type StatusKind = "booked" | "red" | "pressed" | "injured" | "onform";

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
  board: { attack: CardInPlay[]; defense: CardInPlay[] };
  formation: Formation;
  powers: TacticalCard[];
  captainId: string;
  momentum: number;
  handOfGodUsed: boolean;
}

export interface MatchState {
  round: number;
  extraTime: boolean;
  etRound: number;
  players: [PlayerState, PlayerState];
  opponent: OpponentTeam;
  phase: "draw" | "plan" | "reveal" | "resolve" | "end";
  winner: 0 | 1 | null;
}

export interface RunState {
  matchIndex: number;
  stage: "group" | "r16" | "qf" | "sf" | "final";
  deck: Card[];
  captainId: string;
  defeated: string[];
  alive: boolean;
}
