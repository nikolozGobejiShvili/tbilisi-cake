import { AboutPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ka", "about");

export default function Page() {
  return <AboutPage locale="ka" />;
}
