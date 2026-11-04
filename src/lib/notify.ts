import "server-only";
import type { OrderRecord } from "./types";

/**
 * Tells the owner about a new order on Telegram, when configured. Demo orders never notify.
 * A failed notification must not lose the order, so it is logged and otherwise ignored.
 */
export async function notifyNewOrder(order: OrderRecord): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (order.demo || !token || !chat) {
    console.log(`[orders] ${order.reference} saved, no notification sent (${order.demo ? "demo" : "Telegram not configured"}).`);
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `New order ${order.reference}: ${order.date}, ${order.guests} guests, ${order.format}.` }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`[orders] Telegram answered ${response.status} for ${order.reference}.`);
  } catch (error) {
    console.error(`[orders] Telegram failed for ${order.reference}:`, error);
  }
}
