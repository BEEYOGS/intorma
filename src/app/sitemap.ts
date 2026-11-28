import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://intorma-psi.vercel.app";

const ROUTES = [
  "",
  "/katalog",
  "/kalkulator",
  "/order",
  "/lacak",
  "/contact",
  "/privacy",
  "/terms",
  "/faq",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/order" ? 0.9 : 0.7,
  }));
}
