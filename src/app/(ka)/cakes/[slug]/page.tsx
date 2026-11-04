import { CakeSlugPage, cakeMetadata, cakeParams } from "@/components/pages/CakeSlugPage";

export const revalidate = 300;
export const generateStaticParams = cakeParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return cakeMetadata("ka", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <CakeSlugPage locale="ka" slug={(await params).slug} />;
}
