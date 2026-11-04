import type { MetadataRoute } from "next";
import { business } from "@/config/business";
import { getWorks } from "@/lib/content";
import { ALL_PAGES, cakePath, pagePath } from "@/lib/routes";
import { siteUrl } from "@/lib/site-metadata";
import { CATEGORIES } from "@/lib/types";

/** Empty while the concept label is on, because the pages are not meant to be indexed yet. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (business.showConceptLabel) return [];
  const entry = (ka: string, ru: string, en: string) => ({
    url: `${siteUrl}${ka}`,
    alternates: { languages: { ka: `${siteUrl}${ka}`, ru: `${siteUrl}${ru}`, en: `${siteUrl}${en}` } },
  });
  return [
    ...ALL_PAGES.map((page) => entry(pagePath("ka", page), pagePath("ru", page), pagePath("en", page))),
    ...[...CATEGORIES, ...getWorks("en").map((w) => w.slug)].map((slug) => entry(cakePath("ka", slug), cakePath("ru", slug), cakePath("en", slug))),
  ];
}
