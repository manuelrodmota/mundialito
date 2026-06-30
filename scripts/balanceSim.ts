/**
 * Balance simulator — measures goals/match, match-length, outcome mix and the
 * "+0.05 floor" rate under the CURRENT v10 xG curve vs candidate curves.
 *
 * Drives the REAL engine end-to-end (newMatch → startRound → AI both sides →
 * resolveRound loop) and only parameterises the four scoring knobs:
 *   floor, slope, cap, and the goal threshold (hardcoded as 1.0 in xg.ts).
 * Everything else (effective-stats fold, fatigue, halftime, mercy, ET, card flow)
 * is the unmodified engine.
 *
 * Decks are PLAYER-ONLY (no tacticals) so we isolate the base curve — the source
 * of the "reaching a goal is tedious / +0.05" complaint. See note at the bottom.
 *
 * Run: pnpm tsx scripts/balanceSim.ts   (or npx tsx scripts/balanceSim.ts)
 */

import type { Card, MatchState, PlayerCard, PlayerState, OpponentTeam, Tier } from "../src/engine/index.ts";
import {
  newMatch,
  startRound,
  decideTurn,
  computeEffectiveStats,
  applyDefensiveTacticals,
  applyHighPress,
  applyTimeWasting,
  resolveInstants,
  updateFatigue,
  updateMomentum,
  checkWin,
  halftime,
  cleanupBoards,
  makeRng,
  validLineup,
  CARD_CAP,
  type Rng,
  ET_XG_MULT,
  HALFTIME_ROUND,
} from "../src/engine/index.ts";

/** Fixed "realistic football" policy: balanced formation, lanes split evenly,
 *  best attackers up front / best defenders at the back, trimmed to stamina.
 *  Removes the AI's offensive-collapse feedback loop so we measure the CURVE. */
function commitBalanced(m: MatchState, idx: 0 | 1): void {
  const state = m.players[idx]!;
  state.formation = "balanced";
  const cap = CARD_CAP(m.round);
  const atkN = Math.floor(cap / 2);
  const defN = cap - atkN;
  const hand = state.hand.filter((c): c is PlayerCard => c.type === "player");
  const attack = [...hand].sort((a, b) => b.atk - a.atk).slice(0, atkN);
  const rest = hand.filter((c) => !attack.includes(c));
  const defense = rest.sort((a, b) => b.def - a.def).slice(0, defN);

  // Trim to stamina: drop the lowest-contribution card from the larger lane.
  const trim = () => {
    const temp = { ...state, board: { attack: [], defense: [] } } as PlayerState;
    for (;;) {
      temp.board.attack = attack.map((c) => ({ card: c, lane: "attack" as const, statuses: [], faceDown: true }));
      temp.board.defense = defense.map((c) => ({ card: c, lane: "defense" as const, statuses: [], faceDown: true }));
      if (validLineup(temp, m.round)) break;
      if (defense.length >= attack.length && defense.length > 0) defense.pop();
      else if (attack.length > 0) attack.pop();
      else break;
    }
  };
  trim();

  for (const c of attack) {
    const i = state.hand.findIndex((h) => h.id === c.id);
    if (i !== -1) { state.hand.splice(i, 1); state.board.attack.push({ card: c, lane: "attack", statuses: [], faceDown: true }); }
  }
  for (const c of defense) {
    const i = state.hand.findIndex((h) => h.id === c.id);
    if (i !== -1) { state.hand.splice(i, 1); state.board.defense.push({ card: c, lane: "defense", statuses: [], faceDown: true }); }
  }
}
import { players } from "../src/data/players.ts";
import { opponents } from "../src/data/opponents.ts";

// ---------------------------------------------------------------------------
// Parameterised scoring curve
// ---------------------------------------------------------------------------

interface CurveCfg {
  label: string;
  floor: number;
  slope: number;
  cap: number;
  threshold: number; // xG to bank one goal (engine hardcodes 1.0)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function xgAddP(atkEff: number, defEff: number, cfg: CurveCfg): number {
  return clamp(cfg.floor + Math.max(0, atkEff - defEff) / cfg.slope, 0, cfg.cap);
}

