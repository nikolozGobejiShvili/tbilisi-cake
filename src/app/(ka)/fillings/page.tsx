import { FillingsPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ka", "fillings");

export default function Page() {
  return <FillingsPage locale="ka" />;
}
