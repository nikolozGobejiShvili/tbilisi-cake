/** Date logic for the order builder. All "YYYY-MM-DD" strings are calendar days in Tbilisi. */

export const TIME_ZONE = "Asia/Tbilisi";

export type AvailabilityRules = {
  /** Whole days between today and the earliest date that can be ordered. */
  leadDays: number;
  /** How far ahead an order can be placed, in days. */
  horizonDays: number;
  /** Orders the kitchen takes per day. */
  capacityPerDay: number;
  /** Days the owner closed by hand. */
  blocked: readonly string[];
  /** Orders already taken, by day. */
  orderCounts: Readonly<Record<string, number>>;
};

export type DateRefusal = "invalid" | "past" | "leadTime" | "tooFar" | "blocked" | "full";

const DAY_MS = 86_400_000;

export function tbilisiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtcMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const ms = toUtcMs(day);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === day;
}

export function addDays(day: string, days: number): string {
  return new Date(toUtcMs(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Why a day cannot be chosen, or null when it can. */
export function refuseDate(day: string, rules: AvailabilityRules, today: string): DateRefusal | null {
  if (!isValidDay(day)) return "invalid";
  const ahead = daysBetween(today, day);
  if (ahead < 0) return "past";
  if (ahead < rules.leadDays) return "leadTime";
  if (ahead > rules.horizonDays) return "tooFar";
  if (rules.blocked.includes(day)) return "blocked";
  if ((rules.orderCounts[day] ?? 0) >= rules.capacityPerDay) return "full";
  return null;
}

/** The weeks of a month as rows of seven, Monday first; null fills the empty cells. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
