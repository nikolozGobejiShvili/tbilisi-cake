import { FillingsPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ru", "fillings");

export default function Page() {
  return <FillingsPage locale="ru" />;
}
