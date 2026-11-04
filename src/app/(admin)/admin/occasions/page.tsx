import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { tbilisiToday } from "@/lib/dates";
import { listOrders } from "@/lib/db";
import { isUpcoming, nextAnniversary, REMINDER_WINDOW_DAYS } from "@/lib/occasions";
import { fill, messages } from "@/messages";

export default async function OccasionsPage() {
  await requireAdmin();
  const lang = await adminLang();
  const m = messages[lang];
  const t = m.admin.occasions;
  const today = tbilisiToday();
  const upcoming = listOrders()
    .filter((o) => o.reminderOptIn && o.status !== "cancelled" && isUpcoming(o.date, today, REMINDER_WINDOW_DAYS))
    .map((order) => ({ order, next: nextAnniversary(order.date, today) }))
    .sort((a, b) => a.next.localeCompare(b.next));

  return (
    <AdminShell lang={lang}>
      <h1 className="t-section">{t.title}</h1>
      <p className="mt-2 prose-col">{t.hint}</p>
      {upcoming.length === 0 ? (
        <p className="mt-5">{t.empty}</p>
      ) : (
        <ul className="mt-5 grid max-w-3xl gap-3" data-testid="occasions">
          {upcoming.map(({ order, next }) => (
            <li key={order.id} className="border-t border-current/30 pt-2">
              <p className="display text-xl">{next}: {m.order.occasions[order.occasion]}</p>
              <p>{order.customerName}, {order.customerPhone}</p>
              <p className="t-small">
                <Link href={`/admin/orders/${order.id}`}>{fill(t.lastYear, { date: order.date })}</Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
