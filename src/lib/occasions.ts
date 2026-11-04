import { addDays, daysBetween } from "./dates.ts";

/** The next time a past date's month and day come round, on or after today. 29 February falls on the 28th otherwise. */
export function nextAnniversary(date: string, today: string): string {
  const monthDay = date.slice(5);
  const year = Number(today.slice(0, 4));
  const inYear = (y: number) => {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return monthDay === "02-29" && !leap ? `${y}-02-28` : `${y}-${monthDay}`;
  };
  const candidate = inYear(year);
  return candidate >= today ? candidate : inYear(year + 1);
}

export function isUpcoming(date: string, today: string, withinDays: number): boolean {
  // An order for a date still ahead is not an anniversary yet.
  if (date >= today) return false;
  return daysBetween(today, nextAnniversary(date, today)) <= withinDays;
}

export const REMINDER_WINDOW_DAYS = 60;

export function windowEnd(today: string): string {
  return addDays(today, REMINDER_WINDOW_DAYS);
}
