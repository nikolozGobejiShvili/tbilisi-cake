import { AdminShell } from "@/components/admin/AdminShell";
import { Photo } from "@/components/Photo";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLang } from "@/lib/admin-lang";
import { confirmedPriceList, getWorks, hiddenWorks, storedFaq, storedFillings } from "@/lib/content";
import { CATEGORIES, LOCALES } from "@/lib/types";
import { messages } from "@/messages";
import { addWorkAction, removeWorkAction, saveFaqAction, saveFillingsAction, savePricesAction, toggleWorkHiddenAction } from "../actions";

const SPARE_ROWS = 2;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const lang = await adminLang();
  const m = messages[lang];
  const t = m.admin.content;
  const { error } = await searchParams;

  const fillings = storedFillings();
  const fillingRows = [...fillings, ...Array.from({ length: SPARE_ROWS }, () => null)];
  const prices = confirmedPriceList();
  const faq = storedFaq();
  const faqCount = Math.max(...LOCALES.map((l) => (faq?.[l] ?? m.faq.items).length)) + SPARE_ROWS;
  const hidden = hiddenWorks();
  const works = getWorks(lang, { includeHidden: true });

  return (
    <AdminShell lang={lang}>
      <h1 className="t-section">{t.title}</h1>
      <p className="mt-2">{t.hint}</p>

      <section className="mt-8">
        <h2 className="text-3xl">{t.prices}</h2>
        <form action={savePricesAction} className="mt-3 flex flex-wrap items-end gap-3">
          {(
            [
              ["tieredPerKg", t.priceTiered, prices?.tieredPerKg],
              ["bentoEach", t.priceBento, prices?.bentoEach],
              ["dessertsPerGuest", t.priceDesserts, prices?.dessertsPerGuest],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name} className="field">
              <label htmlFor={name}>{label}</label>
              <input id={name} name={name} type="number" min={0} step="any" defaultValue={value ?? ""} className="input !w-40" />
            </div>
          ))}
          <button type="submit" className="btn btn-primary">{t.save}</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-3xl">{t.fillings}</h2>
        <form action={saveFillingsAction} className="mt-3 grid gap-4">
          <input type="hidden" name="count" value={fillingRows.length} />
          {fillingRows.map((filling, i) => (
            <fieldset key={filling?.id ?? `new-${i}`} className="grid gap-2 border border-current/30 p-3 md:grid-cols-3">
              <input type="hidden" name={`id_${i}`} value={filling?.id ?? ""} />
              {LOCALES.map((l) => (
                <div key={l} className="grid gap-2">
                  <div className="field">
                    <label htmlFor={`name_${l}_${i}`}>{t.fillingName}: {t.languages[l]}</label>
                    <input id={`name_${l}_${i}`} name={`name_${l}_${i}`} defaultValue={filling?.names[l] ?? ""} className="input" maxLength={80} />
                  </div>
                  <div className="field">
                    <label htmlFor={`allergens_${l}_${i}`}>{t.fillingAllergens}: {t.languages[l]}</label>
                    <input id={`allergens_${l}_${i}`} name={`allergens_${l}_${i}`} defaultValue={filling?.allergens[l] ?? ""} className="input" maxLength={160} />
                  </div>
                </div>
              ))}
              {filling && (
                <label className="flex items-center gap-2 md:col-span-3">
                  <input type="checkbox" name={`remove_${i}`} className="h-5 w-5" /> {t.remove}
                </label>
              )}
            </fieldset>
          ))}
          <button type="submit" className="btn btn-primary w-fit">{t.save}</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-3xl">{t.works}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" data-testid="admin-works">
          {works.map((work) => (
            <li key={work.slug} className={hidden.includes(work.slug) ? "opacity-50" : ""}>
              <span className="block aspect-square overflow-hidden">
                <Photo src={work.src} width={work.width} height={work.height} alt="" tile sizes="200px" />
              </span>
              <p className="t-small mt-1">{work.number}. {work.title}</p>
              {hidden.includes(work.slug) && <p className="t-small">{t.hidden}</p>}
              <form action={toggleWorkHiddenAction}>
                <input type="hidden" name="slug" value={work.slug} />
                <button type="submit" className="underline" data-testid={`toggle-${work.slug}`}>{hidden.includes(work.slug) ? t.show : t.hide}</button>
              </form>
              {work.slug.startsWith("w-") && (
                <form action={removeWorkAction}>
                  <input type="hidden" name="slug" value={work.slug} />
                  <button type="submit" className="underline">{t.remove}</button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-2xl">{t.addWork}</h3>
        {error === "photo" && <p className="error mt-1">{t.photoError}</p>}
        <form action={addWorkAction} className="mt-2 grid max-w-4xl gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            {LOCALES.map((l) => (
              <div key={l} className="grid gap-2">
                <div className="field">
                  <label htmlFor={`title_${l}`}>{t.workTitle}: {t.languages[l]}</label>
                  <input id={`title_${l}`} name={`title_${l}`} className="input" maxLength={80} required={l === "ka"} />
                </div>
                <div className="field">
                  <label htmlFor={`text_${l}`}>{t.workText}: {t.languages[l]}</label>
                  <textarea id={`text_${l}`} name={`text_${l}`} className="input" rows={2} maxLength={240} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="field">
              <label htmlFor="category">{t.workCategory}</label>
              <select id="category" name="category" className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{m.categories[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="photo">{t.workPhoto}</label>
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-fit">{t.add}</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-3xl">{t.faq}</h2>
        <form action={saveFaqAction} className="mt-3 grid gap-4">
          <input type="hidden" name="count" value={faqCount} />
          {Array.from({ length: faqCount }, (_, i) => (
            <fieldset key={i} className="grid gap-2 border border-current/30 p-3 md:grid-cols-3">
              {LOCALES.map((l) => {
                const item = (faq?.[l] ?? messages[l].faq.items)[i];
                return (
                  <div key={l} className="grid gap-2">
                    <div className="field">
                      <label htmlFor={`q_${l}_${i}`}>{t.faqQuestion}: {t.languages[l]}</label>
                      <input id={`q_${l}_${i}`} name={`q_${l}_${i}`} defaultValue={item?.q ?? ""} className="input" maxLength={200} />
                    </div>
                    <div className="field">
                      <label htmlFor={`a_${l}_${i}`}>{t.faqAnswer}: {t.languages[l]}</label>
                      <textarea id={`a_${l}_${i}`} name={`a_${l}_${i}`} defaultValue={item?.a ?? ""} className="input" rows={3} maxLength={800} />
                    </div>
                  </div>
                );
              })}
            </fieldset>
          ))}
          <button type="submit" className="btn btn-primary w-fit">{t.save}</button>
        </form>
      </section>
    </AdminShell>
  );
}
