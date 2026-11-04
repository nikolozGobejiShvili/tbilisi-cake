import type { Format } from "./types.ts";

/**
 * Serving guidance. These are general confectionery rules of thumb, not the owner's numbers,
 * so the interface always labels them approximate.
 */
export const GRAMS_PER_GUEST = 150;
export const MIN_GUESTS = 2;
export const MAX_GUESTS = 150;

export type CakeSize = {
  /** Approximate weight, rounded to the nearest 0.5 kg, never below 0.5. */
  kilograms: number;
  /** Tier diameters from bottom to top, in centimetres. */
  tiers: number[];
  /** Height of one tier in centimetres. */
  tierHeight: number;
};

export function clampGuests(guests: number): number {
  if (!Number.isFinite(guests)) return MIN_GUESTS;
  return Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, Math.round(guests)));
}

export function cakeSize(format: Format, guestsRaw: number): CakeSize {
  const guests = clampGuests(guestsRaw);
  const kilograms = Math.max(0.5, Math.round((guests * GRAMS_PER_GUEST) / 500) / 2);
  if (format === "bento") return { kilograms: Math.min(kilograms, 0.5), tiers: [11], tierHeight: 7 };
  if (format === "desserts") return { kilograms, tiers: [], tierHeight: 0 };
  if (guests <= 12) return { kilograms, tiers: [guests <= 8 ? 16 : 20], tierHeight: 11 };
  if (guests <= 30) return { kilograms, tiers: [24, 16], tierHeight: 11 };
  if (guests <= 70) return { kilograms, tiers: [30, 22, 14], tierHeight: 11 };
  return { kilograms, tiers: [36, 28, 20, 12], tierHeight: 11 };
}
