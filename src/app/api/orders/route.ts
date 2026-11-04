import { EXAMPLE_FILLINGS } from "@/config/business";
import { storedFillings } from "@/lib/content";
import { tbilisiToday } from "@/lib/dates";
import { createOrder, currentRules, uploadExists } from "@/lib/db";
import { clientKey, isSameOrigin } from "@/lib/http";
import { notifyNewOrder } from "@/lib/notify";
import { validateOrder } from "@/lib/order";
import { RateLimiter } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const limiter = new RateLimiter(Number(process.env.ORDER_RATE_LIMIT) || 6, 10 * 60 * 1000);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "origin" }, { status: 403 });
  if (!limiter.allow(clientKey(request))) return Response.json({ error: "rate" }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ error: "size" }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "json" }, { status: 400 });
  }

  const result = validateOrder(body, currentRules(), tbilisiToday());
  if (!result.ok) {
    // A bot gets a normal-looking answer, so it learns nothing about the trap. Nothing is saved.
    if (result.bot) return Response.json({ reference: "TC-0000-0000", token: "x".repeat(32), demo: true }, { status: 201 });
    return Response.json({ errors: result.errors }, { status: 422 });
  }

  const order = result.value;
  const knownFilling =
    order.fillingId === "unsure" ||
    EXAMPLE_FILLINGS.some((f) => f.id === order.fillingId) ||
    storedFillings().some((f) => f.id === order.fillingId);
  if (!knownFilling) return Response.json({ errors: { fillingId: "invalid" } }, { status: 422 });
  if (order.uploadId && !uploadExists(order.uploadId)) return Response.json({ errors: { uploadId: "invalid" } }, { status: 422 });

  const created = createOrder(order);
  await notifyNewOrder(created);
  return Response.json({ reference: created.reference, token: created.token, demo: created.demo }, { status: 201 });
}
