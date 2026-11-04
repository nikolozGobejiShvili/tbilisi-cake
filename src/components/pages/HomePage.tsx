import Link from "next/link";
import { Lookbook } from "@/components/Lookbook";
import { CakeStage } from "@/components/stage/CakeStage";
import { business } from "@/config/business";
import { getWorks } from "@/lib/content";
import { lookbookLabels, toLookbookWork } from "@/lib/lookbook-props";
import { pagePath } from "@/lib/routes";
import { bakeryJsonLd } from "@/lib/site-metadata";
import type { Locale } from "@/lib/types";
import { messages } from "@/messages";

export function HomePage({ locale }: { locale: Locale }) {
  const t = messages[locale];
  const works = getWorks(locale);

  return (
    <>
      {!business.showConceptLabel && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bakeryJsonLd(locale)).replace(/</g, "\\u003c") }} />
      )}

      <CakeStage
        orderHref={pagePath(locale, "order")}
        galleryHref={pagePath(locale, "cakes")}
        copy={{
          heroTitle: t.home.heroTitle,
          heroLede: t.home.heroLede,
          order: t.nav.order,
          gallery: t.home.ctaGallery,
          cue: t.home.scrollCue,
          canvasLabel: t.home.canvasLabel,
          illustration: t.home.illustration,
          chapters: t.home.chapters,
          layers: t.home.layers,
        }}
      />

      <section className="wrap pt-[clamp(3rem,7vw,7rem)]" aria-labelledby="lookbook-title">
        <h2 id="lookbook-title" className="t-title mb-[clamp(2rem,5vw,4rem)]">
          {t.home.lookbookTitle}
        </h2>
        <Lookbook works={works.map(toLookbookWork)} labels={lookbookLabels(t)} locale={locale} limit={7} />
        <p className="mt-[clamp(2.5rem,5vw,4rem)]">
          <Link href={pagePath(locale, "cakes")} className="btn btn-line">
            {t.home.lookbookAll}
          </Link>
        </p>
      </section>

      <section className="wrap pt-[clamp(5rem,10vw,9rem)]" aria-labelledby="how-title">
        <h2 id="how-title" className="t-title mb-[clamp(2rem,4vw,3.5rem)]">
          {t.home.howTitle}
        </h2>
        <ol className="grid gap-x-[clamp(1rem,3vw,3rem)] gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.howSteps.map((step, i) => (
            <li key={step.title} className="border-t border-[rgba(234,192,186,0.3)] pt-4">
              <span className="display block text-5xl leading-none" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 text-2xl">{step.title}</h3>
              <p className="mt-1.5">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap grid gap-[clamp(2rem,5vw,5rem)] pt-[clamp(5rem,10vw,9rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-labelledby="facts-title">
        <h2 id="facts-title" className="t-title">
          {t.home.factsTitle}
        </h2>
        <div className="grid gap-5">
          <dl className="grid gap-5">
            {t.home.facts.map((item) => (
              <div key={item.title} className="grid gap-1 border-t border-[rgba(234,192,186,0.3)] pt-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="display text-xl">{item.title}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-[rgba(234,192,186,0.3)] pt-5">
            <p className="display text-2xl">{t.home.instagramTitle}</p>
            <a href={business.instagram.url} target="_blank" rel="noopener" className="btn btn-line mt-3">
              {t.home.instagramCta}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
