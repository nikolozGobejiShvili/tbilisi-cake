import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CopyText } from "@/components/admin/CopyText";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { getFillings, getWorks } from "@/lib/content";
import { getOrderById } from "@/lib/db";
import { firstName } from "@/lib/order";
import { statusPath } from "@/lib/routes";
import { STATUSES } from "@/lib/types";
import { fill, messages } from "@/messages";
import { updateStatusAction } from "../../actions";

function Row({ label, value }: { label: string; value: string | number }) {
  if (value === "" || value === null) return null;
  return (
    <div className="grid gap-0.5 border-t border-current/25 py-1.5 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="opacity-80">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const lang = await adminLang();
  const m = messages[lang];
  const t = m.admin;
  const o = m.order;
  const order = getOrderById(Number((await params).id));
  if (!order) notFound();

  const filling = order.fillingId === "unsure" ? m.fillings.unsure : (getFillings(lang).find((f) => f.id === order.fillingId)?.name ?? order.fillingId);
  const work = getWorks(lang, { includeHidden: true }).find((w) => w.slug === order.referenceWork);
  const reply = fill(t.order.replyTemplate, { name: firstName(order.customerName), reference: order.reference, date: order.date });

  return (
    <AdminShell lang={lang}>
      <p><Link href="/admin">{t.order.back}</Link></p>
      <h1 className="t-section mt-2" data-testid="admin-order-title">{order.reference}</h1>
      {order.demo && <p className="t-small"><span className="border border-current px-1">{t.demoBadge}</span></p>}

      <form action={updateStatusAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={order.id} />
        <div className="field">
          <label htmlFor="status">{t.order.statusLabel}</label>
          <select id="status" name="status" defaultValue={order.status} className="input" data-testid="status-select">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t.statuses[s]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" data-testid="status-save">{t.order.save}</button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">{t.order.details}</h2>
          <dl className="mt-2">
            <Row label={o.summary.occasion} value={o.occasions[order.occasion]} />
            <Row label={o.summary.format} value={o.formats[order.format].title} />
            <Row label={o.summary.guests} value={order.guests} />
            <Row label={o.summary.filling} value={filling} />
            <Row label={o.summary.reference} value={work ? `${work.number}. ${work.title}` : ""} />
            <Row label={o.summary.inscription} value={order.inscription} />
            <Row label={o.coloursLabel} value={order.colours} />
            <Row label={o.allergiesLabel} value={order.allergies} />
            <Row label={o.summary.date} value={order.date} />
            <Row label={t.order.created} value={order.createdAt.slice(0, 16).replace("T", " ")} />
          </dl>
          <h3 className="mt-5 text-xl">{t.order.reference}</h3>
          {order.uploadId ? (
            // eslint-disable-next-line @next/next/no-img-element -- served only to the logged-in owner, so the public image optimiser must not touch it
            <img src={`/api/admin/uploads/${order.uploadId}`} alt={t.order.reference} className="mt-2 max-h-96 w-auto" data-testid="admin-upload" />
          ) : (
            <p className="mt-1">{t.order.noReference}</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl">{t.order.customer}</h2>
          <dl className="mt-2">
            <Row label={o.message.name} value={order.customerName} />
            <Row label={o.message.phone} value={order.customerPhone} />
            <Row label={o.channels.instagram} value={order.customerInstagram} />
            <Row label={o.channelLabel} value={o.channels[order.channel]} />
            <Row label={o.reminderLabel} value={order.reminderOptIn ? "✓" : ""} />
          </dl>
          <h2 className="mt-6 text-2xl">{t.order.delivery}</h2>
          <dl className="mt-2">
            <Row label={o.summary.fulfilment} value={order.fulfilment === "delivery" ? o.delivery : o.pickup} />
            <Row label={o.addressLabel} value={order.address} />
            <Row label={o.recipientName} value={order.recipientName} />
            <Row label={o.recipientPhone} value={order.recipientPhone} />
            <Row label={o.cardNote} value={order.cardNote} />
          </dl>
          <h2 className="mt-6 text-2xl">{t.order.replyTitle}</h2>
          <p className="hint">{t.order.replyHint}</p>
          <p className="my-2 border border-current p-3">{reply}</p>
          <CopyText text={reply} label={t.order.copy} done={t.order.copied} />
          <p className="mt-4">
            <a href={statusPath(order.locale, order.token)} target="_blank" rel="noopener" data-testid="admin-status-link">
              {t.order.statusLink}
            </a>
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
