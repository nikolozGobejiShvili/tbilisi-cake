/** The one validation of an order. The builder uses it for hints and the server enforces it. */
import { refuseDate, type AvailabilityRules, type DateRefusal } from "./dates.ts";
import { MAX_GUESTS, MIN_GUESTS } from "./servings.ts";
import { CHANNELS, FORMATS, LOCALES, OCCASIONS, type OrderInput } from "./types.ts";

export type FieldError = "required" | "tooLong" | "invalid" | "phone" | "privacy" | DateRefusal;
export type OrderErrors = Partial<Record<keyof OrderInput, FieldError>>;
export type ValidationResult = { ok: true; value: OrderInput } | { ok: false; errors: OrderErrors; bot?: boolean };

const LIMITS = {
  fillingId: 60,
  referenceWork: 80,
  inscription: 80,
  colours: 160,
  address: 240,
  recipientName: 80,
  recipientPhone: 24,
  cardNote: 240,
  allergies: 400,
  customerName: 80,
  customerPhone: 24,
  customerInstagram: 40,
} as const;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const PHONE = /^\+?[0-9][0-9 ()-]{6,22}$/;
const UPLOAD_ID = /^[a-f0-9]{32}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL, "").trim() : "";
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function validateOrder(input: unknown, rules: AvailabilityRules, today: string): ValidationResult {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const errors: OrderErrors = {};

  const locale = oneOf(raw.locale, LOCALES);
  const occasion = oneOf(raw.occasion, OCCASIONS);
  const format = oneOf(raw.format, FORMATS);
  const channel = oneOf(raw.channel, CHANNELS);
  const fulfilment = oneOf(raw.fulfilment, ["pickup", "delivery"] as const);
  if (!locale) errors.locale = "invalid";
  if (!occasion) errors.occasion = "required";
  if (!format) errors.format = "required";
  if (!channel) errors.channel = "required";
  if (!fulfilment) errors.fulfilment = "required";

  const guests = typeof raw.guests === "number" ? raw.guests : Number(raw.guests);
  if (!Number.isInteger(guests) || guests < MIN_GUESTS || guests > MAX_GUESTS) errors.guests = "invalid";

  const strings = Object.fromEntries(
    (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).map((key) => [key, text(raw[key])]),
  ) as Record<keyof typeof LIMITS, string>;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (strings[key].length > LIMITS[key]) errors[key] = "tooLong";
  }

  const isGift = raw.isGift === true;
  if (!strings.fillingId) errors.fillingId = "required";
  if (strings.customerName.length < 2) errors.customerName = "required";
  if (!strings.customerPhone) errors.customerPhone = "required";
  else if (!PHONE.test(strings.customerPhone)) errors.customerPhone = "phone";
  if (fulfilment === "delivery" && !strings.address) errors.address = "required";
  if (isGift && !strings.recipientName) errors.recipientName = "required";
  if (strings.recipientPhone && !PHONE.test(strings.recipientPhone)) errors.recipientPhone = "phone";

  const uploadId = text(raw.uploadId);
  if (uploadId && !UPLOAD_ID.test(uploadId)) errors.uploadId = "invalid";

  const date = text(raw.date);
  if (!date) errors.date = "required";
  else {
    const refusal = refuseDate(date, rules, today);
    if (refusal) errors.date = refusal;
  }

  if (raw.privacyAccepted !== true) errors.privacyAccepted = "privacy";

  // A filled honeypot is reported separately, so the route can answer without revealing the trap.
  const website = text(raw.website);
  if (website) return { ok: false, errors, bot: true };

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      locale: locale!,
      occasion: occasion!,
      format: format!,
      guests,
      fillingId: strings.fillingId,
      referenceWork: strings.referenceWork,
      uploadId,
      inscription: strings.inscription,
      colours: strings.colours,
      date,
      fulfilment: fulfilment!,
      address: fulfilment === "delivery" ? strings.address : "",
      isGift,
      recipientName: isGift ? strings.recipientName : "",
      recipientPhone: isGift ? strings.recipientPhone : "",
      cardNote: isGift ? strings.cardNote : "",
      allergies: strings.allergies,
      customerName: strings.customerName,
      customerPhone: strings.customerPhone,
      customerInstagram: strings.customerInstagram.replace(/^@/, ""),
      channel: channel!,
      reminderOptIn: raw.reminderOptIn === true,
      privacyAccepted: true,
      website: "",
    },
  };
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Example: TC-2026-0042. */
export function orderReference(year: number, id: number): string {
  return `TC-${year}-${String(id).padStart(4, "0")}`;
}

export type MessageLabels = {
  greeting: string;
  reference: string;
  occasion: string;
  format: string;
  guests: string;
  filling: string;
  reference_work: string;
  photo: string;
  inscription: string;
  colours: string;
  date: string;
  pickup: string;
  delivery: string;
  gift: string;
  cardNote: string;
  allergies: string;
  name: string;
  phone: string;
};

/** The text a customer pastes into Instagram. It holds what the confectioner needs and nothing else. */
export function composeOrderMessage(
  order: {
    reference: string;
    occasionLabel: string;
    formatLabel: string;
    guests: number;
    fillingLabel: string;
    referenceLabel: string;
    hasUpload: boolean;
    inscription: string;
    colours: string;
    date: string;
    fulfilment: "pickup" | "delivery";
    address: string;
    isGift: boolean;
    recipientName: string;
    cardNote: string;
    allergies: string;
    customerName: string;
    customerPhone: string;
  },
  labels: MessageLabels,
): string {
  const lines = [
    labels.greeting,
    `${labels.reference}: ${order.reference}`,
    `${labels.occasion}: ${order.occasionLabel}`,
    `${labels.format}: ${order.formatLabel}`,
    `${labels.guests}: ${order.guests}`,
    `${labels.filling}: ${order.fillingLabel}`,
    order.referenceLabel && `${labels.reference_work}: ${order.referenceLabel}`,
    order.hasUpload && labels.photo,
    order.inscription && `${labels.inscription}: ${order.inscription}`,
    order.colours && `${labels.colours}: ${order.colours}`,
    `${labels.date}: ${order.date}`,
    order.fulfilment === "delivery" ? `${labels.delivery}: ${order.address}` : labels.pickup,
    order.isGift && `${labels.gift}: ${order.recipientName}`,
    order.isGift && order.cardNote && `${labels.cardNote}: ${order.cardNote}`,
    order.allergies && `${labels.allergies}: ${order.allergies}`,
    `${labels.name}: ${order.customerName}`,
    `${labels.phone}: ${order.customerPhone}`,
  ];
  return lines.filter(Boolean).join("\n");
}
