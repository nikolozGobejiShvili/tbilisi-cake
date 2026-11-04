import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";
import { listOrders } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLUMNS = ["reference", "status", "demo", "createdAt", "date", "occasion", "format", "guests", "fillingId", "referenceWork", "inscription", "colours", "fulfilment", "address", "isGift", "recipientName", "recipientPhone", "cardNote", "allergies", "customerName", "customerPhone", "customerInstagram", "channel", "reminderOptIn"] as const;

export async function GET() {
  if (!adminEnabled()) return new Response(null, { status: 404 });
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  const rows = listOrders().map((order) => COLUMNS.map((column) => order[column]));
  return new Response(toCsv([COLUMNS, ...rows]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="tbilisi-cake-orders.csv"',
      "cache-control": "private, no-store",
    },
  });
}
