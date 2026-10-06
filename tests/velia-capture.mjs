import fs from "node:fs/promises";
import sharp from "sharp";
import { server, origin, launch } from "./v10-common.mjs";
const out = "output/playwright/velia";
await fs.mkdir(out, { recursive: true });
const browser = await launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1058 },
  });
  await context.addInitScript(() =>
    sessionStorage.setItem("velia-demo-account", "open"),
  );
  const p = await context.newPage();
  for (const [name, route] of [
    ["home", ""],
    ["shop", "shop/"],
    ["product", "products/facial-cleanser/"],
    ["collections", "collections/"],
    ["account", "account/"],
    ["contact", "contact/"],
    ["journal", "journal/"],
  ]) {
    await p.goto(origin + "/demo/velia/" + route, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(650);
    await p.screenshot({ path: `${out}/${name}-desktop.png` });
  }
  await p.goto(origin + "/demo/velia/", { waitUntil: "networkidle" });
  await p.setViewportSize({ width: 1440, height: 1600 });
  await p.screenshot({ path: `${out}/home-overview.png` });
  await p.setViewportSize({ width: 390, height: 844 });
  for (const [name, route] of [
    ["home", ""],
    ["shop", "shop/"],
    ["product", "products/facial-cleanser/"],
    ["account", "account/"],
    ["contact", "contact/"],
  ]) {
    await p.goto(origin + "/demo/velia/" + route, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${name}-mobile.png` });
  }
  await p.goto(origin + "/demo/velia/", { waitUntil: "networkidle" });
  await p.setViewportSize({ width: 390, height: 1500 });
  await p.screenshot({ path: `${out}/home-mobile-tall.png` });
  if (process.argv.includes("--portfolio")) {
    for (const [file, source] of [
      ["velia-desktop", "home-desktop"],
      ["velia-overview", "home-overview"],
      ["velia-mobile", "home-mobile-tall"],
      ["velia-detail", "product-desktop"],
    ])
      await sharp(`${out}/${source}.png`)
        .webp({ quality: 90 })
        .toFile(`public/portfolio/${file}.webp`);
  }
  console.log("Captured desktop, mobile and portfolio previews.");
} finally {
  await browser.close();
  server.close();
}
