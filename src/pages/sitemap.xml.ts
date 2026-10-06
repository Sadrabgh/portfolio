import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { url } from "../config";
export const GET: APIRoute = async ({ site }) => {
  const paths = [
    "",
    "work/",
    "about/",
    "services/",
    "contact/",
    "privacy/",
    ...(await getCollection("projects")).map((p) => `work/${p.id}/`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site && !site.hostname.endsWith(".invalid") ? paths.map((path) => `<url><loc>${new URL(url(path), site)}</loc></url>`).join("") : ""}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
