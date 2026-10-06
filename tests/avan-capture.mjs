import fs from "node:fs/promises";
import sharp from "sharp";
import { server, launch, go } from "./v10-common.mjs";
const directory = "output/avan/verification/final-captures";
await fs.mkdir(directory, { recursive: true });
let browser;
const captures = [];
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.querySelectorAll("main img"))
      image.loading = "eager";
    await Promise.all(
      [...document.querySelectorAll("main img")].map((image) => image.decode()),
    );
  });
}
try {
  browser = await launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1058 },
    reducedMotion: "reduce",
  });
  for (const [name, width, height, route] of [
    ["desktop", 1440, 1058, ""],
    ["overview", 1440, 1600, ""],
    ["mobile", 390, 1500, ""],
    ["detail", 1440, 1000, "product/h01/"],
  ]) {
    await page.setViewportSize({ width, height });
    await go(page, "/demo/avan/" + route);
    await ready(page);
    const screenshot = await page.screenshot({
      path: `${directory}/${name}.png`,
    });
    await sharp(screenshot)
      .webp({ quality: 90 })
      .toFile(`public/portfolio/avan-${name}.webp`);
    captures.push({
      name,
      width,
      height,
      route: "/demo/avan/" + route,
      path: `public/portfolio/avan-${name}.webp`,
    });
    if (name === "desktop" || name === "mobile")
      await page.screenshot({
        path: `${directory}/home-${name}-full.png`,
        fullPage: true,
      });
  }
  for (const [name, route, width, height] of [
    ["shop-desktop", "shop/", 1440, 1058],
    ["product-mobile", "product/h01/", 390, 844],
    ["faq-mobile", "help/faq/", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await go(page, "/demo/avan/" + route);
    await ready(page);
    await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
  }
} finally {
  await browser?.close();
  server.close();
}
await fs.writeFile(
  `${directory}/manifest.json`,
  JSON.stringify(
    {
      date: new Date().toISOString(),
      purpose:
        "Actual interface captures for AVAN portfolio integration, not fabricated mockups",
      captures,
    },
    null,
    2,
  ),
);
console.log("AVAN desktop, mobile, overview and detail captures created");
