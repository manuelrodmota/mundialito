/**
 * v12 match-dynamics Monte-Carlo — Park the Bus & Snap Shot.
 *
 * Unlike scripts/balanceSim.ts (a v10 *curve sweep* that still models the OLD deterministic
 * "cross 1.0 → goal" finishing), this drives the REAL engine `resolveRound`, so it exercises v11
 * probabilistic finishing AND the new v12 mechanics (Park the Bus conversion penalty, Snap Shot
 * early shots). Both sides play via the engine AI (`decideTurn`) for the realistic measure, plus a
 * focused controlled test (a turtle defender vs a sensible attacker) for the Park-the-Bus item.
 *
 * The two v12 mechanics are toggled per-match via `MatchState.rules` (default = on in production),
 * which lets us A/B the exact same matchups with the mechanics off vs on.
 *
 * Run: pnpm exec tsx --tsconfig supabase/scripts/tsconfig.scripts.json scripts/dynamicsSim.ts
 *      N=4000 pnpm exec tsx ... scripts/dynamicsSim.ts      (more matches/cell)
 */

import type { Card, MatchState, PlayerCard, PlayerState, OpponentTeam, Tier } from "../src/engine/index.ts";
import {
  newMatch,
  startRound,
  decideTurn,
  resolveRound,
  makeRng,
  validLineup,
  CARD_CAP,
  PRESSURE_FULL,
  XG_CAP,
  BASE_CONVERSION,
  PARK_THE_BUS_PENALTY,
  SNAP_THRESHOLD,
  SNAP_CAP,
  ROUND_CAP,
  type Rng,
} from "../src/engine/index.ts";
import { players } from "../src/data/players.ts";
import { opponents } from "../src/data/opponents.ts";

// ── Deck building (mirrors balanceSim's archetypes) ─────────────────────────────────────────────

const SLOTS: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const PREMIUMS = players.filter((p) => p.rarity !== "common");
const COMMONS = players.filter((p) => p.rarity === "common");

