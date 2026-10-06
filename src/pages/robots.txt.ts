import type { APIRoute } from "astro";
import { url } from "../config";
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\nAllow: /\n${site && !site.hostname.endsWith(".invalid") ? `Sitemap: ${new URL(url("sitemap.xml"), site)}\n` : ""}`,
    { headers: { "Content-Type": "text/plain" } },
  );
