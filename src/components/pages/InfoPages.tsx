import Link from "next/link";
import type { ReactNode } from "react";
import { CakeDrawing } from "@/components/CakeDrawing";
import { business } from "@/config/business";
import { confirmedPriceList, getFaq, getFillings } from "@/lib/content";
import { fact } from "@/lib/facts";
import { pagePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { messages } from "@/messages";

function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
      <h1 className="t-title">{title}</h1>
      {intro && <p className="t-lede prose-col mt-5">{intro}</p>}
      <div className="mt-[clamp(2rem,4vw,3.5rem)]">{children}</div>
    </div>
  );
}

function InstagramButton({ label }: { label: string }) {
  return (
    <a href={business.instagram.url} target="_blank" rel="noopener" className="btn btn-line">
      {label}
    </a>
  );
}

export function FillingsPage({ locale }: { locale: Locale }) {
  const t = messages[locale];
  const fillings = getFillings(locale);
  const confirmed = fillings.some((f) => f.confirmed);
  return (
    <Page title={t.fillings.title} intro={t.fillings.intro}>
      {!confirmed && (
        <div className="mb-10 grid justify-items-start gap-4">
          <p className="prose-col">{t.fillings.unconfirmed}</p>
          <InstagramButton label={t.fillings.instagramCta} />
          <h2 className="t-section mt-6">{t.fillings.examplesTitle}</h2>
        </div>
      )}
      <ul className="grid gap-x-[clamp(1rem,3vw,3rem)] gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {fillings.map((filling) => (
          <li key={filling.id}>
            <CakeDrawing
              tiers={[20]}
              tierHeight={11}
              sponge={filling.sponge}
              cream={filling.cream}
              accent={filling.accent}
              label={filling.name}
              forkLabel={t.order.forkLabel}
              fit
            />
            <h3 className="mt-3 text-2xl">{filling.name}</h3>
            {!filling.confirmed && <p className="t-small">{t.order.exampleTag}</p>}
            {filling.confirmed && (
              <p className="t-small mt-1">{filling.allergens ? `${t.fillings.allergensLabel}: ${filling.allergens}` : t.fillings.allergensAsk}</p>
            )}
          </li>
        ))}
      </ul>
    </Page>
  );
}

export function PricesPage({ locale }: { locale: Locale }) {
  const t = messages[locale];
  const list = confirmedPriceList();
  return (
    <Page title={t.prices.title}>
      {list ? (
        <>
          <h2 className="t-section">{t.prices.listTitle}</h2>
          <dl className="mt-5 grid max-w-2xl gap-3">
            {(
              [
                [t.prices.tiered, list.tieredPerKg],
                [t.prices.bento, list.bentoEach],
                [t.prices.desserts, list.dessertsPerGuest],
              ] as const
            )
              .filter(([, amount]) => amount > 0)
              .map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4 border-t border-current pt-2">
                  <dt>{label}</dt>
                  <dd className="display text-xl">
                    {amount} {t.prices.currency}
                  </dd>
                </div>
              ))}
          </dl>
        </>
      ) : (
        <div className="grid justify-items-start gap-4">
          <p className="t-lede prose-col">{t.prices.unconfirmed}</p>
          <InstagramButton label={t.prices.instagramCta} />
        </div>
      )}
      <p className="mt-8">
        <Link href={pagePath(locale, "order")} className="btn btn-primary">
          {t.prices.orderCta}
        </Link>
      </p>
    </Page>
  );
}

export function DeliveryPage({ locale }: { locale: Locale }) {
  const t = messages[locale].delivery;
  const zones = fact(business.delivery);
  return (
    <Page title={t.title}>
      <div className="grid gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-2">
        <section>
          <h2 className="t-section">{t.deliveryTitle}</h2>
          <p className="prose-col mt-3">{zones ? `${zones.zones} ${zones.cost}` : t.deliveryText}</p>
        </section>
        <section>
          <h2 className="t-section">{t.pickupTitle}</h2>
          <p className="prose-col mt-3">{fact(business.address)?.text || t.pickupText}</p>
        </section>
        <section>
          <h2 className="t-section">{t.paymentTitle}</h2>
          <p className="mt-3">{t.paymentText}</p>
          <ul className="display mt-3 text-3xl leading-snug">
            {t.paymentMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="t-section">{t.careTitle}</h2>
          <ul className="prose-col mt-3 grid gap-2">
            {t.careItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </Page>
  );
}

export function ReviewsPage({ locale }: { locale: Locale }) {
  const t = messages[locale].reviews;
  const reviews = fact(business.reviews);
  return (
    <Page title={t.title}>
      {reviews && reviews.length > 0 ? (
        <ul className="grid gap-8 md:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.name + review.text}>
              <blockquote className="display text-2xl leading-snug">{review.text}</blockquote>
              <p className="mt-2">{review.name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid justify-items-start gap-4">
          <p className="t-lede prose-col">{t.unconfirmed}</p>
          <InstagramButton label={t.instagramCta} />
        </div>
      )}
    </Page>
  );
}

export function FaqPage({ locale }: { locale: Locale }) {
  const t = messages[locale].faq;
  return (
    <Page title={t.title}>
      <div className="max-w-3xl">
        {getFaq(locale).map((item) => (
          <details key={item.q} className="border-t border-current py-3">
            <summary className="display cursor-pointer text-2xl leading-snug">{item.q}</summary>
            <p className="prose-col mt-2">{item.a}</p>
          </details>
        ))}
      </div>
    </Page>
  );
}

export function AboutPage({ locale }: { locale: Locale }) {
  const t = messages[locale].about;
  return (
    <Page title={t.title}>
      <div className="grid justify-items-start gap-5">
        <p className="t-section max-w-[24ch]">{t.lead}</p>
        <p className="t-lede prose-col">{t.body}</p>
        {business.showConceptLabel && <p className="prose-col">{t.pending}</p>}
        <InstagramButton label={t.instagramCta} />
      </div>
    </Page>
  );
}

export function PrivacyPage({ locale }: { locale: Locale }) {
  const t = messages[locale].privacy;
  return (
    <Page title={t.title} intro={t.updated}>
      <div className="grid max-w-3xl gap-7">
        {t.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-2xl">{section.title}</h2>
            <p className="prose-col mt-1.5">{section.text}</p>
          </section>
        ))}
      </div>
    </Page>
  );
}
