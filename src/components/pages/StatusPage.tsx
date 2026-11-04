import { business } from "@/config/business";
import { getOrderByToken } from "@/lib/db";
import { firstName } from "@/lib/order";
import type { Locale } from "@/lib/types";
import { fill, messages } from "@/messages";

/** Reached through an unguessable link. It shows the first name and the date, and nothing else about the customer. */
export function StatusPage({ locale, token }: { locale: Locale; token: string }) {
  const t = messages[locale];
  const order = /^[\w-]{20,64}$/.test(token) ? getOrderByToken(token) : null;

  if (!order) {
    return (
      <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
        <h1 className="t-title">{t.status.notFoundTitle}</h1>
        <p className="t-lede prose-col mt-4">{t.status.notFoundText}</p>
      </div>
    );
  }

  return (
    <div className="wrap pt-[clamp(1.5rem,4vw,3.5rem)]">
      <h1 className="t-title">{fill(t.status.title, { reference: order.reference })}</h1>
      <p className="t-lede mt-4">{fill(t.status.greeting, { name: firstName(order.customerName) })}</p>
      {order.demo && (
        <p className="prose-col mt-3" data-testid="status-demo">
          {t.status.demo}
        </p>
      )}
      <dl className="mt-8 grid max-w-2xl gap-3">
        <div className="grid gap-1 border-t border-current pt-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt>{t.status.statusLabel}</dt>
          <dd className="display text-2xl" data-testid="status-value" data-status={order.status}>
            {t.status.statuses[order.status]}
          </dd>
        </div>
        <div className="grid gap-1 border-t border-current pt-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt>{t.status.dateLabel}</dt>
          <dd className="display text-2xl">{order.date}</dd>
        </div>
      </dl>
      <p className="mt-8">
        <a href={business.instagram.direct} target="_blank" rel="noopener" className="btn btn-line">
          {t.status.instagramCta}
        </a>
      </p>
    </div>
  );
}
