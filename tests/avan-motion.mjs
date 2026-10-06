import assert from "node:assert/strict";
import fs from "node:fs/promises";
import zlib from "node:zlib";
import { server, launch, go } from "./v10-common.mjs";
const directory = "output/avan/verification/motion";
await fs.mkdir(directory, { recursive: true });
let browser;
const results = [],
  errors = [],
  traces = [];
async function run(name, task) {
  try {
    await task();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({ name, status: "failed", message: error.message });
  }
}
const seeded = {
  version: 1,
  cart: [
    { sku: "h01-graphite", quantity: 1, priceAtAdd: 6200000 },
    { sku: "e01-graphite", quantity: 1, priceAtAdd: 4400000 },
    { sku: "a02-graphite", quantity: 1, priceAtAdd: 450000 },
  ],
  wishlist: [],
  compare: [],
  coupon: "",
};
async function context(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...options,
  });
  context.on("page", (page) =>
    page.on("pageerror", (e) => errors.push(e.message)),
  );
  return context;
}
async function trace(page, name, action) {
  await page.evaluate(() => {
    window.motionFrames = [];
    window.motionTasks = [];
    window.motionStart = performance.now();
    const observer = new PerformanceObserver((list) =>
      window.motionTasks.push(
        ...list
          .getEntries()
          .map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    );
    observer.observe({ type: "longtask", buffered: false });
    let previous;
    window.motionRecording = true;
    const frame = (now) => {
      if (previous) window.motionFrames.push(now - previous);
      previous = now;
      if (window.motionRecording) requestAnimationFrame(frame);
      else observer.disconnect();
    };
    requestAnimationFrame(frame);
  });
  await action();
  await page.waitForTimeout(800);
  const measured = await page.evaluate(() => {
    window.motionRecording = false;
    return { intervals: window.motionFrames, longTasks: window.motionTasks };
  });
  const sorted = [...measured.intervals].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  traces.push({ name, p95, ...measured });
  assert(p95 <= 25, `${name}: frame p95 ${p95}ms exceeds 25ms`);
  assert(
    !measured.longTasks.some((t) => t.duration > 50),
    `${name}: a motion-window long task exceeded 50ms`,
  );
}
try {
  browser = await launch();
  const main = await context();
  const page = await main.newPage();
  await run(
    "Exactly three 700ms marketing reveals; focus cancels concealment",
    async () => {
      await go(page, "/demo/avan/");
      assert.equal(await page.locator("[data-marketing-reveal]").count(), 3);
      assert.equal(
        await page
          .locator(
            ".hero.av-reveal-pending,[data-product-card].av-reveal-pending",
          )
          .count(),
        0,
      );
      await page
        .locator("[data-marketing-reveal]")
        .first()
        .scrollIntoViewIfNeeded();
      await page.waitForFunction(() =>
        document
          .querySelector("[data-marketing-reveal]")
          .getAnimations()
          .some((a) => a.effect.getTiming().duration === 700),
      );
      assert.equal(
        await page
          .locator("[data-marketing-reveal]")
          .first()
          .getAttribute("data-reveal-seen"),
        "true",
      );
      await trace(page, "marketing reveal", async () => {
        await page
          .locator("[data-marketing-reveal]")
          .nth(1)
          .scrollIntoViewIfNeeded();
      });
      await page.evaluate(() =>
        document
          .querySelectorAll("[data-marketing-reveal]")[2]
          .querySelector("a")
          .focus(),
      );
      assert(
        await page
          .locator("[data-marketing-reveal]")
          .nth(2)
          .evaluate(
            (n) =>
              getComputedStyle(n).opacity === "1" &&
              !n.classList.contains("av-reveal-pending"),
          ),
      );
    },
  );
  await run(
    "Decoded gallery crossfade, rapid reversal, bounded layers, live reduced motion",
    async () => {
      await go(page, "/demo/avan/product/h01/");
      await page.waitForFunction(
        () => document.querySelector(".main-image img").dataset.sku,
      );
      await page
        .locator('[data-gallery-sku="h01-graphite"][data-gallery-index="1"]')
        .evaluate((n) => n.click());
      await page.waitForFunction(() =>
        document
          .querySelector(".main-image img:not(.av-photo-layer)")
          .getAnimations()
          .some((a) => a.effect.getTiming().duration === 200),
      );
      assert(
        await page
          .locator(".main-image .av-photo-layer")
          .evaluate(
            (n) => n.getAttribute("aria-hidden") === "true" && n.alt === "",
          ),
      );
      await page.evaluate(() => {
        const buttons = [
          ...document.querySelectorAll('[data-gallery-sku="h01-graphite"]'),
        ];
        buttons[2].click();
        buttons[0].click();
        buttons[1].click();
      });
      await page.waitForTimeout(80);
      assert((await page.locator(".av-photo-layer").count()) <= 2);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(50);
      assert.equal(await page.locator(".av-photo-layer").count(), 0);
      assert(
        await page
          .locator(".main-image img")
          .evaluate(
            (n) =>
              getComputedStyle(n).opacity === "1" && !n.getAnimations().length,
          ),
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await trace(page, "gallery crossfade", async () => {
        await page
          .locator('[data-gallery-sku="h01-graphite"][data-gallery-index="2"]')
          .evaluate((n) => n.click());
      });
      assert(
        (await page.locator(".main-image img").getAttribute("alt")).includes(
          "نمای 3",
        ),
      );
    },
  );
  await run(
    "Drawer 280/200ms, immediate semantics and focus, interruptible retoggle",
    async () => {
      const trigger = page.locator('.site-header [aria-label="سبد خرید"]');
      await trigger.evaluate((n) => n.click());
      await page.waitForTimeout(30);
      assert(
        await page
          .locator("[data-cart-dialog]")
          .evaluate(
            (n) =>
              n.open &&
              n.contains(document.activeElement) &&
              n
                .getAnimations()
                .some((a) => a.effect.getTiming().duration === 280),
          ),
      );
      await page
        .locator("[data-cart-dialog] [data-close-dialog]")
        .evaluate((n) => n.click());
      assert(await trigger.evaluate((n) => document.activeElement === n));
      assert(await page.locator("[data-cart-dialog]").evaluate((n) => !n.open));
      await page.waitForTimeout(20);
      assert(
        await page
          .locator("[data-cart-dialog]")
          .evaluate((n) =>
            n
              .getAnimations()
              .some((a) => a.effect.getTiming().duration === 200),
          ),
      );
      await trigger.evaluate((n) => n.click());
      await page.waitForTimeout(30);
      assert(
        await page
          .locator("[data-cart-dialog]")
          .evaluate((n) => n.open && n.contains(document.activeElement)),
      );
      await page.keyboard.press("Escape");
      assert(await trigger.evaluate((n) => document.activeElement === n));
      await page.waitForTimeout(230);
      await trace(page, "drawer entry and exit", async () => {
        await trigger.evaluate((n) => n.click());
        await page.waitForTimeout(320);
        await page.keyboard.press("Escape");
      });
    },
  );
  await run(
    "Cart FLIP preserves SKU continuity and focus; checkout uses RTL 200ms movement",
    async () => {
      await page.evaluate(
        (value) => localStorage.setItem("avan:v1:state", JSON.stringify(value)),
        seeded,
      );
      await go(page, "/demo/avan/cart/");
      await page
        .locator('[data-cart-content] [data-remove-sku="h01-graphite"]')
        .first()
        .evaluate((n) => n.click());
      assert(
        await page
          .locator('main [data-cart-line="e01-graphite"]')
          .evaluate((n) =>
            n
              .getAnimations()
              .some((a) => a.effect.getTiming().duration === 220),
          ),
      );
      await go(page, "/demo/avan/checkout/");
      for (const [key, value] of Object.entries({
        name: "کاربر نمونه",
        phone: "09123456789",
        city: "شهر نمونه",
        postal: "1234567890",
        address: "نشانی نمونه برای آزمون",
      }))
        await page.locator(`[name=${key}]`).fill(value);
      await page.locator("[data-checkout-next]").evaluate((n) => n.click());
      assert(
        await page
          .locator("[data-checkout-heading]")
          .evaluate((n) => n === document.activeElement),
      );
      assert(
        await page
          .locator("[data-checkout-shipping]")
          .evaluate(
            (n) =>
              !n.hidden &&
              n
                .getAnimations()
                .some(
                  (a) =>
                    a.effect.getTiming().duration === 200 &&
                    a.effect.getKeyframes()[0].transform ===
                      "translateX(-14px)",
                ),
          ),
      );
      await page.locator("[data-checkout-back]").evaluate((n) => n.click());
      assert(
        await page
          .locator("[data-checkout-info]")
          .evaluate((n) =>
            n
              .getAnimations()
              .some(
                (a) =>
                  a.effect.getKeyframes()[0].transform === "translateX(14px)",
              ),
          ),
      );
    },
  );
  await run(
    "In-place favorite feedback and instant pointer press",
    async () => {
      await go(page, "/demo/avan/shop/");
      const save = page.locator(
        '[data-catalog-results] [data-save-model="h01"]',
      );
      await save.click();
      assert.equal(await save.getAttribute("aria-pressed"), "true");
      assert.equal(await save.getAttribute("data-feedback"), "ذخیره شد");
      await save.hover();
      await page.mouse.down();
      assert.equal(
        await save.evaluate((n) => getComputedStyle(n).transitionDuration),
        "0s",
      );
      await page.mouse.up();
    },
  );
  await run(
    "No JS and unavailable WAAPI/IntersectionObserver keep all content visible",
    async () => {
      for (const options of [{ javaScriptEnabled: false }, {}]) {
        const c = await context(options);
        if (options.javaScriptEnabled !== false)
          await c.addInitScript(() => {
            HTMLElement.prototype.animate = undefined;
            window.IntersectionObserver = undefined;
          });
        const p = await c.newPage();
        await go(p, "/demo/avan/");
        assert(
          await p
            .locator("[data-marketing-reveal]")
            .evaluateAll((nodes) =>
              nodes.every((n) => getComputedStyle(n).opacity === "1"),
            ),
        );
        assert.equal(await p.locator("h1").count(), 1);
        await c.close();
      }
    },
  );
  await run(
    "Six responsive widths, 200%/400% reflow, decoded screenshots and local asset budgets",
    async () => {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await go(page, "/demo/avan/");
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `overflow at ${width}`,
        );
        for (
          let y = 0;
          y < (await page.evaluate(() => document.body.scrollHeight));
          y += 800
        ) {
          await page.evaluate((y) => scrollTo(0, y), y);
          await page.waitForTimeout(80);
        }
        await page
          .locator("main img")
          .evaluateAll(async (images) =>
            Promise.all(images.map((image) => image.decode().catch(() => {}))),
          );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `${directory}/home-${width}.png`,
          fullPage: true,
        });
      }
      // A 1280px desktop viewport at browser zoom 200%/400% has CSS widths 640/320.
      for (const width of [640, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await go(page, "/demo/avan/product/h01/");
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `reflow ${width}`,
        );
        assert(await page.locator("[data-add-to-cart]").isVisible());
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await go(page, "/demo/avan/");
      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((e) => ({
            name: e.name,
            size: e.decodedBodySize,
            type: e.initiatorType,
          })),
      );
      const initial =
        resources.reduce((sum, r) => sum + r.size, 0) +
        (await fs.stat("dist/demo/avan/index.html")).size;
      assert(initial <= 600 * 1024, `initial mobile payload ${initial}`);
      const scripts = resources.filter((r) => r.type === "script");
      let gzip = 0;
      for (const script of scripts)
        gzip += zlib.gzipSync(
          await fs.readFile("dist" + new URL(script.name).pathname),
        ).length;
      assert(gzip <= 60 * 1024, `own JS gzip ${gzip}`);
      await fs.writeFile(
        `${directory}/asset-budget.json`,
        JSON.stringify(
          {
            status: "passed",
            initialBytes: initial,
            jsGzipBytes: gzip,
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 1,
            resources,
          },
          null,
          2,
        ),
      );
    },
  );
  await main.close();
} finally {
  await browser?.close();
  server.close();
}
const report = {
  stage: "motion",
  status:
    results.every((r) => r.status === "passed") && !errors.length
      ? "passed"
      : "failed",
  date: new Date().toISOString(),
  reviewer: "A",
  environment:
    "Windows; installed headless Chrome; local static build; emulated viewports, no physical touch-device claim",
  results,
  errors,
  traces,
};
await fs.writeFile(
  "output/avan/verification/motion-report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
assert.equal(report.status, "passed");
