import { PricesPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ka", "prices");

export default function Page() {
  return <PricesPage locale="ka" />;
}
