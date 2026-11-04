/**
 * CSV for the owner's spreadsheet. A customer controls most of these fields, and a cell
 * starting with = + - @ runs as a formula when the file is opened, so those are neutralised.
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: readonly (readonly (string | number | boolean | null | undefined)[])[]): string {
  // The byte order mark makes Excel read Georgian and Russian as UTF-8.
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
