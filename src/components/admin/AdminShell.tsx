import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction, setLangAction } from "@/app/(admin)/admin/actions";
import { Monogram } from "@/components/Monogram";
import { business } from "@/config/business";
import type { AdminLang } from "@/lib/admin-lang";
import { messages } from "@/messages";

export function AdminShell({ lang, children }: { lang: AdminLang; children: ReactNode }) {
  const t = messages[lang].admin;
  return (
    <div className="wrap py-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-current pb-3">
        <Link href="/admin" aria-label={t.title} className="no-underline">
          <Monogram className="h-10 w-auto" />
        </Link>
        <nav aria-label={t.title}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li><Link href="/admin">{t.nav.orders}</Link></li>
            <li><Link href="/admin/calendar">{t.nav.calendar}</Link></li>
            <li><Link href="/admin/occasions">{t.nav.occasions}</Link></li>
            <li><Link href="/admin/content">{t.nav.content}</Link></li>
            <li><a href={lang === "ru" ? "/ru" : "/"} target="_blank" rel="noopener">{t.nav.site}</a></li>
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <form action={setLangAction} className="flex gap-1">
            <button type="submit" name="lang" value="ka" aria-pressed={lang === "ka"} className={`px-2 py-1 ${lang === "ka" ? "underline" : ""}`}>ქართული</button>
            <button type="submit" name="lang" value="ru" aria-pressed={lang === "ru"} className={`px-2 py-1 ${lang === "ru" ? "underline" : ""}`}>Русский</button>
          </form>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-line !min-h-10 !py-1">{t.nav.logout}</button>
          </form>
        </div>
      </header>
      {business.showConceptLabel && <p className="t-small mt-3" data-testid="admin-demo-note">{t.demoNote}</p>}
      <main className="mt-6">{children}</main>
    </div>
  );
}
