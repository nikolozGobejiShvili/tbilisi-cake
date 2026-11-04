import Link from "next/link";
import { Lookbook } from "@/components/Lookbook";
import { business } from "@/config/business";
import { getWorks } from "@/lib/content";
import { lookbookLabels, toLookbookWork } from "@/lib/lookbook-props";
import { cakePath, pagePath } from "@/lib/routes";
import { CATEGORIES, type Category, type Locale } from "@/lib/types";
import { messages } from "@/messages";

export function CakesPage({ locale, category }: { locale: Locale; category?: Category }) {
  const t = messages[locale];
  const all = getWorks(locale);
  const works = category ? all.filter((w) => w.category === category) : all;

  return (
    <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
      <h1 className="t-title">{category ? t.categories[category] : t.cakes.title}</h1>
      <p className="t-lede prose-col mt-4">{t.cakes.intro}</p>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
        <nav aria-label={t.cakes.filterLabel}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <Link href={pagePath(locale, "cakes")} aria-current={!category ? "page" : undefined} className={!category ? "underline" : "no-underline hover:underline"}>
                {t.categories.all}
              </Link>
            </li>
            {CATEGORIES.map((slug) => (
              <li key={slug}>
                <Link href={cakePath(locale, slug)} aria-current={category === slug ? "page" : undefined} className={category === slug ? "underline" : "no-underline hover:underline"}>
                  {t.categories[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-[clamp(2.5rem,5vw,4.5rem)]">
        {works.length > 0 ? (
          <Lookbook works={works.map(toLookbookWork)} labels={lookbookLabels(t)} locale={locale} showFavouritesFilter />
        ) : (
          <div className="grid justify-items-start gap-4">
            <p className="t-lede prose-col">{t.cakes.emptyCategory}</p>
            <a href={business.instagram.url} target="_blank" rel="noopener" className="btn btn-line">
              {t.cakes.openInstagram}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
