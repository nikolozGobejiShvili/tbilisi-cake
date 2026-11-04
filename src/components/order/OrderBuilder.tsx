"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { cloneElement, useEffect, useMemo, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type ReactElement } from "react";
import { CakeDrawing } from "@/components/CakeDrawing";
import { Photo } from "@/components/Photo";
import type { PriceList } from "@/config/business";
import { refuseDate, type AvailabilityRules } from "@/lib/dates";
import { estimatePrice } from "@/lib/facts";
import { composeOrderMessage, validateOrder, type OrderErrors } from "@/lib/order";
import { statusPath } from "@/lib/routes";
import { cakeSize, clampGuests, MAX_GUESTS, MIN_GUESTS } from "@/lib/servings";
import { FORMATS, OCCASIONS, type Channel, type Format, type Locale, type Occasion, type OrderInput } from "@/lib/types";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/upload";
import type { Messages } from "@/messages/en";
import { Calendar } from "./Calendar";

export type BuilderFilling = { id: string; name: string; sponge: string; cream: string; accent: string; confirmed: boolean };
export type BuilderWork = { slug: string; number: number; title: string; src: string; width: number; height: number; alt: string };

export type BuilderProps = {
  locale: Locale;
  labels: Messages["order"];
  unsureFilling: string;
  fillings: BuilderFilling[];
  works: BuilderWork[];
  prices: PriceList | null;
  demo: boolean;
  instagramDirect: string;
  whatsappConfirmed: boolean;
  privacyHref: string;
  /** The cake a customer arrived from, through "I want one like this". */
  like: string | null;
};

type Draft = Omit<OrderInput, "locale" | "website" | "occasion" | "format"> & { occasion: Occasion | ""; format: Format | ""; step: number };

const EMPTY: Draft = {
  occasion: "",
  format: "",
  guests: 10,
  fillingId: "",
  referenceWork: "",
  uploadId: "",
  inscription: "",
  colours: "",
  date: "",
  fulfilment: "pickup",
  address: "",
  isGift: false,
  recipientName: "",
  recipientPhone: "",
  cardNote: "",
  allergies: "",
  customerName: "",
  customerPhone: "",
  customerInstagram: "",
  channel: "instagram",
  reminderOptIn: false,
  privacyAccepted: false,
  step: 0,
};

const DRAFT_KEY = "tc-order-draft";
const UNSURE = "unsure";
const STEP_KEYS = ["occasion", "format", "filling", "design", "date", "contact"] as const;
const STEP_OF_FIELD: Partial<Record<keyof OrderInput, number>> = {
  occasion: 0,
  format: 1,
  guests: 1,
  fillingId: 2,
  referenceWork: 3,
  uploadId: 3,
  inscription: 3,
  colours: 3,
  date: 4,
  fulfilment: 4,
  address: 4,
  recipientName: 4,
  recipientPhone: 4,
  cardNote: 4,
};

type Initial = { draft: Draft; restored: boolean };

/** Arriving from "I want one like this" sets the reference. */
function withLike(draft: Draft, works: readonly BuilderWork[], like: string | null): Draft {
  return like && works.some((w) => w.slug === like) ? { ...draft, referenceWork: like } : draft;
}

/** Runs only in the browser. */
function loadDraft(works: readonly BuilderWork[], like: string | null): Initial {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) return { draft: withLike({ ...EMPTY, ...(JSON.parse(saved) as Partial<Draft>), privacyAccepted: false }, works, like), restored: true };
  } catch {
    // A broken or unavailable draft just means a fresh start.
  }
  return { draft: withLike(EMPTY, works, like), restored: false };
}

function saveDraft(draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Without storage the draft simply does not survive a reload.
  }
}

const noopSubscribe = () => () => {};

/**
 * The server sends the first step, so the page has its content before any script runs. The draft
 * lives in localStorage, so once in the browser the builder starts again from it. For a first-time
 * visitor both versions look the same, so nothing on the page moves.
 */
