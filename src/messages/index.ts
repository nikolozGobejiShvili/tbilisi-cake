import type { Locale } from "@/lib/types";
import { en, type Messages } from "./en";
import { ka } from "./ka";
import { ru } from "./ru";

export type { Messages };

export const messages: Record<Locale, Messages> = { ka, ru, en };

/** Fills {placeholders} in a message. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
