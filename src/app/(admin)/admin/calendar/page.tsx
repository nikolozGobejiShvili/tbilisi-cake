import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { monthGrid, tbilisiToday } from "@/lib/dates";
import { currentRules } from "@/lib/db";
import { fill, messages } from "@/messages";
import { saveCalendarSettingsAction, toggleDayAction } from "../actions";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const lang = await adminLang();
  const m = messages[lang];
  const t = m.admin.calendar;
  const rules = currentRules();
  const today = tbilisiToday();
  const { m: requested } = await searchParams;
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : today.slice(0, 7);
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const shift = (delta: number) => {
    const total = year * 12 + (monthNumber - 1) + delta;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  };

  return (
    <AdminShell lang={lang}>
      <h1 className="t-section">{t.title}</h1>

      <form action={saveCalendarSettingsAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="field">
          <label htmlFor="capacity">{t.capacityLabel}</label>
          <input id="capacity" name="capacity" type="number" min={1} max={100} defaultValue={rules.capacityPerDay} className="input !w-28" />
        </div>
        <div className="field">
          <label htmlFor="lead">{t.leadLabel}</label>
          <input id="lead" name="lead" type="number" min={0} max={90} defaultValue={rules.leadDays} className="input !w-28" data-testid="lead-input" />
        </div>
        <button type="submit" className="btn btn-line">{t.saveSettings}</button>
      </form>

      <p className="mt-5">{t.hint}</p>
      <div className="mt-3 flex items-center gap-4">
        <Link href={`/admin/calendar?m=${shift(-1)}`} aria-label={t.prev}>‹ {t.prev}</Link>
        <p className="display text-2xl">{m.order.months[monthNumber - 1]} {year}</p>
        <Link href={`/admin/calendar?m=${shift(1)}`} aria-label={t.next} data-testid="admin-next-month">{t.next} ›</Link>
      </div>

      <div className="mt-3 grid max-w-4xl grid-cols-7 gap-1">
        {m.order.weekdays.map((d) => <span key={d} className="t-small text-center">{d}</span>)}
        {monthGrid(year, monthNumber).flat().map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const closed = rules.blocked.includes(day);
          const count = rules.orderCounts[day] ?? 0;
          return (
            <form key={day} action={toggleDayAction}>
              <input type="hidden" name="day" value={day} />
              <button
                type="submit"
                data-testid={`admin-day-${day}`}
                aria-pressed={closed}
                className={`grid min-h-16 w-full content-start border border-current/30 p-1 text-start ${closed ? "bg-[var(--on-sheet)] text-[var(--sheet)]" : ""} ${day === today ? "border-current border-2" : ""}`}
              >
                <span>{Number(day.slice(8))}</span>
                {closed && <span className="t-small">{t.closed}</span>}
                {count > 0 && <span className="t-small">{fill(t.orders, { n: count })}</span>}
              </button>
            </form>
          );
        })}
      </div>
    </AdminShell>
  );
}
