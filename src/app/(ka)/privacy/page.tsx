import { PrivacyPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ka", "privacy");

export default function Page() {
  return <PrivacyPage locale="ka" />;
}
