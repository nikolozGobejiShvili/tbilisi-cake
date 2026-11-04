import type { ReactNode } from "react";
import "../globals.css";
import { StageScript } from "@/components/StageScript";
import { SiteShell } from "@/components/SiteShell";
import { fontVariables } from "@/lib/fonts";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={fontVariables} suppressHydrationWarning>
      <head>
        <StageScript />
      </head>
      <body>
        <SiteShell locale="ru">{children}</SiteShell>
      </body>
    </html>
  );
}
