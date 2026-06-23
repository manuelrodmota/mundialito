/**
 * WCC-015 — Status effects (GDD v10 §11).
 *
 * Statuses are applied to `CardInPlay` during tactical/round resolution.
 * They modify stats via `statusMods` and are ticked down each round.
 * Fatigue is NOT a status — it lives on `PlayerState.fatigue`.
 */

import type { CardInPlay, Status, StatusKind } from "./types.ts";

/** Effective stat multiplier returned by a status. */
interface StatMod {
  atkMult: number;
  defMult: number;
  defFlat: number;
  atkFlat: number;
}

/**
 * Computes the cumulative stat modifications from all statuses on a card.
 * Returns multiplicative/additive adjustments applied in effectiveStats.
 * GDD §11 table lines 217-223.
 */
export function statusMods(card: CardInPlay): StatMod {
  let atkMult = 1;
  const defMult = 1;
  let defFlat = 0;
  let atkFlat = 0;

  for (const s of card.statuses) {
    switch (s.kind) {
      case "pressed":
        defFlat += -(s.amount ?? 10);
        break;
      case "injured":
        atkFlat += -(s.amount ?? 15);
        defFlat += -(s.amount ?? 15);
        break;
      case "offside":
        // Offside Trap: this attacker contributes 0 to xG this round (GDD §12).
        atkMult = 0;
        break;
      case "booked":
      case "red":
      case "onform":
        break;
    }
  }

  return { atkMult, defMult, defFlat, atkFlat };
}

/** Whether a card has been sent off (red card) and must be exiled. GDD §11. */
export function isRedCarded(card: CardInPlay): boolean {
  return card.statuses.some((s) => s.kind === "red");
}

/** Whether a card has an active booking (yellow card). GDD §11. */
export function isBooked(card: CardInPlay): boolean {
  return card.statuses.some((s) => s.kind === "booked");
}

/**
 * Applies a second yellow card to a booked card, converting it to a red.
 * Returns true when the conversion happened. GDD §11 line 219.
 */
export function applySecondBooking(card: CardInPlay): boolean {
  const idx = card.statuses.findIndex((s) => s.kind === "booked");
  if (idx === -1) return false;
  card.statuses.splice(idx, 1);
  card.statuses.push({ kind: "red" });
  return true;
}

/** Adds a status to a card. */
export function addStatus(card: CardInPlay, status: Status): void {
  card.statuses.push({ ...status });
}

/**
 * Ticks down all duration-based statuses on a card by one round and
 * removes any that have expired (duration === 0). GDD §11.
 */
export function tickStatuses(card: CardInPlay): void {
  card.statuses = card.statuses.filter((s) => {
    if (s.duration === undefined) return true;
    s.duration -= 1;
    return s.duration > 0;
  });
}

/** Returns the On Form status if present, otherwise undefined. */
export function getOnForm(card: CardInPlay): Status | undefined {
  return card.statuses.find((s) => s.kind === "onform");
}

/** Returns the xG bonus from an active On Form status. GDD §11 / §16. */
export function onFormXgBonus(card: CardInPlay): number {
  const s = getOnForm(card);
  return s ? (s.amount ?? 0.1) : 0;
}

/** Removes a status of the given kind from a card. */
export function removeStatus(card: CardInPlay, kind: StatusKind): void {
  card.statuses = card.statuses.filter((s) => s.kind !== kind);
}
