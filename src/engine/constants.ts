// GDD v10 §15 / §17 — every engine knob in one place.
// Changing a balance value means editing exactly this file.

import type { Rarity, Formation } from "./types.ts";

/**
 * Sim-only tuning override: a balance knob may be overridden via an env var when running under Node
 * (scripts/*.ts sweeps), falling back to the shipped default. Browser-safe — `globalThis.process` is
 * undefined in the app bundle, so production always uses the defaults. Lets scripts/arcadeSim.ts sweep
 * the fill curve + fatigue ramp without editing this file per cell.
 */
export function tunable(envKey: string, def: number): number {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const raw = env?.[envKey];
  const n = raw != null && raw !== "" ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : def;
}

/** Rarity multiplier applied to each card's stat contribution. §17 */
export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.1,
  epic: 1.2,
  legendary: 1.3,
} as const satisfies Record<Rarity, number>;

/**
 * Overall at/above which a card reads as "gold" (legendary-tier colour in the UI). v11.1: a GOLD
 * GOALKEEPER anchors its lane at the legendary multiplier (×1.3) even if its rating lands it in the
 * epic band — elite keepers are defensive keystones. Mirrors the UI colour threshold. §4
 */
export const GOLD_THRESHOLD = 87;

/** Per-round stamina cost to field a card (v10 gentle curve). §17 */
export const COST_BY_RARITY: Record<Rarity, number> = {
  common: 2,
  rare: 2,
  epic: 3,
  legendary: 4,
} as const satisfies Record<Rarity, number>;

/**
 * v10 diminishing-returns weights for lane stacking.
 * Sort contributions high→low then multiply by the corresponding weight.
 * Beyond index 5 a card contributes nothing. §17
 */
export const STACK_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25] as const;

/**
 * v10 star-core stamina discount.
 * Non-anchor cards in a lane that contains ≥1 premium pay this fraction of
 * their cost (rounded down, minimum 1). All-common lanes receive no discount. §17
 */
export const STAR_SYNERGY_DISCOUNT = 0.5;

// xG scoring curve (v10.1-tuned — balance pass for scoring tempo).
// Raised floor + lower threshold convert the slowly-accumulating xG into goals
// faster, killing the "+0.05 grind" where balanced/defensive matchups stalled
// at the floor and dragged to extra time. See scripts/balanceSim.ts. §7 / §17
export const XG_FLOOR = 0.1;
export const XG_SLOPE = 180;
// v12: cap raised to 0.65 (was 0.55→0.60; 0.60 undershot at 8 rounds) to add SHOTS — safe only
// because probabilistic finishing (0.75) brakes scoring. Sweep must confirm totals stay ≤ ~6. §7/§19#1
export const XG_CAP = tunable("SIM_XG_CAP", 0.65);
/**
 * @deprecated v11 replaced the deterministic "cross the threshold → goal" with probabilistic
 * finishing (Pressure → Conversion, below). Kept only for the legacy balance-sim curve sweep.
 */
export const GOAL_THRESHOLD = 0.8;

// ── v11 probabilistic finishing — "Pressure → Conversion" (§7 / §14 / §19) ──────────────────────
// The meter (state.xg) is now PRESSURE in [0, PRESSURE_FULL]: each attacking round adds the same
// xG fill as before, but reaching the top no longer guarantees a goal — it triggers a SHOT that
// converts with probability P. A goal empties the meter; a miss knocks a chunk off (keep trying).
// This breaks the deterministic "I score / you score" metronome while keeping the better deck ahead
// (it fills faster → shoots more often). Tune via scripts/balanceSim.ts.
/** Meter value that triggers a shot ("full"). The bar is displayed as pressure / PRESSURE_FULL.
 *  v12: lowered 1.0 → 0.85 → 0.75 → 0.70 (the §19#1 sweep pick: lands ~5.1 G/match in the 5–6 band at
 *  8 rounds; higher values undershot). More shots, not more conversion — the 0.75 finish is untouched. */
export const PRESSURE_FULL = tunable("SIM_PRESSURE_FULL", 0.7);
/** Base shot conversion when the meter reaches full (open play). v12: 0.80 → 0.75 (a full meter is a bit less of a sure thing). */
export const BASE_CONVERSION = 0.75;
/** Open play is never a certainty; hard ceiling on P after all bonuses. */
export const CONVERSION_CAP = 0.95;
/** A forced shot (tactical) never drops below this. */
export const CONVERSION_FLOOR = 0.05;
/** Fraction of the meter lost on a miss — you keep some pressure to try again next round. */
export const MISS_DROP_FRAC = 0.5;
/** Per-consecutive-miss conversion bonus (bad-luck protection / "they're due"). */
export const PITY_STEP = 0.07;
export const PITY_CAP = 0.25;
/** Max conversion bonus from momentum (a side "on top" finishes a little better). */
export const MOMENTUM_CONVERSION = 0.06;
/** Penalty Kick: a forced shot at this conversion regardless of build-up (≈ a real penalty). */
export const PENALTY_CONVERSION = 0.78;
/** Hand of God: a forced, near-certain shot once per match (no longer a flat guaranteed goal). */
export const HAND_OF_GOD_CONVERSION = 0.95;

