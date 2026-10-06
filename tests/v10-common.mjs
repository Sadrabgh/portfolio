import path from "node:path";
import { createPreviewServer } from "../serve.mjs";
import { chromium } from "playwright";
export const dist = path.resolve("dist");
export const server = createPreviewServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
export const origin = `http://127.0.0.1:${server.address().port}`;
export async function launch() {
  let error;
  for (let i = 0; i < 3; i++) {
    try {
      return await chromium.launch({
        headless: true,
        executablePath: process.env.BROWSER_EXECUTABLE || undefined,
        args: process.env.BROWSER_ARGS
          ? JSON.parse(process.env.BROWSER_ARGS)
          : [],
      });
    } catch (e) {
      error = e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw error;
}
export const go = (p, route) =>
  p.goto(route.startsWith("http") ? route : origin + route, {
    waitUntil: "networkidle",
  });