export function OrderBuilder(props: BuilderProps) {
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const initial = inBrowser ? loadDraft(props.works, props.like) : { draft: withLike(EMPTY, props.works, props.like), restored: false };
  return <Builder key={inBrowser ? "browser" : "server"} {...props} initial={initial} />;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactElement<InputHTMLAttributes<HTMLInputElement>> }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined })}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p className="error" id={`${id}-error`} data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}

type Availability = { today: string; leadDays: number; horizonDays: number; closed: string[] };

function Builder({ locale, labels, unsureFilling, fillings, works, prices, demo, instagramDirect, whatsappConfirmed, privacyHref, initial }: BuilderProps & { initial: Initial }) {
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [showRestored, setShowRestored] = useState(initial.restored);
  // Motion answers the customer's own actions, so nothing animates until the first choice.
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [stepError, setStepError] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [uploadState, setUploadState] = useState<{ status: "idle" | "uploading" | "done"; error: string; preview: string }>({ status: draft.uploadId ? "done" : "idle", error: "", preview: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ reference: string; token: string; demo: boolean; message: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const previousStep = useRef(draft.step);

  const update = (patch: Partial<Draft>) => {
    setTouched(true);
    setDraft((current) => {
      const next = { ...current, ...patch };
      saveDraft(next);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/availability", { cache: "no-store" })
      .then((r) => r.json() as Promise<Availability>)
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setStepError(labels.errors.server);
      });
    return () => {
      cancelled = true;
    };
  }, [labels.errors.server]);

  // Moves focus to the new step's heading, so keyboard and screen reader users land in the right place.
  // This runs only when the step changes, never on typing.
  useEffect(() => {
    if (previousStep.current !== draft.step) {
      previousStep.current = draft.step;
      // The top of the builder, not the top of the page, so a phone shows the drawing and the new step.
      container.current?.scrollIntoView({ block: "start" });
      heading.current?.focus({ preventScroll: true });
    }
  }, [draft.step]);

  const rules: AvailabilityRules | null = useMemo(
    () =>
      availability && {
        leadDays: availability.leadDays,
        horizonDays: availability.horizonDays,
        capacityPerDay: 1,
        blocked: availability.closed,
        orderCounts: {},
      },
    [availability],
  );

  const format: Format = draft.format || "tiered";
  const size = cakeSize(format, draft.guests);
  const filling = fillings.find((f) => f.id === draft.fillingId) ?? fillings[0];
  const hasRealFillings = fillings.some((f) => f.confirmed);
  const reference = works.find((w) => w.slug === draft.referenceWork);
  const estimate = prices ? estimatePrice({ confirmed: true, value: prices }, format, size.kilograms, clampGuests(draft.guests)) : null;
  const fillingLabel = draft.fillingId === UNSURE ? unsureFilling : (fillings.find((f) => f.id === draft.fillingId)?.name ?? "");

  const sizeSummary =
    format === "bento"
      ? labels.bentoSummary
      : format === "desserts"
        ? labels.dessertsSummary.replace("{guests}", String(draft.guests))
        : labels.sizeSummary.replace("{kg}", String(size.kilograms)).replace("{guests}", String(draft.guests));

  const errorText = (code: string | undefined): string | undefined => {
    if (!code) return undefined;
    const map = labels.errors as Record<string, string>;
    return map[code] ?? labels.errors.invalid;
  };

  const checkStep = (step: number): OrderErrors => {
    const found: OrderErrors = {};
    if (step === 0 && !draft.occasion) found.occasion = "required";
    if (step === 1 && !draft.format) found.format = "required";
    if (step === 2 && !draft.fillingId) found.fillingId = "required";
    if (step === 4) {
      if (!draft.date) found.date = "required";
      else if (rules && availability) {
        const refused = refuseDate(draft.date, rules, availability.today);
        if (refused) found.date = refused;
      }
      if (draft.fulfilment === "delivery" && !draft.address.trim()) found.address = "required";
      if (draft.isGift && !draft.recipientName.trim()) found.recipientName = "required";
    }
    return found;
  };

  const goNext = () => {
    const found = checkStep(draft.step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStepError(labels.errors.summary);
      return;
    }
    setStepError("");
    setShowRestored(false);
    update({ step: draft.step + 1 });
  };

  const goBack = () => {
    setStepError("");
    setErrors({});
    update({ step: Math.max(0, draft.step - 1) });
  };

  const startOver = () => {
    saveDraft(null);
    setDraft(EMPTY);
    setErrors({});
    setStepError("");
    setShowRestored(false);
    setUploadState({ status: "idle", error: "", preview: "" });
    setResult(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadState((s) => ({ ...s, error: labels.errors.tooBig }));
      return;
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!sniffImage(head)) {
      setUploadState((s) => ({ ...s, error: labels.errors.notImage }));
      return;
    }
    setUploadState({ status: "uploading", error: "", preview: "" });
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      if (!response.ok) {
        const code = response.status === 413 ? labels.errors.tooBig : response.status === 415 ? labels.errors.notImage : response.status === 429 ? labels.errors.rate : labels.errors.uploadFailed;
        setUploadState({ status: "idle", error: code, preview: "" });
        return;
      }
      const { id } = (await response.json()) as { id: string };
      update({ uploadId: id });
      setUploadState({ status: "done", error: "", preview: URL.createObjectURL(file) });
    } catch {
      setUploadState({ status: "idle", error: labels.errors.uploadFailed, preview: "" });
    }
  };

  const submit = async () => {
    if (!rules || !availability || !draft.occasion || !draft.format) return;
    const payload: OrderInput = { ...draft, occasion: draft.occasion, format: draft.format, locale, website: honeypot.current?.value ?? "" };
    const local = validateOrder(payload, rules, availability.today);
    if (!local.ok) {
      setErrors(local.errors);
      setStepError(labels.errors.summary);
      const firstStep = Math.min(...Object.keys(local.errors).map((k) => STEP_OF_FIELD[k as keyof OrderInput] ?? 5));
      if (firstStep !== draft.step) update({ step: firstStep });
      return;
    }
    setSending(true);
    setStepError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 429) {
        setStepError(labels.errors.rate);
        return;
      }
      if (response.status === 422) {
        const { errors: serverErrors } = (await response.json()) as { errors: OrderErrors };
        setErrors(serverErrors);
        setStepError(labels.errors.summary);
        const firstStep = Math.min(...Object.keys(serverErrors).map((k) => STEP_OF_FIELD[k as keyof OrderInput] ?? 5));
        if (firstStep !== draft.step) update({ step: firstStep });
        return;
      }
      if (!response.ok) {
        setStepError(labels.errors.server);
        return;
      }
      const created = (await response.json()) as { reference: string; token: string; demo: boolean };
      const message = composeOrderMessage(
        {
          reference: created.reference,
          occasionLabel: labels.occasions[draft.occasion],
          formatLabel: labels.formats[draft.format].title,
          guests: draft.guests,
          fillingLabel,
          referenceLabel: reference ? `${reference.number}. ${reference.title}` : "",
          hasUpload: Boolean(draft.uploadId),
          inscription: draft.inscription,
          colours: draft.colours,
          date: draft.date,
          fulfilment: draft.fulfilment,
          address: draft.address,
          isGift: draft.isGift,
          recipientName: draft.recipientName,
          cardNote: draft.cardNote,
          allergies: draft.allergies,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
        },
        labels.message,
      );
      saveDraft(null);
      setResult({ ...created, message });
      window.scrollTo({ top: 0 });
    } catch {
      setStepError(labels.errors.server);
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return <OrderResult result={result} labels={labels} locale={locale} instagramDirect={instagramDirect} onAnother={startOver} />;
  }

  const total = STEP_KEYS.length;
  const stepName = labels.steps[STEP_KEYS[draft.step]];

  return (
    <div ref={container} className="builder on-sheet scroll-mt-2 p-[clamp(1rem,3vw,2.5rem)]">
      <div className="min-w-0">
        <p className="t-small" data-testid="progress">
          {labels.progress.replace("{n}", String(draft.step + 1)).replace("{total}", String(total))}
        </p>
        <h2 ref={heading} tabIndex={-1} className="t-section mt-1 outline-none" data-testid="step-title">
          {stepName}
        </h2>

        {showRestored && (
          <p className="mt-3" role="status">
            {labels.draftRestored}{" "}
            <button type="button" className="underline" onClick={startOver}>
              {labels.startOver}
            </button>
          </p>
        )}

        <div key={draft.step} className={`mt-6 grid gap-6 ${touched ? "step-enter" : ""}`}>
          {draft.step === 0 && (
            <fieldset>
              <legend className="field-label mb-3">{labels.occasionQuestion}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {OCCASIONS.map((occasion) => (
                  <button key={occasion} type="button" className="choice" aria-pressed={draft.occasion === occasion} data-value={occasion} onClick={() => update({ occasion })}>
                    {labels.occasions[occasion]}
                  </button>
                ))}
              </div>
              {errors.occasion && <p className="error mt-2">{labels.errors.choose}</p>}
            </fieldset>
          )}

          {draft.step === 1 && (
            <>
              <fieldset>
                <legend className="field-label mb-3">{labels.formatQuestion}</legend>
                <div className="grid gap-2">
                  {FORMATS.map((option) => (
                    <button key={option} type="button" className="choice" aria-pressed={draft.format === option} data-value={option} onClick={() => update({ format: option })}>
                      <span className="display block text-xl">{labels.formats[option].title}</span>
                      <span className="t-small">{labels.formats[option].text}</span>
                    </button>
                  ))}
                </div>
                {errors.format && <p className="error mt-2">{labels.errors.choose}</p>}
              </fieldset>
              <div className="field">
                <label htmlFor="guests">{labels.guestsLabel}</label>
                <div className="flex items-stretch gap-2">
                  <button type="button" className="btn btn-line !px-3" aria-label={labels.guestsLess} onClick={() => update({ guests: clampGuests(draft.guests - 1) })}>
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <input
                    id="guests"
                    className="input !w-24 text-center"
                    type="number"
                    inputMode="numeric"
                    min={MIN_GUESTS}
                    max={MAX_GUESTS}
                    value={draft.guests}
                    onChange={(event) => update({ guests: clampGuests(Number(event.target.value)) })}
                  />
                  <button type="button" className="btn btn-line !px-3" aria-label={labels.guestsMore} onClick={() => update({ guests: clampGuests(draft.guests + 1) })}>
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="hint">{labels.sizeNote}</p>
              </div>
            </>
          )}

          {draft.step === 2 && (
            <fieldset>
              <legend className="field-label mb-1">{labels.fillingQuestion}</legend>
              {!hasRealFillings && <p className="hint mb-3">{labels.fillingExamplesNote}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {fillings.map((option) => (
                  <button key={option.id} type="button" className="choice" aria-pressed={draft.fillingId === option.id} data-value={option.id} onClick={() => update({ fillingId: option.id })}>
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="inline-grid h-6 w-6 shrink-0 overflow-hidden border border-current" style={{ gridTemplateRows: "1fr 1fr 1fr" }}>
                        <span style={{ background: option.sponge }} />
                        <span style={{ background: option.accent }} />
                        <span style={{ background: option.cream }} />
                      </span>
                      <span>
                        {option.name}
                        {!option.confirmed && <span className="t-small block opacity-80">{labels.exampleTag}</span>}
                      </span>
                    </span>
                  </button>
                ))}
                <button type="button" className="choice sm:col-span-2" aria-pressed={draft.fillingId === UNSURE} data-value={UNSURE} onClick={() => update({ fillingId: UNSURE })}>
                  {labels.fillingUnsure}
                </button>
              </div>
              {errors.fillingId && <p className="error mt-2">{labels.errors.choose}</p>}
            </fieldset>
          )}

          {draft.step === 3 && (
            <>
              <fieldset>
                <legend className="field-label mb-3">{labels.referenceLabel}</legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  <button type="button" className="choice t-small !p-2" aria-pressed={!draft.referenceWork} onClick={() => update({ referenceWork: "" })}>
                    {labels.referenceNone}
                  </button>
                  {works.map((work) => (
                    <button
                      key={work.slug}
                      type="button"
                      className={`border p-1 ${draft.referenceWork === work.slug ? "border-[3px] border-current" : "border-transparent"}`}
                      aria-pressed={draft.referenceWork === work.slug}
                      aria-label={`${work.number}. ${work.title}`}
                      data-value={work.slug}
                      onClick={() => update({ referenceWork: work.slug })}
                    >
                      <span className="block aspect-square overflow-hidden">
                        <Photo src={work.src} width={work.width} height={work.height} alt="" tile sizes="120px" />
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <span className="field-label">{labels.uploadLabel}</span>
                <p className="hint">{labels.uploadHint}</p>
                <label className="btn btn-line w-fit cursor-pointer focus-within:outline-2 focus-within:outline-offset-2">
                  {uploadState.status === "uploading" ? labels.uploading : draft.uploadId ? labels.uploadReplace : labels.uploadButton}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    data-testid="upload-input"
                    onChange={(event) => {
                      void onFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {uploadState.error && <p className="error" role="alert" data-testid="upload-error">{uploadState.error}</p>}
                {draft.uploadId && (
                  <div className="mt-1 flex items-center gap-3" role="status">
                    {uploadState.preview && (
                      // eslint-disable-next-line @next/next/no-img-element -- a local blob preview cannot go through next/image
                      <img src={uploadState.preview} alt="" className="h-16 w-16 object-cover" />
                    )}
                    <span data-testid="upload-done">{labels.uploaded}</span>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        update({ uploadId: "" });
                        setUploadState({ status: "idle", error: "", preview: "" });
                      }}
                    >
                      {labels.uploadRemove}
                    </button>
                  </div>
                )}
              </div>

              <Field id="inscription" label={labels.inscriptionLabel} hint={labels.inscriptionHint} error={errorText(errors.inscription)}>
                <input id="inscription" className="input" maxLength={80} value={draft.inscription} onChange={(e) => update({ inscription: e.target.value })} />
              </Field>
              <Field id="colours" label={labels.coloursLabel} error={errorText(errors.colours)}>
                <textarea id="colours" className="input" rows={3} maxLength={160} value={draft.colours} onChange={(e) => update({ colours: e.target.value })} />
              </Field>
            </>
          )}

          {draft.step === 4 && (
            <>
              <div className="field">
                <span className="field-label">{labels.dateQuestion}</span>
                <p className="hint">{labels.dateHint}</p>
                {availability && rules ? (
                  <Calendar
                    value={draft.date}
                    today={availability.today}
                    rules={rules}
                    labels={labels}
                    onChange={(date) => {
                      update({ date });
                      setErrors((e) => ({ ...e, date: undefined }));
                    }}
                  />
                ) : (
                  <p>{labels.dateLoading}</p>
                )}
                {draft.date && <p aria-live="polite" data-testid="date-chosen">{labels.dateChosen.replace("{date}", draft.date)}</p>}
                {errors.date && <p className="error" data-testid="error-date">{errorText(errors.date === "required" ? "choose" : errors.date)}</p>}
              </div>

              <fieldset>
                <legend className="field-label mb-3">{labels.fulfilmentQuestion}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" className="choice" aria-pressed={draft.fulfilment === "pickup"} data-value="pickup" onClick={() => update({ fulfilment: "pickup" })}>
                    <span className="block">{labels.pickup}</span>
                    <span className="t-small">{labels.pickupNote}</span>
                  </button>
                  <button type="button" className="choice" aria-pressed={draft.fulfilment === "delivery"} data-value="delivery" onClick={() => update({ fulfilment: "delivery" })}>
                    <span className="block">{labels.delivery}</span>
                    <span className="t-small">{labels.deliveryNote}</span>
                  </button>
                </div>
              </fieldset>

              {draft.fulfilment === "delivery" && (
                <Field id="address" label={labels.addressLabel} error={errorText(errors.address)}>
                  <input id="address" className="input" autoComplete="street-address" maxLength={240} value={draft.address} onChange={(e) => update({ address: e.target.value })} />
                </Field>
              )}

              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0" checked={draft.isGift} data-testid="gift" onChange={(e) => update({ isGift: e.target.checked })} />
                <span>{labels.giftLabel}</span>
              </label>

              {draft.isGift && (
                <>
                  <Field id="recipientName" label={labels.recipientName} error={errorText(errors.recipientName)}>
                    <input id="recipientName" className="input" maxLength={80} value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} />
                  </Field>
                  <Field id="recipientPhone" label={labels.recipientPhone} hint={labels.recipientHint} error={errorText(errors.recipientPhone)}>
                    <input id="recipientPhone" className="input" type="tel" maxLength={24} value={draft.recipientPhone} onChange={(e) => update({ recipientPhone: e.target.value })} />
                  </Field>
                  <Field id="cardNote" label={labels.cardNote} error={errorText(errors.cardNote)}>
                    <textarea id="cardNote" className="input" rows={2} maxLength={240} value={draft.cardNote} onChange={(e) => update({ cardNote: e.target.value })} />
                  </Field>
                </>
              )}
            </>
          )}

          {draft.step === 5 && (
            <>
              <p className="field-label">{labels.contactQuestion}</p>
              <Field id="customerName" label={labels.nameLabel} error={errorText(errors.customerName)}>
                <input id="customerName" className="input" autoComplete="name" maxLength={80} value={draft.customerName} onChange={(e) => update({ customerName: e.target.value })} />
              </Field>
              <Field id="customerPhone" label={labels.phoneLabel} error={errorText(errors.customerPhone)}>
                <input id="customerPhone" className="input" type="tel" autoComplete="tel" maxLength={24} value={draft.customerPhone} onChange={(e) => update({ customerPhone: e.target.value })} />
              </Field>
              <Field id="customerInstagram" label={labels.instagramLabel} hint={labels.instagramHint} error={errorText(errors.customerInstagram)}>
                <input id="customerInstagram" className="input" maxLength={40} value={draft.customerInstagram} onChange={(e) => update({ customerInstagram: e.target.value })} />
              </Field>
              <fieldset>
                <legend className="field-label mb-2">{labels.channelLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {(["instagram", "phone", ...(whatsappConfirmed ? (["whatsapp"] as const) : [])] as Channel[]).map((channel) => (
                    <button key={channel} type="button" className="choice !w-auto" aria-pressed={draft.channel === channel} onClick={() => update({ channel })}>
                      {labels.channels[channel]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field id="allergies" label={labels.allergiesLabel} hint={labels.allergiesHint} error={errorText(errors.allergies)}>
                <textarea id="allergies" className="input" rows={2} maxLength={400} value={draft.allergies} onChange={(e) => update({ allergies: e.target.value })} />
              </Field>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0" checked={draft.reminderOptIn} onChange={(e) => update({ reminderOptIn: e.target.checked })} />
                <span>{labels.reminderLabel}</span>
              </label>
              <div>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0" checked={draft.privacyAccepted} data-testid="privacy" onChange={(e) => update({ privacyAccepted: e.target.checked })} />
                  <span>{labels.privacyLabel}</span>
                </label>
                <p className="mt-1 ps-8 t-small">
                  <Link href={privacyHref} target="_blank">
                    {labels.privacyLink}
                  </Link>
                </p>
                {errors.privacyAccepted && <p className="error mt-1 ps-8" data-testid="error-privacy">{labels.errors.privacy}</p>}
              </div>
              {/* Hidden from people and from assistive technology. Only a bot fills this in. */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", height: 0, overflow: "hidden" }}>
                <label>
                  Website
                  <input ref={honeypot} type="text" tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
                </label>
              </div>
              {demo && <p data-testid="demo-note">{labels.demoNote}</p>}
            </>
          )}
        </div>

        {stepError && (
          <p className="error mt-5" role="alert" data-testid="step-error">
            {stepError}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          {draft.step > 0 && (
            <button type="button" className="btn btn-line" onClick={goBack}>
              {labels.back}
            </button>
          )}
          {draft.step < total - 1 ? (
            <button type="button" className="btn btn-primary" data-testid="next" onClick={goNext}>
              {labels.next}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" data-testid="submit" disabled={sending || !availability} onClick={() => void submit()}>
              {sending ? labels.sending : labels.submit}
            </button>
          )}
        </div>
      </div>

      <aside className="builder-aside min-w-0">
        <div data-testid="cake-drawing">
          <CakeDrawing
            key={`${format}-${size.tiers.join("-")}-${filling.id}-${format === "desserts" ? draft.guests : 0}`}
            tiers={size.tiers}
            tierHeight={size.tierHeight}
            desserts={format === "desserts" ? draft.guests : 0}
            sponge={filling.sponge}
            cream={filling.cream}
            accent={filling.accent}
            animate={touched}
            label={labels.sliceLabel.replace("{summary}", sizeSummary)}
            forkLabel={labels.forkLabel}
          />
        </div>
        <p className="mt-2 text-center" data-testid="size-summary">{draft.format ? sizeSummary : labels.forkLabel}</p>
        {format === "tiered" && draft.format && <p className="t-small text-center">{labels.tiersSummary.replace("{tiers}", String(size.tiers.length))}</p>}
        <p className="t-small mt-1 text-center" data-testid="price-line">
          {estimate ? labels.estimate.replace("{amount}", String(estimate)) : labels.priceOnConfirm}
        </p>

        <dl className="builder-summary t-small mt-5 grid gap-1 border-t border-current pt-3">
          <SummaryRow label={labels.summary.occasion} value={draft.occasion ? labels.occasions[draft.occasion] : ""} empty={labels.notChosen} />
          <SummaryRow label={labels.summary.format} value={draft.format ? labels.formats[draft.format].title : ""} empty={labels.notChosen} />
          <SummaryRow label={labels.summary.guests} value={String(draft.guests)} empty={labels.notChosen} />
          <SummaryRow label={labels.summary.filling} value={fillingLabel} empty={labels.notChosen} />
          {reference && <SummaryRow label={labels.summary.reference} value={`${reference.number}. ${reference.title}`} empty="" />}
          {draft.uploadId && <SummaryRow label={labels.summary.photo} value={labels.summary.photoYes} empty="" />}
          {draft.inscription && <SummaryRow label={labels.summary.inscription} value={draft.inscription} empty="" />}
          <SummaryRow label={labels.summary.date} value={draft.date} empty={labels.notChosen} />
          <SummaryRow label={labels.summary.fulfilment} value={draft.fulfilment === "delivery" ? labels.delivery : labels.pickup} empty="" />
          {draft.isGift && draft.recipientName && <SummaryRow label={labels.summary.gift} value={draft.recipientName} empty="" />}
        </dl>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-end">{value || <span className="opacity-70">{empty}</span>}</dd>
    </div>
  );
}

function OrderResult({
  result,
  labels,
  locale,
  instagramDirect,
  onAnother,
}: {
  result: { reference: string; token: string; demo: boolean; message: string };
  labels: Messages["order"];
  locale: Locale;
  instagramDirect: string;
  onAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const r = labels.result;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
    } catch {
      // Without clipboard access, select the text so the customer can copy it by hand.
      area.current?.select();
    }
  };

  return (
    <div className="on-sheet grid gap-5 p-[clamp(1rem,3vw,2.5rem)]" data-testid="order-result">
      <h2 ref={heading} tabIndex={-1} className="t-section outline-none" data-testid="result-title" data-reference={result.reference}>
        {(result.demo ? r.demoTitle : r.title).replace("{reference}", result.reference)}
      </h2>
      {result.demo && <p className="prose-col" data-testid="result-demo">{r.demoNote}</p>}
      <div>
        <h3 className="text-2xl">{r.nextTitle}</h3>
        <p className="prose-col mt-1">{r.nextText}</p>
      </div>
      <textarea ref={area} className="input max-w-2xl" rows={9} readOnly value={result.message} aria-label={r.nextTitle} data-testid="result-message" />
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {copied ? r.copied : r.copy}
        </button>
        <a href={instagramDirect} target="_blank" rel="noopener" className="btn btn-line" data-testid="open-instagram">
          {r.openInstagram}
        </a>
      </div>
      <p>
        <Link href={statusPath(locale, result.token)} data-testid="status-link">
          {r.statusLink}
        </Link>
      </p>
      <p>
        <button type="button" className="underline" onClick={onAnother}>
          {r.another}
        </button>
      </p>
    </div>
  );
}
