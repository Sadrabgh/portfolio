import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { server, origin, launch } from "./v10-common.mjs";
let checks = 0;
const errors = [],
  failed = [],
  posts = [];
const ok = (v, m) => {
  assert(v, m);
  checks++;
};
const root = "dist/demo/velia";
async function routesAt(dir) {
  const routes = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) routes.push(...(await routesAt(p)));
    else if (e.name === "index.html")
      routes.push(
        "/" +
          path
            .dirname(p)
            .replace(/^dist[\\/]/, "")
            .replaceAll("\\", "/") +
          "/",
      );
  }
  return routes;
}
const routes = await routesAt(root);
const browser = await launch();
await fs.mkdir("output/playwright/velia", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1058 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() });
  });
  p.on("request", (r) => {
    if (r.method() !== "GET") posts.push({ url: r.url(), method: r.method() });
  });
  const go = async (route) => {
    await p.goto(origin + "/demo/velia/" + route, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
  };
  await go("");
  ok(
    (await p.locator("html").getAttribute("data-velia-theme")) === "light",
    "light default",
  );
  ok((await p.locator("html").getAttribute("dir")) === "rtl", "RTL");
  ok(
    await p
      .locator(".velia-hero-copy")
      .evaluate((e) => getComputedStyle(e).fontFamily.includes("Yekan Bakh")),
    "user Yekan Bakh rendered",
  );
  // Portable integrity check: compare the served build with the existing project font bytes.
  // Original account Downloads are unavailable; this does not certify external provenance.
  const builtFonts = await fs.readdir("dist/_astro");
  for (const weight of ["Light", "Regular", "SemiBold", "Bold", "ExtraBold"]) {
    const file = "YekanBakhFaNum-" + weight;
    const built = builtFonts.find(
      (f) => f.startsWith(file + ".") && f.endsWith(".woff"),
    );
    ok(!!built, "built Yekan Bakh weight " + weight);
    const source = await fs.readFile(
      "src/assets/fonts/yekan-bakh/" + file + ".woff",
    );
    const response = await fetch(origin + "/_astro/" + built);
    ok(response.ok, "served Yekan Bakh weight " + weight);
    const served = Buffer.from(await response.arrayBuffer());
    const digest = (b) => crypto.createHash("sha256").update(b).digest("hex");
    ok(
      source.readUInt32BE(0) === 0x774f4646 &&
        digest(source) === digest(served),
      "served font byte integrity " + weight,
    );
  }
  await p.locator("[data-skin-theme]").click();
  await go("contact/");
  ok(
    (await p.locator("html").getAttribute("data-velia-theme")) === "dark",
    "theme persists",
  );
  await p.locator("[data-skin-theme]").click();
  await go("shop/");
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 20,
    "20 catalog products",
  );
  await p.locator('[data-skin-category="body"]').click();
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 5,
    "body category",
  );
  await p.locator('[data-skin-category="all"]').click();
  await p.locator("#skin-search").fill("كرم دست");
  await p.waitForTimeout(220);
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 1,
    "Persian Arabic normalization",
  );
  await p.locator("#skin-search").fill("<img src=x onerror=alert(1)>");
  await p.waitForTimeout(220);
  ok(await p.locator("[data-no-results]").isVisible(), "no results");
  ok((await p.locator('img[src="x"]').count()) === 0, "search input escaped");
  await p.locator("[data-no-results] [data-clear-filters]").click();
  await p.locator("[data-skin-sort]").selectOption("price-low");
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]")
      .first()
      .getAttribute("data-skin-card")) === "hand-cream",
    "price sorting",
  );
  await p.locator("[data-filter-open]").click();
  await p.locator('[name="budget"]').fill("600000");
  await p.locator('[name="available"]').check();
  await p.locator('[name="skinType"]').selectOption("خشک");
  await p.locator('[data-filter-form] button[type="submit"]').click();
  const filtered = await p
    .locator("[data-product-grid] [data-skin-card]:not([hidden])")
    .count();
  ok(filtered > 0 && filtered < 20, "combined filters");
  ok(
    p.url().includes("budget=600000") && p.url().includes("available=1"),
    "filter URL state",
  );
  await p.reload({ waitUntil: "networkidle" });
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === filtered,
    "filter persistence on reload",
  );
  await go("category/serum/");
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 4,
    "category page",
  );
  await p.locator("[data-filter-open]").click();
  await p.locator('[name="available"]').check();
  await p.locator('[data-filter-form] button[type="submit"]').click();
  ok(
    (await p
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 3,
    "availability filter",
  );
  await go("products/facial-cleanser/");
  await p.locator('[data-favourite="facial-cleanser"]').click();
  await go("favourites/");
  ok(
    (await p
      .locator("[data-saved-grid] [data-skin-card]:not([hidden])")
      .count()) === 1,
    "favourite persists across pages",
  );
  await go("products/facial-cleanser/");
  await p.locator('[data-product-tab="use"]').click();
  ok(await p.locator('[data-product-panel="use"]').isVisible(), "product tab");
  await p.keyboard.press("ArrowLeft");
  ok(
    (await p
      .locator('[data-product-tab="reviews"]')
      .getAttribute("aria-selected")) === "true",
    "RTL keyboard tabs",
  );
  await p
    .locator('[data-demo-form="review"] [name="name"]')
    .fill("<b>نمونه</b>");
  await p
    .locator('[data-demo-form="review"] [name="message"]')
    .fill("دیدگاه آزمایشی برای نمایش رابط محصول");
  await p.locator('[data-demo-form="review"] button').click();
  ok(
    (await p.locator("[data-review-list] .velia-review").count()) === 3,
    "review preview",
  );
  ok(
    (await p.locator("[data-review-list] .velia-review b b").count()) === 0,
    "review text escaped",
  );
  await p.locator("[data-detail-plus]").click();
  await p.locator(".skin-product-buy-row [data-add-product]").click();
  await p.locator("[data-bag-open]").first().click();
  await p.locator("[data-bag-dialog] [data-dialog-close]").click();
  await go("cart/");
  ok(
    (await p
      .locator('[data-bag-surface="page"] [data-line-quantity]')
      .textContent()) === "۲",
    "product quantity in cart",
  );
  await p.locator('[data-bag-surface="page"] [data-remove]').click();
  ok(
    await p.locator('[data-bag-surface="page"] [data-bag-empty]').isVisible(),
    "empty cart",
  );
  await p.locator('[data-bag-surface="page"] [data-undo]').click();
  ok(
    (await p
      .locator('[data-bag-surface="page"] [data-line-quantity]')
      .textContent()) === "۲",
    "undo removal",
  );
  await p.locator('[data-bag-surface="page"] [name="promo"]').fill("ALBA10");
  await p.locator('[data-bag-surface="page"] [data-promo-form] button').click();
  ok(
    (
      await p.locator('[data-bag-surface="page"] [data-total]').textContent()
    ).includes((956000).toLocaleString("fa-IR")),
    "discount and shipping calculated",
  );
  await go("checkout/");
  await p.locator("[data-checkout-next]").click();
  ok(
    (await p.locator('[aria-invalid="true"]').count()) > 0,
    "inline checkout validation",
  );
  for (const [name, value] of [
    ["name", "نام آزمایشی خصوصی"],
    ["phone", "۰۹۱۲۳۴۵۶۷۸۹"],
    ["city", "تهران"],
    ["postal", "۱۲۳۴۵۶۷۸۹۰"],
    ["address", "خیابان نمونه، کوچهٔ آزمایشی، پلاک ۱۲، واحد ۳"],
  ])
    await p.locator(`[data-checkout-form] [name="${name}"]`).fill(value);
  await p.locator('[name="delivery"][value="express"]').check();
  await p.locator("[data-checkout-next]").click();
  ok(await p.locator('[data-checkout-panel="2"]').isVisible(), "review step");
  ok(
    (await p.locator("[data-review-delivery]").textContent()).includes("سریع"),
    "chosen delivery reviewed",
  );
  await p.locator("[data-checkout-back]").click();
  await p.locator("[data-checkout-next]").click();
  await p.locator("[data-checkout-confirm]").click();
  ok(await p.locator("[data-order-receipt]").isVisible(), "checkout receipt");
  const receiptId = await p.locator("[data-order-id]").textContent();
  ok(/^AL-/.test(receiptId), "original brand receipt number");
  const stored = await p.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  ok(
    !stored.includes("نام آزمایشی خصوصی") &&
      !stored.includes("خیابان نمونه، کوچهٔ آزمایشی"),
    "no receiver identity persistence",
  );
  await go("tracking/");
  await p.locator('[name="order"]').fill(receiptId);
  await p.locator("[data-tracking-form] button").click();
  ok(
    await p.locator("[data-tracking-result]").isVisible(),
    "new receipt tracked",
  );
  await p.locator('[name="order"]').fill("AL-MISSING");
  await p.locator("[data-tracking-form] button").click();
  ok(
    !(await p.locator("[data-tracking-result]").isVisible()),
    "invalid receipt not shown",
  );
  await go("account/orders/");
  await p.locator("[data-demo-login]").click();
  ok(
    (await p.locator("[data-orders-list] .velia-order-row").count()) === 2,
    "saved receipt in account",
  );
  await p.locator('[data-order-filter="new"]').click();
  ok(
    (await p.locator("[data-orders-list] .velia-order-row").count()) === 1,
    "order status filter",
  );
  await p.locator("[data-orders-list] .velia-order-row").click();
  await p.locator("[data-order-detail-id]").waitFor({ state: "visible" });
  ok(
    (await p.locator("[data-order-detail-id]").textContent()) === receiptId,
    "order detail",
  );
  ok(
    (await p.locator("[data-order-detail-total]").textContent()) ===
      (1001000).toLocaleString("fa-IR"),
    "receipt total matches chosen delivery",
  );
  await p.locator("[data-order-rebuy]").click();
  ok(
    (await p
      .locator("[data-bag-dialog] [data-line-quantity]")
      .textContent()) === "۲",
    "rebuy stored selection",
  );
  await p.keyboard.press("Escape");
  await go("account/addresses/");
  await p.locator("[data-address-new]").click();
  await p.locator('[name="label"]').fill("نشانی نمونهٔ تازه");
  await p.locator('[name="address"]').fill("تهران، خیابان خصوصی تست، پلاک ۲");
  await p.locator('[data-address-form] button[type="submit"]').click();
  ok((await p.locator("[data-address-card]").count()) === 3, "address preview");
  await p
    .locator("[data-address-card]")
    .last()
    .locator("[data-address-remove]")
    .click();
  await p.locator("[data-address-status] button").click();
  ok(
    (await p.locator("[data-address-card]:not([hidden])").count()) === 3,
    "address removal undo",
  );
  await go("contact/");
  await p
    .locator('[data-demo-form="contact"] [name="name"]')
    .fill("نام تست پیام");
  await p
    .locator('[data-demo-form="contact"] [name="email"]')
    .fill("demo@example.com");
  await p
    .locator('[data-demo-form="contact"] [name="message"]')
    .fill("پیام خصوصی آزمایشی برای فرم تماس فروشگاه");
  await p.locator('[data-demo-form="contact"] button').click();
  ok(
    (
      await p
        .locator('[data-demo-form="contact"] [data-form-status]')
        .textContent()
    ).includes("ذخیره یا ارسال نشده"),
    "contact feedback",
  );
  ok(
    !(
      await p.evaluate(() =>
        JSON.stringify({ ...localStorage, ...sessionStorage }),
      )
    ).includes("پیام خصوصی آزمایشی"),
    "no contact message persistence",
  );
  await go("collections/everyday/");
  await p.evaluate(() => localStorage.removeItem("velia-cart-v1"));
  await p.reload({ waitUntil: "networkidle" });
  await p.locator("[data-add-collection]").click();
  ok(
    (await p.locator("[data-bag-dialog] [data-line-id]").count()) === 3,
    "collection adds all three products",
  );
  await p.keyboard.press("Escape");
  await go("products/recovery-serum/");
  ok(
    await p.locator(".skin-product-buy-row [data-add-product]").isDisabled(),
    "unavailable product disabled",
  );
  const links = new Set();
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await p.goto(origin + route, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(30);
      const result = await p.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        h1: document.querySelectorAll("main h1").length,
        main: document.querySelectorAll("main").length,
        links: [...document.querySelectorAll("a[href]")].map(
          (a) => new URL(a.href).pathname,
        ),
        badImgs: [...document.images]
          .filter((img) => img.complete && !img.naturalWidth)
          .map((img) => img.src),
      }));
      ok(result.width <= result.viewport + 1, `no overflow ${width} ${route}`);
      ok(result.h1 === 1 && result.main === 1, `semantic page ${route}`);
      ok(result.badImgs.length === 0, `images ${route}`);
      result.links.forEach((link) => links.add(link));
    }
  }
  for (const link of links) {
    if (link.startsWith("/demo/velia/") || link === "/work/velia/")
      ok(
        (await context.request.get(origin + link)).status() === 200,
        `internal route ${link}`,
      );
  }
  for (const width of [320, 768]) {
    await p.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "shop/",
      "products/facial-cleanser/",
      "checkout/",
      "contact/",
      "account/orders/",
      "collections/everyday/",
    ]) {
      await go(route);
      ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `narrow/tablet ${width} ${route}`,
      );
    }
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await go("shop/");
  await p.locator("[data-menu-open]").click();
  ok(
    await p.locator("[data-menu-dialog]").evaluate((e) => e.open),
    "mobile menu",
  );
  await p.keyboard.press("Escape");
  ok(
    await p
      .locator("[data-menu-open]")
      .evaluate((e) => e === document.activeElement),
    "menu restores focus",
  );
  await p.locator("[data-bag-open]").first().click();
  ok(
    await p
      .locator("[data-bag-dialog]")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    "mobile drawer does not overflow",
  );
  await p.keyboard.press("Escape");
  await go("products/facial-cleanser/");
  const buy = await p
    .locator(".skin-product-buy-row [data-add-product]")
    .boundingBox();
  ok(buy.y + buy.height < 772, "mobile purchase visible above nav");
  await p.locator(".skin-related").scrollIntoViewIfNeeded();
  await p.locator("[data-mobile-purchase]").waitFor({ state: "visible" });
  ok(
    await p.locator("[data-mobile-purchase]").isVisible(),
    "sticky mobile purchase after original leaves viewport",
  );
  await p.locator("[data-skin-theme]").click();
  for (const route of [
    "",
    "shop/",
    "contact/",
    "account/profile/",
    "checkout/",
    "products/facial-cleanser/",
  ]) {
    await go(route);
    ok(
      (await p.locator("html").getAttribute("data-velia-theme")) === "dark",
      `dark mode ${route}`,
    );
  }
  ok(errors.length === 0, JSON.stringify(errors));
  ok(failed.length === 0, JSON.stringify(failed));
  ok(posts.length === 0, "no form or checkout network submission");
  const report = {
    checks,
    routes: routes.length,
    widths: [320, 390, 768, 1440],
    runtimeErrors: errors,
    failedRequests: failed,
    submissions: posts,
  };
  await fs.writeFile(
    "verification-velia.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.close();
}
