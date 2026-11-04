import { OrderBuilder, type BuilderProps } from "@/components/order/OrderBuilder";
import { business } from "@/config/business";
import { confirmedPriceList, getFillings, getWorks } from "@/lib/content";
import { pagePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { messages } from "@/messages";

export function OrderPage({ locale, like }: { locale: Locale; like: string | null }) {
  const t = messages[locale];
  const props: BuilderProps = {
    locale,
    labels: t.order,
    unsureFilling: t.fillings.unsure,
    fillings: getFillings(locale).map(({ id, name, sponge, cream, accent, confirmed }) => ({ id, name, sponge, cream, accent, confirmed })),
    works: getWorks(locale).map(({ slug, number, title, src, width, height, alt }) => ({ slug, number, title, src, width, height, alt })),
    prices: confirmedPriceList(),
    demo: business.showConceptLabel,
    instagramDirect: business.instagram.direct,
    whatsappConfirmed: business.whatsapp.confirmed,
    privacyHref: pagePath(locale, "privacy"),
    like,
  };

  return (
    <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
      <h1 className="t-title">{t.order.title}</h1>
      <p className="t-lede prose-col mt-4">{t.order.intro}</p>
      <div className="mt-[clamp(1.5rem,3vw,2.5rem)]">
        <OrderBuilder {...props} />
      </div>
    </div>
  );
}
