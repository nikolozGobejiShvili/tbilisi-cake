/**
 * Everything the site knows about the business. This is the first file to edit.
 *
 * Facts come from the public Instagram profile (see research/instagram-facts.md) and the owner
 * has not confirmed them. A group marked `confirmed: false` may drive logic but is never shown
 * as fact: read it through `fact()` in src/lib/facts.ts. When the owner confirms a value, fill
 * it in and set `confirmed: true`. No other change is needed.
 */
import type { Unconfirmed } from "../lib/types.ts";

export type ExampleFilling = {
  id: string;
  sponge: string;
  cream: string;
  accent: string;
};

export type PriceList = {
  /** GEL per kilogram of tiered cake. */
  tieredPerKg: number;
  /** GEL for one bento cake. */
  bentoEach: number;
  /** GEL per guest for a dessert box. */
  dessertsPerGuest: number;
};

export type Review = { name: string; text: string };

const prices: Unconfirmed<PriceList> = { confirmed: false, value: { tieredPerKg: 0, bentoEach: 0, dessertsPerGuest: 0 } };
const reviews: Unconfirmed<Review[]> = { confirmed: false, value: [] };
const phone: Unconfirmed<{ display: string; e164: string }> = { confirmed: false, value: { display: "", e164: "" } };
const whatsapp: Unconfirmed<{ number: string }> = { confirmed: false, value: { number: "" } };
const address: Unconfirmed<{ text: string }> = { confirmed: false, value: { text: "" } };
const delivery: Unconfirmed<{ zones: string; cost: string }> = { confirmed: false, value: { zones: "", cost: "" } };
/** Whole days of notice. The number is a placeholder so the calendar works; it is not the owner's rule. */
const leadTime: Unconfirmed<{ days: number }> = { confirmed: false, value: { days: 3 } };
/** Orders per day. A placeholder until the owner sets a real figure in the panel. */
const capacity: Unconfirmed<{ perDay: number }> = { confirmed: false, value: { perDay: 3 } };

export const business = {
  name: "Tbilisi Cake",

  /**
   * The concept label. While true: a banner on every page, noindex, no sitemap or JSON-LD,
   * and orders are saved as demo with no notification. Set to false only after the owner approves.
   */
  showConceptLabel: true,

  /** Final public address, e.g. "https://tbilisicake.ge". The host's domain is used while empty. */
  siteUrl: "",

  instagram: {
    handle: "tbilisi_cake",
    url: "https://www.instagram.com/tbilisi_cake/",
    direct: "https://ig.me/m/tbilisi_cake",
  },

  prices,
  reviews,
  phone,
  whatsapp,
  address,
  delivery,
  leadTime,
  capacity,

  /** How far ahead the calendar opens. */
  horizonDays: 180,
};

/**
 * Example flavours so the builder and its cross-section can be shown. The real menu is in the
 * Price/Fillings highlight, which could not be read. Names are in the message files, and the
 * interface labels every one of these an example.
 */
export const EXAMPLE_FILLINGS: readonly ExampleFilling[] = [
  { id: "vanillaBerry", sponge: "#F2D9A8", cream: "#FBF3E4", accent: "#A21824" },
  { id: "chocolate", sponge: "#5A2F1C", cream: "#C89A7A", accent: "#2E140A" },
  { id: "caramelNut", sponge: "#E5BE83", cream: "#F4E2C4", accent: "#B06A25" },
  { id: "lemon", sponge: "#F5E19A", cream: "#FDF7D8", accent: "#D9B21F" },
];
