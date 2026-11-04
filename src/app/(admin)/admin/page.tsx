import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { listOrders } from "@/lib/db";
import { STATUSES, type OrderStatus } from "@/lib/types";
import { messages } from "@/messages";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const lang = await adminLang();
  const m = messages[lang];
  const t = m.admin;
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const orders = listOrders(filter);

  return (
    <AdminShell lang={lang}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="t-section">{t.orders.title}</h1>
        <a href="/api/admin/orders.csv" className="btn btn-line" download>
          {t.orders.export}
        </a>
      </div>
      <nav className="mt-3" aria-label={t.orders.columns.status}>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <li><Link href="/admin" aria-current={!filter ? "page" : undefined} className={!filter ? "font-semibold" : ""}>{t.orders.filterAll}</Link></li>
          {STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin?status=${s}`} aria-current={filter === s ? "page" : undefined} className={filter === s ? "font-semibold" : ""}>
                {t.statuses[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6">{t.orders.empty}</p>
      ) : (
        <table className="panel-table mt-5" data-testid="orders-table">
          <thead>
            <tr>
              <th>{t.orders.columns.reference}</th>
              <th>{t.orders.columns.date}</th>
              <th>{t.orders.columns.customer}</th>
              <th>{t.orders.columns.cake}</th>
              <th>{t.orders.columns.status}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} data-reference={order.reference}>
                <td>
                  <Link href={`/admin/orders/${order.id}`}>{order.reference}</Link>
                  {order.demo && <span className="t-small ms-2 border border-current px-1">{t.demoBadge}</span>}
                </td>
                <td>{order.date}</td>
                <td>{order.customerName}</td>
                <td>
                  {m.order.formats[order.format].title}, {order.guests}
                </td>
                <td>{t.statuses[order.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
