import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, launch, go } from "./v10-common.mjs";

const results = [],
  errors = [];
let browser;
async function run(name, task) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on("pageerror", (error) =>
    errors.push({ scenario: name, message: error.message }),
  );
  try {
    await task(page);
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({ name, status: "failed", message: error.message });
  } finally {
    await context.close();
  }
}
try {
  browser = await launch();
  await run("700ms reveal and live reduced-motion fallback", async (page) => {
    await go(page, "/demo/avan/");
    assert.equal(await page.locator("[data-marketing-reveal]").count(), 3);
    const target = page.locator(".av-reveal-pending").first();
    assert(await target.count(), "offscreen marketing section is observed");
    await target.evaluate((node) => {
      window.__revealTarget = node;
      node.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await page.waitForFunction(() =>
      window.__revealTarget
        .getAnimations()
        .some((a) => a.effect.getTiming().duration === 700),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        !document.querySelector(".av-reveal-pending") &&
        !window.__revealTarget.getAnimations().length,
    );
    assert.equal(await page.locator(".av-reveal-pending").count(), 0);
    assert.equal(
      await page.evaluate(() => window.__revealTarget.getAnimations().length),
      0,
    );
  });
  await run("Catalog filtering, saved models and comparison", async (page) => {
    await go(page, "/demo/avan/shop/");
    assert.equal(
      await page.locator("[data-catalog-results] [data-product-card]").count(),
      10,
    );
    await page.locator("#search").fill("H۰۱");
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-catalog-results] [data-product-card]")
          .length === 1,
    );
    assert.equal(
      await page
        .locator("[data-catalog-results] [data-product-card]")
        .getAttribute("data-product-card"),
      "h01",
    );
    await page.locator("[data-catalog-results] [data-save-model=h01]").click();
    await go(page, "/demo/avan/wishlist/");
    assert.equal(
      await page
        .locator("[data-wishlist-content] [data-product-card=h01]")
        .count(),
      1,
    );
    await go(page, "/demo/avan/shop/?category=headphones");
    await page
      .locator("[data-catalog-results] [data-compare-model=h01]")
      .click();
    await page
      .locator("[data-catalog-results] [data-compare-model=h02]")
      .click();
    await go(page, "/demo/avan/compare/");
    assert(
      await page.locator("main").getByText("AVAN H01", { exact: true }).count(),
    );
    assert(
      await page.locator("main").getByText("AVAN H02", { exact: true }).count(),
    );
  });
  await run("Product color, cart and complete guest order", async (page) => {
    await go(page, "/demo/avan/product/h01/");
    await page.locator("input[name=color][value=h01-ivory]").check();
    await page.waitForFunction(() =>
      document.querySelector(".main-image img").src.includes("ivory"),
    );
    assert(
      await page
        .locator(".main-image img:not(.av-photo-layer)")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    );
    await page.locator("[data-add-to-cart]").click();
    assert(await page.locator("[data-cart-dialog]").isVisible());
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("avan:v1:state")).cart[0].sku,
      ),
      "h01-ivory",
    );
    await page.locator('[data-cart-dialog] a[href$="/checkout/"]').click();
    const root = page.locator("main [data-checkout-root]");
    await root.locator("[data-checkout-next]").click();
    assert(await root.locator("[data-errors]").isVisible());
    for (const [key, value] of Object.entries({
      name: "کاربر آزمایشی",
      phone: "۰۹۱۲۳۴۵۶۷۸۹",
      city: "تهران",
      postal: "۱۲۳۴۵۶۷۸۹۰",
      address: "نشانی آزمایشی برای بررسی سفارش",
    }))
      await root.locator(`[name=${key}]`).fill(value);
    await root.locator("[data-checkout-next]").click();
    assert(await root.locator("[data-checkout-shipping]").isVisible());
    await root.locator("[data-checkout-next]").click();
    assert(await root.locator("[data-checkout-review]").isVisible());
    await root.locator("[data-checkout-next]").click();
    await page.waitForURL("**/demo/avan/order/");
    await page
      .locator("[data-order-content] .receipt-id")
      .waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("avan:v1:state")).cart.length,
      ),
      0,
    );
    assert(
      !(
        await page.evaluate(() => localStorage.getItem("avan:v1:state"))
      ).includes("کاربر آزمایشی"),
    );
  });
  await run("Mobile layout, menu and FAQ", async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["", "shop/", "product/h01/", "help/faq/"]) {
      await go(page, "/demo/avan/" + route);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "mobile overflow: " + route,
      );
      assert(await page.locator("main h1").isVisible());
    }
    await page.locator(".mobile-menu summary").click();
    await page.locator(".mobile-menu nav").waitFor({ state: "visible" });
    assert(await page.locator(".mobile-menu nav").isVisible());
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".mobile-menu").evaluate((menu) => menu.open),
      false,
    );
    assert(
      await page
        .locator(".mobile-menu summary")
        .evaluate((node) => node === document.activeElement),
    );
    const faq = page.locator(".prose details").first();
    await faq.locator("summary").click();
    assert(await faq.evaluate((node) => node.open));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await faq.locator("summary").click();
    assert.equal(await faq.evaluate((node) => node.open), false);
  });
  await run(
    "Portfolio gallery, case study and live demo link",
    async (page) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await go(page, "/");
      const carousel = page.locator(".project-carousel");
      assert.equal(
        await carousel.locator("[data-slide-index]:not([data-clone])").count(),
        7,
      );
      await carousel.scrollIntoViewIfNeeded();
      for (let i = 0; i < 6; i++)
        await carousel.locator("[data-carousel-next]").click();
      assert.equal(await carousel.getAttribute("data-slide"), "6");
      const cover = carousel.locator(
        '[data-slide-index="6"]:not([data-clone]) .tile-image',
      );
      await cover.locator("img").evaluateAll(async (images) => {
        for (const image of images) image.loading = "eager";
        await Promise.all(images.map((image) => image.decode()));
      });
      await cover.click();
      await page.waitForURL("**/work/avan/");
      assert(
        await page
          .locator("h1")
          .textContent()
          .then((text) => text.includes("آوان")),
      );
      const demo = page.locator('a[href$="/demo/avan/"]').first();
      await demo.click();
      await page.waitForURL("**/demo/avan/");
      assert(await page.locator(".hero h1").isVisible());
      await go(page, "/work/");
      await page.locator("[data-filter=commerce]").click();
      assert(
        await page
          .locator('.portfolio-grid .tile-image[href$="/work/avan/"]')
          .isVisible(),
      );
      await go(page, "/work/avan/");
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [...document.querySelectorAll("main img")];
        for (const image of images) image.loading = "eager";
        await Promise.all(images.map((image) => image.decode()));
      });
      await page.screenshot({
        path: "output/avan/verification/final-captures/portfolio-case-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "portfolio case mobile overflow",
      );
      await page.screenshot({
        path: "output/avan/verification/final-captures/portfolio-case-mobile.png",
        fullPage: true,
      });
    },
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  const report = {
    status:
      results.every((r) => r.status === "passed") && !errors.length
        ? "passed"
        : "failed",
    date: new Date().toISOString(),
    scope:
      "Five essential flows only, per the human's latest request; no repeated performance or exhaustive regression suite",
    results,
    errors,
  };
  await fs.writeFile(
    "output/avan/verification/final-basic-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}
