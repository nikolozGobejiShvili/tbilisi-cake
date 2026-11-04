"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { decideStage } from "@/lib/stage-support";

export type StageCopy = {
  heroTitle: string;
  heroLede: string;
  order: string;
  gallery: string;
  cue: string;
  canvasLabel: string;
  illustration: string;
  chapters: { title: string; text: string; cta?: string }[];
  layers: { coat: string; sponge: string; cream: string; berry: string };
};

/** Which layer of the model each label points at: top sponge, upper cream, upper berry layer. */
const LABELS = [
  { key: "coat", part: "coat", layer: 6 },
  { key: "sponge", part: "layer", layer: 6 },
  { key: "berry", part: "layer", layer: 5 },
  { key: "cream", part: "layer", layer: 4 },
] as const;

/**
 * The opening of the home page. Without scripts, without WebGL, or with reduced motion, it is a
 * still image followed by the same text in reading order, so nothing depends on the animation.
 */
export function CakeStage({ copy, orderHref, galleryHref }: { copy: StageCopy; orderHref: string; galleryHref: string }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = root.current;
    const surface = canvas.current;
    const heading = hero.current;
    decideStage();
    if (!element || !surface || !heading || !document.documentElement.classList.contains("stage-on")) return;

    let stop: (() => void) | undefined;
    let cancelled = false;
    const fallBack = () => document.documentElement.classList.remove("stage-on");

    // The words appear first. The 3D, the heaviest thing on the page, loads once the browser has a moment.
    const load = () => {
      import("./engine")
        .then(async ({ startStage }) => {
          if (cancelled) return;
          const stopStage = await startStage(
            {
              root: element,
              canvas: surface,
              hero: heading,
              chapters: [...element.querySelectorAll<HTMLElement>("[data-chapter]")],
              labels: [...element.querySelectorAll<HTMLElement>("[data-part]")],
              progress: progress.current,
              cue: cue.current,
            },
            () => cancelled,
          );
          if (cancelled) stopStage?.();
          else stop = stopStage ?? undefined;
        })
        .catch((error: unknown) => {
          console.warn("The 3D cake could not start, showing the still image.", error);
          fallBack();
        });
    };
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(load, { timeout: 1200 }) : window.setTimeout(load, 300);

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      stop?.();
    };
  }, []);

  return (
    <section ref={root} className="stage" data-testid="cake-stage" aria-label={copy.canvasLabel}>
      <div className="stage-frame">
        <div className="stage-glow" aria-hidden="true" />
        <canvas ref={canvas} className="stage-canvas" aria-hidden="true" data-testid="cake-canvas" />
        <div className="stage-grain" aria-hidden="true" />
        <div className="stage-poster">
          <Image src="/brand/cake-poster.webp" alt={copy.canvasLabel} width={1200} height={1200} sizes="(max-width: 760px) 100vw, 60vw" priority={false} />
        </div>

        <div ref={hero} className="chapter chapter-hero" data-testid="stage-hero">
          <h1 className="display t-hero">{copy.heroTitle}</h1>
          <p className="t-lede mt-5 max-w-[32ch]">{copy.heroLede}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={orderHref} className="btn btn-primary">
              {copy.order}
            </Link>
            <Link href={galleryHref} className="btn btn-line">
              {copy.gallery}
            </Link>
          </div>
        </div>

        {copy.chapters.map((chapter, i) => (
          <div key={chapter.title} className="chapter chapter-side" data-chapter={i}>
            <h2 className="display t-title">{chapter.title}</h2>
            <p className="t-lede mt-4 max-w-[36ch]">{chapter.text}</p>
            {i === 0 && <p className="t-small mt-3 max-w-[36ch] opacity-75">{copy.illustration}</p>}
            {chapter.cta && (
              <Link href={orderHref} className="btn btn-primary mt-6">
                {chapter.cta}
              </Link>
            )}
          </div>
        ))}

        <ul className="stage-labels" aria-hidden="true">
          {LABELS.map(({ key, part, layer }) => (
            <li key={key} className="stage-label" data-part={part} data-layer={layer}>
              <span>{copy.layers[key]}</span>
            </li>
          ))}
        </ul>

        <p ref={cue} className="stage-cue t-small">
          <span aria-hidden="true" className="stage-cue-line" />
          {copy.cue}
        </p>
        <div className="stage-track" aria-hidden="true">
          <div ref={progress} className="stage-track-fill" />
        </div>
      </div>
    </section>
  );
}
