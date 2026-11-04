import { DeliveryPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ka", "delivery");

export default function Page() {
  return <DeliveryPage locale="ka" />;
}
