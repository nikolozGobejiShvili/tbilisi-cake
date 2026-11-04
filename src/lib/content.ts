import "server-only";
import { business, EXAMPLE_FILLINGS, type PriceList } from "@/config/business";
import { WORKS, type Work } from "@/config/works";
import { messages } from "@/messages";
import { getSetting, listStoredWorks } from "./db";
import { fact } from "./facts";
import type { Category, Locale, Unconfirmed } from "./types";

export type PublicWork = Work & { title: string; text: string; alt: string };

export type PublicFilling = {
  id: string;
  name: string;
  allergens: string;
  sponge: string;
  cream: string;
  accent: string;
  /** False for the example flavours, which the interface must label as examples. */
  confirmed: boolean;
};

type StoredFilling = {
  id: string;
  names: Record<Locale, string>;
  allergens: Record<Locale, string>;
};

const PALETTES = EXAMPLE_FILLINGS;

export function storedFillings(): StoredFilling[] {
  return getSetting<StoredFilling[]>("fillings") ?? [];
}

export function getFillings(locale: Locale): PublicFilling[] {
  const stored = storedFillings();
  if (stored.length > 0) {
    return stored.map((f, i) => {
      const { sponge, cream, accent } = PALETTES[i % PALETTES.length];
      return { id: f.id, name: f.names[locale] || f.names.ka, allergens: f.allergens[locale] || f.allergens.ka || "", sponge, cream, accent, confirmed: true };
    });
  }
  const examples = messages[locale].fillings.examples as Record<string, string>;
  return EXAMPLE_FILLINGS.map((f) => ({ ...f, name: examples[f.id], allergens: "", confirmed: false }));
}

/** The price list, from the panel or the config. Null means the owner has not confirmed one. */
export function getPrices(): Unconfirmed<PriceList> {
  const saved = getSetting<PriceList>("prices");
  return saved ? { confirmed: true, value: saved } : business.prices;
}

export function confirmedPriceList(): PriceList | null {
  const list = fact(getPrices());
  return list && (list.tieredPerKg > 0 || list.bentoEach > 0 || list.dessertsPerGuest > 0) ? list : null;
}

export type FaqItem = { q: string; a: string };

export function storedFaq(): Record<Locale, FaqItem[]> | null {
  return getSetting<Record<Locale, FaqItem[]>>("faq");
}

export function getFaq(locale: Locale): FaqItem[] {
  const stored = storedFaq();
  const own = stored?.[locale]?.filter((item) => item.q && item.a);
  return own && own.length > 0 ? own : messages[locale].faq.items;
}

export function hiddenWorks(): string[] {
  return getSetting<string[]>("hiddenWorks") ?? [];
}

export function getWorks(locale: Locale, options: { includeHidden?: boolean } = {}): PublicWork[] {
  const texts = messages[locale].cakes.works as Record<string, { title: string; text: string; alt: string }>;
  const hidden = options.includeHidden ? [] : hiddenWorks();
  const fromConfig: PublicWork[] = WORKS.map((work) => ({ ...work, ...texts[work.slug] }));
  const fromPanel: PublicWork[] = listStoredWorks().map((work) => {
    const own = work.texts[locale]?.title ? work.texts[locale] : work.texts.ka;
    return {
      slug: work.slug,
      number: work.number,
      category: work.category as Category,
      src: `/media/works/${work.slug}`,
      width: work.width,
      height: work.height,
      post: "",
      title: own.title,
      text: own.text,
      alt: own.title,
    };
  });
  return [...fromConfig, ...fromPanel].filter((work) => !hidden.includes(work.slug)).sort((a, b) => a.number - b.number);
}
