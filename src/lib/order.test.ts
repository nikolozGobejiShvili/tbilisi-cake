import assert from "node:assert/strict";
import { test } from "node:test";
import type { AvailabilityRules } from "./dates.ts";
import { composeOrderMessage, firstName, orderReference, validateOrder } from "./order.ts";

const rules: AvailabilityRules = { leadDays: 3, horizonDays: 180, capacityPerDay: 2, blocked: ["2026-12-25"], orderCounts: { "2026-12-26": 2 } };
const today = "2026-12-01";

const good = {
  locale: "ru",
  occasion: "birthday",
  format: "tiered",
  guests: 12,
  fillingId: "chocolate",
  referenceWork: "piggy",
  uploadId: "",
  inscription: "С днём рождения",
  colours: "",
  date: "2026-12-20",
  fulfilment: "pickup",
  address: "",
  isGift: false,
  recipientName: "",
  recipientPhone: "",
  cardNote: "",
  allergies: "",
  customerName: "Нина Иванова",
  customerPhone: "+995 555 12 34 56",
  customerInstagram: "@nina",
  channel: "instagram",
  reminderOptIn: true,
  privacyAccepted: true,
  website: "",
};

const errorsOf = (patch: Record<string, unknown>) => {
  const result = validateOrder({ ...good, ...patch }, rules, today);
  return result.ok ? {} : result.errors;
};

test("a complete order passes and is normalised", () => {
  const result = validateOrder({ ...good, customerName: "  Нина Иванова " }, rules, today);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.customerName, "Нина Иванова");
    assert.equal(result.value.customerInstagram, "nina");
  }
});

test("a date inside the lead time, blocked or full is refused on the server side too", () => {
  assert.equal(errorsOf({ date: "2026-12-02" }).date, "leadTime");
  assert.equal(errorsOf({ date: "2026-12-25" }).date, "blocked");
  assert.equal(errorsOf({ date: "2026-12-26" }).date, "full");
  assert.equal(errorsOf({ date: "" }).date, "required");
  assert.equal(errorsOf({ date: "2026-13-45" }).date, "invalid");
});

test("required fields and formats", () => {
  assert.equal(errorsOf({ customerName: "" }).customerName, "required");
  assert.equal(errorsOf({ customerPhone: "" }).customerPhone, "required");
  assert.equal(errorsOf({ customerPhone: "call me" }).customerPhone, "phone");
  assert.equal(errorsOf({ occasion: "funeral" }).occasion, "required");
  assert.equal(errorsOf({ guests: 1 }).guests, "invalid");
  assert.equal(errorsOf({ guests: 500 }).guests, "invalid");
  assert.equal(errorsOf({ privacyAccepted: false }).privacyAccepted, "privacy");
});

test("delivery needs an address and a gift needs a recipient", () => {
  assert.equal(errorsOf({ fulfilment: "delivery" }).address, "required");
  assert.equal(errorsOf({ isGift: true }).recipientName, "required");
});

test("gift and address fields are dropped when they do not apply", () => {
  const result = validateOrder({ ...good, address: "leftover", recipientName: "leftover", cardNote: "leftover" }, rules, today);
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.value.address, "");
    assert.equal(result.value.recipientName, "");
    assert.equal(result.value.cardNote, "");
  }
});

test("over-long text is refused, control characters are removed", () => {
  assert.equal(errorsOf({ inscription: "x".repeat(81) }).inscription, "tooLong");
  const result = validateOrder({ ...good, inscription: "ok\u0000\u0007" }, rules, today);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.value.inscription, "ok");
});

test("an upload id must look like one, so it can never reach the file system as a path", () => {
  assert.equal(errorsOf({ uploadId: "../../etc/passwd" }).uploadId, "invalid");
  assert.equal(errorsOf({ uploadId: "a".repeat(32) }).uploadId, undefined);
});

test("a filled honeypot is reported as a bot", () => {
  const result = validateOrder({ ...good, website: "http://spam" }, rules, today);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.bot, true);
});

test("garbage input does not throw", () => {
  for (const junk of [null, undefined, 3, "x", []]) {
    assert.equal(validateOrder(junk, rules, today).ok, false);
  }
});

test("first name only, for the public status page", () => {
  assert.equal(firstName("  Нина   Иванова "), "Нина");
  assert.equal(firstName("Nina"), "Nina");
});

test("reference format", () => {
  assert.equal(orderReference(2026, 42), "TC-2026-0042");
});

test("the order message leaves out empty parts", () => {
  const labels = {
    greeting: "Hello", reference: "Ref", occasion: "Occasion", format: "Format", guests: "Guests", filling: "Filling",
    reference_work: "Like", photo: "Photo attached", inscription: "Text", colours: "Colours", date: "Date", pickup: "Pickup",
    delivery: "Delivery", gift: "Gift for", cardNote: "Card", allergies: "Allergies", name: "Name", phone: "Phone",
  };
  const base = {
    reference: "TC-2026-0001", occasionLabel: "Birthday", formatLabel: "Tiered", guests: 12, fillingLabel: "Lemon",
    referenceLabel: "", hasUpload: false, inscription: "", colours: "", date: "2026-12-20", fulfilment: "pickup" as const,
    address: "", isGift: false, recipientName: "", cardNote: "", allergies: "", customerName: "Nina", customerPhone: "+995555",
  };
  const plain = composeOrderMessage(base, labels);
  assert.ok(plain.includes("Ref: TC-2026-0001"));
  assert.ok(plain.includes("Pickup"));
  assert.ok(!plain.includes("Like:"));
  assert.ok(!plain.includes("Allergies"));
  const full = composeOrderMessage({ ...base, fulfilment: "delivery", address: "Vake", isGift: true, recipientName: "Ana", cardNote: "Hi", hasUpload: true }, labels);
  assert.ok(full.includes("Delivery: Vake"));
  assert.ok(full.includes("Gift for: Ana"));
  assert.ok(full.includes("Card: Hi"));
  assert.ok(full.includes("Photo attached"));
});