function addXgP(state: PlayerState, amount: number, round: number, threshold: number): boolean {
  state.xg += amount;
  let scored = false;
  while (state.xg >= threshold) {
    state.goals += 1;
    state.xg -= threshold;
    scored = true;
    if (state.scoredFirstAt === null) state.scoredFirstAt = round;
  }
  return scored;
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

interface Tel {
  rounds: number;            // player regulation rounds observed
  xgSum: number;             // sum of player's per-round xG add (pre-ET, pre-tactical)
  floorRounds: number;       // rounds where player's Δ <= 0 (xG add == floor)
  atkSum: number;            // player atkEff
  defSum: number;            // player defEff
  oppDefSum: number;         // opponent defEff (the wall the player faces)
}

function newTel(): Tel {
  return { rounds: 0, xgSum: 0, floorRounds: 0, atkSum: 0, defSum: 0, oppDefSum: 0 };
}

// ---------------------------------------------------------------------------
// resolveRound — faithful copy of src/engine/match.ts resolveRound, with ONLY
// xgAdd→xgAddP and addXg→addXgP substituted, plus telemetry capture.
// ---------------------------------------------------------------------------

function resolveRoundParam(m: MatchState, rng: Rng, cfg: CurveCfg, tel: Tel): MatchState {
  m.phase = "resolve";

  resolveInstants(m, rng);
  applyHighPress(m, 0);
  applyHighPress(m, 1);
  applyTimeWasting(m, 0);
  applyTimeWasting(m, 1);

  const stats0 = computeEffectiveStats(m.players[0]!);
  const stats1 = computeEffectiveStats(m.players[1]!);

  const defEff0 = applyDefensiveTacticals(m, 0, stats0.defEff) * DEF_SCALE;
  const defEff1 = applyDefensiveTacticals(m, 1, stats1.defEff) * DEF_SCALE;

  // telemetry for the human side (idx 0) during regulation
  if (!m.extraTime) {
    const delta = stats0.atkEff - defEff1;
    tel.rounds += 1;
    tel.xgSum += xgAddP(stats0.atkEff, defEff1, cfg);
    if (Math.max(0, delta) === 0) tel.floorRounds += 1;
    tel.atkSum += stats0.atkEff;
    tel.defSum += stats0.defEff;
    tel.oppDefSum += defEff1;
  }

  let xg0 = xgAddP(stats0.atkEff, defEff1, cfg);
  let xg1 = xgAddP(stats1.atkEff, defEff0, cfg);

  if (m.extraTime) {
    xg0 *= ET_XG_MULT;
    xg1 *= ET_XG_MULT;
  }

  if (m.extraTime) {
    const lead = xg0 >= xg1 ? 0 : 1;
    const scored = addXgP(m.players[lead]!, lead === 0 ? xg0 : xg1, m.round, cfg.threshold);
    updateMomentum(m.players[0]!, lead === 0 && scored);
    updateMomentum(m.players[1]!, lead === 1 && scored);
    updateFatigue(m.players[0]!, m.round);
    updateFatigue(m.players[1]!, m.round);
    m.etRound += 1;
  } else {
    const s0 = addXgP(m.players[0]!, xg0, m.round, cfg.threshold);
    const s1 = addXgP(m.players[1]!, xg1, m.round, cfg.threshold);
    updateMomentum(m.players[0]!, s0);
    updateMomentum(m.players[1]!, s1);
    updateFatigue(m.players[0]!, m.round);
    updateFatigue(m.players[1]!, m.round);
    if (m.round === HALFTIME_ROUND) halftime(m, rng);
  }

  cleanupBoards(m);
  checkWin(m, rng);

  if (m.winner === null) {
    m.round += 1;
    m.phase = "draw";
  }
  return m;
}

// ---------------------------------------------------------------------------
// Deck building
// ---------------------------------------------------------------------------

const SLOTS: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

const PREMIUMS = players.filter((p) => p.rarity !== "common");
const COMMONS = players.filter((p) => p.rarity === "common");

/** Picks premiums up to a slot budget with rough positional spread, then fills commons. */
function buildStarDeck(budget: number, rosterSize: number, rng: Rng): { deck: Card[]; captainId: string } {
  const order: PlayerCard["position"][] = ["GK", "DEF", "FWD", "MID", "DEF", "FWD", "MID", "DEF"];
  const byPos = (pos: string) => rng.shuffle(PREMIUMS.filter((p) => p.position === pos));
  const pools: Record<string, PlayerCard[]> = {
    GK: byPos("GK"), DEF: byPos("DEF"), FWD: byPos("FWD"), MID: byPos("MID"),
  };
  const picks: PlayerCard[] = [];
  let slotsLeft = budget;
  let oi = 0;
  let guard = 0;
  while (slotsLeft > 0 && picks.length < rosterSize && guard++ < 200) {
    const pos = order[oi % order.length]!;
    oi++;
    const pool = pools[pos]!;
    const idx = pool.findIndex((c) => SLOTS[c.rarity]! <= slotsLeft && !picks.includes(c));
    if (idx === -1) continue;
    const card = pool[idx]!;
    picks.push(card);
    slotsLeft -= SLOTS[card.rarity]!;
  }
  const fillers = rng.shuffle(COMMONS).slice(0, Math.max(0, rosterSize - picks.length));
  const deck = [...picks, ...fillers];
  const captain = [...deck].sort((a, b) => (b as PlayerCard).overall - (a as PlayerCard).overall)[0]!;
  return { deck, captainId: captain.id };
}

function buildCommonDeck(rosterSize: number, rng: Rng): { deck: Card[]; captainId: string } {
  const deck = rng.shuffle(COMMONS).slice(0, rosterSize);
  const captain = [...deck].sort((a, b) => (b as PlayerCard).overall - (a as PlayerCard).overall)[0]!;
  return { deck, captainId: captain.id };
}

function oppDeck(opp: OpponentTeam): { deck: Card[]; captainId: string } {
  const deck = [...opp.squad];
  const captain = [...deck].sort((a, b) => b.overall - a.overall)[0]!;
  return { deck, captainId: captain.id };
}

const TIER_TEAMS: Record<Tier, OpponentTeam[]> = { S: [], A: [], B: [], C: [], D: [] };
for (const o of opponents) TIER_TEAMS[o.tier].push(o);

// ---------------------------------------------------------------------------
// Single match
// ---------------------------------------------------------------------------

type Archetype = "star-run" | "all-common" | "quickplay-allstar";

interface MatchResult {
  g0: number; g1: number; win0: boolean;
  rounds: number; endedBy: "mercy" | "fulltime" | "et";
  tel: Tel;
}

function buildPlayerDeck(arch: Archetype, rng: Rng) {
  if (arch === "star-run") return buildStarDeck(10, 11, rng);
  if (arch === "quickplay-allstar") return buildStarDeck(20, 16, rng);
  return buildCommonDeck(11, rng);
}

function simMatch(arch: Archetype, tier: Tier, cfg: CurveCfg, seed: number): MatchResult {
  const rng = makeRng(seed);
  const you = buildPlayerDeck(arch, rng);
  const teams = TIER_TEAMS[tier];
  const opp = teams[Math.floor(rng.next() * teams.length)]!;
  const them = oppDeck(opp);

  const m = newMatch(seed ^ 0x9e3779b9, you, them, opp);
  const tel = newTel();

  let guard = 0;
  while (m.winner === null && guard++ < 60) {
    startRound(m, rng);
    if (POLICY === "balanced") {
      commitBalanced(m, 0);
      commitBalanced(m, 1);
    } else if (POLICY === "mixed") {
      commitBalanced(m, 0); // human side plays sensible football
      decideTurn(m, 1, rng); // opponent is the AI (the realistic match)
    } else {
      decideTurn(m, 0, rng); // AI plays the human side too (reference policy)
      decideTurn(m, 1, rng);
    }
    resolveRoundParam(m, rng, cfg, tel);
  }

  const g0 = m.players[0]!.goals;
  const g1 = m.players[1]!.goals;
  let endedBy: MatchResult["endedBy"];
  if (m.extraTime) endedBy = "et";
  else if (Math.abs(g0 - g1) >= 3) endedBy = "mercy";
  else endedBy = "fulltime";

  return { g0, g1, win0: m.winner === 0, rounds: m.round, endedBy, tel };
}

// ---------------------------------------------------------------------------
// Batch + reporting
// ---------------------------------------------------------------------------

interface Agg {
  n: number; goals: number; pg: number; og: number; wins: number;
  mercy: number; ft: number; et: number; rounds: number;
  telRounds: number; telXg: number; telFloor: number; telAtk: number; telDef: number; telOppDef: number;
}

function newAgg(): Agg {
  return { n: 0, goals: 0, pg: 0, og: 0, wins: 0, mercy: 0, ft: 0, et: 0, rounds: 0,
    telRounds: 0, telXg: 0, telFloor: 0, telAtk: 0, telDef: 0, telOppDef: 0 };
}

function run(arch: Archetype, tier: Tier, cfg: CurveCfg, n: number, seed0: number): Agg {
  const a = newAgg();
  for (let i = 0; i < n; i++) {
    const r = simMatch(arch, tier, cfg, seed0 + i * 7919);
    a.n++;
    a.goals += r.g0 + r.g1;
    a.pg += r.g0; a.og += r.g1;
    if (r.win0) a.wins++;
    if (r.endedBy === "mercy") a.mercy++;
    else if (r.endedBy === "fulltime") a.ft++;
    else a.et++;
    a.rounds += r.rounds;
    a.telRounds += r.tel.rounds; a.telXg += r.tel.xgSum; a.telFloor += r.tel.floorRounds;
    a.telAtk += r.tel.atkSum; a.telDef += r.tel.defSum; a.telOppDef += r.tel.oppDefSum;
  }
  return a;
}

const f = (x: number, d = 2) => x.toFixed(d);
const pct = (num: number, den: number) => den === 0 ? "  0%" : `${Math.round((100 * num) / den)}%`.padStart(4);

function tableHeader(title: string) {
  console.log(`\n${title}`);
  console.log("cfg".padEnd(22) + "G/match  P-W%  mercy  FT   ET   xG/rnd  floor%  ⌀atkEff  ⌀oppDEF  ⌀Δ");
}

function row(label: string, a: Agg) {
  const gm = a.goals / a.n;
  const pw = pct(a.wins, a.n);
  const me = pct(a.mercy, a.n);
  const ft = pct(a.ft, a.n);
  const et = pct(a.et, a.n);
  const xgr = a.telXg / a.telRounds;
  const fl = pct(a.telFloor, a.telRounds);
  const atk = a.telAtk / a.telRounds;
  const odef = a.telOppDef / a.telRounds;
  const delta = atk - odef;
  console.log(
    label.padEnd(22) +
    `${f(gm)}`.padStart(6) + "  " +
    pw + "  " + me + "  " + ft + " " + et + "  " +
    `${f(xgr, 3)}`.padStart(6) + "  " +
    fl + "   " +
    `${f(atk, 0)}`.padStart(6) + "   " +
    `${f(odef, 0)}`.padStart(6) + "  " +
    `${f(delta, 0)}`.padStart(4),
  );
}

// ---------------------------------------------------------------------------
// Configs under test
// ---------------------------------------------------------------------------

const CFGS: CurveCfg[] = [
  { label: "OLD v10", floor: 0.05, slope: 210, cap: 0.50, threshold: 1.0 },
  { label: "NEW v10.1", floor: 0.10, slope: 180, cap: 0.55, threshold: 0.80 },
];

const N = Number(process.env.N ?? 3000);
const SEED0 = 1234567;
// "ai": both sides AI · "balanced": both sides fixed balanced · "mixed": idx0 balanced (human), idx1 AI (realistic)
const POLICY = (process.env.POLICY ?? "ai") as "ai" | "balanced" | "mixed";
// Mirrors the engine's DEF_COEFF (defense scale in the xG delta). Default matches constants.ts.
const DEF_SCALE = Number(process.env.DEF_SCALE ?? 0.9);

// ---------------------------------------------------------------------------
// Diagnostic: dump one match round-by-round (DIAG=tier, e.g. DIAG=D)
// ---------------------------------------------------------------------------
if (process.env.DIAG) {
  const tier = process.env.DIAG as Tier;
  const cfg = CFGS[0]!;
  const seed = SEED0 + 3;
  const rng = makeRng(seed);
  const you = buildStarDeck(10, 11, rng);
  const teams = TIER_TEAMS[tier];
  const opp = (process.env.DIAG_TEAM ? opponents.find((o) => o.id === process.env.DIAG_TEAM) : undefined)
    ?? teams[Math.floor(rng.next() * teams.length)]!;
  const them = oppDeck(opp);
  const m = newMatch(seed ^ 0x9e3779b9, you, them, opp);
  console.log(`DIAG star-run vs ${opp.name} (Tier ${tier}, pref ${opp.preferredFormation})`);
  console.log("rnd  P0(form a/d  atkEff/defEff)        P1(form a/d  atkEff/defEff)       xg0   xg1   score");
  let guard = 0;
  while (m.winner === null && guard++ < 60) {
    startRound(m, rng);
    decideTurn(m, 0, rng);
    decideTurn(m, 1, rng);
    const s0 = computeEffectiveStats(m.players[0]!);
    const s1 = computeEffectiveStats(m.players[1]!);
    const d0 = applyDefensiveTacticals(m, 0, s0.defEff);
    const d1 = applyDefensiveTacticals(m, 1, s1.defEff);
    const x0 = xgAddP(s0.atkEff, d1, cfg);
    const x1 = xgAddP(s1.atkEff, d0, cfg);
    const a0n = m.players[0]!.board.attack.length, df0n = m.players[0]!.board.defense.length;
    const a1n = m.players[1]!.board.attack.length, df1n = m.players[1]!.board.defense.length;
    const fm = (s: PlayerState) => s.formation.slice(0, 3);
    resolveRoundParam(m, rng, cfg, newTel());
    console.log(
      `${String(m.extraTime ? "ET" : m.round - (m.winner === null ? 1 : 0)).padStart(3)}  ` +
      `${fm(m.players[0]!).padEnd(3)} ${a0n}/${df0n}  ${f(s0.atkEff, 0).padStart(3)}/${f(s0.defEff, 0).padStart(3)}  fat${String(Math.round(m.players[0]!.fatigue)).padStart(2)}      ` +
      `${fm(m.players[1]!).padEnd(3)} ${a1n}/${df1n}  ${f(s1.atkEff, 0).padStart(3)}/${f(s1.defEff, 0).padStart(3)}  fat${String(Math.round(m.players[1]!.fatigue)).padStart(2)}    ` +
      `${f(x0, 2)}  ${f(x1, 2)}   ${m.players[0]!.goals}-${m.players[1]!.goals}`,
    );
  }
  process.exit(0);
}

console.log(`Balance sim — ${N} matches/cell — player-only decks (no tacticals) — POLICY=${POLICY} DEF_SCALE=${DEF_SCALE}`);
console.log("Target from GDD §7: ~5–6 goals/match total.\n");

// 1) Run experience: STAR-RUN deck across the ladder, per config
for (const tier of ["D", "B", "S"] as Tier[]) {
  tableHeader(`STAR-RUN deck (budget 10, 11 players) vs Tier ${tier}`);
  for (const cfg of CFGS) row(cfg.label, run("star-run", tier, cfg, N, SEED0));
}

// 2) Quickplay all-star vs champions
tableHeader(`QUICKPLAY all-star (budget 20, 16 players) vs Tier S`);
for (const cfg of CFGS) row(cfg.label, run("quickplay-allstar", "S", cfg, N, SEED0));

// 3) Balance check — does star still beat common? (player win% by archetype, same tier B & A)
for (const tier of ["B", "A"] as Tier[]) {
  tableHeader(`BALANCE CHECK vs Tier ${tier} — win% must stay: star-run > all-common`);
  for (const cfg of CFGS) {
    const star = run("star-run", tier, cfg, N, SEED0);
    const common = run("all-common", tier, cfg, N, SEED0);
    console.log(
      `${cfg.label}`.padEnd(22) +
      `star ${pct(star.wins, star.n)}  (${f(star.goals / star.n)} G/m)   ` +
      `common ${pct(common.wins, common.n)}  (${f(common.goals / common.n)} G/m)   ` +
      `gap ${`${Math.round((100 * star.wins) / star.n - (100 * common.wins) / common.n)}`.padStart(3)}pp`,
    );
  }
}

console.log(`
Legend: G/match = total goals both sides · P-W% = player win rate · mercy/FT/ET = how matches end
        xG/rnd = player's mean per-round xG add · floor% = rounds where player's Δ<=0 (the "+0.05" rounds)
        ⌀atkEff / ⌀oppDEF / ⌀Δ = mean player attack vs the defense it faces (the difference that drives scoring)
Note:   decks are player-only — tacticals add flat xG on top and are a separate lever (GDD §19.14).`);
