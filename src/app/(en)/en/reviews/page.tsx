import { ReviewsPage } from "@/components/pages/InfoPages";
import { pageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;
export const metadata = pageMetadata("en", "reviews");

export default function Page() {
  return <ReviewsPage locale="en" />;
}
