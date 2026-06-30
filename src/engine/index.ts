export type {
  Position,
  Rarity,
  Lane,
  Formation,
  TacticalCat,
  Tier,
  TacticalEffect,
  PlayerCard,
  TacticalCard,
  Card,
  StatusKind,
  Status,
  CardInPlay,
  OpponentTeam,
  PlayerState,
  MatchState,
  RunState,
  ShotResult,
} from "./types.ts";

export {
  RARITY_MULT,
  COST_BY_RARITY,
  STACK_WEIGHTS,
  STAR_SYNERGY_DISCOUNT,
  XG_FLOOR,
  XG_SLOPE,
  XG_CAP,
  GOAL_THRESHOLD,
  DEF_COEFF,
  STAMINA,
  CARD_CAP,
  FORMATIONS,
  MERCY_LEAD,
  ROUND_CAP,
  HALFTIME_ROUND,
  ET_ROUND_CAP,
  ET_XG_MULT,
  XG_TIEBREAK_GAP,
  HAND_SIZE,
  TACTICALS_PER_HALF,
  RUN_TACTICAL_DECK_CAP,
  CHEM_BONUS_ATK,
  CHEM_BONUS_DEF,
  STRIKE_BONUS_ATK,
  BACKLINE_BONUS_DEF,
  MIDFIELD_BONUS_STAMINA,
  CAPTAIN_PRIDE_ATK,
  CAPTAIN_PRIDE_DEF,
  FATIGUE_MAX,
  FATIGUE_DIV,
  FATIGUE_GAIN_FOR,
  FATIGUE_LOSS,
  FATIGUE_BALANCED_GAIN,
  HALFTIME_FATIGUE_RECOVERY,
  FLOOR_FATIGUE_BONUS,
  xgFloorFor,
  COUNTER_ATTACK_XG,
  MOMENTUM_XG,
  PRESSURE_FULL,
  BASE_CONVERSION,
  CONVERSION_CAP,
  MISS_DROP_FRAC,
  PENALTY_CONVERSION,
  HAND_OF_GOD_CONVERSION,
  PARK_THE_BUS_PENALTY,
  SNAP_THRESHOLD,
  SNAP_SCALE,
  SNAP_CAP,
} from "./constants.ts";

export { makeRng } from "./rng.ts";
export type { Rng } from "./rng.ts";

// WCC-006 — xG engine
export { xgAdd, addPressure, takeShot, previewConversion } from "./xg.ts";
export type { ShotOpts } from "./xg.ts";

// WCC-007/008 — Effective stats + formation
export { atkOf, defOf, laneStack, laneMultiplier, cardLaneMult, applyFormation, computeEffectiveStats, laneDecor, laneFx } from "./effectiveStats.ts";
export type { EffectiveStats, LaneDecor, LaneFx } from "./effectiveStats.ts";

// WCC-009 — Synergies
export { computeSynergies, atkSynergy, defSynergy } from "./synergies.ts";
export type { SynergyDeltas } from "./synergies.ts";

// WCC-010 — Fatigue
export { applyFatiguePenalty, fatigueDelta, updateFatigue, resetFatigue, recoverFatigueAtHalftime } from "./fatigue.ts";

// WCC-011 — Card flow
export { drawToHand, refreshStamina, routeCard, returnLockedToDrawPile, buildOpeningHand, isPremium, isCommonPlayer, isTactical } from "./cards.ts";

// WCC-012 — Lineup validation
export { laneStamina, validLineup } from "./validateLineup.ts";

// WCC-013 — Board
export { commitCard, revealBoards, intentOf, clearBoard } from "./board.ts";
export type { Intent } from "./board.ts";

// WCC-014 — Tactical resolution
export { canPlayTactical, playTactical, tacticalGatePassed, resolveInstants, applyTacticalXg, applyDefensiveTacticals, applyCatenaccio, applyHighPress, applyTimeWasting, shotModifiers, resetTacticalCounters } from "./tacticals.ts";

// WCC-015 — Status effects
export { statusMods, isRedCarded, isBooked, applySecondBooking, addStatus, tickStatuses, onFormXgBonus, removeStatus } from "./status.ts";

// WCC-016 — Momentum
export { updateMomentum, resetMomentum } from "./momentum.ts";

// WCC-017 — Win condition
export { checkWin, beginExtraTime } from "./checkWin.ts";

// WCC-018 — Match state machine
export { newMatch, startRound, resolveRound, halftime, cleanupBoards } from "./match.ts";
export type { NewMatchInput } from "./match.ts";

// WCC-019 — Opponent AI
export { decideTurn } from "./ai.ts";
export type { AiDecision } from "./ai.ts";

// Shared utility
export { clamp } from "./util.ts";
