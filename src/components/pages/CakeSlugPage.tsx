import type { Metadata } from "next";
import { getWorks } from "@/lib/content";
import { cakePath } from "@/lib/routes";
import { buildMetadata } from "@/lib/site-metadata";
import { CATEGORIES, LOCALES, type Category, type Locale } from "@/lib/types";
import { messages } from "@/messages";
import { CakeDetailPage } from "./CakeDetailPage";
import { CakesPage } from "./CakesPage";

const isCategory = (slug: string): slug is Category => (CATEGORIES as readonly string[]).includes(slug);

/** One URL space: /cakes/wedding is a category, /cakes/rose is a cake. Slugs never overlap. */
export function CakeSlugPage({ locale, slug }: { locale: Locale; slug: string }) {
  return isCategory(slug) ? <CakesPage locale={locale} category={slug} /> : <CakeDetailPage locale={locale} slug={slug} />;
}

export function cakeParams(): { slug: string }[] {
  return [...CATEGORIES.map((slug) => ({ slug })), ...getWorks("en").map((w) => ({ slug: w.slug }))];
}

export function cakeMetadata(locale: Locale, slug: string): Metadata {
  const t = messages[locale];
  const paths = Object.fromEntries(LOCALES.map((l) => [l, cakePath(l, slug)])) as Record<Locale, string>;
  if (isCategory(slug)) {
    return buildMetadata(locale, `${t.categories[slug]} | Tbilisi Cake`, t.meta.cakes.description, paths);
  }
  const work = getWorks(locale).find((w) => w.slug === slug);
  if (!work) return { title: t.notFound.title, robots: { index: false, follow: false } };
  return buildMetadata(locale, `${work.title} | Tbilisi Cake`, work.text, paths);
}
