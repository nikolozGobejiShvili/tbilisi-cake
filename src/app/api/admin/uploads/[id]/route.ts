import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminEnabled()) return new Response(null, { status: 404 });
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response(null, { status: 404 });
  const path = join(uploadsDir(), `${id}.webp`);
  if (!existsSync(path)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(readFileSync(path)), {
    headers: { "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}
