import type { TacticalCard } from "../engine/types.ts";

/**
 * GDD v10 §12 complete tactical card catalog — all 19 effect kinds.
 *
 * Slot costs follow §15: standard tacticals cost 1 deck slot;
 * high-powered legendary-tier Powers (Hand of God, Total Football) cost 2.
 * Field stamina cost matches the `cost` column in the §12 table.
 *
 * High Press encodes the "≥2 FWD/MID" gate as requiresCount: 2 with no
 * requiresPosition, which means the engine must check FWD-or-MID cards when
 * enforcing the gate. The gate is noted in the card name's flavor via the
 * effect kind "highPress".
 */
export const tacticals: TacticalCard[] = [
  // ── Instants ──────────────────────────────────────────────────────────────

  {
    id: "tac-var",
    type: "tactical",
    name: "VAR Review",
    category: "instant",
    cost: 2,
    slots: 1,
    rarity: "rare",
    effect: { kind: "var" },
  },
  {
    id: "tac-offside-trap",
    type: "tactical",
    name: "Offside Trap",
    category: "instant",
    cost: 2,
    slots: 1,
    rarity: "rare",
    effect: { kind: "offsideTrap", requiresPosition: "DEF", requiresCount: 1 },
  },
  {
    id: "tac-referee",
    type: "tactical",
    name: "Referee's Whistle",
    category: "instant",
    cost: 1,
    slots: 1,
    rarity: "common",
    effect: { kind: "referee" },
  },
  {
    id: "tac-injury",
    type: "tactical",
    name: "Injury",
    category: "instant",
    cost: 2,
    slots: 1,
    rarity: "rare",
    effect: { kind: "injury", amount: 15 },
  },

  // ── Skills ────────────────────────────────────────────────────────────────

  {
    id: "tac-water-break",
    type: "tactical",
    name: "Water Break / Fresh Legs",
    category: "skill",
    cost: 0,
    slots: 1,
    rarity: "common",
    effect: { kind: "waterBreak", amount: 2 },
  },
  {
    id: "tac-substitution",
    type: "tactical",
    name: "Substitution",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "common",
    effect: { kind: "substitution", amount: 8 },
  },
  {
    id: "tac-tiki-taka",
    type: "tactical",
    name: "Tiki-Taka",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "epic",
    effect: { kind: "tikiTaka", amount: 0.20, requiresPosition: "MID", requiresCount: 2 },
  },
  {
    id: "tac-catenaccio",
    type: "tactical",
    name: "Catenaccio",
    category: "skill",
    cost: 2,
    slots: 1,
    rarity: "epic",
    effect: { kind: "catenaccio", requiresPosition: "DEF", requiresCount: 2 },
  },
  {
    id: "tac-counter-attack",
    type: "tactical",
    name: "Counter-Attack",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind: "counterAttack", amount: 0.40, requiresPosition: "FWD", requiresCount: 1 },
  },
  {
    id: "tac-high-press",
    type: "tactical",
    name: "High Press",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "epic",
    // Gate: ≥2 FWD-or-MID. requiresPosition is intentionally absent here
    // because the gate accepts either role; the engine checks FWD-or-MID
    // when requiresCount is set and requiresPosition is absent for highPress.
    effect: { kind: "highPress", requiresCount: 2 },
  },
  {
    id: "tac-long-ball",
    type: "tactical",
    name: "Long Ball",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind: "longBall", amount: 0.45, requiresPosition: "FWD", requiresCount: 1 },
  },
  {
    id: "tac-nutmeg",
    type: "tactical",
    name: "Nutmeg",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind: "nutmeg", requiresPosition: "FWD", requiresCount: 1 },
  },
  {
    id: "tac-penalty",
    type: "tactical",
    name: "Penalty Kick",
    category: "skill",
    cost: 2,
    slots: 1,
    rarity: "epic",
    effect: { kind: "penalty", amount: 0.85, requiresPosition: "FWD", requiresCount: 1 },
  },
  {
    id: "tac-team-talk",
    type: "tactical",
    name: "Halftime Team Talk",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind: "teamTalk" },
  },
  {
    id: "tac-time-wasting",
    type: "tactical",
    name: "Time Wasting",
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "common",
    effect: { kind: "timeWasting" },
  },

  // ── Powers ────────────────────────────────────────────────────────────────

  {
    id: "tac-hand-of-god",
    type: "tactical",
    name: "Hand of God",
    category: "power",
    cost: 3,
    slots: 2,
    rarity: "legendary",
    effect: { kind: "handOfGod", amount: 1.0, requiresPosition: "FWD", requiresCount: 1 },
  },
  {
    id: "tac-fortress",
    type: "tactical",
    name: "Fortress",
    category: "power",
    cost: 3,
    slots: 1,
    rarity: "legendary",
    effect: { kind: "fortress", amount: 8 },
  },
  {
    id: "tac-talisman",
    type: "tactical",
    name: "Talisman",
    category: "power",
    cost: 2,
    slots: 1,
    rarity: "epic",
    effect: { kind: "talisman", amount: 3 },
  },
  {
    id: "tac-total-football",
    type: "tactical",
    name: "Total Football",
    category: "power",
    cost: 3,
    slots: 2,
    rarity: "legendary",
    effect: { kind: "totalFootball" },
  },
] satisfies TacticalCard[];
