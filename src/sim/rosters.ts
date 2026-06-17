// Representative archetype decks and opponent tiers for the Monte-Carlo sim.
// Exact ratings don't matter — the spread does (GDD §4, ticket §test-matrix).

import type { PlayerCard, TacticalCard, Card, OpponentTeam } from "../engine/types.ts";

function player(
  id: string,
  name: string,
  pos: PlayerCard["position"],
  rarity: PlayerCard["rarity"],
  atk: number,
  def: number,
  overall: number,
  cost: number,
  nation: string,
): PlayerCard {
  return { id, type: "player", name, position: pos, rarity, nation, atk, def, overall, cost };
}

function tactic(
  id: string,
  name: string,
  kind: TacticalCard["effect"]["kind"],
  cat: TacticalCard["category"],
  slots: number,
  cost: number,
): TacticalCard {
  return { id, type: "tactical", name, category: cat, effect: { kind }, slots, cost };
}

// ---- shared tactical card pool ----

const counterAttackCard = tactic("t-counter", "Counter-Attack", "counterAttack", "instant", 1, 2);
const catenaccioCard = tactic("t-cat", "Catenaccio", "catenaccio", "skill", 2, 3);
const tikiTakaCard = tactic("t-tiki", "Tiki-Taka", "tikiTaka", "skill", 1, 3);
const penaltyCard = tactic("t-penalty", "Penalty Kick", "penalty", "instant", 2, 4);
const longBallCard = tactic("t-longball", "Long Ball", "longBall", "instant", 1, 2);
const offsideTrapCard = tactic("t-offside", "Offside Trap", "offsideTrap", "skill", 1, 2);
const highPressCard = tactic("t-press", "High Press", "highPress", "skill", 2, 3);

// ---- all-common deck (no tacticals — baseline for tactical-impact measurement) ----

export const allCommonCards: Card[] = [
  player("c1", "Carlos Lima", "GK", "common", 10, 60, 60, 2, "BRA"),
  player("c2", "Jose Ramos", "DEF", "common", 30, 55, 58, 2, "ESP"),
  player("c3", "Diego Morales", "DEF", "common", 28, 52, 55, 2, "ESP"),
  player("c4", "Ahmed Hassan", "DEF", "common", 25, 50, 52, 2, "EGY"),
  player("c5", "Liu Wei", "MID", "common", 45, 40, 52, 2, "CHN"),
  player("c6", "Kwame Asante", "MID", "common", 42, 38, 50, 2, "GHA"),
  player("c7", "Ivan Petrov", "MID", "common", 40, 36, 48, 2, "RUS"),
  player("c8", "Marco Rios", "FWD", "common", 58, 20, 55, 2, "MEX"),
  player("c9", "Luka Jovic", "FWD", "common", 55, 18, 52, 2, "SRB"),
  player("c10", "Takeshi Ito", "FWD", "common", 52, 15, 50, 2, "JPN"),
  player("c11", "Olumide Obi", "MID", "common", 38, 35, 46, 2, "NGA"),
  player("c12", "Hamid Aziz", "DEF", "common", 22, 48, 50, 2, "IRN"),
];
export const allCommonCaptain = "c8";

// ---- all-common WITH tacticals (for tactical-impact delta) ----

export const allCommonWithTacticsCards: Card[] = [
  ...allCommonCards,
  counterAttackCard,
  longBallCard,
  offsideTrapCard,
];
export const allCommonWithTacticsCaptain = "c8";

// ---- balanced deck ----

export const balancedCards: Card[] = [
  player("b1", "Fabio Santos", "GK", "rare", 12, 68, 70, 3, "BRA"),
  player("b2", "Roberto Silva", "DEF", "rare", 35, 62, 68, 3, "BRA"),
  player("b3", "Carlos Perez", "DEF", "rare", 32, 60, 65, 3, "ARG"),
  player("b4", "Luis Mendez", "DEF", "common", 28, 55, 57, 2, "MEX"),
  player("b5", "Gabriel Costa", "MID", "rare", 55, 48, 65, 3, "BRA"),
  player("b6", "Andre Ferreira", "MID", "common", 48, 44, 55, 2, "PRT"),
  player("b7", "Sven Larsson", "MID", "common", 44, 42, 52, 2, "SWE"),
  player("b8", "Pedro Alves", "FWD", "epic", 72, 22, 75, 4, "BRA"),
  player("b9", "Rodrigo Lima", "FWD", "rare", 65, 18, 68, 3, "BRA"),
  player("b10", "Jean-Paul Luc", "FWD", "common", 58, 16, 56, 2, "FRA"),
  player("b11", "Mehmet Yilmaz", "MID", "common", 46, 40, 52, 2, "TUR"),
  player("b12", "Erik Hansen", "DEF", "common", 26, 52, 53, 2, "DNK"),
  tikiTakaCard,
  counterAttackCard,
  offsideTrapCard,
];
export const balancedCaptain = "b8";

