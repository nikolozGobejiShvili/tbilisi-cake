import type { Metadata } from "next";
import { StatusPage } from "@/components/pages/StatusPage";
import { messages } from "@/messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: messages.ka.meta.status.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <StatusPage locale="ka" token={(await params).token} />;
}
