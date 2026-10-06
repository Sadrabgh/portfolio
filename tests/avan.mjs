import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, launch, go } from "./v10-common.mjs";
const directory = "output/avan/verification";
await fs.mkdir(directory + "/commerce-captures", { recursive: true });
let browser,
  page,
  checks = 0;
const errors = [],
  failures = [],
  metrics = [];
const ok = (value, label) => {
  assert(value, label);
  checks++;
};
const state = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("avan:v1:state")));
const route = (path) => go(page, "/demo/avan/" + path);
const waitCardCount = async (n) => {
  await page.waitForFunction(
    (n) =>
      document.querySelectorAll("[data-catalog-results] [data-product-card]")
        .length === n,
    n,
  );
  ok(
    (await page
      .locator("[data-catalog-results] [data-product-card]")
      .count()) === n,
    "catalog count " + n,
  );
};
const close = async (selector) => {
  await page
    .locator(selector + " [data-close-dialog]")
    .first()
    .click();
  await page.waitForFunction(
    (selector) => !document.querySelector(selector).open,
    selector,
  );
};
const fillRecipient = async (root) => {
  for (const [key, value] of Object.entries({
    name: "کاربر آزمون خصوصی",
    phone: "۰۹۱۲۳۴۵۶۷۸۹",
    city: "شهر آزمایشی",
    postal: "۱۲۳۴۵۶۷۸۹۰",
    address: "نشانی خصوصی آزمایشی شماره ۱۲۳",
  }))
    await root.locator(`[name=${key}]`).fill(value);
};
async function checkout(root) {
  await root.locator("[data-checkout-next]").click();
  ok(await root.locator("[data-errors]").isVisible(), "invalid errors visible");
  ok(
    (await root.locator("[data-errors] a").count()) === 5,
    "all five field errors",
  );
  ok(
    await root
      .locator("[data-errors]")
      .evaluate((n) => n === document.activeElement),
    "error summary focused",
  );
  await fillRecipient(root);
  await root.locator("[data-checkout-next]").click();
  ok(
    await root.locator("[data-checkout-shipping]").isVisible(),
    "shipping step",
  );
  await root.locator("[data-checkout-next]").click();
  ok(await root.locator("[data-checkout-review]").isVisible(), "review step");
  await root.locator("[data-checkout-back]").click();
  await root.locator("[data-checkout-back]").click();
  ok(
    (await root.locator("[name=name]").inputValue()) === "کاربر آزمون خصوصی",
    "back edit preserves page memory",
  );
  await root.locator("[data-checkout-next]").click();
  await root.locator("[data-checkout-next]").click();
}
try {
  browser = await launch();
  const mainContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page = await mainContext.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await route("shop/?category=headphones&color=ivory&stock=1&priceMax=4000000");
  await waitCardCount(0);
  ok(await page.locator("[data-no-results]").isVisible(), "no results route");
  await page.locator("[data-no-results] [data-filter-reset]").click();
  await waitCardCount(10);
  await page.locator("#search").fill("H۰۱");
  await waitCardCount(1);
  ok(
    (await page
      .locator("[data-catalog-results] article")
      .getAttribute("data-product-card")) === "h01",
    "Persian code search",
  );
  ok(new URL(page.url()).searchParams.get("q") === "h01", "normalized URL");
  await page.locator("#search").fill("ایرباد");
  await waitCardCount(3);
  await page.goBack();
  await waitCardCount(1);
  await page.goForward();
  await waitCardCount(3);
  await route("shop/?category=earbuds,headphones&anc=1&color=ivory&stock=1");
  await waitCardCount(2);
  ok(
    (await page
      .locator("[data-catalog-results] article")
      .first()
      .getAttribute("data-matched-sku")) === "h01-ivory",
    "matched SKU card",
  );
  ok(
    (
      await page
        .locator("[data-catalog-results] article img")
        .first()
        .getAttribute("src")
    ).includes("h01-ivory-front"),
    "matched image",
  );
  await page.locator("#av-filters [name=category][value=headphones]").uncheck();
  await page.locator("#av-filters [name=category][value=earbuds]").uncheck();
  await page.locator("#av-filters [name=category][value=speakers]").check();
  await waitCardCount(1);
  ok(!new URL(page.url()).searchParams.has("anc"), "ANC category clearing");
  ok(await page.locator(".anc-filter").isHidden(), "inapplicable ANC hidden");
  await route(
    "shop/?sort=price-desc&priceMin=evil&category=bad&color=bad&stock=true",
  );
  await waitCardCount(10);
  ok(
    !page.url().includes("bad") && !page.url().includes("evil"),
    "invalid URL canonicalized",
  );
  ok(
    (await page
      .locator("[data-catalog-results] article")
      .first()
      .getAttribute("data-product-card")) === "s02",
    "price sort",
  );
  await page.locator("[data-catalog-results] [data-save-model=h01]").click();
  ok((await state()).wishlist.includes("h01"), "wishlist persisted");
  await route("wishlist/");
  ok(
    (await page
      .locator("[data-wishlist-content] [data-product-card=h01]")
      .count()) === 1,
    "saved card rendered",
  );
  await page.locator("[data-wishlist-content] [data-save-model=h01]").click();
  ok(!(await state()).wishlist.includes("h01"), "unsave");
  await route("compare/");
  ok(
    (await page.locator("[data-compare-content] table").count()) === 0,
    "zero comparison",
  );
  for (const [id, n] of [
    ["h01", 1],
    ["h02", 2],
    ["h03", 3],
  ]) {
    await page.locator("[data-compare-select]").selectOption(id);
    await page.locator("[data-compare-selected]").click();
    ok(
      (await page.locator("[data-compare-content] thead th").count()) === n + 1,
      n + " models compare",
    );
  }
  await page.locator("[data-compare-selected]").click();
  ok((await state()).compare.length === 3, "duplicate not added");
  ok(
    (await page.locator("[data-compare-content]").textContent()).includes(
      "کاربرد ندارد",
    ),
    "null labels",
  );
  ok(
    (await page.locator("[data-compare-content]").textContent()).includes(
      "ندارد",
    ),
    "false labels",
  );
  ok(
    (await page.locator("[data-compare-content] bdi").count()) > 3,
    "LTR units",
  );
  await page.locator("[data-only-differences]").check();
  ok(
    (await page.locator("[data-compare-content]").getAttribute("class")) ===
      "show-differences",
    "difference highlight",
  );
  await page.locator("[data-compare-select]").selectOption("e01");
  await page.locator("[data-compare-selected]").click();
  ok(
    await page.locator("[data-reset-dialog]").evaluate((n) => n.open),
    "reset confirmation",
  );
  await close("[data-reset-dialog]");
  ok((await state()).compare.length === 3, "cancel retains compare");
  await page.locator("[data-compare-selected]").click();
  await page.locator("[data-confirm-comparison]").click();
  ok(
    JSON.stringify((await state()).compare) === '["e01"]',
    "confirmed group reset",
  );
  await route("product/h03/?color=ivory");
  await page.waitForFunction(
    () => document.querySelector(".main-image img").dataset.sku === "h03-ivory",
  );
  ok((await page.locator("#quantity option").count()) === 1, "stock one");
  await page.locator("[data-add-to-cart]").click();
  ok(
    await page.locator("[data-cart-dialog]").evaluate((n) => n.open),
    "cart drawer after add",
  );
  await close("[data-cart-dialog]");
  ok(
    await page
      .locator("[data-add-to-cart]")
      .evaluate((n) => n === document.activeElement),
    "drawer focus return",
  );
  await page.locator("[data-add-to-cart]").click();
  ok((await state()).cart[0].quantity === 1, "stock clamp repeated add");
  await close("[data-cart-dialog]");
  await page.locator("[name=color][value=h03-graphite]").check();
  await page.locator("#quantity").selectOption("2");
  await page.locator("[data-add-to-cart]").click();
  ok((await state()).cart.length === 2, "colors separate cart");
  await close("[data-cart-dialog]");
  await route("product/h02/");
  await page.locator("[name=color][value=h02-ivory]").check();
  ok(
    await page.locator("[data-add-to-cart]").isDisabled(),
    "out of stock view no add",
  );
  await page.waitForFunction(
    () => document.querySelector(".main-image img").dataset.sku === "h02-ivory",
  );
  ok(
    (await page.locator("[data-product-price]").textContent()).includes(
      "۴٬۰۰۰٬۰۰۰",
    ),
    "unavailable SKU price",
  );
  await route("product/h01/");
  for (const color of ["ivory", "graphite", "ivory", "graphite", "ivory"])
    await page.locator("[name=color][value=h01-" + color + "]").check();
  await page.waitForFunction(
    () => document.querySelector(".main-image img").dataset.sku === "h01-ivory",
  );
  ok(
    (await page.locator(".main-image img").getAttribute("src")).includes(
      "ivory",
    ),
    "rapid color final image",
  );
  await page.locator("[data-gallery-next]").click();
  await page.waitForFunction(() =>
    document.querySelector(".main-image img").src.includes("ivory-side"),
  );
  await page.locator(".gallery-zoom").click();
  ok(
    await page.locator("[data-zoom-dialog]").evaluate((n) => n.open),
    "zoom opens",
  );
  await page.keyboard.press("Escape");
  ok(
    await page
      .locator(".gallery-zoom")
      .evaluate((n) => n === document.activeElement),
    "zoom Escape focus return",
  );
  await page.route("**/h01-graphite-*.webp", (r) => r.abort());
  await page.locator("[name=color][value=h01-graphite]").check();
  await page.waitForFunction(() =>
    document
      .querySelector("[data-gallery-status]")
      .textContent.includes("بارگذاری نشد"),
  );
  ok(
    !(await page.locator("[data-add-to-cart]").isDisabled()),
    "broken image does not block purchase",
  );
  await page.unroute("**/h01-graphite-*.webp");
  await route("cart/");
  let cart = page.locator("main [data-cart-content]");
  await cart.locator("[data-cart-quantity=h03-graphite]").selectOption("3");
  ok(
    (await state()).cart.find((l) => l.sku === "h03-graphite").quantity === 3,
    "cart update stock",
  );
  await cart.locator("[data-remove-sku=h03-ivory]").click();
  ok((await state()).cart.length === 1, "remove");
  await cart.locator("[data-undo-cart]").click();
  ok((await state()).cart.length === 2, "undo");
  await cart.locator("[name=coupon]").fill("avan10");
  await cart.locator("[data-coupon-form] button[type=submit]").click();
  ok((await state()).coupon === "AVAN10", "coupon");
  await cart.locator("[name=coupon]").fill("bad");
  await cart.locator("[data-coupon-form] button[type=submit]").click();
  ok(
    (await state()).coupon === "AVAN10",
    "invalid code keeps stated old discount",
  );
  ok(
    (await cart.locator(".coupon-feedback").textContent()).includes("قبلی"),
    "coupon invalid feedback",
  );
  await route("checkout/");
  const checkoutRoot = page.locator("main [data-checkout-root]");
  await checkout(checkoutRoot);
  const other = await page.context().newPage();
  await go(other, "/demo/avan/cart/");
  await other
    .locator("main [data-cart-quantity=h03-graphite]")
    .selectOption("2");
  await page.waitForFunction(
    () => !document.querySelector("main [data-checkout-shipping]").hidden,
  );
  ok(
    await checkoutRoot.locator("[data-checkout-shipping]").isVisible(),
    "cross tab change requires re-review",
  );
  await other.close();
  await checkoutRoot.locator("[data-checkout-next]").click();
  await page.screenshot({
    path: directory + "/commerce-captures/checkout-review-desktop.png",
  });
  await checkoutRoot.locator("[data-checkout-next]").evaluate((n) => {
    if (n instanceof HTMLButtonElement) {
      n.click();
      n.click();
    }
  });
  await page.waitForURL("**/demo/avan/order/");
  ok(
    (await page.locator("[data-order-content] .receipt-id").count()) === 1,
    "single receipt",
  );
  ok((await state()).cart.length === 0, "cart cleared after receipt");
  const saved = await page.evaluate(() => ({
    local: localStorage.getItem("avan:v1:state"),
    session: sessionStorage.getItem("avan:v1:receipt"),
  }));
  for (const value of [
    "کاربر آزمون خصوصی",
    "09123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "نشانی خصوصی",
    "1234567890",
  ])
    ok(!JSON.stringify(saved).includes(value), "no persisted PII " + value);
  ok(
    !(await page.locator("[data-order-content]").textContent()).includes(
      "کاربر آزمون خصوصی",
    ),
    "receipt nonpersonal",
  );
  await page.screenshot({
    path: directory + "/commerce-captures/receipt-desktop.png",
  });
  await page.evaluate(() => {
    localStorage.setItem(
      "avan:v1:state",
      JSON.stringify({
        version: 1,
        cart: [
          { sku: "h01-graphite", quantity: 100, priceAtAdd: 1 },
          { sku: "s02-ivory", quantity: 1 },
          { sku: "a02-graphite", quantity: 1.2 },
          { sku: "x", quantity: 1 },
        ],
        wishlist: ["h01", "x"],
        compare: ["h01", "e01"],
      }),
    );
  });
  await route("cart/");
  ok(
    (await state()).cart.length === 1 && (await state()).cart[0].quantity === 7,
    "corrupt persisted payload repaired",
  );
  await page.evaluate(() => {
    localStorage.removeItem("avan:v1:state");
    localStorage.setItem(
      "avan:v0:state",
      JSON.stringify({ version: 0, items: [{ sku: "a01-ivory", qty: 2 }] }),
    );
  });
  await page.reload();
  ok((await state()).cart[0].sku === "a01-ivory", "migration route");
  await route("guide/");
  await page
    .locator("[data-guide-form] [name=category][value=earbuds]")
    .check();
  await page.locator("[data-guide-form] [name=use][value=sport]").check();
  await page.locator("#guide-budget").fill("۴۰۰۰۰۰۰");
  await page.locator("[data-guide-form] button").click();
  ok(
    (await page.locator("[data-guide-results] [data-product-card]").count()) ===
      1,
    "guide strict result",
  );
  ok(
    (await page
      .locator("[data-guide-results] article")
      .getAttribute("data-product-card")) === "e03",
    "guide matched E03",
  );
  await page.locator("#guide-budget").fill("۱۰۰۰۰۰");
  await page.locator("[data-guide-form] button").click();
  ok(
    (await page.locator("[data-guide-results] [data-product-card]").count()) ===
      0,
    "guide no invented recommendation",
  );
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "shop/",
      "product/h01/",
      "compare/",
      "cart/",
      "checkout/",
      "guide/",
    ]) {
      await route(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      ok(overflow <= 1, `no document overflow ${path} ${width} (${overflow})`);
      metrics.push({ width, path, overflow });
    }
    if (width === 320 || width === 390) {
      await route("shop/");
      await page.locator("[data-open-filters]").click();
      ok(
        await page.locator("[data-filters-dialog] #av-filters").isVisible(),
        "mobile filters " + width,
      );
      await page.keyboard.press("Tab");
      ok(
        await page
          .locator("[data-filters-dialog]")
          .evaluate((n) => n.contains(document.activeElement)),
        "dialog focus contained " + width,
      );
      await page.keyboard.press("Escape");
      ok(
        await page
          .locator("[data-open-filters]")
          .evaluate((n) => n === document.activeElement),
        "mobile focus return " + width,
      );
      await page.screenshot({
        path: directory + "/commerce-captures/shop-" + width + ".png",
      });
    }
  }
  await page.close();
  for (const mode of ["session", "memory", "receipt-blocked"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await context.addInitScript((mode) => {
      if (mode === "session" || mode === "memory")
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("blocked", "SecurityError");
          },
        });
      if (mode === "memory" || mode === "receipt-blocked")
        Object.defineProperty(window, "sessionStorage", {
          get() {
            throw new DOMException("blocked", "SecurityError");
          },
        });
      if (mode === "memory") {
        HTMLDialogElement.prototype.showModal = undefined;
        HTMLDialogElement.prototype.close = undefined;
      }
    }, mode);
    await route("product/e02/");
    await page.locator("[data-add-to-cart]").click();
    if (mode === "memory")
      ok(
        (await page
          .locator("[data-cart-dialog]")
          .getAttribute("data-fallback")) === "true",
        "unsupported native dialog fallback",
      );
    await page.locator('[data-cart-dialog] a[href$="/checkout/"]').click();
    if (mode === "memory")
      ok(
        page.url().includes("/product/e02/"),
        "memory checkout stays same page",
      );
    else await page.waitForURL("**/checkout/");
    const root =
      mode === "memory"
        ? page.locator("[data-inline-checkout] [data-checkout-root]")
        : page.locator("main [data-checkout-root]");
    await checkout(root);
    await root.locator("[data-checkout-next]").click();
    if (mode === "session") {
      await page.waitForURL("**/order/");
      ok(
        (await page.locator("[data-order-content] .receipt-id").count()) === 1,
        "session mode receipt",
      );
    } else {
      ok(
        (await root.locator("[data-checkout-receipt] .receipt-id").count()) ===
          1,
        mode + " receipt in same page",
      );
      ok(
        (await root.locator("[data-checkout-receipt]").textContent()).includes(
          "ثبت شد",
        ),
        "memory success",
      );
    }
    await page.screenshot({
      path: directory + "/commerce-captures/" + mode + ".png",
    });
    await context.close();
  }
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  page = await nojs.newPage();
  for (const path of ["", "shop/", "product/h01/", "help/faq/", "checkout/"]) {
    await route(path);
    ok((await page.locator("h1").count()) === 1, "no JS h1 " + path);
    ok(
      await page
        .locator("noscript")
        .textContent()
        .then((s) => s.includes("JavaScript")),
      "no JS message " + path,
    );
    ok(
      (await page
        .locator("button[data-requires-js]:not(:disabled)")
        .count()) === 0,
      "no dead active controls " + path,
    );
  }
  await nojs.close();
  ok(errors.length === 0, "no runtime exceptions");
  await fs.writeFile(
    directory + "/commerce-browser-report.json",
    JSON.stringify(
      {
        status: "passed",
        checks,
        errors,
        metrics,
        browser: browser.version(),
        scope:
          "Chromium functional flows, storage/fallback and six widths; no physical device or Firefox/WebKit claim",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "passed", checks, errors }));
} catch (error) {
  failures.push(error.message);
  if (page && !page.isClosed())
    await page
      .screenshot({
        path: directory + "/commerce-captures/failure.png",
        fullPage: true,
      })
      .catch(() => {});
  await fs.writeFile(
    directory + "/commerce-browser-failure.json",
    JSON.stringify({ checks, errors, failures }, null, 2),
  );
  throw error;
} finally {
  await browser?.close();
  server.close();
}
