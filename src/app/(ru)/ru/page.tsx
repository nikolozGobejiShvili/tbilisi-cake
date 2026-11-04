import { HomePage } from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("ru", "home");

export default function Page() {
  return <HomePage locale="ru" />;
}
