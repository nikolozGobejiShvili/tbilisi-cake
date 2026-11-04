// Fills the panel with obviously fake orders, so it can be shown to the owner.
// Every name says Demo and every phone number is zeros. Run with: npm run seed:demo
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { addDays, tbilisiToday } from "../src/lib/dates.ts";
import { orderReference } from "../src/lib/order.ts";
import { SCHEMA } from "../src/lib/schema.ts";

const dir = resolve(process.env.DATA_DIR || "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "tbilisi-cake.db"));
db.exec(SCHEMA);

const today = tbilisiToday();
const base = {
  locale: "ka", format: "tiered", fillingId: "unsure", uploadId: "", colours: "", fulfilment: "pickup", address: "",
  isGift: false, recipientName: "", recipientPhone: "", cardNote: "", allergies: "", customerInstagram: "", channel: "instagram",
  reminderOptIn: false, privacyAccepted: true, website: "",
};
const orders = [
  { dayOffset: 5, status: "new", occasion: "birthday", guests: 12, referenceWork: "piggy", inscription: "Demo" },
  { dayOffset: 6, status: "new", occasion: "wedding", guests: 60, referenceWork: "ribbons", fulfilment: "delivery", address: "Demo address 1" },
  { dayOffset: 8, status: "confirmed", occasion: "kids", guests: 16, referenceWork: "first-birthday" },
  { dayOffset: 9, status: "inProgress", occasion: "justBecause", format: "bento", guests: 2, referenceWork: "frog-wedding", isGift: true, recipientName: "Demo recipient", cardNote: "Demo note", fulfilment: "delivery", address: "Demo address 2" },
  { dayOffset: 12, status: "confirmed", occasion: "anniversary", guests: 20, referenceWork: "rose", allergies: "Demo: no nuts" },
  { dayOffset: -2, status: "delivered", occasion: "birthday", guests: 8, referenceWork: "sunflower" },
  { dayOffset: -3, status: "cancelled", occasion: "other", guests: 30, referenceWork: "gothic-sword" },
  { dayOffset: -340, status: "delivered", occasion: "birthday", guests: 14, referenceWork: "air-cloud", reminderOptIn: true },
  { dayOffset: -325, status: "delivered", occasion: "anniversary", guests: 10, referenceWork: "raspberries", reminderOptIn: true },
];

let added = 0;
orders.forEach(({ dayOffset, status, ...fields }, i) => {
  const date = addDays(today, dayOffset);
  const data = { ...base, ...fields, date, customerName: `Demo customer ${i + 1}`, customerPhone: `+995 000 00 00 ${String(i + 1).padStart(2, "0")}` };
  const createdAt = new Date().toISOString();
  const insert = db
    .prepare("INSERT INTO orders (token, status, demo, created_at, date, data) VALUES (?, ?, 1, ?, ?, ?)")
    .run(randomBytes(24).toString("base64url"), status, createdAt, date, JSON.stringify(data));
  const id = Number(insert.lastInsertRowid);
  db.prepare("UPDATE orders SET reference = ? WHERE id = ?").run(orderReference(new Date(createdAt).getUTCFullYear(), id), id);
  added += 1;
});
console.log(`Added ${added} demo orders to ${join(dir, "tbilisi-cake.db")}.`);