function buildStarDeck(budget: number, rosterSize: number, rng: Rng): { deck: Card[]; captainId: string } {
  const order: PlayerCard["position"][] = ["GK", "DEF", "FWD", "MID", "DEF", "FWD", "MID", "DEF"];
  const byPos = (pos: string) => rng.shuffle(PREMIUMS.filter((p) => p.position === pos));
  const pools: Record<string, PlayerCard[]> = { GK: byPos("GK"), DEF: byPos("DEF"), FWD: byPos("FWD"), MID: byPos("MID") };
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
    picks.push(pool[idx]!);
    slotsLeft -= SLOTS[pool[idx]!.rarity]!;
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

type Archetype = "star-run" | "all-common" | "quickplay-allstar";
function buildPlayerDeck(arch: Archetype, rng: Rng) {
  if (arch === "star-run") return buildStarDeck(10, 11, rng);
  if (arch === "quickplay-allstar") return buildStarDeck(20, 16, rng);
  return buildCommonDeck(11, rng);
}

// ── Controlled lineup policies for the focused Park-the-Bus test ─────────────────────────────────
// "bus" turtles (GK + defenders, defensive formation); "attack" overloads the front.

function commit(m: MatchState, idx: 0 | 1, mode: "bus" | "attack"): void {
  const state = m.players[idx]!;
  const cap = CARD_CAP(m.round);
  const hand = state.hand.filter((c): c is PlayerCard => c.type === "player");

  let attack: PlayerCard[] = [];
  let defense: PlayerCard[] = [];
  if (mode === "bus") {
    state.formation = "defensive";
    const gk = hand.filter((c) => c.position === "GK").slice(0, 1);
    const defs = hand.filter((c) => c.position === "DEF").sort((a, b) => b.def - a.def);
    defense = [...gk, ...defs].slice(0, cap);
    // top up the back line from the best remaining defenders-by-DEF if short
    if (defense.length < cap) {
      const rest = hand.filter((c) => !defense.includes(c)).sort((a, b) => b.def - a.def);
      defense = [...defense, ...rest].slice(0, cap);
    }
  } else {
    state.formation = "offensive";
    attack = [...hand].sort((a, b) => b.atk - a.atk).slice(0, cap);
  }

  // Trim to stamina, dropping the weakest body from the larger lane.
  for (;;) {
    const temp = { ...state, board: {
      attack: attack.map((c) => ({ card: c, lane: "attack" as const, statuses: [], faceDown: true })),
      defense: defense.map((c) => ({ card: c, lane: "defense" as const, statuses: [], faceDown: true })),
    } } as PlayerState;
    if (validLineup(temp, m.round)) break;
    if (defense.length >= attack.length && defense.length > 0) defense.pop();
    else if (attack.length > 0) attack.pop();
    else break;
  }

  for (const c of attack) {
    const i = state.hand.findIndex((h) => h.id === c.id);
    if (i !== -1) { state.hand.splice(i, 1); state.board.attack.push({ card: c, lane: "attack", statuses: [], faceDown: true }); }
  }
  for (const c of defense) {
    const i = state.hand.findIndex((h) => h.id === c.id);
    if (i !== -1) { state.hand.splice(i, 1); state.board.defense.push({ card: c, lane: "defense", statuses: [], faceDown: true }); }
  }
}

// ── Telemetry ───────────────────────────────────────────────────────────────────────────────────

interface Tel {
  shots: number; snaps: number; snapGoals: number;
  busShots: number; busGoals: number;      // open-play shots facing a parked bus
  nonBusShots: number; nonBusGoals: number; // open-play shots with no bus
}
function newTel(): Tel { return { shots: 0, snaps: 0, snapGoals: 0, busShots: 0, busGoals: 0, nonBusShots: 0, nonBusGoals: 0 }; }

// These decks carry no tacticals, so every shot is open play (full-meter or Snap) — cleanly
// splittable into bus-faced vs not, which directly measures the Park-the-Bus conversion penalty.
function tallyShot(tel: Tel, pl: PlayerState): void {
  const s = pl.lastShot;
  if (!s?.took) return;
  tel.shots++;
  if (s.snap) { tel.snaps++; if (s.scored) tel.snapGoals++; }
  if (s.busApplied) { tel.busShots++; if (s.scored) tel.busGoals++; }
  else { tel.nonBusShots++; if (s.scored) tel.nonBusGoals++; }
}
const conv = (goals: number, shots: number) => (shots ? goals / shots : 0);

interface MatchResult { g0: number; g1: number; win0: boolean; et: boolean; mercy: boolean; }

interface SimOpts {
  rules?: MatchState["rules"];
  policy?: { p0?: "ai" | "bus" | "attack"; p1?: "ai" | "bus" | "attack" };
  tel?: Tel;
  /** Opponent ATK/DEF handicap (the real run's per-stage MatchState.aiStrengthMult). Default 1 (off). */
  aiMult?: number;
}

function simMatch(p0Deck: ReturnType<typeof buildPlayerDeck>, opp: OpponentTeam, seed: number, opts: SimOpts): MatchResult {
  const rng = makeRng(seed);
  const them = oppDeck(opp);
  const m = newMatch(seed ^ 0x9e3779b9, p0Deck, them, opp);
  if (opts.rules) m.rules = opts.rules;
  if (opts.aiMult !== undefined && opts.aiMult !== 1) m.aiStrengthMult = opts.aiMult;
  const pol0 = opts.policy?.p0 ?? "ai";
  const pol1 = opts.policy?.p1 ?? "ai";

  let guard = 0;
  while (m.winner === null && guard++ < 60) {
    startRound(m, rng);
    if (pol0 === "ai") decideTurn(m, 0, rng); else commit(m, 0, pol0);
    if (pol1 === "ai") decideTurn(m, 1, rng); else commit(m, 1, pol1);
    const wasET = m.extraTime;
    resolveRound(m, rng);
    if (opts.tel && !wasET) { tallyShot(opts.tel, m.players[0]!); tallyShot(opts.tel, m.players[1]!); }
  }

  const g0 = m.players[0]!.goals;
  const g1 = m.players[1]!.goals;
  return { g0, g1, win0: m.winner === 0, et: m.extraTime, mercy: !m.extraTime && Math.abs(g0 - g1) >= 3 };
}

// ── Batch ───────────────────────────────────────────────────────────────────────────────────────

interface Agg { n: number; gFor: number; gAgainst: number; wins: number; et: number; mercy: number; tel: Tel; }
function newAgg(): Agg { return { n: 0, gFor: 0, gAgainst: 0, wins: 0, et: 0, mercy: 0, tel: newTel() }; }

function runCell(arch: Archetype, tier: Tier, n: number, seed0: number, opts: SimOpts): Agg {
  const a = newAgg();
  a.tel = opts.tel ?? newTel();
  for (let i = 0; i < n; i++) {
    const rng = makeRng(seed0 + i * 2654435761);
    const deck = buildPlayerDeck(arch, rng);
    const teams = TIER_TEAMS[tier];
    const opp = teams[Math.floor(rng.next() * teams.length)]!;
    const r = simMatch(deck, opp, seed0 + i * 7919, { ...opts, tel: a.tel });
    a.n++; a.gFor += r.g0; a.gAgainst += r.g1; if (r.win0) a.wins++; if (r.et) a.et++; if (r.mercy) a.mercy++;
  }
  return a;
}

const f = (x: number, d = 2) => x.toFixed(d);
const pct = (num: number, den: number) => (den === 0 ? "  0%" : `${Math.round((100 * num) / den)}%`.padStart(4));

const N = Number(process.env.N ?? 3000);
const SEED0 = 20260629;

// ── TIERDUMP — per-team top-11 OVR spread for Tier A vs S (run with TIERDUMP=1, instant) ──────────
if (process.env.TIERDUMP) {
  const top11 = (s: PlayerCard[]) => {
    const a = [...s].sort((x, y) => y.overall - x.overall).slice(0, 11);
    return a.reduce((q, c) => q + c.overall, 0) / Math.max(1, a.length);
  };
  for (const tier of ["A", "S"] as Tier[]) {
    const ts = TIER_TEAMS[tier]
      .map((o) => ({ name: o.name, year: o.year, t11: top11(o.squad as PlayerCard[]), prem: o.squad.filter((c) => c.rarity !== "common").length }))
      .sort((a, b) => a.t11 - b.t11);
    console.log(`\nTier ${tier} (${ts.length} teams) — weakest → strongest by top-11 OVR:`);
    for (const t of ts) console.log(`  ${t.t11.toFixed(1)}  ${String(t.prem).padStart(2)}prem  ${t.name} ${t.year}`);
  }
  process.exit(0);
}

// ── TIERCURVE diagnostic — difficulty monotonicity check (run with TIERCURVE=1) ──────────────────
// Holds ONE star-run deck fixed and plays it against every tier D→S, so any non-monotonic win curve
// is the OPPONENT POOL, not deck growth. Reports raw (no handicap) + with the real per-stage handicap.
if (process.env.TIERCURVE) {
  const TN = Number(process.env.N ?? 3000);
  const tiers: Tier[] = ["D", "C", "B", "A", "S"];
  // tier → the real Arcade run's per-stage AI handicap (D≈group … S=final), from STAGE_AI_STRENGTH.
  const TIER_HANDICAP: Record<Tier, number> = { D: 0.95, C: 1.0, B: 1.025, A: 1.075, S: 1.125 };

  console.log(`TIERCURVE — ${TN} fixed star-run decks (budget 10) vs each tier\n`);
  console.log("Opponent pool strength by tier (static proxy):");
  console.log("  tier  teams  ⌀squad  ⌀#premium  ⌀top11-OVR  ⌀strength");
  for (const t of tiers) {
    const teams = TIER_TEAMS[t];
    const n = teams.length || 1;
    let sq = 0, prem = 0, top = 0, str = 0;
    for (const tm of teams) {
      sq += tm.squad.length;
      prem += tm.squad.filter((c) => c.rarity !== "common").length;
      const t11 = [...tm.squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
      top += t11.reduce((s, c) => s + c.overall, 0) / Math.max(1, t11.length);
      str += tm.strength;
    }
    console.log(`  ${t.padEnd(4)}  ${String(teams.length).padStart(5)}  ${f(sq / n, 1).padStart(6)}  ${f(prem / n, 1).padStart(9)}  ${f(top / n, 1).padStart(10)}  ${f(str / n, 1).padStart(8)}`);
  }

  const runCurve = (withHandicap: boolean) => {
    const wins: Record<Tier, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
    const gf: Record<Tier, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
    const ga: Record<Tier, number> = { D: 0, C: 0, B: 0, A: 0, S: 0 };
    for (let i = 0; i < TN; i++) {
      const deck = buildStarDeck(10, 11, makeRng(SEED0 + i * 2654435761)); // ONE deck, reused across tiers
      for (const t of tiers) {
        const pickRng = makeRng((SEED0 ^ (i * 1000003)) + t.charCodeAt(0));
        const opp = TIER_TEAMS[t][Math.floor(pickRng.next() * TIER_TEAMS[t].length)]!;
        const r = simMatch({ deck: [...deck.deck], captainId: deck.captainId }, opp, SEED0 + i * 7919 + t.charCodeAt(0) * 131, { aiMult: withHandicap ? TIER_HANDICAP[t] : 1 });
        if (r.win0) wins[t]++;
        gf[t] += r.g0; ga[t] += r.g1;
      }
    }
    console.log("  tier  P-win%   ⌀you  ⌀them");
    for (const t of tiers) console.log(`  ${t.padEnd(4)}  ${pct(wins[t], TN)}   ${f(gf[t] / TN).padStart(4)}  ${f(ga[t] / TN).padStart(4)}`);
  };

  console.log(`\nPaired tier curve — NO handicap (raw squad strength only):`);
  runCurve(false);
  console.log(`\nPaired tier curve — WITH the real per-stage handicap (D=group 0.95 … S=final 1.125):`);
  runCurve(true);
  console.log(`\nSame deck across all tiers, so a non-monotonic win curve is the opponent pool, not deck growth.`);
  console.log(`Healthy = win% declines D > C > B > A > S.`);
  process.exit(0);
}

console.log(`v12 dynamics sim — ${N} matches/cell — REAL engine resolveRound (${ROUND_CAP} rounds, v11 finishing + v12 Park the Bus / Snap Shot)`);
console.log(`PRESSURE_FULL ${PRESSURE_FULL} · xG cap ${XG_CAP} · BASE_CONVERSION ${BASE_CONVERSION} · PARK_THE_BUS ${PARK_THE_BUS_PENALTY} · SNAP_THRESHOLD ${SNAP_THRESHOLD}/${SNAP_CAP}\n`);

// ── A) Scoring band + win% + new-mechanic rates (rules ON, AI vs AI) ─────────────────────────────
console.log("A) Headline — v12 rules ON, both sides engine AI");
console.log("  archetype × tier        G/match  P-win%  mercy  ET   snap/100shots  busShots  busSaved%");
const HEADLINE: Array<[Archetype, Tier]> = [
  ["star-run", "D"], ["star-run", "B"], ["star-run", "S"],
  ["all-common", "B"], ["quickplay-allstar", "S"],
];
for (const [arch, tier] of HEADLINE) {
  const a = runCell(arch, tier, N, SEED0, {});
  const goalsM = (a.gFor + a.gAgainst) / a.n;
  const snapPer100 = a.tel.shots ? (100 * a.tel.snaps) / a.tel.shots : 0;
  const busSavedPct = a.tel.busShots ? pct(a.tel.busShots - a.tel.busGoals, a.tel.busShots) : "  —";
  console.log(
    `  ${`${arch} vs ${tier}`.padEnd(22)}  ${f(goalsM).padStart(6)}  ${pct(a.wins, a.n)}   ${pct(a.mercy, a.n)}  ${pct(a.et, a.n)}  ` +
    `${f(snapPer100, 2).padStart(11)}  ${String(a.tel.busShots).padStart(8)}  ${busSavedPct}`,
  );
}

// ── B) A/B — v12 mechanics OFF vs ON, identical matchups (isolates Park-the-Bus + Snap-Shot) ──────
console.log("\nB) A/B — same matchups, v12 mechanics OFF (baseline = v11 finishing @0.75) vs ON");
console.log("  archetype × tier        G/m OFF  G/m ON   Δgoals    P-win OFF  P-win ON   Δwin");
const OFF: MatchState["rules"] = { parkTheBus: false, snapShot: false };
for (const [arch, tier] of HEADLINE) {
  const off = runCell(arch, tier, N, SEED0, { rules: OFF });
  const on = runCell(arch, tier, N, SEED0, {});
  const gOff = (off.gFor + off.gAgainst) / off.n;
  const gOn = (on.gFor + on.gAgainst) / on.n;
  const wOff = (100 * off.wins) / off.n;
  const wOn = (100 * on.wins) / on.n;
  console.log(
    `  ${`${arch} vs ${tier}`.padEnd(22)}  ${f(gOff).padStart(6)}  ${f(gOn).padStart(6)}  ${(gOn - gOff >= 0 ? "+" : "") + f(gOn - gOff)}`.padEnd(46) +
    `  ${pct(off.wins, off.n)}      ${pct(on.wins, on.n)}     ${(wOn - wOff >= 0 ? "+" : "") + f(wOn - wOff, 1)}pp`,
  );
}

// ── C) Star vs Common balance invariant (must hold under v12) ────────────────────────────────────
console.log("\nC) Balance invariant — star-run must still beat all-common (rules ON)");
for (const tier of ["B", "A"] as Tier[]) {
  const star = runCell("star-run", tier, N, SEED0, {});
  const common = runCell("all-common", tier, N, SEED0, {});
  const gap = (100 * star.wins) / star.n - (100 * common.wins) / common.n;
  console.log(
    `  vs Tier ${tier}:  star ${pct(star.wins, star.n)} (${f((star.gFor + star.gAgainst) / star.n)} G/m)   ` +
    `common ${pct(common.wins, common.n)} (${f((common.gFor + common.gAgainst) / common.n)} G/m)   gap ${(gap >= 0 ? "+" : "") + Math.round(gap)}pp`,
  );
}

// ── D) Park the Bus focused — strong attacker vs a turtle; conversion contrast (the direct proof) ──
console.log("\nD) Park the Bus focused — quickplay-allstar attacker (overload) vs Tier-C turtle (GK+DEF wall)");
console.log("   the wall already throttles the FILL; this isolates the extra CONVERSION cut on shots that get through");
console.log("   mode      atk goals/m  shot conv%(non-bus)  shot conv%(bus)  busShots  attacker win%");
{
  for (const [label, rules] of [["bus OFF", OFF], ["bus ON ", undefined]] as const) {
    const a = newAgg(); a.tel = newTel();
    for (let i = 0; i < N; i++) {
      const rng = makeRng(SEED0 + i * 40503);
      const deck = buildStarDeck(20, 16, rng);                 // strong attacker → reaches full meter often
      const opp = TIER_TEAMS.C[Math.floor(rng.next() * TIER_TEAMS.C.length)]!;
      const r = simMatch(deck, opp, SEED0 + i * 7919, { rules: rules ?? undefined, policy: { p0: "attack", p1: "bus" }, tel: a.tel });
      a.n++; a.gFor += r.g0; a.gAgainst += r.g1; if (r.win0) a.wins++;
    }
    const nonBus = conv(a.tel.nonBusGoals, a.tel.nonBusShots) * 100;
    const bus = a.tel.busShots ? conv(a.tel.busGoals, a.tel.busShots) * 100 : NaN;
    console.log(
      `   ${label}   ${f(a.gFor / a.n).padStart(7)}     ${f(nonBus, 1).padStart(12)}%     ${(Number.isNaN(bus) ? "   —" : f(bus, 1) + "%").padStart(11)}   ${String(a.tel.busShots).padStart(7)}   ${pct(a.wins, a.n)}`,
    );
  }
}

console.log(`
Legend: snap/100shots = Snap Shots per 100 total shots · busShots = open-play shots that faced a parked bus
        busSaved% = share of bus-faced shots saved · shot conv% = goals / shots · Δ = ON minus OFF.
Target (GDD §7/§19): total ~4–6 goals/match; star clearly beats common; Park the Bus drops a shot's
        conversion ~0.20 (defensible, not a wall); Snap Shot ≈ neutral on total goals.`);
