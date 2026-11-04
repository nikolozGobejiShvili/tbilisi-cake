import { FaqPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("en", "faq");

export default function Page() {
  return <FaqPage locale="en" />;
}