// ---- star-heavy deck ----

export const starHeavyCards: Card[] = [
  player("s1", "Victor Godin", "GK", "epic", 15, 80, 82, 4, "FRA"),
  player("s2", "Lorenzo Conte", "DEF", "epic", 40, 75, 80, 4, "ITA"),
  player("s3", "Matteo Ricci", "DEF", "rare", 38, 70, 75, 3, "ITA"),
  player("s4", "Rafael Torres", "DEF", "common", 30, 58, 60, 2, "ESP"),
  player("s5", "Alejandro Vega", "MID", "legendary", 75, 58, 88, 5, "ESP"),
  player("s6", "Bruno Machado", "MID", "epic", 68, 52, 78, 4, "PRT"),
  player("s7", "Antoine Girard", "MID", "rare", 58, 50, 68, 3, "FRA"),
  player("s8", "El Tigre", "FWD", "legendary", 92, 20, 95, 6, "ARG"),
  player("s9", "Luis Aguila", "FWD", "epic", 82, 18, 85, 5, "URY"),
  player("s10", "Rashid Khalil", "FWD", "rare", 72, 16, 76, 4, "MAR"),
  player("s11", "Ko Yamamoto", "MID", "common", 50, 44, 56, 2, "JPN"),
  player("s12", "Pavel Novak", "DEF", "common", 28, 54, 56, 2, "CZE"),
  penaltyCard,
  catenaccioCard,
];
export const starHeavyCaptain = "s8";

// ---- defense-heavy deck ----

export const defenseHeavyCards: Card[] = [
  player("d1", "Rene Muller", "GK", "epic", 12, 85, 86, 4, "DEU"),
  player("d2", "Franz Bauer", "DEF", "epic", 35, 82, 84, 4, "DEU"),
  player("d3", "Hans Richter", "DEF", "epic", 32, 80, 82, 4, "DEU"),
  player("d4", "Klaus Weber", "DEF", "rare", 30, 75, 78, 3, "DEU"),
  player("d5", "Stefan Braun", "DEF", "rare", 28, 72, 74, 3, "DEU"),
  player("d6", "Jens Fischer", "MID", "rare", 50, 55, 65, 3, "DEU"),
  player("d7", "Michael Schulz", "MID", "common", 44, 48, 55, 2, "AUT"),
  player("d8", "Thomas Huber", "FWD", "epic", 70, 25, 76, 4, "DEU"),
  player("d9", "Wolfgang Klein", "FWD", "rare", 62, 20, 68, 3, "DEU"),
  player("d10", "Dieter Lang", "FWD", "common", 54, 15, 52, 2, "SUI"),
  player("d11", "Günter Roth", "MID", "common", 46, 46, 54, 2, "DEU"),
  player("d12", "Anton Keller", "DEF", "common", 26, 68, 68, 2, "AUT"),
  catenaccioCard,
  offsideTrapCard,
  highPressCard,
];
export const defenseHeavyCaptain = "d8";

// ---- opponent tiers ----

export const weakOpponent: OpponentTeam = {
  id: "opp-weak",
  name: "Minnow FC",
  tier: "weak",
  preferredFormation: "balanced",
  captainId: "w8",
  cards: [
    player("w1", "Pete Brown", "GK", "common", 8, 42, 42, 1, "ENG"),
    player("w2", "Tom Hill", "DEF", "common", 18, 38, 40, 1, "ENG"),
    player("w3", "Dan Ford", "DEF", "common", 16, 36, 38, 1, "ENG"),
    player("w4", "Sam Park", "DEF", "common", 14, 34, 36, 1, "ENG"),
    player("w5", "Ray Hall", "MID", "common", 28, 26, 34, 1, "ENG"),
    player("w6", "Nick Cole", "MID", "common", 25, 24, 32, 1, "ENG"),
    player("w7", "Matt Cox", "MID", "common", 22, 22, 30, 1, "ENG"),
    player("w8", "Jake Ward", "FWD", "common", 38, 10, 38, 2, "ENG"),
    player("w9", "Ben Fox", "FWD", "common", 34, 8, 34, 1, "ENG"),
    player("w10", "Sean Page", "FWD", "common", 30, 6, 30, 1, "ENG"),
    player("w11", "Adam Ross", "MID", "common", 20, 20, 28, 1, "IRL"),
    player("w12", "Phil Dean", "DEF", "common", 12, 32, 32, 1, "IRL"),
  ],
};

