import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { adminLang } from "@/lib/admin-lang";

export const metadata: Metadata = {
  title: "Tbilisi Cake",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={await adminLang()} className={fontVariables}>
      <body className="on-sheet">{children}</body>
    </html>
  );
}
