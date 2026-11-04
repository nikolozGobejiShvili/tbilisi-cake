import Link from "next/link";
import type { ReactNode } from "react";
import { business } from "@/config/business";
import { messages } from "@/messages";
import { pagePath, type PageKey } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { Monogram } from "./Monogram";
import { PhoneBar } from "./PhoneBar";
import { SiteHeader } from "./SiteHeader";

const FOOTER_LINKS: PageKey[] = ["cakes", "order", "fillings", "prices", "delivery", "reviews", "faq", "about", "privacy"];

export function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = messages[locale];
  const labels: Record<PageKey, string> = t.nav;
  return (
    <>
      {business.showConceptLabel && (
        <p className="t-small on-sheet px-[var(--gutter)] py-1.5 text-center" data-testid="concept-banner">
          {t.concept.banner}
        </p>
      )}
      <div className="relative">
        <SiteHeader locale={locale} labels={t.nav} />
        <main id="main">{children}</main>
      </div>
      <footer className="wrap mt-[clamp(5rem,12vw,10rem)] border-t border-[rgba(234,192,186,0.25)] pb-10 pt-10">
        <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-start">
          <Monogram className="h-20 w-auto text-[var(--blush)]" />
          <div className="max-w-2xl">
            <p className="t-lede">{t.footer.line}</p>
            <nav aria-label={t.nav.menu} className="mt-5">
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {FOOTER_LINKS.map((page) => (
                  <li key={page}>
                    <Link href={pagePath(locale, page)}>{labels[page]}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <p className="t-small md:text-end">
            <a href={business.instagram.url} rel="noopener" target="_blank">
              {t.footer.instagram}
            </a>
            <span aria-hidden="true"> / </span>
            {t.footer.credit}
          </p>
        </div>
      </footer>
      <PhoneBar locale={locale} label={t.nav.order} />
    </>
  );
}
