import type { OpponentTeam, PlayerCard, Position, Tier } from "../engine/types.ts";
import { HAND_SIZE } from "../engine/constants.ts";
import { toPlayerCard } from "./players.ts";

/**
 * Minimum cycling "gray" commons an opponent needs to keep a full hand refilling once its premium
 * core locks for the half (premiums are once-per-half). One above HAND_SIZE so a gray is always
 * drawable alongside the locked-then-returning stars. The AI fields at most a handful of cards a
 * round, so it never needs the player-sized bench — a lean pool sustains it (see GDD §6 card flow).
 */
const OPPONENT_BENCH_FLOOR = HAND_SIZE + 1; // 6

/**
 * Overall handed to a synthesized nation reserve, by team tier. Kept < 80 so the card derives as
 * `common` (deriveRarity), but scaled up for stronger nations so an elite side's depth players
 * aren't a pushover when its stars are locked.
 */
const RESERVE_OVERALL_BY_TIER: Record<Tier, number> = {
  S: 78,
  A: 75,
  B: 73,
  C: 71,
  D: 69,
};

/** Positions cycled through for synthesized reserves so the bench can serve both lanes. */
const RESERVE_POSITIONS: readonly Position[] = ["DEF", "MID", "FWD"];

/**
 * Builds the opponent's cycling common bench *on-theme*: its own squad commons first, then — only
 * if those fall short of the sustain floor — reserves synthesized for the opponent's **own** nation
 * (so they render the correct crest/jersey/flag; PlayerCard keys all of that off `nation`).
 *
 * Why this exists: opponent squads are hand-authored 11-man rosters (`opponents.ts`). Most nations
 * have fewer commons than a sustaining bench needs and the 8 elite (Tier-S) teams have *zero* — every
 * player is rare+. The previous code topped the bench up from the *global* common pool, which fielded
 * Chilean/Ghanaian players for a Canada side. Synthesizing the shortfall from the opponent's own
 * nation keeps every gray on-crest while still feeding buildQuickplayDeck a pure-common pool to cycle.
 */
export function buildOpponentBench(opponent: OpponentTeam): PlayerCard[] {
  const realCommons = opponent.squad.filter((c) => c.rarity === "common");
  const shortfall = Math.max(0, OPPONENT_BENCH_FLOOR - realCommons.length);
  if (shortfall === 0) return realCommons;

  const overall = RESERVE_OVERALL_BY_TIER[opponent.tier] ?? RESERVE_OVERALL_BY_TIER.C;
  const seenIds = new Map<string, number>();
  const reserves = Array.from({ length: shortfall }, (_, i) =>
    toPlayerCard(
      {
        name: opponent.nation,
        nation: opponent.nation,
        worldCup: opponent.year,
        position: RESERVE_POSITIONS[i % RESERVE_POSITIONS.length],
        overall,
      },
      seenIds,
    ),
  );
  return [...realCommons, ...reserves];
}
