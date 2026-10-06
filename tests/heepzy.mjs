import { spawn } from "node:child_process";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  origin = "http://127.0.0.1:4971",
  draft = process.env.HEEPZY_DRAFT === "1";
const server = spawn(process.execPath, [path.join(root, "serve.mjs")], {
  env: { ...process.env, PORT: "4971" },
  stdio: "ignore",
});
let browser,
  checks = 0;
const errors = [],
  bad = [],
  labels = [],
  viewports = [];
function ok(value, label) {
  assert(value, label);
  checks++;
  labels.push(label);
}
const money = (n) => new Intl.NumberFormat("fa-IR").format(n) + " تومان";
const watch = (p) => {
  p.on("pageerror", (e) => {
    const detail = { url: p.url(), message: e.message, stack: e.stack };
    errors.push(detail);
    console.log("RAVA_PAGEERROR", JSON.stringify(detail));
  });
  p.on("response", (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
};
const go = async (p, route = "") => {
  const r = await p.goto(origin + "/demo/rava/" + route, {
    waitUntil: "networkidle",
  });
  ok(r?.status() === 200, "route " + route);
};
const seed = async (p, items, code = null) => {
  await go(p, "cart/");
  await p.evaluate(
    ({ items, code }) =>
      localStorage.setItem(
        "rava-cart-v1",
        JSON.stringify({ version: 1, items, promotionCode: code }),
      ),
    { items, code },
  );
  await p.reload({ waitUntil: "networkidle" });
};
const cart = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("rava-cart-v1")));
const filled = async (p) => {
  for (const [key, value] of Object.entries({
    name: "کاربر آزمایشی",
    mobile: "۰۹۱۲۳۴۵۶۷۸۹",
    city: "تهران",
    postal: "۱۲۳۴۵۶۷۸۹۰",
    address: "خیابان نمونه، پلاک آزمایشی",
  }))
    await p.locator(`[data-private-field="${key}"]`).fill(value);
};
const eventually = async (test, label) => {
  for (let i = 0; i < 30; i++) {
    if (await test()) {
      ok(true, label);
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  ok(false, label);
};
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : { channel: "chrome" }),
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    p = await context.newPage();
  watch(p);
  const slugs = [
    "route",
    "breeze",
    "rhythm",
    "circuit",
    "flux",
    "base",
    "nightrun",
    "traverse",
    "calm",
    "axis",
    "range",
    "dawn",
  ];
  const routes = [
    "",
    "catalog/",
    "favourites/",
    "cart/",
    "checkout/",
    "order/",
    "about/",
    "size-guide/",
    "help/shipping/",
    "help/returns/",
    "help/privacy/",
    "help/terms/",
    ...slugs.map((s) => "product/" + s + "/"),
  ];
  ok(routes.length === 24, "24 storefront routes");
  for (const route of routes) {
    await go(p, route);
    ok((await p.locator("main").count()) === 1, "one main " + route);
    ok((await p.locator("h1").count()) === 1, "one h1 " + route);
  }
  await go(p, "catalog/?colour=blue&size=39&available=1");
  ok(
    !(await p.locator("[data-card=h05]").isVisible()),
    "availability uses same colour and size",
  );
  ok(
    await p.locator("[data-card=h10]").isVisible(),
    "another matching blue variant remains",
  );
  await p.locator("[name=colour]").selectOption("orange");
  ok(
    await p.locator("[data-card=h05]").isVisible(),
    "orange size 39 available",
  );
  await p.locator("[name=collection]").selectOption("drops");
  ok(
    (await p.locator("[data-card]:visible").count()) === 1,
    "combined collection filters",
  );
  await p.goBack();
  ok(
    (await p.locator("[name=collection]").inputValue()) === "all",
    "Back restores filter controls",
  );
  await p.goForward();
  ok(
    (await p.locator("[name=collection]").inputValue()) === "drops",
    "Forward restores filter controls",
  );
  await p.locator("[name=q]").fill("محصولی که وجود ندارد");
  await eventually(
    async () => await p.locator("[data-filter-empty]").isVisible(),
    "search empty state",
  );
  await p.locator("[data-clear-filters]").click();
  await eventually(
    async () => (await p.locator("[data-card]:visible").count()) === 12,
    "clear filters",
  );
  await p.locator("[name=q]").fill("كتاني");
  await eventually(
    async () => (await p.locator("[data-card]:visible").count()) === 1,
    "Arabic letter normalization",
  );
  await p.locator(".hp-filters button[type=reset]").click();
  await p.locator("[name=sort]").selectOption("price-asc");
  ok(
    (await p
      .locator("[data-catalog-grid] [data-card]:visible")
      .first()
      .getAttribute("data-card")) === "h09",
    "sort by sale-adjusted price",
  );
  await go(p, "product/flux/");
  const panel = p.locator("main [data-product]");
  ok(await panel.locator("[data-add]").isDisabled(), "explicit size required");
  ok(
    (await panel.locator(".hp-thumbs button").count()) === 4,
    "four RAVA 05 angles",
  );
  await panel.locator("[data-size]").selectOption("39");
  await panel.locator(".hp-colours [data-colour=blue]").click();
  ok(
    (await panel.locator("[data-size]").inputValue()) === "",
    "unavailable size cleared on colour change",
  );
  ok(
    await panel.locator("[data-add]").isDisabled(),
    "unavailable new colour cannot add",
  );
  ok(
    await panel
      .locator(".hp-thumbs img")
      .evaluateAll((es) => es.every((e) => e.src.includes("h05-blue-"))),
    "all thumbnails match blue",
  );
  for (const angle of [2, 4, 1, 3])
    await panel.locator(`.hp-thumbs [data-angle="${angle}"]`).click();
  ok(
    (await panel.locator("[data-product-image]").getAttribute("src")).includes(
      "h05-blue-3",
    ),
    "rapid gallery ends at latest angle",
  );
  await panel.locator("[data-lifestyle]").click();
  ok(
    (await panel.getAttribute("data-colour")) === "orange",
    "lifestyle explicitly resets orange",
  );
  ok(
    (await panel.locator("[data-product-image]").getAttribute("src")).includes(
      "featured",
    ),
    "lifestyle correct image",
  );
  await panel.locator("[data-zoom]").click();
  ok(
    await p.locator("[data-zoom-dialog]").evaluate((e) => e.open),
    "zoom opens",
  );
  await p.keyboard.press("Escape");
  await p.locator("dialog[open]").waitFor({ state: "hidden" });
  ok(
    await panel
      .locator("[data-zoom]")
      .evaluate((e) => e === document.activeElement),
    "zoom Escape returns focus",
  );
  await panel.locator("[data-size]").selectOption("39");
  await panel.locator("[data-add]").click();
  ok(
    await p.locator("[data-cart-dialog]").evaluate((e) => e.open),
    "add opens cart",
  );
  ok(
    (await cart(p)).items[0].sku === "h05-orange-39",
    "SKU has model colour size",
  );
  await p.keyboard.press("Escape");
  await p.locator("dialog[open]").waitFor({ state: "hidden" });
  await panel.locator("[data-add]").click();
  await p.keyboard.press("Escape");
  await p.locator("dialog[open]").waitFor({ state: "hidden" });
  await panel.locator("[data-add]").click();
  ok(
    (await cart(p)).items[0].quantity === 2,
    "stock ceiling cannot be exceeded",
  );
  await panel.locator("[data-favourite]").click();
  await go(p, "favourites/");
  ok(
    (await p.locator("main [data-card]:visible").count()) === 1,
    "favourite route",
  );
  await p.reload({ waitUntil: "networkidle" });
  ok(await p.locator("main [data-card=h05]").isVisible(), "favourite persists");
  await p.locator("main [data-favourite=h05]").click();
  ok(
    await p.locator("[data-favourites-empty]").isVisible(),
    "remove last favourite",
  );
  await go(p, "catalog/");
  await p.locator("[data-card=h01] [data-quick]").click();
  ok(
    await p.locator("[data-quick-dialog] [data-add]").isDisabled(),
    "quick add needs explicit size",
  );
  await p.locator("[data-quick-dialog] [data-size]").selectOption("42");
  await p.locator("[data-quick-dialog] [data-add]").click();
  ok((await cart(p)).items.length === 2, "different SKU separate line");
  await p.keyboard.press("Escape");
  await p.locator("dialog[open]").waitFor({ state: "hidden" });
  await seed(p, [
    { sku: "h01-brown-42", quantity: 1 },
    { sku: "h05-orange-39", quantity: 1 },
  ]);
  const summary = p.locator("main [data-summary]");
  ok(
    (await summary.locator("[data-total=subtotal]").textContent()) ===
      money(7500000),
    "sale subtotal 7.5m",
  );
  await summary.locator("[data-coupon-input]").fill("WRONG");
  await summary.locator("[data-coupon-apply]").click();
  ok((await cart(p)).promotionCode === null, "invalid coupon rejected");
  await summary.locator("[data-coupon-input]").fill("rava10");
  await summary.locator("[data-coupon-apply]").click();
  ok(
    (await summary.locator("[data-total=discount]").textContent()) ===
      money(750000),
    "coupon 10 percent after sales",
  );
  ok(
    (await summary.locator("[data-total=total]").textContent()) ===
      money(6840000),
    "discount and standard shipping fixture",
  );
  await summary.locator("[data-checkout-link]").click();
  ok(
    (await cart(p)).promotionCode === "RAVA10",
    "coupon survives checkout navigation",
  );
  await p.reload({ waitUntil: "networkidle" });
  ok(
    (await p.locator("main [data-coupon-input]").inputValue()) === "RAVA10",
    "coupon survives reload",
  );
  await p.locator("[data-next-step]").click();
  ok(
    (await p.locator("[data-field-error=name]").textContent()) !== "",
    "field validation before review",
  );
  await filled(p);
  await p.locator("[data-next-step]").click();
  ok(await p.locator('[data-checkout-step="2"]').isVisible(), "review step");
  ok(
    await p.locator("[data-confirm-order]").isDisabled(),
    "review requires acknowledgement",
  );
  await p.locator("[name=shipping][value=express]").check();
  ok(
    (await p.locator("main [data-total=total]").textContent()) ===
      money(6900000),
    "express fixture",
  );
  await p.locator("[data-review-ack]").check();
  ok(
    await p.locator("[data-confirm-order]").isEnabled(),
    "valid review enables confirmation",
  );
  const second = await context.newPage();
  watch(second);
  await go(second, "cart/");
  await second.locator("main [data-coupon-remove]").click();
  await eventually(
    async () => (await p.locator("[data-review-ack]").isChecked()) === false,
    "other-tab coupon invalidates acknowledgement",
  );
  ok(
    await p
      .locator("[data-checkout-warning]")
      .textContent()
      .then((t) => t.includes("زبانه")),
    "other-tab review warning",
  );
  await second.close();
  await p.locator("main [data-coupon-input]").fill("RAVA10");
  await p.locator("main [data-coupon-apply]").click();
  await p.locator("[data-review-ack]").check();
  const requests = [];
  p.on("request", (r) => requests.push({ url: r.url(), post: r.postData() }));
  await p.locator("[data-confirm-order]").evaluate((b) => {
    if (b instanceof HTMLButtonElement) {
      b.click();
      b.click();
    }
  });
  await p.waitForURL("**/demo/rava/order/");
  ok((await cart(p)).items.length === 0, "order clears cart");
  const receipt = await p.evaluate(() =>
    JSON.parse(sessionStorage.getItem("rava-receipt-v1")),
  );
  ok(
    receipt.lines.length === 2 && receipt.totals.total === 6900000,
    "receipt contains snapshot totals",
  );
  ok(
    Object.keys(receipt).sort().join(",") ===
      "createdAt,id,lines,method,promotionCode,totals,version",
    "receipt whitelist without identity",
  );
  ok(
    !JSON.stringify(receipt).includes("09123456789") &&
      !JSON.stringify(receipt).includes("کاربر"),
    "receipt contains no personal data",
  );
  ok(
    requests.every(
      (r) =>
        !r.post && !r.url.includes("09123456789") && !r.url.includes("name="),
    ),
    "no form data network or URL",
  );
  await p.reload({ waitUntil: "networkidle" });
  ok(
    (await p.locator(".hp-receipt-id").textContent()) === receipt.id,
    "receipt refresh retains one order",
  );
  await seed(p, [{ sku: "h04-silver-42", quantity: 2 }], "RAVA10");
  ok(
    (await p.locator("main [data-total=shipping]").textContent()) === "رایگان",
    "shipping threshold after coupon",
  );
  ok(
    (await p.locator("main [data-total=total]").textContent()) ===
      money(11160000),
    "free standard fixture",
  );
  await go(p, "checkout/");
  await filled(p);
  await p.locator("[data-next-step]").click();
  await p.locator("[name=shipping][value=express]").check();
  ok(
    (await p.locator("main [data-total=total]").textContent()) ===
      money(11310000),
    "express independent of free threshold",
  );
  await seed(p, [{ sku: "h01-brown-42", quantity: 1 }], "RAVA10");
  await p.locator("main .hp-row-remove").click();
  ok((await cart(p)).promotionCode === null, "empty cart clears promotion");
  await p.locator("[data-undo]").click();
  ok((await cart(p)).items[0].quantity === 1, "undo restores SKU and count");
  await p.evaluate(() =>
    localStorage.setItem(
      "rava-cart-v1",
      '{"version":1,"items":[{"sku":"bad","quantity":999},{"sku":"h01-brown-42","quantity":999},{"sku":"h05-blue-39","quantity":1}],"promotionCode":"BAD","name":"untrusted"}',
    ),
  );
  await p.reload({ waitUntil: "networkidle" });
  const clean = await cart(p);
  ok(
    clean.items.length === 1 &&
      clean.items[0].quantity === 3 &&
      clean.promotionCode === null &&
      !("name" in clean),
    "untrusted cart sanitized and stock clamped",
  );
  await p.evaluate(() => localStorage.setItem("rava-cart-v1", "{bad json"));
  await p.reload({ waitUntil: "networkidle" });
  ok((await cart(p)).items.length === 0, "malformed JSON recovers");
  const session = await browser.newContext();
  await session.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  const s = await session.newPage();
  watch(s);
  await go(s, "product/route/");
  await s.locator("main [data-size]").selectOption("42");
  await s.locator("main [data-add]").click();
  await s.keyboard.press("Escape");
  await go(s, "cart/");
  ok(
    (await s.locator("main [data-row-sku]").count()) === 1,
    "session fallback across navigation",
  );
  ok(
    await s
      .locator("[data-storage-message]")
      .textContent()
      .then((t) => t.includes("زبانه")),
    "session limitation disclosed",
  );
  await session.close();
  const memory = await browser.newContext();
  await memory.addInitScript(() => {
    for (const key of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, key, {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
  });
  const m = await memory.newPage();
  watch(m);
  await go(m, "product/route/");
  await m.locator("main [data-size]").selectOption("42");
  await m.locator("main [data-add]").click();
  await m.locator("[data-cart-dialog] [data-quantity-action=plus]").click();
  ok(
    (await m.locator("[data-cart-dialog] .hp-quantity span").textContent()) ===
      "۲",
    "memory cart remains editable",
  );
  await m
    .locator("[data-cart-dialog] [data-checkout-link]")
    .click({ force: true });
  ok(m.url().endsWith("/product/route/"), "memory checkout navigation blocked");
  await m.locator("[data-cart-dialog] [data-cart-link]").click();
  ok(
    m.url().endsWith("/product/route/"),
    "memory cart-page navigation blocked",
  );
  await memory.close();
  const noReceipt = await browser.newContext();
  await noReceipt.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  const nr = await noReceipt.newPage();
  watch(nr);
  await seed(nr, [{ sku: "h01-brown-42", quantity: 1 }]);
  await go(nr, "checkout/");
  await filled(nr);
  await nr.locator("[data-next-step]").click();
  await nr.locator("[data-review-ack]").check();
  await nr.locator("[data-confirm-order]").click();
  ok(
    nr.url().endsWith("/checkout/") &&
      (await nr.locator("[data-inline-receipt]").isVisible()),
    "blocked receipt storage displays inline",
  );
  ok(
    await nr
      .locator("[data-checkout-warning]")
      .textContent()
      .then((t) => t.includes("تازه‌سازی")),
    "inline receipt refresh limitation",
  );
  ok(
    await nr
      .locator("[data-private-field]")
      .evaluateAll((es) => es.every((e) => e.value === "")),
    "private fields cleared after order",
  );
  await noReceipt.close();
  for (const width of [320, 390, 430, 768, 1024, 1440, 1920]) {
    await p.setViewportSize({ width, height: 1000 });
    await go(p);
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    ok(overflow <= 1, "home overflow " + width);
    await go(p, "catalog/");
    ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "catalog overflow " + width,
    );
    viewports.push({ width, overflow });
  }
  const nojs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const n = await nojs.newPage();
  await go(n, "product/flux/");
  ok(await n.locator("main [data-add]").isDisabled(), "no-JS add disabled");
  ok(await n.locator("noscript").isVisible(), "no-JS explanation");
  await go(n, "checkout/");
  ok(
    await n
      .locator("[data-private-field]")
      .evaluateAll((es) => es.every((e) => e.disabled && !e.name)),
    "no-JS private fields inert and unnamed",
  );
  ok(
    (await n.locator("[data-checkout-form]").getAttribute("method")) ===
      "dialog",
    "native form cannot transmit PII",
  );
  await nojs.close();
  const rm = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const rmp = await rm.newPage();
  watch(rmp);
  await go(rmp);
  await rmp.locator("[data-open-menu]").click();
  ok(
    await rmp.locator("[data-menu-dialog]").evaluate((e) => e.open),
    "mobile native menu opens",
  );
  await rmp.keyboard.press("Escape");
  ok(
    await rmp
      .locator("[data-open-menu]")
      .evaluate((e) => e === document.activeElement),
    "mobile menu returns focus",
  );
  ok(
    await rmp.evaluate(() =>
      document
        .getAnimations()
        .every(
          (a) =>
            a.playState !== "running" ||
            a.effect
              .getKeyframes()
              .every(
                (k) =>
                  !["transform", "translate", "scale", "rotate"].some(
                    (p) => p in k && k[p] !== "none",
                  ),
              ),
        ),
    ),
    "reduced motion disables spatial animations while retaining color feedback",
  );
  await rm.close();

  await go(p, "product/calm/");
  const calm = p.locator("main [data-product]");
  ok(
    (await calm.locator(".hp-thumbs button:visible").count()) === 2,
    "existing bone rear photograph included",
  );
  await calm.locator(".hp-colours [data-colour=charcoal]").click();
  ok(
    (await calm.locator(".hp-thumbs button:visible").count()) === 1,
    "only available charcoal views shown",
  );
  await go(p, "product/flux/");
  await p.locator("main [data-product]").evaluate((panel) => {
    for (let i = 0; i < 12; i++) {
      panel
        .querySelector(
          ".hp-colours [data-colour=" + (i % 2 ? "blue" : "orange") + "]",
        )
        .click();
    }
    panel.querySelector('.hp-thumbs [data-angle="4"]').click();
  });
  await eventually(
    async () =>
      await p
        .locator("main [data-product-image]")
        .evaluate(
          (i) =>
            i.complete &&
            i.naturalWidth > 0 &&
            getComputedStyle(i).opacity === "1",
        ),
    "rapid color and angle changes leave latest image fully visible",
  );
  ok(
    (await p.locator("main [data-product-image]").getAttribute("src")).includes(
      "h05-blue-4",
    ),
    "latest blue detail survives interruption",
  );
  await go(p);
  await p.locator("[data-open-cart]").click();
  await p.evaluate(() => {
    document.querySelector("[data-cart-dialog] [data-close-dialog]").click();
    setTimeout(() => document.querySelector("[data-open-cart]").click(), 40);
  });
  await p.waitForTimeout(400);
  ok(
    await p
      .locator("[data-cart-dialog]")
      .evaluate((d) => d.open && getComputedStyle(d).opacity === "1"),
    "drawer close can retarget to open",
  );
  await p.keyboard.press("Escape");
  await p.locator("dialog[open]").waitFor({ state: "hidden" });
  ok(
    await p
      .locator("[data-open-cart]")
      .evaluate((b) => b === document.activeElement),
    "normal-motion drawer restores trigger focus",
  );
  await go(p, "catalog/");
  await p.locator("[data-filter-form]").evaluate((f) => {
    for (const sort of ["price-desc", "price-asc", "newest", "price-asc"]) {
      const s = f.querySelector("[name=sort]");
      s.value = sort;
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  ok(
    (await p
      .locator("[data-catalog-grid] [data-card]:visible")
      .first()
      .getAttribute("data-card")) === "h09",
    "rapid sorting commits final semantic order",
  );
  if (!draft) {
    const sources = JSON.parse(
      await fs.readFile("public/art/heepzy/sources.json", "utf8"),
    );
    const active = sources.images.filter((i) => i.active !== false);
    ok(active.length === 60, "active photos follow latest human request");
    for (const image of active) {
      ok(
        (await fetch(origin + "/art/heepzy/" + image.file)).status === 200,
        "asset " + image.id,
      );
    }
    await go(p);
    await p.evaluate(async () => {
      for (const img of document.querySelectorAll("main img,.hp-footer img")) {
        img.loading = "eager";
      }
      await Promise.all(
        Array.from(document.querySelectorAll("main img,.hp-footer img")).map(
          (i) => i.decode().catch(() => null),
        ),
      );
    });
    ok(
      await p
        .locator("main img,.hp-footer img")
        .evaluateAll((es) => es.every((e) => e.complete && e.naturalWidth > 0)),
      "all home images decode",
    );
    ok(bad.length === 0, "no failed responses " + bad.join(","));
  }
  ok(errors.length === 0, "no runtime errors " + JSON.stringify(errors));
  const report = {
    date: new Date().toISOString(),
    status: "passed",
    draft,
    checks,
    routes: 24,
    viewports,
    labels,
    errors,
    failedResponses: bad,
  };
  await fs.mkdir("output/heepzy", { recursive: true });
  await fs.writeFile(
    `output/heepzy/${draft ? "draft-" : ""}test-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ status: "passed", draft, checks, routes: 24 }));
} finally {
  await browser?.close();
  server.kill();
}
