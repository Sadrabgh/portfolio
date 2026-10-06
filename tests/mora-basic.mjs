import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { launch, go, server, origin } from "./v10-common.mjs";
const out = path.resolve("output/mora/verification");
await fs.mkdir(out, { recursive: true });
const results = [],
  errors = [],
  bad = [];
const browser = await launch();
const check = (condition, label) => {
  assert.ok(condition, label);
  results.push({ label, passed: true });
};
async function capture(page, name, width, height, portfolioName) {
  await page.setViewportSize({ width, height });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images].filter((i) => i.getAttribute("src"));
    for (const i of imgs) i.loading = "eager";
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
  await page.waitForTimeout(750);
  await page.screenshot({ path: path.join(out, name + ".png") });
  if (portfolioName) {
    const image = await sharp(path.join(out, name + ".png"))
      .webp({ quality: 90 })
      .toBuffer();
    await fs.mkdir("public/portfolio", { recursive: true });
    await fs.mkdir("dist/portfolio", { recursive: true });
    await fs.writeFile("public/portfolio/" + portfolioName + ".webp", image);
    await fs.writeFile("dist/portfolio/" + portfolioName + ".webp", image);
  }
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1058 },
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(origin))
      bad.push(r.status() + " " + r.url());
  });
  await go(p, "/demo/mora/");
  await p.evaluate(() => document.fonts.ready);
  check(
    (await p.locator("h1").count()) === 1 &&
      (await p.locator("[data-feature]").isVisible()),
    "home render",
  );
  check(
    await p.evaluate(() => document.fonts.check("16px Mora")),
    "local font ready",
  );
  await capture(p, "home-desktop", 1440, 1058, "mora-desktop");
  await capture(p, "home-overview", 1440, 1600, "mora-overview");
  await p.locator('[data-slide="1"]').click();
  await p.waitForFunction(
    () =>
      document.querySelector("[data-feature-code]").textContent === "MORA T01",
  );
  await p.locator("[data-open-cart]").click();
  check(await p.locator("#mr-cart").isVisible(), "cart dialog");
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector("#mr-cart").open);
  await go(p, "/demo/mora/shop/");
  await p.locator("[name=category]").selectOption("tables");
  check(
    (await p.locator("[data-catalog] [data-product]:visible").count()) === 3,
    "category filter",
  );
  await p.locator("[data-catalog] [data-save=t01]").click();
  await p.locator("[data-catalog] [data-compare=t01]").click();
  await go(p, "/demo/mora/wishlist/");
  check(
    (await p.locator("[data-wishlist] [data-product]:visible").count()) === 1,
    "saved model",
  );
  await go(p, "/demo/mora/compare/");
  check(await p.locator(".mr-compare-table").isVisible(), "comparison render");
  await go(p, "/demo/mora/product/c02/");
  check(
    await p.locator("[data-product-buy]").isDisabled(),
    "unavailable model protected",
  );
  await go(p, "/demo/mora/product/c01/");
  await capture(p, "product-desktop", 1440, 1000, "mora-detail");
  await p.locator("#mr-product-qty").selectOption("2");
  await p.locator("[data-product-buy]").click();
  await p.reload({ waitUntil: "networkidle" });
  check(
    (await p.evaluate(
      () => JSON.parse(localStorage.getItem("mora:v1:store")).cart.c01,
    )) === 2,
    "cart survives route and reload",
  );
  await go(p, "/demo/mora/cart/");
  await p.locator("[name=coupon]").fill("MORA10");
  await p.locator(".mr-coupon button[type=submit]").click();
  check(
    (await p.locator("[data-cart-content] .mr-totals").textContent()).includes(
      "۲۹٬۱۰۰٬۰۰۰",
    ),
    "coupon cap and shipping total",
  );
  await go(p, "/demo/mora/checkout/");
  await p.locator('[data-step="0"] [data-next]').click();
  check(
    await p.locator("[data-form-error]").isVisible(),
    "required information validation",
  );
  await p.locator("[name=fullName]").fill("سارا احمدی");
  await p.locator("[name=phone]").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await p.locator("[name=city]").fill("تهران");
  await p.locator("[name=postal]").fill("۱۲۳۴۵۶۷۸۹۰");
  await p.locator("[name=address]").fill("خیابان نمونه، کوچهٔ آزمایشی، پلاک ۲");
  await p.locator('[data-step="0"] [data-next]').click();
  await p.locator("[value=pickup]").check();
  check(
    (
      await p.locator("[data-checkout-summary] .mr-totals").textContent()
    ).includes("۲۸٬۶۰۰٬۰۰۰"),
    "delivery selection updates total",
  );
  await p.locator("[value=standard]").check();
  await p.locator('[data-step="1"] [data-next]').click();
  await p.locator("[name=consent]").check();
  await p.locator("#mr-checkout-form button[type=submit]").click();
  await p.waitForURL("**/demo/mora/order/");
  check(await p.locator(".mr-receipt").isVisible(), "simulated order receipt");
  const stored = await p.evaluate(() => ({
    receipt: sessionStorage.getItem("mora:v1:receipt"),
    store: localStorage.getItem("mora:v1:store"),
  }));
  check(
    !stored.receipt.includes("احمدی") &&
      !stored.receipt.includes("0912") &&
      !stored.receipt.includes("۰۹۱۲") &&
      Object.keys(JSON.parse(stored.store).cart).length === 0,
    "receipt excludes personal data and clears purchased cart",
  );
  await p.screenshot({ path: path.join(out, "order-desktop.png") });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 1500 },
    isMobile: true,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const m = await mobile.newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await go(m, "/demo/mora/");
  await capture(m, "home-mobile", 390, 1500, "mora-mobile");
  await m.locator("[data-open-menu]").click();
  check(await m.locator("#mr-menu").isVisible(), "mobile menu opens");
  await m.locator("#mr-menu [data-close]").click();
  await m.waitForFunction(() => !document.querySelector("#mr-menu").open);
  for (const route of [
    "/demo/mora/",
    "/demo/mora/shop/",
    "/demo/mora/product/c01/",
    "/demo/mora/checkout/",
  ]) {
    await m.setViewportSize({ width: 320, height: 850 });
    await go(m, route);
    check(
      await m.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "320px layout: " + route,
    );
  }
  await go(p, "/work/mora/");
  check(
    await p
      .locator("h1")
      .textContent()
      .then((t) => t.includes("مورا")),
    "main portfolio case",
  );
  await p.evaluate(async () => {
    for (const i of document.images) {
      if (i.loading === "lazy") i.loading = "eager";
    }
    await Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    );
  });
  check(
    await p.evaluate(() =>
      [...document.images]
        .filter((i) => i.getAttribute("src"))
        .every((i) => i.naturalWidth > 0),
    ),
    "portfolio screenshots present",
  );
  check(errors.length === 0, "no browser exceptions: " + errors.join(" / "));
  check(bad.length === 0, "no missing assets: " + bad.join(" / "));
  const report = {
    status: "passed",
    scope:
      "basic acceptance only; no exhaustive regression or performance audit",
    checks: results,
    errors,
    badResponses: bad,
  };
  await fs.writeFile(
    path.join(out, "basic-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      status: "passed",
      checks: results.length,
      screenshots: out,
    }),
  );
} catch (error) {
  await fs.writeFile(
    path.join(out, "basic-report.json"),
    JSON.stringify(
      {
        status: "failed",
        checks: results,
        errors,
        badResponses: bad,
        failure: String(error),
      },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
