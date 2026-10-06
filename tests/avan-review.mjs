import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, launch, go } from "./v10-common.mjs";
let browser;
const results = [];
const state = (cart) => ({
  version: 1,
  cart,
  wishlist: [],
  compare: [],
  coupon: "",
});
const line = { sku: "h01-graphite", quantity: 1, priceAtAdd: 6200000 };
async function fill(root) {
  for (const [key, value] of Object.entries({
    name: "کاربر نمونه",
    phone: "۰۹۱۲۳۴۵۶۷۸۹",
    city: "شهر نمونه",
    postal: "۱۲۳۴۵۶۷۸۹۰",
    address: "نشانی نمونه برای آزمون",
  }))
    await root.locator(`[name=${key}]`).fill(value);
}
async function run(name, task) {
  try {
    await task();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({ name, status: "failed", message: error.message });
  }
}
try {
  browser = await launch();
  await run(
    "A second order can start on the same page when storage is blocked",
    async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(() => {
        for (const name of ["localStorage", "sessionStorage"])
          Object.defineProperty(window, name, {
            configurable: true,
            get() {
              throw Error("test: blocked");
            },
          });
      });
      const page = await context.newPage();
      await go(page, "/demo/avan/product/h01/");
      await page.locator("[data-add-to-cart]").click();
      await page.locator('[data-cart-dialog] a[href$="/checkout/"]').click();
      const root = page.locator("[data-inline-checkout] [data-checkout-root]");
      await fill(root);
      await root.locator("[data-checkout-next]").click();
      await root.locator("[data-checkout-next]").click();
      await root.locator("[data-checkout-next]").click();
      await root
        .locator("[data-checkout-receipt]")
        .waitFor({ state: "visible" });
      await page.locator("[data-inline-checkout] [data-close-dialog]").click();
      await page.locator("[data-add-to-cart]").click();
      await page.locator('[data-cart-dialog] a[href$="/checkout/"]').click();
      assert(
        await root.locator("[data-checkout-info]").isVisible(),
        "new order must show a fresh recipient step instead of the previous receipt",
      );
      assert.equal(
        await root.locator("[name=name]").inputValue(),
        "",
        "prior recipient must not remain in a fresh order",
      );
      await fill(root);
      await root.locator("[data-checkout-next]").click();
      await root.locator("[data-checkout-next]").click();
      await root.locator("[data-checkout-next]").click();
      assert(
        await root.locator("[data-checkout-receipt]").isVisible(),
        "second receipt is reachable",
      );
      await context.close();
    },
  );
  await run(
    "Clearing storage in another tab invalidates a reviewed checkout",
    async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await go(page, "/demo/avan/");
      await page.evaluate(
        (s) => localStorage.setItem("avan:v1:state", JSON.stringify(s)),
        state([line]),
      );
      await go(page, "/demo/avan/checkout/");
      const root = page.locator("main [data-checkout-root]");
      await fill(root);
      await root.locator("[data-checkout-next]").click();
      await root.locator("[data-checkout-next]").click();
      const second = await context.newPage();
      await go(second, "/demo/avan/");
      await second.evaluate(() => localStorage.clear());
      await page.waitForFunction(
        () => document.querySelector("main [data-checkout-next]").disabled,
        {},
        { timeout: 1800 },
      );
      assert(
        await root.locator("[data-checkout-review]").isHidden(),
        "cleared cart must invalidate final review",
      );
      await context.close();
    },
  );
  await run(
    "Adding beyond stock announces the limit without reporting an addition",
    async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await go(page, "/demo/avan/");
      await page.evaluate(
        (s) => localStorage.setItem("avan:v1:state", JSON.stringify(s)),
        state([{ ...line, quantity: 7 }]),
      );
      await go(page, "/demo/avan/product/h01/");
      await page.locator("[data-add-to-cart]").click();
      await page.waitForTimeout(80);
      const text = await page.locator("[data-live-status]").textContent();
      assert(
        /حداکثر|موجودی|سقف/.test(text),
        "stock cap needs an explicit status instead of a success message",
      );
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("avan:v1:state")).cart[0].quantity,
        ),
        7,
      );
      await context.close();
    },
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(
    "output/avan/verification/continuation-review-report.json",
    JSON.stringify(
      {
        status: results.every((r) => r.status === "passed")
          ? "passed"
          : "failed",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
}
if (results.some((r) => r.status === "failed")) process.exitCode = 1;
