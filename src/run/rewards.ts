import type { RunState, PlayerCard, TacticalCard, Card, Rarity } from "../engine/types.ts";
import type { Rng } from "../engine/rng.ts";
import { RUN_TACTICAL_DECK_CAP } from "../engine/constants.ts";

/**
 * Rarity odds table keyed by bracket stage.
 * Each entry is a probability distribution [common, rare, epic, legendary]
 * that sums to 1.0. Later stages shift weight toward higher rarities.
 */
const RARITY_ODDS_BY_STAGE: Record<
  RunState["stage"],
  Record<Rarity, number>
> = {
  group: { common: 0.55, rare: 0.30, epic: 0.12, legendary: 0.03 },
  r16:   { common: 0.40, rare: 0.35, epic: 0.18, legendary: 0.07 },
  qf:    { common: 0.25, rare: 0.35, epic: 0.27, legendary: 0.13 },
  sf:    { common: 0.10, rare: 0.30, epic: 0.35, legendary: 0.25 },
  final: { common: 0.05, rare: 0.20, epic: 0.40, legendary: 0.35 },
};

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

/** Counts the number of TacticalCards currently in a run deck. */
export function countTacticals(deck: Card[]): number {
  return deck.filter((c) => c.type === "tactical").length;
}

/**
 * Rolls the rarity for a player reward based on the current stage odds,
 * then returns a random player of that rarity from the pool.
 *
 * Falls back to any card in the pool if no card of the rolled rarity exists.
 */
export function rollPlayerReward(
  stage: RunState["stage"],
  pool: PlayerCard[],
  rng: Rng,
): PlayerCard {
  const odds = RARITY_ODDS_BY_STAGE[stage];
  const roll = rng.next();
  let cumulative = 0;
  let targetRarity: Rarity = "common";

  for (const rarity of RARITY_ORDER) {
    cumulative += odds[rarity];
    if (roll < cumulative) {
      targetRarity = rarity;
      break;
    }
  }

  const byRarity = pool.filter((p) => p.rarity === targetRarity);
  const candidates = byRarity.length > 0 ? byRarity : pool;

  const idx = Math.floor(rng.next() * candidates.length);
  return candidates[idx]!;
}

/**
 * Generates a choose-1-of-3 offer of distinct TacticalCards from the pool.
 * Returns up to 3 cards; fewer if the pool is smaller.
 */
export function offerTacticals(pool: TacticalCard[], rng: Rng): TacticalCard[] {
  const shuffled = rng.shuffle(pool);
  return shuffled.slice(0, 3);
}

/**
 * Applies a post-match reward to the run state.
 *
 * The player card is always added to the deck. The tactical card is added
 * only when the deck is below RUN_TACTICAL_DECK_CAP; when at the cap the
 * caller should use swapTactical instead of passing a chosenTactical here.
 *
 * Returns a new RunState; the input is never mutated.
 */
export function applyReward(
  run: RunState,
  chosenPlayer: PlayerCard,
  chosenTactical?: TacticalCard,
): RunState {
  let deck = [...run.deck, chosenPlayer];

  if (chosenTactical !== undefined) {
    const tacticalCount = countTacticals(deck);
    if (tacticalCount < RUN_TACTICAL_DECK_CAP) {
      deck = [...deck, chosenTactical];
    }
  }

  return { ...run, deck };
}

/**
 * Swaps a tactical reward into the deck when already at the cap.
 *
 * Adds `takeId` and removes `exileId` from the deck so the total tactical
 * count stays at exactly RUN_TACTICAL_DECK_CAP. The caller is responsible for
 * providing a `takeCard` that is the incoming reward and an `exileId` that
 * belongs to a tactical already in the deck.
 *
 * Throws if the deck is not at cap, the exile target is not found, or the
 * take card already exists in the deck.
 *
 * Returns a new RunState; the input is never mutated.
 */
export function swapTactical(
  run: RunState,
  takeCard: TacticalCard,
  exileId: string,
): RunState {
  const currentCount = countTacticals(run.deck);
  if (currentCount < RUN_TACTICAL_DECK_CAP) {
    throw new Error(
      `swapTactical called but deck has ${currentCount} tacticals (cap is ${RUN_TACTICAL_DECK_CAP}); use applyReward instead.`,
    );
  }

  const exileIndex = run.deck.findIndex((c) => c.id === exileId);
  if (exileIndex === -1) {
    throw new Error(`Exile target "${exileId}" not found in run deck.`);
  }

  const exiledCard = run.deck[exileIndex]!;
  if (exiledCard.type !== "tactical") {
    throw new Error(`Exile target "${exileId}" is not a tactical card.`);
  }

  const deckWithoutExile = run.deck.filter((c) => c.id !== exileId);
  const deck = [...deckWithoutExile, takeCard];

  return { ...run, deck };
}

/**
 * Removes a card from the run deck by id (StS-style card removal).
 * Returns a new RunState; throws if the card is not found.
 */
export function removeCard(run: RunState, cardId: string): RunState {
  const idx = run.deck.findIndex((c) => c.id === cardId);
  if (idx === -1) {
    throw new Error(`removeCard: card "${cardId}" not found in run deck.`);
  }
  const deck = run.deck.filter((c) => c.id !== cardId);
  return { ...run, deck };
}
