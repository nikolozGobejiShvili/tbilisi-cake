import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { pagePath } from "@/lib/routes";
import { LOCALES } from "@/lib/types";
import { messages } from "@/messages";

export const metadata: Metadata = {
  title: "404 | Tbilisi Cake",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ka" className={fontVariables}>
      <body>
        <main className="wrap grid min-h-svh content-center gap-6 py-10">
          <p className="display t-hero">404</p>
          <ul className="grid gap-4">
            {LOCALES.map((locale) => (
              <li key={locale} lang={locale}>
                <h1 className="t-section">{messages[locale].notFound.title}</h1>
                <a href={pagePath(locale, "home")}>{messages[locale].notFound.backHome}</a>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
