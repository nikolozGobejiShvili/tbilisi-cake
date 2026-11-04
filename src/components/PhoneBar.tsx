"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pagePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

/** The order button on phones. It steps aside on the order pages, which have their own actions. */
export function PhoneBar({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  if (pathname.startsWith(pagePath(locale, "order"))) return null;
  return (
    <div className="phone-bar">
      <Link href={pagePath(locale, "order")} className="btn btn-primary w-full">
        {label}
      </Link>
    </div>
  );
}
