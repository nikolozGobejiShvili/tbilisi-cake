"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { monthGrid, refuseDate, type AvailabilityRules } from "@/lib/dates";

type Labels = {
  prevMonth: string;
  nextMonth: string;
  weekdays: string[];
  months: string[];
  unavailable: string;
};

export function Calendar({
  value,
  today,
  rules,
  labels,
  onChange,
}: {
  value: string;
  today: string;
  rules: AvailabilityRules;
  labels: Labels;
  onChange: (day: string) => void;
}) {
  const start = value || today;
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
  const move = (delta: number) =>
    setView(({ year, month }) => {
      const total = year * 12 + (month - 1) + delta;
      return { year: Math.floor(total / 12), month: (total % 12) + 1 };
    });

  const nowYear = Number(today.slice(0, 4));
  const nowMonth = Number(today.slice(5, 7));
  const atStart = view.year === nowYear && view.month === nowMonth;

  return (
    <div className="max-w-md" data-testid="calendar">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="grid h-11 w-11 place-items-center disabled:opacity-30" aria-label={labels.prevMonth} disabled={atStart} onClick={() => move(-1)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <p className="display text-xl" aria-live="polite">
          {labels.months[view.month - 1]} {view.year}
        </p>
        <button type="button" className="grid h-11 w-11 place-items-center" aria-label={labels.nextMonth} data-testid="calendar-next" onClick={() => move(1)}>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="cal-grid t-small mb-1 text-center" aria-hidden="true">
        {labels.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="cal-grid">
        {monthGrid(view.year, view.month)
          .flat()
          .map((day, i) => {
            if (!day) return <span key={`empty-${i}`} />;
            const refused = refuseDate(day, rules, today);
            const dayNumber = Number(day.slice(8));
            const name = `${dayNumber} ${labels.months[view.month - 1]} ${view.year}${refused ? `, ${labels.unavailable}` : ""}`;
            return (
              <button
                key={day}
                type="button"
                className="cal-day"
                disabled={Boolean(refused)}
                aria-pressed={value === day}
                aria-label={name}
                data-day={day}
                data-refused={refused ?? undefined}
                onClick={() => onChange(day)}
              >
                {dayNumber}
              </button>
            );
          })}
      </div>
    </div>
  );
}
