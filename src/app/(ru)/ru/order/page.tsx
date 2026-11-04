import { OrderPage } from "@/components/pages/OrderPage";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata("ru", "order");

export default async function Page({ searchParams }: { searchParams: Promise<{ like?: string }> }) {
  const { like } = await searchParams;
  return <OrderPage locale="ru" like={like ?? null} />;
}
