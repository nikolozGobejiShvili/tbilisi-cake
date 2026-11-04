import Link from "next/link";
import { notFound } from "next/navigation";
import { FavouriteButton } from "@/components/Lookbook";
import { Photo } from "@/components/Photo";
import { ShareButton } from "@/components/ShareButton";
import { getWorks } from "@/lib/content";
import { cakePath, orderLikePath, pagePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { fill, messages } from "@/messages";

export function CakeDetailPage({ locale, slug }: { locale: Locale; slug: string }) {
  const t = messages[locale];
  const works = getWorks(locale);
  const index = works.findIndex((w) => w.slug === slug);
  if (index < 0) notFound();
  const work = works[index];
  const previous = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];

  return (
    <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
      <p>
        <Link href={pagePath(locale, "cakes")}>{t.cakes.backToAll}</Link>
      </p>
      <div className="mt-6 grid gap-[clamp(1.5rem,5vw,5rem)] md:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <Photo src={work.src} width={work.width} height={work.height} alt={work.alt} priority />
        <div className="grid content-start justify-items-start gap-4">
          <p>{fill(t.cakes.number, { n: work.number })}</p>
          <h1 className="t-title">{work.title}</h1>
          <p className="t-lede prose-col">{work.text}</p>
          <p>
            {t.cakes.categoryLabel}:{" "}
            <Link href={cakePath(locale, work.category)}>{t.categories[work.category]}</Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={orderLikePath(locale, work.slug)} className="btn btn-primary">
              {t.cakes.wantThis}
            </Link>
            <ShareButton title={work.title} label={t.cakes.share} copied={t.cakes.copied} />
            <FavouriteButton slug={work.slug} labels={{ favourite: t.cakes.favourite, unfavourite: t.cakes.unfavourite }} />
          </div>
          {work.post && (
            <a href={work.post} target="_blank" rel="noopener">
              {t.cakes.onInstagram}
            </a>
          )}
        </div>
      </div>
      <nav className="mt-[clamp(3rem,6vw,5rem)] flex flex-wrap justify-between gap-4 border-t border-current pt-4" aria-label={t.cakes.title}>
        <Link href={cakePath(locale, previous.slug)} rel="prev">
          {t.cakes.previous}: {previous.title}
        </Link>
        <Link href={cakePath(locale, next.slug)} rel="next">
          {t.cakes.next}: {next.title}
        </Link>
      </nav>
    </div>
  );
}