export const midOpponent: OpponentTeam = {
  id: "opp-mid",
  name: "Europa United",
  tier: "mid",
  preferredFormation: "balanced",
  captainId: "m8",
  cards: [
    player("m1", "Mario Gallo", "GK", "rare", 10, 65, 66, 2, "ITA"),
    player("m2", "Sergio Blanco", "DEF", "rare", 35, 65, 70, 3, "ESP"),
    player("m3", "Klaus Wulf", "DEF", "rare", 32, 62, 68, 3, "DEU"),
    player("m4", "Piotr Wisnik", "DEF", "common", 28, 55, 57, 2, "POL"),
    player("m5", "Yann Dubois", "MID", "rare", 58, 50, 68, 3, "FRA"),
    player("m6", "Lars Berg", "MID", "common", 50, 44, 56, 2, "NOR"),
    player("m7", "Tomas Novak", "MID", "common", 45, 42, 52, 2, "CZE"),
    player("m8", "Sergio Moreno", "FWD", "epic", 75, 20, 78, 4, "ESP"),
    player("m9", "Jean Blanc", "FWD", "rare", 68, 18, 72, 3, "FRA"),
    player("m10", "Nico Russo", "FWD", "common", 58, 16, 56, 2, "ITA"),
    player("m11", "Artur Coelho", "MID", "common", 48, 40, 54, 2, "PRT"),
    player("m12", "Goran Petrovic", "DEF", "common", 26, 52, 53, 2, "SRB"),
    counterAttackCard,
    tikiTakaCard,
  ],
};

export const championOpponent: OpponentTeam = {
  id: "opp-champion",
  name: "Tier-S Legends XI",
  tier: "champion",
  preferredFormation: "offensive",
  captainId: "ch8",
  cards: [
    player("ch1", "Maxime Renard", "GK", "legendary", 18, 92, 94, 5, "FRA"),
    player("ch2", "Pablo Ortega", "DEF", "legendary", 45, 88, 92, 5, "ESP"),
    player("ch3", "Luca Fantini", "DEF", "epic", 42, 85, 88, 4, "ITA"),
    player("ch4", "Diogo Rocha", "DEF", "epic", 38, 82, 84, 4, "PRT"),
    player("ch5", "Zindan Barka", "MID", "legendary", 82, 68, 92, 6, "ALG"),
    player("ch6", "Hiroshi Tanaka", "MID", "epic", 72, 60, 82, 5, "JPN"),
    player("ch7", "Kristof Balogh", "MID", "rare", 62, 55, 72, 4, "HUN"),
    player("ch8", "El Maestro", "FWD", "legendary", 98, 22, 99, 7, "ARG"),
    player("ch9", "Golden Boot", "FWD", "legendary", 94, 18, 96, 6, "BRA"),
    player("ch10", "Flash Gordon", "FWD", "epic", 84, 16, 88, 5, "GBR"),
    player("ch11", "Femi Okonkwo", "MID", "epic", 70, 58, 80, 5, "NGA"),
    player("ch12", "Santiago Cruz", "DEF", "rare", 35, 78, 80, 4, "ARG"),
    penaltyCard,
    catenaccioCard,
    highPressCard,
  ],
};

/** All player archetypes available for the sim matrix. */
export type DeckName = "all-common" | "all-common-tactics" | "balanced" | "star-heavy" | "defense-heavy";

export interface DeckSpec {
  name: DeckName;
  cards: Card[];
  captainId: string;
}

export const DECKS: DeckSpec[] = [
  { name: "all-common", cards: allCommonCards, captainId: allCommonCaptain },
  { name: "all-common-tactics", cards: allCommonWithTacticsCards, captainId: allCommonWithTacticsCaptain },
  { name: "balanced", cards: balancedCards, captainId: balancedCaptain },
  { name: "star-heavy", cards: starHeavyCards, captainId: starHeavyCaptain },
  { name: "defense-heavy", cards: defenseHeavyCards, captainId: defenseHeavyCaptain },
];

export const OPPONENTS: OpponentTeam[] = [weakOpponent, midOpponent, championOpponent];
