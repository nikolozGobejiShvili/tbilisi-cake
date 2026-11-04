import type { Metadata } from "next";
import { business } from "@/config/business";
import { messages } from "@/messages";
import { pagePath, type PageKey } from "./routes";
import type { Locale } from "./types";

const platformDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteUrl =
  business.siteUrl || process.env.SITE_URL || (platformDomain ? `https://${platformDomain}` : "http://localhost:3000");

/** While the concept label shows, search engines are told to stay away, so this can never pass for the official site. */
export const robots: Metadata["robots"] = business.showConceptLabel ? { index: false, follow: false } : { index: true, follow: true };

const OG_LOCALES: Record<Locale, string> = { ka: "ka_GE", ru: "ru_RU", en: "en_GB" };

export function buildMetadata(locale: Locale, title: string, description: string, paths: Record<Locale, string>): Metadata {
  const shareDescription = business.showConceptLabel ? `${messages[locale].concept.banner} ${description}` : description;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description: shareDescription,
    robots,
    alternates: {
      canonical: paths[locale],
      languages: { ka: paths.ka, ru: paths.ru, en: paths.en, "x-default": paths.ka },
    },
    openGraph: {
      type: "website",
      siteName: business.name,
      title,
      description: shareDescription,
      url: paths[locale],
      locale: OG_LOCALES[locale],
      images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: business.name }],
    },
    twitter: { card: "summary_large_image", title, description: shareDescription, images: ["/brand/og.jpg"] },
  };
}

export function pageMetadata(locale: Locale, page: PageKey): Metadata {
  const { title, description } = messages[locale].meta[page];
  return buildMetadata(locale, title, description, {
    ka: pagePath("ka", page),
    ru: pagePath("ru", page),
    en: pagePath("en", page),
  });
}

/** Published only once the concept label is off. Facts come from the public profile alone. */
export function bakeryJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: business.name,
    description: messages[locale].meta.home.description,
    url: siteUrl,
    image: `${siteUrl}/brand/og.jpg`,
    areaServed: "Tbilisi",
    sameAs: [business.instagram.url],
  };
}