// ── v12 defense/attack edge-case finishing — Park the Bus & Snap Shot (§7 / §15 / §19) ──────────
/**
 * Park the Bus (the defensive answer to a full meter). When a side stacks its back line this round
 * — a goalkeeper + ≥2 defenders, or ≥3 defenders — the OPPONENT's open-play shot conversion is
 * reduced by this amount (so a 0.75 shot lands at ~0.55). Forced shots (Penalty / Hand of God)
 * ignore it. The bus costs the round (slots not attacking), raises fatigue, and a denied shot still
 * builds the attacker's pity — it delays goals, not walls them out. §7
 */
export const PARK_THE_BUS_PENALTY = 0.20;
/**
 * Snap Shot (the attacking mirror). When a side's per-round xG fill is near the cap (a dominant
 * attacking round), it gets a slim chance of an immediate shot on a PARTIAL meter:
 *   snapChance = clamp((xgRound − SNAP_THRESHOLD) × SNAP_SCALE, 0, SNAP_CAP)
 * The attempt is a normal open-play shot (Park the Bus still blunts it) and it RESETS the meter to 0
 * whether it scores or not — a tempo gamble (score now vs. keep building), not free goals. §7
 */
export const SNAP_THRESHOLD = tunable("SIM_SNAP_THRESHOLD", 0.55); // v12: tracks the xG cap at cap − 0.10 (0.65 → 0.55), near-max-only
export const SNAP_SCALE = 1.0;
export const SNAP_CAP = 0.1;
/**
 * v10.1 defense coefficient — how much of effective DEF is subtracted from the
 * opponent's ATK in the xG delta. <1.0 stops a stacked back line (bunkering
 * underdogs, defensive formations) from out-suppressing a star attack and
 * dragging matches to a 0–0 → extra-time grind. Defense still clearly suppresses
 * (a strong line concedes measurably less), just no longer to a standstill. §7 / §19.9
 */
export const DEF_COEFF = 0.9;

/** Per-round stamina budget. v12 (8-round match): ramps at R5 and R7. §15 / §17 */
export function STAMINA(round: number): number {
  return round <= 4 ? 8 : round <= 6 ? 10 : 12;
}

/** Maximum player cards fielded per round (attack + defense combined). v12: R1–4 / R5–6 / R7–8. §15 / §17 */
export function CARD_CAP(round: number): number {
  return round <= 4 ? 4 : round <= 6 ? 5 : 6;
}

/** ATK and DEF multipliers per formation. §15 */
export const FORMATIONS: Record<Formation, { atkMult: number; defMult: number }> = {
  offensive: { atkMult: 1.18, defMult: 0.82 },
  balanced: { atkMult: 1.0, defMult: 1.0 },
  defensive: { atkMult: 0.82, defMult: 1.18 },
} as const satisfies Record<Formation, { atkMult: number; defMult: number }>;

// Match structure. §15 — v12: match cut 10 → 8 rounds (halftime R4 / 45', full time R8 / 90').
export const MERCY_LEAD = 3;
export const ROUND_CAP = 8;
export const HALFTIME_ROUND = 4;
export const ET_ROUND_CAP = 5;
export const ET_XG_MULT = 2;
/**
 * v12 §19#5(b) — partial xG tie-break. A game level on goals at full time is decided outright by the
 * side with more accumulated xG (chances created) IF their lead is at least this gap; otherwise it
 * goes to golden-goal ET. Higher gap → fewer tie-breaks → more ET; lower → less ET. Swept to land
 * ET ~20–25% (default below is the sweep pick). Tunable via SIM_XG_TIEBREAK_GAP for the sweep. §14
 */
export const XG_TIEBREAK_GAP = tunable("SIM_XG_TIEBREAK_GAP", 1.0);

// Hand and tactical limits. §15
export const HAND_SIZE = 5;
export const TACTICALS_PER_HALF = 2;
export const RUN_TACTICAL_DECK_CAP = 4;

// Synergy bonuses. §15
export const CHEM_BONUS_ATK = 2;
export const CHEM_BONUS_DEF = 2;
export const STRIKE_BONUS_ATK = 5;
export const BACKLINE_BONUS_DEF = 8;
export const MIDFIELD_BONUS_STAMINA = 1;

// Captain's Pride bonus. §15
export const CAPTAIN_PRIDE_ATK = 2;
export const CAPTAIN_PRIDE_DEF = 2;

// Fatigue. §15
export const FATIGUE_MAX = 30;
/** Fatigue→DEF penalty divisor: DEF_eff = DEF × (1 − F/DIV). Lower = defenses fray harder late. §15 */
export const FATIGUE_DIV = tunable("SIM_FATIGUE_DIV", 60);
/** Fatigue gained per round of defending. §15 */
export const FATIGUE_GAIN = tunable("SIM_FATIGUE_GAIN", 3);
/** Fatigue lost per round of attacking (rest). §15 */
export const FATIGUE_LOSS = 3;

// Tactical xG values. §15
export const COUNTER_ATTACK_XG = 0.4;
export const MOMENTUM_XG = 0.1;

// High Press / Pressed status. §11 / §12
/** DEF penalty applied to a Pressed defender. */
export const PRESSED_DEF = 10;
/** Fatigue added to a pressed opponent (carries into the next round). */
export const HIGH_PRESS_FATIGUE = 6;

// Skill fatigue relief. §12
/** Fatigue reduced by Substitution (fresh legs). */
export const SUBSTITUTION_FATIGUE = 8;
/** Extra cards drawn by Substitution / Halftime Team Talk. */
export const SUBSTITUTION_DRAW = 1;
export const TEAM_TALK_DRAW = 2;
