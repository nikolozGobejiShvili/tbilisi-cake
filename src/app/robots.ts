import type { MetadataRoute } from "next";
import { business } from "@/config/business";

/** A concept stays out of search engines entirely. The panel and order links never belong there. */
export default function robots(): MetadataRoute.Robots {
  if (business.showConceptLabel) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/order/status", "/ru/order/status", "/en/order/status"] } };
}
