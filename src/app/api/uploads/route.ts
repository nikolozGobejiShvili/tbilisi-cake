import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { recordUpload, uploadsDir } from "@/lib/db";
import { clientKey, isSameOrigin } from "@/lib/http";
import { RateLimiter } from "@/lib/ratelimit";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/upload";

export const dynamic = "force-dynamic";

const limiter = new RateLimiter(Number(process.env.UPLOAD_RATE_LIMIT) || 20, 10 * 60 * 1000);

/**
 * A customer's reference photo. It is checked by its real bytes and re-encoded, which removes
 * location data and anything hidden in the file. It is stored outside public/ and only the
 * logged-in panel can read it.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "origin" }, { status: 403 });
  if (!limiter.allow(clientKey(request))) return Response.json({ error: "rate" }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return Response.json({ error: "size" }, { status: 413 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "form" }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "file" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "size" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImage(bytes)) return Response.json({ error: "type" }, { status: 415 });

  let encoded: Buffer;
  try {
    encoded = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    return Response.json({ error: "type" }, { status: 415 });
  }

  const id = recordUpload();
  writeFileSync(join(uploadsDir(), `${id}.webp`), encoded);
  return Response.json({ id }, { status: 201 });
}
