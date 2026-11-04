"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { localePrefix, pagePath, type PageKey } from "@/lib/routes";
import { LOCALES, type Locale } from "@/lib/types";
import { Monogram } from "./Monogram";

type NavLabels = Record<"cakes" | "fillings" | "prices" | "delivery" | "reviews" | "faq" | "about" | "order" | "menu" | "close" | "skip" | "home" | "language" | "main", string>;

const LINKS = ["cakes", "fillings", "prices", "delivery", "reviews", "faq", "about"] as const;
const LANGUAGE_NAMES: Record<Locale, string> = { ka: "ქართული", ru: "Русский", en: "English" };
const LANGUAGE_SHORT: Record<Locale, string> = { ka: "KA", ru: "RU", en: "EN" };

function pathIn(locale: Locale, current: Locale, pathname: string): string {
  const bare = pathname.slice(localePrefix(current).length) || "/";
  const target = `${localePrefix(locale)}${bare === "/" ? "" : bare}`;
  return target || "/";
}

function Languages({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-1">
      {LOCALES.map((other) =>
        other === locale ? (
          <span key={other} aria-current="true" className="inline-flex min-h-11 min-w-9 items-center justify-center underline underline-offset-4">
            <span aria-hidden="true">{LANGUAGE_SHORT[other]}</span>
            <span className="visually-hidden">{LANGUAGE_NAMES[other]}</span>
          </span>
        ) : (
          // A language is a separate root layout, so this is a full page load by design.
          <a key={other} href={pathIn(other, locale, pathname)} hrefLang={other} lang={other} className="inline-flex min-h-11 min-w-9 items-center justify-center no-underline hover:underline">
            <span aria-hidden="true">{LANGUAGE_SHORT[other]}</span>
            <span className="visually-hidden">{LANGUAGE_NAMES[other]}</span>
          </a>
        ),
      )}
    </nav>
  );
}

export function SiteHeader({ locale, labels }: { locale: Locale; labels: NavLabels }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isCurrent = (page: PageKey) => pathname === pagePath(locale, page) || pathname.startsWith(`${pagePath(locale, page)}/`);

  return (
    <header className="wrap absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 py-4">
      <a href="#main" data-testid="skip-link" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-sheet focus:px-4 focus:py-2 focus:text-on-sheet">
        {labels.skip}
      </a>
      <Link href={pagePath(locale, "home")} aria-label={labels.home} className="block shrink-0 no-underline">
        <Monogram className="h-11 w-auto text-[var(--blush)]" />
      </Link>

      <nav aria-label={labels.main} className="hidden min-[1280px]:flex items-center gap-5">
        {LINKS.map((page) => (
          <Link key={page} href={pagePath(locale, page)} aria-current={isCurrent(page) ? "page" : undefined} className={`no-underline hover:underline ${isCurrent(page) ? "underline" : ""}`}>
            {labels[page]}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Languages locale={locale} label={labels.language} />
        </div>
        <Link href={pagePath(locale, "order")} className="btn btn-primary hidden sm:inline-flex">
          {labels.order}
        </Link>
        <button
          type="button"
          className="btn btn-line min-[1280px]:hidden !px-3"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? labels.close : labels.menu}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div
          id="site-menu"
          className="absolute inset-x-0 top-full z-40 on-sheet px-[var(--gutter)] py-6 min-[1280px]:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <nav aria-label={labels.main}>
            <ul className="grid gap-1">
              {LINKS.map((page) => (
                <li key={page}>
                  <Link
                    href={pagePath(locale, page)}
                    onClick={() => setOpen(false)}
                    aria-current={isCurrent(page) ? "page" : undefined}
                    className="display block py-1.5 text-3xl no-underline hover:underline"
                  >
                    {labels[page]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-5 sm:hidden">
            <Languages locale={locale} label={labels.language} />
          </div>
        </div>
      )}
    </header>
  );
}
