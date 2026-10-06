import { spawn } from "node:child_process";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const origin = "http://127.0.0.1:4972",
  root = process.cwd(),
  portfolio = process.argv.includes("--portfolio");
const server = spawn(process.execPath, [path.join(root, "serve.mjs")], {
  env: { ...process.env, PORT: "4972" },
  stdio: "ignore",
});
let browser;
const captures = [];
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.querySelectorAll("main img,.hp-footer img"))
      image.loading = "eager";
    await Promise.all(
      Array.from(document.querySelectorAll("main img,.hp-footer img")).map(
        (i) => i.decode().catch(() => null),
      ),
    );
  });
  await page.waitForTimeout(250);
}
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : { channel: "chrome" }),
  });
  await fs.mkdir("output/heepzy/captures", { recursive: true });
  for (const [name, width, height] of [
    ["desktop", 1440, 1058],
    ["mobile", 390, 844],
    ["small", 320, 800],
    ["tablet", 768, 1024],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await page.goto(origin + "/demo/rava/", { waitUntil: "networkidle" });
    await ready(page);
    const home = `output/heepzy/captures/home-${name}.png`;
    await page.screenshot({ path: home, fullPage: true });
    captures.push({ file: home, route: "/demo/rava/", width, height });
    await page.screenshot({ path: `output/heepzy/captures/hero-${name}.png` });
    if (name === "desktop" || name === "mobile") {
      for (const [section, selector] of [
        ["lifestyle", ".hp-lifestyle"],
        ["catalog", "[data-home-catalog]"],
        ["featured", ".hp-featured-section"],
        ["reviews", ".hp-review-grid"],
        ["campaign", ".hp-campaign"],
        ["drops", ".hp-drops"],
        ["footer", ".hp-footer"],
      ])
        await page
          .locator(selector)
          .screenshot({
            path: `output/heepzy/captures/${section}-${name}.png`,
          });
      await page.evaluate(() => scrollTo(0, 0));
      if (portfolio) {
        await page.screenshot({
          path: `public/portfolio/rava-${name}.png`,
          ...(name === "mobile"
            ? { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 1500 } }
            : {}),
        });
        if (name === "desktop")
          await page.screenshot({
            path: "public/portfolio/rava-overview.png", fullPage: true,
            clip: { x: 0, y: 0, width: 1440, height: 1600 },
          });
      }
      await page.goto(origin + "/demo/rava/product/flux/", {
        waitUntil: "networkidle",
      });
      await ready(page);
      await page.screenshot({
        path: `output/heepzy/captures/product-${name}.png`,
        fullPage: true,
      });
      if (portfolio && name === "desktop")
        await page.screenshot({ path: "public/portfolio/rava-detail.png", fullPage: true, clip: { x: 0, y: 0, width: 1440, height: 1000 } });
      await page.locator("main [data-size]").selectOption("39");
      await page.locator("main [data-add]").click();
      await page.screenshot({
        path: `output/heepzy/captures/drawer-${name}.png`,
      });
      await page.keyboard.press("Escape");
      await page.goto(origin + "/demo/rava/cart/", {
        waitUntil: "networkidle",
      });
      await ready(page);
      await page.screenshot({
        path: `output/heepzy/captures/cart-${name}.png`,
        fullPage: true,
      });
      await page.goto(origin + "/demo/rava/checkout/", {
        waitUntil: "networkidle",
      });
      await ready(page);
      await page.screenshot({
        path: `output/heepzy/captures/checkout-${name}.png`,
        fullPage: true,
      });
    }
    await page.close();
  }
  await fs.writeFile(
    "output/heepzy/captures/manifest.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        source: "actual production build, Playwright Chrome",
        captures,
        portfolio,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ captures: captures.length, portfolio }));
} finally {
  await browser?.close();
  server.kill();
}

