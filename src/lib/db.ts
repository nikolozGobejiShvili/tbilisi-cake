import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { business } from "@/config/business";
import { tbilisiToday, type AvailabilityRules } from "./dates";
import { orderReference } from "./order";
import { SCHEMA } from "./schema";
import type { Locale, OrderInput, OrderRecord, OrderStatus } from "./types";

/** Orders and customer photos live here. It is outside public/ and never served directly. */
export function dataDir(): string {
  return resolve(process.env.DATA_DIR || "data");
}

export function uploadsDir(): string {
  const dir = join(dataDir(), "uploads");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function worksDir(): string {
  const dir = join(dataDir(), "works");
  mkdirSync(dir, { recursive: true });
  return dir;
}

let database: DatabaseSync | null = null;

function db(): DatabaseSync {
  if (!database) {
    mkdirSync(dataDir(), { recursive: true });
    database = new DatabaseSync(join(dataDir(), "tbilisi-cake.db"));
    database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;");
    database.exec(SCHEMA);
  }
  return database;
}

type OrderRow = {
  id: number;
  reference: string;
  token: string;
  status: string;
  demo: number;
  created_at: string;
  date: string;
  data: string;
};

function toRecord(row: OrderRow): OrderRecord {
  return {
    ...(JSON.parse(row.data) as OrderInput),
    id: row.id,
    reference: row.reference,
    token: row.token,
    status: row.status as OrderStatus,
    demo: row.demo === 1,
    createdAt: row.created_at,
    date: row.date,
  };
}

export function createOrder(input: OrderInput): OrderRecord {
  const token = randomBytes(24).toString("base64url");
  const createdAt = new Date().toISOString();
  const demo = business.showConceptLabel ? 1 : 0;
  const conn = db();
  const insert = conn
    .prepare("INSERT INTO orders (token, demo, created_at, date, data) VALUES (?, ?, ?, ?, ?)")
    .run(token, demo, createdAt, input.date, JSON.stringify(input));
  const id = Number(insert.lastInsertRowid);
  conn.prepare("UPDATE orders SET reference = ? WHERE id = ?").run(orderReference(new Date(createdAt).getUTCFullYear(), id), id);
  return getOrderById(id)!;
}

export function getOrderById(id: number): OrderRecord | null {
  const row = db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return row ? toRecord(row) : null;
}

export function getOrderByToken(token: string): OrderRecord | null {
  const row = db().prepare("SELECT * FROM orders WHERE token = ?").get(token) as OrderRow | undefined;
  return row ? toRecord(row) : null;
}

/** The next orders come first, nearest date on top. Past orders follow, most recent first. */
export function listOrders(status?: OrderStatus): OrderRecord[] {
  const today = tbilisiToday();
  const order = "ORDER BY CASE WHEN date >= ? THEN 0 ELSE 1 END, CASE WHEN date >= ? THEN date END ASC, date DESC, id DESC";
  const rows = status
    ? db().prepare(`SELECT * FROM orders WHERE status = ? ${order}`).all(status, today, today)
    : db().prepare(`SELECT * FROM orders ${order}`).all(today, today);
  return (rows as OrderRow[]).map(toRecord);
}

export function setOrderStatus(id: number, status: OrderStatus): void {
  db().prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
}

/** Orders by day, leaving out cancelled ones so they free up the day again. */
export function orderCounts(): Record<string, number> {
  const rows = db()
    .prepare("SELECT date, COUNT(*) AS n FROM orders WHERE status != 'cancelled' GROUP BY date")
    .all() as { date: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.date, Number(r.n)]));
}

export function blockedDays(): string[] {
  return (db().prepare("SELECT day FROM blocked_days ORDER BY day").all() as { day: string }[]).map((r) => r.day);
}

export function toggleBlockedDay(day: string): void {
  const conn = db();
  const exists = conn.prepare("SELECT 1 FROM blocked_days WHERE day = ?").get(day);
  if (exists) conn.prepare("DELETE FROM blocked_days WHERE day = ?").run(day);
  else conn.prepare("INSERT INTO blocked_days (day) VALUES (?)").run(day);
}

export function getSetting<T>(key: string): T | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : null;
}

export function setSetting(key: string, value: unknown): void {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
}

export function currentRules(): AvailabilityRules {
  return {
    leadDays: getSetting<number>("leadDays") ?? business.leadTime.value.days,
    capacityPerDay: getSetting<number>("capacityPerDay") ?? business.capacity.value.perDay,
    horizonDays: business.horizonDays,
    blocked: blockedDays(),
    orderCounts: orderCounts(),
  };
}

export function recordUpload(): string {
  const id = randomBytes(16).toString("hex");
  db().prepare("INSERT INTO uploads (id, created_at) VALUES (?, ?)").run(id, new Date().toISOString());
  return id;
}

export function uploadExists(id: string): boolean {
  return Boolean(db().prepare("SELECT 1 FROM uploads WHERE id = ?").get(id));
}

export type StoredWork = {
  slug: string;
  number: number;
  category: string;
  width: number;
  height: number;
  texts: Record<Locale, { title: string; text: string }>;
};

export function listStoredWorks(): StoredWork[] {
  const rows = db().prepare("SELECT * FROM works ORDER BY number").all() as (Omit<StoredWork, "texts"> & { texts: string })[];
  return rows.map((r) => ({ ...r, texts: JSON.parse(r.texts) as StoredWork["texts"] }));
}

export function addStoredWork(work: Omit<StoredWork, "number"> & { minNumber: number }): void {
  const conn = db();
  const last = conn.prepare("SELECT MAX(number) AS n FROM works").get() as { n: number | null };
  const number = Math.max(work.minNumber, (last.n ?? 0) + 1);
  conn
    .prepare("INSERT INTO works (slug, number, category, mood, width, height, texts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(work.slug, number, work.category, "", work.width, work.height, JSON.stringify(work.texts), new Date().toISOString());
}

export function removeStoredWork(slug: string): void {
  db().prepare("DELETE FROM works WHERE slug = ?").run(slug);
}
