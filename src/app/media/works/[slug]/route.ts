import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { worksDir } from "@/lib/db";

/** Photos of cakes the owner adds in the panel. These are public, unlike customers' reference photos. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response(null, { status: 404 });
  const path = join(worksDir(), `${slug}.webp`);
  if (!existsSync(path)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(readFileSync(path)), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" },
  });
}
