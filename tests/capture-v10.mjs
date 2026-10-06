import fs from "node:fs/promises";
import { server, launch, go } from "./v10-common.mjs";
let browser;
try {
  browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await p.addInitScript(() => {
    localStorage.setItem("demo-motion", "reduce");
    localStorage.setItem("demo-theme", "light");
  });
  await fs.mkdir("captures/v10", { recursive: true });
  for (const brand of ["atelier", "rift", "velo", "neva"]) {
    await go(p, `/demo/${brand}/`);
    await p.screenshot({ path: `captures/v10/${brand}-desktop.png` });
    console.log("captured", brand);
  }
  await go(p, "/demo/velo/");
  await p.waitForSelector("[data-study][data-ready=true]");
  await p.evaluate(() => {
    document.querySelector(".velo-configurator").style.display = "block";
    document.querySelector(".velo-stage").style.position = "static";
    document.querySelector("[data-model-viewport]").style.height = "800px";
    document.querySelector("[data-model-viewport]").style.minHeight = "800px";
    document.querySelector(".velo-stage").style.width = "1200px";
    document
      .querySelectorAll(".model-hotspot,.model-badge,.model-status")
      .forEach((el) => (el.style.visibility = "hidden"));
  });
  await p.waitForTimeout(300);
  for (const model of ["city", "step", "tour"]) {
    await p.locator(`[data-velo-model=${model}]`).click();
    for (const color of ["cyan", "ink", "chalk"]) {
      await p.locator(`[data-velo-color=${color}]`).click();
      await p.locator("[data-reset]").click();
      await p.waitForTimeout(150);
      const data = await p
        .locator("canvas")
        .evaluate((c) => c.toDataURL("image/webp",0.94));
      await fs.writeFile(
        `public/art/v10/velo-${model}-${color}.webp`,
        Buffer.from(data.split(",")[1], "base64"),
      );
      console.log("rendered", model, color);
    }
  }
} finally {
  await browser?.close();
  server.close();
}
