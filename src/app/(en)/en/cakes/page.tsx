import { CakesPage } from "@/components/pages/CakesPage";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("en", "cakes");

export default function Page() {
  return <CakesPage locale="en" />;
}
