import type { PriceList } from "../config/business.ts";
import type { Format, Unconfirmed } from "./types.ts";

/** The only way to read an unverified value for display: null until the owner confirms it. */
export function fact<T>(field: Unconfirmed<T>): T | null {
  return field.confirmed ? field.value : null;
}

/**
 * The live estimate in the builder, in GEL. Null unless real prices are confirmed, so no
 * amount can appear on the site by accident.
 */
export function estimatePrice(
  prices: Unconfirmed<PriceList>,
  format: Format,
  kilograms: number,
  guests: number,
): number | null {
  const list = fact(prices);
  if (!list) return null;
  const amount =
    format === "bento" ? list.bentoEach : format === "desserts" ? list.dessertsPerGuest * guests : list.tieredPerKg * kilograms;
  return amount > 0 ? Math.round(amount) : null;
}
