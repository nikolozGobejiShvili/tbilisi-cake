/** Database schema, shared by the server and the demo seed script. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new',
  demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_date ON orders(date);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blocked_days (
  day TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS works (
  slug TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  category TEXT NOT NULL,
  mood TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  texts TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
