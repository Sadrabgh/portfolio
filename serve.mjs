// Local preview of the included production build. No dependencies required.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createReadStream } from "node:fs";
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
  ".mp4": "video/mp4",
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
      if (path.extname(file) === ".mp4") {
        const { size } = await fs.stat(file);
        const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
        let start = 0;
        let end = size - 1;
        if (range) {
          start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
          end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
            res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
            return;
          }
        }
        res.writeHead(range ? 206 : 200, {
          "Content-Type": "video/mp4", "Content-Length": end - start + 1,
          "Accept-Ranges": "bytes", "Cache-Control": "no-store",
          ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
        });
        if (req.method === "HEAD") res.end();
        else createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
        return;
      }
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
