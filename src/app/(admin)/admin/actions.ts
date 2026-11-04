"use server";

import { randomBytes } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { WORKS } from "@/config/works";
import { endSession, loginAllowed, loginSucceeded, passwordMatches, requireAdmin, startSession } from "@/lib/admin-auth";
import { hiddenWorks } from "@/lib/content";
import { isValidDay } from "@/lib/dates";
import { addStoredWork, removeStoredWork, setOrderStatus, setSetting, toggleBlockedDay, worksDir } from "@/lib/db";
import { CATEGORIES, LOCALES, STATUSES, type Category, type Locale, type OrderStatus } from "@/lib/types";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/upload";

const str = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);

/** Public pages are cached for a few minutes. This refreshes them right after an edit. */
function refreshSite() {
  revalidatePath("/", "layout");
}

export async function loginAction(form: FormData) {
  const key = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!loginAllowed(key)) redirect("/admin/login?error=throttled");
  if (!passwordMatches(String(form.get("password") ?? ""))) redirect("/admin/login?error=wrong");
  loginSucceeded(key);
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function setLangAction(form: FormData) {
  const lang = form.get("lang") === "ru" ? "ru" : "ka";
  (await cookies()).set("tc_admin_lang", lang, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 31536000 });
  revalidatePath("/admin", "layout");
}

export async function updateStatusAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as OrderStatus;
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return;
  setOrderStatus(id, status);
  revalidatePath("/admin", "layout");
}

export async function toggleDayAction(form: FormData) {
  await requireAdmin();
  const day = String(form.get("day"));
  if (isValidDay(day)) toggleBlockedDay(day);
  revalidatePath("/admin/calendar");
}

export async function saveCalendarSettingsAction(form: FormData) {
  await requireAdmin();
  const capacity = Number(form.get("capacity"));
  const lead = Number(form.get("lead"));
  if (Number.isInteger(capacity) && capacity >= 1 && capacity <= 100) setSetting("capacityPerDay", capacity);
  if (Number.isInteger(lead) && lead >= 0 && lead <= 90) setSetting("leadDays", lead);
  revalidatePath("/admin/calendar");
}

export async function saveFillingsAction(form: FormData) {
  await requireAdmin();
  const count = Math.min(Number(form.get("count")) || 0, 60);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    if (form.get(`remove_${i}`)) continue;
    const names = Object.fromEntries(LOCALES.map((l) => [l, str(form, `name_${l}_${i}`, 80)])) as Record<Locale, string>;
    if (!names.ka && !names.ru && !names.en) continue;
    list.push({
      id: str(form, `id_${i}`, 40) || `f-${randomBytes(4).toString("hex")}`,
      names,
      allergens: Object.fromEntries(LOCALES.map((l) => [l, str(form, `allergens_${l}_${i}`, 160)])),
    });
  }
  setSetting("fillings", list);
  refreshSite();
  revalidatePath("/admin/content");
}

export async function savePricesAction(form: FormData) {
  await requireAdmin();
  const amount = (key: string) => {
    const value = Number(form.get(key));
    return Number.isFinite(value) && value >= 0 && value <= 100000 ? value : 0;
  };
  setSetting("prices", { tieredPerKg: amount("tieredPerKg"), bentoEach: amount("bentoEach"), dessertsPerGuest: amount("dessertsPerGuest") });
  refreshSite();
  revalidatePath("/admin/content");
}

export async function saveFaqAction(form: FormData) {
  await requireAdmin();
  const count = Math.min(Number(form.get("count")) || 0, 40);
  const faq = Object.fromEntries(
    LOCALES.map((locale) => {
      const items = [];
      for (let i = 0; i < count; i += 1) {
        const q = str(form, `q_${locale}_${i}`, 200);
        const a = str(form, `a_${locale}_${i}`, 800);
        if (q && a) items.push({ q, a });
      }
      return [locale, items];
    }),
  );
  setSetting("faq", faq);
  refreshSite();
  revalidatePath("/admin/content");
}

export async function toggleWorkHiddenAction(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug", 80);
  const hidden = hiddenWorks();
  setSetting("hiddenWorks", hidden.includes(slug) ? hidden.filter((s) => s !== slug) : [...hidden, slug]);
  refreshSite();
  revalidatePath("/admin/content");
}

export async function addWorkAction(form: FormData) {
  await requireAdmin();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) redirect("/admin/content?error=photo");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImage(bytes)) redirect("/admin/content?error=photo");

  let encoded: Buffer;
  let width = 0;
  let height = 0;
  try {
    const result = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    encoded = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    redirect("/admin/content?error=photo");
  }

  const category = str(form, "category") as Category;
  const texts = Object.fromEntries(
    LOCALES.map((l) => [l, { title: str(form, `title_${l}`, 80), text: str(form, `text_${l}`, 240) }]),
  ) as Record<Locale, { title: string; text: string }>;
  if (!CATEGORIES.includes(category) || !texts.ka.title) redirect("/admin/content?error=photo");

  const slug = `w-${randomBytes(4).toString("hex")}`;
  writeFileSync(join(worksDir(), `${slug}.webp`), encoded);
  addStoredWork({ slug, category, width, height, texts, minNumber: Math.max(...WORKS.map((w) => w.number)) + 1 });
  refreshSite();
  revalidatePath("/admin/content");
}

export async function removeWorkAction(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug", 80);
  if (!/^w-[a-f0-9]+$/.test(slug)) return;
  removeStoredWork(slug);
  const path = join(worksDir(), `${slug}.webp`);
  if (existsSync(path)) rmSync(path);
  refreshSite();
  revalidatePath("/admin/content");
}
