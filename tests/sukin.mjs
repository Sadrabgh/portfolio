import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";
import { server, origin, launch } from "./v10-common.mjs";
let browser,
  checks = 0;
const errors = [],
  failures = [],
  posts = [];
const ok = (value, message) => {
  assert(value, message);
  checks++;
};
const ids = [
  "facial-cleanser",
  "daily-moisturiser",
  "cream-cleanser",
  "green-moisturiser",
  "cleansing-oil",
  "rosehip-oil",
  "foaming-cleanser",
  "recovery-serum",
];
const routes = [
  "/demo/sukin/",
  "/demo/sukin/cart/",
  "/demo/sukin/checkout/",
  "/demo/sukin/favourites/",
  "/demo/sukin/story/",
  ...ids.map((id) => `/demo/sukin/products/${id}/`),
];
const money = (value) => value.toLocaleString("fa-IR");
try {
  browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1058 },
    colorScheme: "dark",
  });
  const p = await context.newPage();
  p.on("pageerror", (error) => errors.push(error.message));
  p.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  p.on("response", (response) => {
    if (response.status() >= 400)
      failures.push({ url: response.url(), status: response.status() });
  });
  const go = async (route) => {
    await p.goto(origin + route, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
  };
  await p.addInitScript(() => {
    window.addEventListener("pagereveal", (event) => {
      window.__skinRevealHadTransition = !!event.viewTransition;
    });
    new MutationObserver(() => {
      const targets = [...document.images].filter(
        (img) => img.style.viewTransitionName === "skin-product-image",
      ).length;
      if (targets)
        window.__skinTransitionTargets = Math.max(
          targets,
          window.__skinTransitionTargets || 0,
        );
    }).observe(document, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });
  });
  await go("/demo/sukin/");
  ok(
    (await p.locator("html").getAttribute("data-sukin-theme")) === "light",
    "light default ignores OS dark preference",
  );
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 8,
    "eight products visible immediately",
  );
  // Regression guard: a downloaded image must actually paint, not just report naturalWidth.
  const png = await p.screenshot();
  const box = await p
    .locator('[data-skin-card="facial-cleanser"] .skin-card-image')
    .boundingBox();
  const { data, info } = await sharp(png)
    .extract({
      left: Math.ceil(box.x),
      top: Math.ceil(box.y),
      width: Math.floor(box.width) - 1,
      height: Math.floor(box.height) - 1,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += info.channels)
    if (data[i] < 150 && data[i + 1] < 150 && data[i + 2] < 150) darkPixels++;
  ok(
    darkPixels > 1000,
    "catalog product picture paints on the first desktop visit",
  );
  await p.locator("[data-skin-theme]").focus();
  await p.keyboard.press("Enter");
  ok(
    (await p.locator("html").getAttribute("data-sukin-theme")) === "dark",
    "keyboard theme choice works",
  );
  await go("/demo/sukin/story/");
  ok(
    (await p.locator("html").getAttribute("data-sukin-theme")) === "dark",
    "theme persists between pages",
  );
  await p.locator("[data-skin-theme]").click();
  await go("/demo/sukin/");
  await p.locator('[data-skin-category="cleanser"]').click();
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 4,
    "cleanser category has four products",
  );
  await p.locator('[data-skin-category="all"]').click();
  await p.locator("#skin-search").fill("كرمي");
  await p.waitForTimeout(180);
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 1,
    "Arabic letter forms find the Persian product",
  );
  ok(
    await p.locator('[data-skin-card="cream-cleanser"]').isVisible(),
    "matching product is the cream cleanser",
  );
  await p.locator("#skin-search").fill("<img src=x onerror=alert(1)>");
  await p.waitForTimeout(180);
  ok(
    await p.locator("[data-no-results]").isVisible(),
    "unknown search has an actionable empty state",
  );
  ok(
    (await p.locator('img[src="x"]').count()) === 0,
    "search text cannot inject markup",
  );
  await p.locator("[data-no-results] [data-clear-filters]").click();
  await p.locator("[data-skin-sort]").selectOption("price-low");
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]")
      .first()
      .getAttribute("data-skin-card")) === "foaming-cleanser",
    "price sort changes the actual card order",
  );
  await p.locator("[data-filter-open]").click();
  await p.locator('[name="available"]').check();
  await p.keyboard.press("Escape");
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 8,
    "cancelled filters do not mutate results",
  );
  ok(
    await p
      .locator("[data-filter-open]")
      .evaluate((el) => el === document.activeElement),
    "Escape returns filter focus",
  );
  await p.locator("[data-filter-open]").click();
  await p.locator('[name="available"]').check();
  await p.locator('[data-filter-form] button[type="submit"]').click();
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 7,
    "availability excludes the unavailable product",
  );
  await p.locator("[data-filter-open]").click();
  await p.locator('[name="budget"]').fill("500000");
  await p.locator('[data-filter-form] button[type="submit"]').click();
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 3,
    "price ceiling filters products",
  );
  await p.locator("[data-active-filters] [data-clear-filters]").click();
  await p.locator('[data-favourite="facial-cleanser"]').click();
  ok(
    (await p
      .locator('[data-favourite="facial-cleanser"]')
      .getAttribute("aria-pressed")) === "true",
    "favourite gives an accessible selected state",
  );
  await go("/demo/sukin/favourites/");
  ok(
    (await p
      .locator("[data-saved-grid] [data-skin-card]:not([hidden])")
      .count()) === 1,
    "favourite persists to its own page",
  );
  await p
    .locator('[data-skin-card="facial-cleanser"] .skin-card-image')
    .click();
  await p.waitForURL("**/products/facial-cleanser/");
  await p.waitForTimeout(450);
  if (
    await p.evaluate(() => "onpagereveal" in window && "navigation" in window)
  ) {
    ok(
      (await p.evaluate(() => window.__skinTransitionTargets)) === 1,
      "one selected product image participates in the page transition",
    );
    ok(
      await p
        .locator("[data-gallery-image]")
        .evaluate((img) => getComputedStyle(img).viewTransitionName === "none"),
      "temporary transition name is cleared after capture",
    );
  }
  await p.locator("[data-gallery-source]").nth(1).click();
  await p.waitForTimeout(280);
  ok(
    (await p.locator("[data-gallery-image]").getAttribute("src")).includes(
      "facial-bottle",
    ),
    "gallery switches to a genuine second image",
  );
  await p.locator("[data-zoom-open]").click();
  ok(
    await p.locator("[data-zoom-dialog]").evaluate((dialog) => dialog.open),
    "zoom uses a native modal",
  );
  ok(
    (await p.locator("[data-zoom-image]").getAttribute("src")).includes(
      "facial-bottle",
    ),
    "zoom follows the selected gallery image",
  );
  await p.keyboard.press("Escape");
  ok(
    await p
      .locator("[data-zoom-open]")
      .evaluate((el) => el === document.activeElement),
    "zoom restores opener focus",
  );
  await p.locator("[data-detail-plus]").click();
  await p.locator("[data-detail-add]").click();
  ok(
    (await p.locator(".skin-header [data-bag-count]").textContent()) ===
      money(2),
    "selected detail quantity is added",
  );
  await go("/demo/sukin/");
  await p.locator('[data-add-product="cream-cleanser"]').click();
  ok(
    await p.locator('[data-add-product="recovery-serum"]').isDisabled(),
    "unavailable product cannot be added",
  );
  const trigger = p.locator(".skin-header [data-bag-open]");
  await trigger.click();
  const bag = p.locator("[data-bag-dialog]");
  ok(
    await bag.evaluate((dialog) => dialog.open),
    "cart drawer is a native modal",
  );
  ok(
    (await bag.locator("[data-total]").textContent()) === money(1455000),
    "cart combines prices and grants free shipping",
  );
  await bag.locator('[name="promo"]').fill("BAD");
  await bag.locator("[data-promo-form] button").click();
  ok(
    (await bag.locator('[name="promo"]').getAttribute("aria-invalid")) ===
      "true",
    "invalid code has inline accessible feedback",
  );
  await bag.locator('[name="promo"]').fill("nature10");
  await bag.locator("[data-promo-form] button").click();
  ok(
    (await bag.locator("[data-total]").textContent()) === money(1309500),
    "ten percent discount uses catalog prices",
  );
  await bag
    .locator('[data-line-id="facial-cleanser"] [data-line-minus]')
    .click();
  ok(
    (await bag.locator("[data-total]").textContent()) === money(929000),
    "quantity changes recompute discount and shipping",
  );
  await bag.locator('[data-line-id="cream-cleanser"] [data-remove]').click();
  await bag.locator('[data-line-id="facial-cleanser"] [data-remove]').click();
  ok(
    await bag.locator("[data-bag-empty]").isVisible(),
    "removing the last item shows the empty state",
  );
  ok(
    await bag.locator("[data-undo]").isVisible(),
    "last-item deletion still exposes Undo",
  );
  await bag.locator("[data-undo]").click();
  ok(
    (await bag.locator('[data-line-id="facial-cleanser"]').count()) === 1,
    "Undo restores the removed quantity",
  );
  await p.keyboard.press("Escape");
  ok(
    await trigger.evaluate((el) => el === document.activeElement),
    "cart Escape restores opener focus",
  );
  await go("/demo/sukin/cart/");
  const cart = p.locator('[data-bag-surface="page"]');
  ok(
    (await cart.locator("[data-line-quantity]").textContent()) === money(1),
    "cart survives page navigation",
  );
  await p.evaluate(() =>
    localStorage.setItem(
      "sukin-cart-v1",
      JSON.stringify({
        lines: [
          { id: "facial-cleanser", quantity: 1 },
          { id: "rosehip-oil", quantity: 1 },
        ],
        promo: true,
      }),
    ),
  );
  await p.reload({ waitUntil: "networkidle" });
  ok(
    (await cart.locator("[data-shipping]").textContent()) === "رایگان",
    "shipping threshold is evaluated before the discount",
  );
  ok(
    (await cart.locator("[data-total]").textContent()) === money(1161000),
    "free shipping remains correct below the post-discount threshold",
  );
  await go("/demo/sukin/checkout/");
  await p.locator("[data-checkout-next]").click();
  ok(
    (await p.locator('[name="name"]').getAttribute("aria-invalid")) === "true",
    "required fields have inline errors",
  );
  ok(
    await p
      .locator('[name="name"]')
      .evaluate((el) => el === document.activeElement),
    "validation focuses the first invalid field",
  );
  await p.locator('[name="name"]').fill("کاربر آزمایشی");
  await p.locator('[name="phone"]').fill("۰۹۱۲۳۴۵۶۷۸۹");
  await p.locator('[name="city"]').fill("تهران");
  await p.locator('[name="postal"]').fill("۱۱۱۱۱۱۱۱۱۱");
  await p
    .locator('[name="address"]')
    .fill("نشانی ساختگی، خیابان نمونه، پلاک ۱۲");
  await p.locator("[data-checkout-next]").click();
  ok(
    await p.locator('[data-checkout-panel="2"]').isVisible(),
    "Persian digits validate and open review",
  );
  ok(
    (await p.locator("[data-review-address]").textContent()).includes(
      "نشانی ساختگی",
    ),
    "review shows escaped user input",
  );
  const stored = await p.evaluate(() => JSON.stringify({ ...localStorage }));
  ok(
    !stored.includes("کاربر آزمایشی") &&
      !stored.includes("نشانی ساختگی") &&
      !stored.includes("۰۹۱۲۳۴۵۶۷۸۹"),
    "identity details are absent from local storage",
  );
  await p.locator("[data-checkout-back]").click();
  ok(
    await p.locator('[data-checkout-panel="1"]').isVisible(),
    "review supports editing",
  );
  await p.locator("[data-checkout-next]").click();
  await p.locator("[data-checkout-confirm]").evaluate((button) => {
    if (button instanceof HTMLButtonElement) {
      button.click();
      button.click();
    }
  });
  ok(
    await p.locator("[data-order-receipt]").isVisible(),
    "demo checkout produces a single receipt",
  );
  ok(
    (await p.locator("[data-order-total]").textContent()) === money(1161000),
    "receipt preserves the final total",
  );
  ok(
    (await p.locator('[name="name"]').inputValue()) === "" &&
      (await p.locator('[name="address"]').inputValue()) === "",
    "receipt clears personal fields",
  );
  ok(
    (await p.locator(".skin-header [data-bag-count]").textContent()) ===
      money(0),
    "receipt empties the demo cart",
  );
  ok(posts.length === 0, "checkout makes no POST or payment request");
  // A tampered local cart cannot override pricing, stock or DOM content.
  await p.evaluate(() =>
    localStorage.setItem(
      "sukin-cart-v1",
      JSON.stringify({
        lines: [
          { id: "unknown", quantity: 1 },
          { id: "recovery-serum", quantity: 9 },
          { id: "facial-cleanser", quantity: 999, price: 1 },
          { id: "cream-cleanser", quantity: -3 },
        ],
        promo: true,
      }),
    ),
  );
  await go("/demo/sukin/cart/");
  ok(
    (await cart.locator("[data-line-id]").count()) === 1,
    "unknown and invalid stored lines are rejected",
  );
  ok(
    (await cart.locator("[data-line-quantity]").textContent()) === money(8),
    "stored quantity is bounded by stock",
  );
  ok(
    (await cart.locator("[data-subtotal]").textContent()) === money(3960000),
    "stored price cannot override catalog price",
  );
  ok(
    await cart.locator("[data-line-plus]").isDisabled(),
    "stock limit disables further increments",
  );
  await go("/demo/sukin/favourites/");
  await p.locator('[data-favourite="facial-cleanser"]').click();
  ok(
    await p.locator("[data-saved-empty]").isVisible(),
    "removing the last saved product exposes an empty state",
  );
  await go("/demo/sukin/");
  await p.locator("[data-skin-sort]").selectOption("price-high");
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.waitForFunction(
    () =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    null,
    { timeout: 1000 },
  );
  ok(
    await p.evaluate(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    ),
    "reduced motion cancels ongoing card effects",
  );
  await p.locator('[data-skin-category="cleanser"]').click();
  ok(
    await p.evaluate(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    ),
    "reduced motion skips new filter animations",
  );
  await trigger.click();
  ok(
    await bag.evaluate(
      (dialog) => getComputedStyle(dialog).transitionDuration === "0s",
    ),
    "reduced motion opens the modal without spatial animation",
  );
  await p.keyboard.press("Escape");
  await p.emulateMedia({ reducedMotion: "no-preference" });
  console.log(
    "Functional, privacy and motion flows passed; scanning 13 pages at four widths in both themes.",
  );
  for (const width of [320, 390, 768, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await p.evaluate(
        (value) => localStorage.setItem("sukin-theme", value),
        theme,
      );
      for (const route of routes) {
        await go(route);
        const overflow = await p.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        ok(overflow <= 1, `no horizontal overflow: ${route} ${width} ${theme}`);
        ok(
          (await p.locator("main").count()) === 1 &&
            (await p.locator("h1:visible").count()) === 1,
          `one primary landmark and heading: ${route}`,
        );
      }
    }
  }
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await nojs.goto(origin + "/demo/sukin/");
  ok(
    (await nojs.locator("[data-skin-card]").count()) === 8,
    "no-JS catalog preserves product content",
  );
  ok(
    (await nojs.locator(".skin-quick-add:visible").count()) === 0,
    "no-JS catalog does not expose inert buy buttons",
  );
  await nojs.goto(origin + "/demo/sukin/checkout/");
  ok(
    await nojs.locator("[data-checkout-empty]").isVisible(),
    "no-JS checkout explains how to continue",
  );
  ok(
    await nojs.locator("[data-checkout-form]").isHidden(),
    "no-JS checkout cannot submit identity data",
  );
  ok(errors.length === 0, "no browser runtime errors: " + errors.join("; "));
  ok(
    failures.length === 0,
    "no missing assets or route responses: " + JSON.stringify(failures),
  );
  const report = {
    date: new Date().toISOString(),
    status: "passed",
    checks,
    routes: routes.length,
    widths: [320, 390, 768, 1440],
    themes: ["light", "dark"],
    errors,
    failures,
    checkoutPosts: posts.length,
  };
  await fs.writeFile(
    "verification-sukin.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
