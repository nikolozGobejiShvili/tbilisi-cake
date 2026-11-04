import { OrderPage } from "@/components/pages/OrderPage";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata("en", "order");

export default async function Page({ searchParams }: { searchParams: Promise<{ like?: string }> }) {
  const { like } = await searchParams;
  return <OrderPage locale="en" like={like ?? null} />;
}
