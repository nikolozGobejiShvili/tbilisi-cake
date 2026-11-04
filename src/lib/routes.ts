import type { Locale } from "./types";

export type PageKey = "home" | "cakes" | "order" | "fillings" | "prices" | "delivery" | "reviews" | "faq" | "about" | "privacy";

const SEGMENTS: Record<PageKey, string> = {
  home: "",
  cakes: "cakes",
  order: "order",
  fillings: "fillings",
  prices: "prices",
  delivery: "delivery",
  reviews: "reviews",
  faq: "faq",
  about: "about",
  privacy: "privacy",
};

export const ALL_PAGES = Object.keys(SEGMENTS) as PageKey[];

export function localePrefix(locale: Locale): string {
  return locale === "ka" ? "" : `/${locale}`;
}

export function pagePath(locale: Locale, page: PageKey): string {
  const path = `${localePrefix(locale)}/${SEGMENTS[page]}`.replace(/\/$/, "");
  return path || "/";
}

export function cakePath(locale: Locale, slug: string): string {
  return `${localePrefix(locale)}/cakes/${slug}`;
}

export function orderLikePath(locale: Locale, slug: string): string {
  return `${pagePath(locale, "order")}?like=${encodeURIComponent(slug)}`;
}

export function statusPath(locale: Locale, token: string): string {
  return `${localePrefix(locale)}/order/status/${token}`;
}
