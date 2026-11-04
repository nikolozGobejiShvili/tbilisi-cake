"use client";

import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cakePath, orderLikePath, pagePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { Photo } from "./Photo";

export type LookbookWork = {
  slug: string;
  number: number;
  src: string;
  width: number;
  height: number;
  title: string;
  text: string;
  alt: string;
};

export type LookbookLabels = {
  number: string;
  wantThis: string;
  favourite: string;
  unfavourite: string;
  previous: string;
  next: string;
  close: string;
  favouritesFilter: string;
  emptyFavourites: string;
  invite: string;
};

const FAVOURITES_KEY = "tc-favourites";
const listeners = new Set<() => void>();
let cache: string | null = null;

function readRaw(): string {
  if (cache !== null) return cache;
  try {
    cache = localStorage.getItem(FAVOURITES_KEY) ?? "[]";
  } catch {
    cache = "[]";
  }
  return cache;
}

function toggleFavourite(slug: string) {
  const list = JSON.parse(readRaw()) as string[];
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  cache = JSON.stringify(next);
  try {
    localStorage.setItem(FAVOURITES_KEY, cache);
  } catch {
    // Favourites then last only for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useFavourites(): string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return useMemo(() => JSON.parse(raw) as string[], [raw]);
}

export function FavouriteButton({ slug, labels }: { slug: string; labels: Pick<LookbookLabels, "favourite" | "unfavourite"> }) {
  const favourites = useFavourites();
  const saved = favourites.includes(slug);
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? labels.unfavourite : labels.favourite} className="grid h-11 w-11 place-items-center" onClick={() => toggleFavourite(slug)}>
      <Heart size={20} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function Lookbook({
  works,
  labels,
  locale,
  limit,
  showFavouritesFilter = false,
}: {
  works: readonly LookbookWork[];
  labels: LookbookLabels;
  locale: Locale;
  limit?: number;
  showFavouritesFilter?: boolean;
}) {
  const favourites = useFavourites();
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const shown = useMemo(() => {
    const filtered = onlyFavourites ? works.filter((w) => favourites.includes(w.slug)) : works;
    return limit ? filtered.slice(0, limit) : filtered;
  }, [works, onlyFavourites, favourites, limit]);

  const index = shown.findIndex((w) => w.slug === openSlug);
  const current = index >= 0 ? shown[index] : null;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (current && !element.open) element.showModal();
    if (!current && element.open) element.close();
  }, [current]);

  const step = (delta: number) => {
    if (index < 0 || shown.length === 0) return;
    setOpenSlug(shown[(index + delta + shown.length) % shown.length].slug);
  };

  return (
    <>
      {showFavouritesFilter && (
        <div className="mb-8">
          <button type="button" className="btn btn-line" aria-pressed={onlyFavourites} onClick={() => setOnlyFavourites((v) => !v)}>
            <Heart size={18} aria-hidden="true" fill={onlyFavourites ? "currentColor" : "none"} />
            {labels.favouritesFilter}
          </button>
        </div>
      )}

      {shown.length === 0 && onlyFavourites && <p className="t-lede prose-col">{labels.emptyFavourites}</p>}

      <ul className="lookbook" data-testid="lookbook">
        {shown.map((work) => (
          <li key={work.slug} className="look">
            <figure>
              <a
                href={cakePath(locale, work.slug)}
                className="look-frame"
                aria-haspopup="dialog"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                  event.preventDefault();
                  setOpenSlug(work.slug);
                }}
              >
                <Photo src={work.src} width={work.width} height={work.height} alt={work.alt} tile sizes="(max-width: 900px) 50vw, 300px" />
              </a>
              <figcaption className="look-caption">
                <span className="min-w-0">
                  <span className="t-small block opacity-80">{labels.number.replace("{n}", String(work.number))}</span>
                  <Link href={cakePath(locale, work.slug)} className="display text-xl leading-tight no-underline hover:underline">
                    {work.title}
                  </Link>
                </span>
                <FavouriteButton slug={work.slug} labels={labels} />
              </figcaption>
            </figure>
          </li>
        ))}
        {/* The last tile completes the grid and leads to the builder. */}
        {!onlyFavourites && (
          <li className="look">
            <Link href={pagePath(locale, "order")} className="look-frame look-invite" data-testid="lookbook-invite">
              <span className="display text-2xl leading-tight">{labels.invite}</span>
            </Link>
          </li>
        )}
      </ul>

      <dialog
        ref={dialog}
        className="lightbox on-sheet"
        aria-label={current?.title}
        onClose={() => setOpenSlug(null)}
        onClick={(event) => {
          if (event.target === dialog.current) setOpenSlug(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
      >
        {current && (
          <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(14rem,1fr)] sm:p-7">
            <Photo src={current.src} width={current.width} height={current.height} alt={current.alt} />
            <div className="flex flex-col gap-3">
              <p className="t-small">{labels.number.replace("{n}", String(current.number))}</p>
              <h2 className="text-3xl leading-tight">{current.title}</h2>
              <p>{current.text}</p>
              <Link href={orderLikePath(locale, current.slug)} className="btn btn-primary mt-1">
                {labels.wantThis}
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <FavouriteButton slug={current.slug} labels={labels} />
                <span className="flex gap-1">
                  <button type="button" className="grid h-11 w-11 place-items-center" aria-label={labels.previous} onClick={() => step(-1)}>
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>
                  <button type="button" className="grid h-11 w-11 place-items-center" aria-label={labels.next} onClick={() => step(1)}>
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                  <button type="button" className="grid h-11 w-11 place-items-center" aria-label={labels.close} onClick={() => setOpenSlug(null)}>
                    <X size={22} aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
