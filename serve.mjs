// Local preview of the included production build. No dependencies required.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};
export const createPreviewServer = () =>
  http.createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if ((await fs.stat(file)).isDirectory())
        file = path.join(file, "index.html");
      const original = await fs.readFile(file);
      const compressible = /\.(html|js|css|svg|xml|txt|json)$/.test(file);
      const gzip =
        compressible &&
        String(req.headers["accept-encoding"] || "")
          .split(",")
          .some((value) =>
            /^gzip(?:\s*;\s*q=(?!0(?:\.0*)?\s*$)[0-9.]+)?\s*$/i.test(
              value.trim(),
            ),
          );
      const content = gzip ? gzipSync(original) : original;
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Content-Length": content.length,
        "Cache-Control": "no-store",
        ...(compressible ? { Vary: "Accept-Encoding" } : {}),
        ...(gzip ? { "Content-Encoding": "gzip" } : {}),
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      const content = await fs
        .readFile(path.join(root, "404.html"))
        .catch(() => Buffer.from("Build the site first: npm run build"));
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : content);
    }
  });
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createPreviewServer();
  server.listen(port, "127.0.0.1", () =>
    console.log(`Portfolio preview: http://localhost:${port}\nCtrl+C to stop.`),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
