import { tbilisiToday } from "@/lib/dates";
import { currentRules } from "@/lib/db";

export const dynamic = "force-dynamic";

/** What the calendar needs. Full and blocked days look the same from outside, so order counts stay private. */
export function GET() {
  const rules = currentRules();
  const full = Object.entries(rules.orderCounts)
    .filter(([, count]) => count >= rules.capacityPerDay)
    .map(([day]) => day);
  return Response.json(
    { today: tbilisiToday(), leadDays: rules.leadDays, horizonDays: rules.horizonDays, closed: [...rules.blocked, ...full] },
    { headers: { "cache-control": "no-store" } },
  );
}
