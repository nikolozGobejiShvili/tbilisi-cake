import { FillingsPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("en", "fillings");

export default function Page() {
  return <FillingsPage locale="en" />;
}
