import "server-only";
import { cookies } from "next/headers";

export type AdminLang = "ka" | "ru";

export async function adminLang(): Promise<AdminLang> {
  return (await cookies()).get("tc_admin_lang")?.value === "ru" ? "ru" : "ka";
}
