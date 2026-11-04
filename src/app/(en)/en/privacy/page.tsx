import { PrivacyPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("en", "privacy");

export default function Page() {
  return <PrivacyPage locale="en" />;
}
