export type {
  Position,
  Rarity,
  Lane,
  Formation,
  TacticalCategory,
  TacticalKind,
  Tier,
  TacticalEffect,
  PlayerCard,
  TacticalCard,
  Card,
  CardStatus,
  PlayerState,
  PrevSnapshot,
  MatchState,
  SideTotals,
  BoardSnapshot,
  AiIntent,
  MatchEvent,
  XgPart,
  GateSpec,
  OpponentTeam,
  Tuning,
} from "./types.ts";

export { DEFAULT_TUNING } from "./config.ts";
export { makeRng } from "./rng.ts";
export type { Rng } from "./rng.ts";

// NOTE: the match-resolution engine (newMatch/reveal/resolveRound/…) is intentionally
// absent — the throwaway balance-sim port was retired. The shipping engine is built FRESH
// from the GDD rules under epic SCRUM-6 (see APP_DEFINITION.md §6/§7/§8/§14/§17).
