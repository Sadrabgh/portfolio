import fs from "node:fs/promises";
import sharp from "sharp";
import { server, launch, go } from "./v10-common.mjs";
async function ready(p) {
  await p
    .locator("img")
    .evaluateAll((ims) => ims.forEach((i) => (i.loading = "eager")));
  await p.waitForFunction(() =>
    Array.from(document.images)
      .filter((i) => i.getAttribute("src"))
      .every((i) => i.complete && i.naturalWidth),
  );
}
let browser;
try {
  browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1058 } });
  await p.addInitScript(() => {
    localStorage.setItem("demo-motion", "reduce");
    localStorage.setItem("demo-theme", "light");
    localStorage.setItem("portfolio-theme", "light");
    localStorage.setItem("portfolio-motion", "reduce");
  });
  await fs.mkdir("captures/v10", { recursive: true });
  const ids = { atelier: "form", rift: "luma", velo: "orbit", neva: "medical" };
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: width === 390 ? 844 : 1058 });
    for (const brand of Object.keys(ids)) {
      await go(p, `/demo/${brand}/`);
      await p.evaluate(() => document.fonts.ready);
      await ready(p);
      await p.screenshot({
        path: `captures/v10/${brand}-${width}-light.png`,
        fullPage: true,
      });
      await sharp(await p.screenshot({ type: "png" }))
        .webp({ quality: 90 })
        .toFile(`public/portfolio/${ids[brand]}-${width === 390 ? "mobile" : "desktop"}.webp`);
      await p.locator("[data-theme-toggle]").click();
      await p.waitForTimeout(400);
      await p.screenshot({
        path: `captures/v10/${brand}-${width}-dark.png`,
        fullPage: true,
      });
      console.log("visual", brand, width);
    }
  }
  await p.setViewportSize({ width: 1440, height: 1058 });
  for (const [name, route] of [
    ["atelier-project", "/demo/atelier/projects/pavilion/"],
    ["atelier-volume", "/demo/atelier/projects/atrium/"],
    ["rift-product", "/demo/rift/products/shell/"],
    ["rift-catalog", "/demo/rift/catalog/"],
    ["neva-profile", "/demo/neva/doctors/skin/"],
    ["neva-book", "/demo/neva/book/?doctor=general"],
    ["velo-detail", "/demo/velo/design/"],
  ]) {
    await go(p, route);
    await ready(p);
    await p.screenshot({ path: `captures/v10/${name}.png`, fullPage: true });
    console.log("detail", name);
  }
  if (!process.env.V10_DEMOS_ONLY) {
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: width === 390 ? 844 : 1058 });
    await go(p, "/");
    await ready(p);
    await p.screenshot({ path: `captures/v10/main-${width}.png` });
    await p.locator("[data-project-gallery]").scrollIntoViewIfNeeded();
    await p.screenshot({
      path: `captures/v10/main-gallery-${width}-light.png`,
    });
    await p.locator(".theme-toggle").click();
    await p.screenshot({ path: `captures/v10/main-gallery-${width}-dark.png` });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  await go(p, "/");
  await ready(p);
  await p.screenshot({ path: "public/art/og.png" });
  }
} finally {
  await browser?.close();
  server.close();
}
