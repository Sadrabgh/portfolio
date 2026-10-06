import fs from "node:fs/promises";
import path from "node:path";
import { server, origin, launch } from "./v10-common.mjs";
const stage = process.argv[2] || "after";
if (!["before", "after"].includes(stage))
  throw new Error("Use before or after");
const out = `output/playwright/velia-motion/${stage}`;
await fs.mkdir(out, { recursive: true });
const browser = await launch();
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
      recordVideo: { dir: out, size: viewport },
    });
    const page = await context.newPage();
    const video = page.video();
    const pause = () => page.waitForTimeout(600);
    const go = (route) =>
      page.goto(origin + "/demo/velia/" + route, { waitUntil: "networkidle" });
    await go("");
    await pause();
    if (name === "desktop") {
      const r = await page.locator("[data-skin-tilt]").boundingBox();
      await page.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.35, {
        steps: 12,
      });
      await pause();
      await page.mouse.move(1100, 700, { steps: 10 });
      await pause();
      await page.locator("[data-mega] summary").click();
      await pause();
      await page.keyboard.press("Escape");
      await pause();
    }
    await go("shop/");
    await page
      .locator('[data-skin-card="facial-cleanser"] .skin-card-image')
      .scrollIntoViewIfNeeded();
    if (name === "desktop") {
      await page
        .locator('[data-skin-card="facial-cleanser"] .skin-card-image')
        .hover();
      await pause();
    }
    await page.screenshot({ path: `${out}/${name}-catalog.png` });
    await page.locator('[data-skin-category="body"]').click();
    await pause();
    await page.locator('[data-skin-category="all"]').click();
    await pause();
    await page
      .locator('[data-skin-card="facial-cleanser"] .skin-card-image')
      .click();
    await page.waitForLoadState("networkidle");
    await pause();
    await page.locator("[data-gallery-source]").last().click();
    await pause();
    await page.locator("[data-gallery-source]").first().click();
    await pause();
    await page.locator('[data-product-tab="use"]').click();
    await pause();
    await page.locator('[data-product-tab="description"]').click();
    await pause();
    if (name === "mobile") {
      await page.locator(".skin-related").scrollIntoViewIfNeeded();
      await pause();
      await page
        .locator("[data-mobile-purchase]")
        .screenshot({ path: `${out}/mobile-purchase.png` });
    }
    await page.locator("[data-bag-open]").first().click();
    await pause();
    await page.keyboard.press("Escape");
    await pause();
    await page.locator(".skin-product-buy-row [data-add-product]").click();
    await page.locator("[data-bag-open]").first().click();
    await pause();
    await page.locator("[data-bag-dialog] [data-line-plus]").click();
    await pause();
    await page.locator("[data-bag-dialog] [data-remove]").click();
    await pause();
    await page.locator("[data-bag-dialog] [data-undo]").click();
    await pause();
    await page.screenshot({ path: `${out}/${name}-cart.png` });
    await page.keyboard.press("Escape");
    await pause();
    await go("checkout/");
    for (const [field, value] of [
      ["name", "کاربر نمونه"],
      ["phone", "09123456789"],
      ["city", "تهران"],
      ["postal", "1234567890"],
      ["address", "نشانی آزمایشی، کوچهٔ نمونه، پلاک ۱۲"],
    ])
      await page.locator(`[name="${field}"]`).fill(value);
    await page.locator("[data-checkout-next]").click();
    await pause();
    await page.locator("[data-checkout-back]").click();
    await pause();
    await page.locator("[data-checkout-next]").click();
    await pause();
    await page.locator("[data-checkout-confirm]").click();
    await pause();
    await page.screenshot({ path: `${out}/${name}-receipt.png` });
    await page.waitForTimeout(800);
    await context.close();
    await fs.rename(await video.path(), path.join(out, `${name}.webm`));
  }
  console.log(`Recorded ${stage} desktop/mobile motion samples.`);
} finally {
  await browser.close();
  server.close();
}
