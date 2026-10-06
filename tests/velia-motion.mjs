import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, origin, launch } from "./v10-common.mjs";
const browser = await launch();
let checks = 0;
const ok = (value, message) => {
  assert(value, message);
  checks++;
};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1058 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.addInitScript(() => {
    window.addEventListener("pagereveal", (event) => {
      window.__veliaShared = !!event.viewTransition;
    });
    window.__veliaTargets = 0;
    new MutationObserver(() => {
      window.__veliaTargets = Math.max(
        window.__veliaTargets,
        [...document.images].filter(
          (img) => img.style.viewTransitionName === "skin-product-image",
        ).length,
      );
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  });
  await page.goto(origin + "/demo/velia/shop/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.querySelector('[data-skin-category="body"]').click();
    document.querySelector('[data-skin-category="serum"]').click();
    document.querySelector('[data-skin-category="all"]').click();
    document.querySelector("[data-skin-sort]").value = "price-low";
    document
      .querySelector("[data-skin-sort]")
      .dispatchEvent(new Event("change"));
  });
  ok(
    (await page
      .locator("[data-product-grid] [data-skin-card]:not([hidden])")
      .count()) === 20,
    "rapid filters keep final category",
  );
  await page.waitForFunction(() =>
    document
      .querySelector("[data-product-grid]")
      .getAnimations({ subtree: true })
      .every((a) => a.playState !== "running"),
  );
  ok(
    (await page
      .locator("[data-product-grid] [data-skin-card]")
      .first()
      .getAttribute("data-skin-card")) === "hand-cream",
    "sort settles after interrupted motion",
  );
  const card = page.locator(
    '[data-skin-card="facial-cleanser"] .skin-card-image',
  );
  const before = await card.boundingBox();
  await card.hover();
  await page.waitForTimeout(260);
  const after = await card.boundingBox();
  ok(
    Math.abs(before.x - after.x) < 1 &&
      Math.abs(before.width - after.width) < 1,
    "hover preserves the product hit area",
  );
  const image = await card.locator("img").getAttribute("src");
  await card.click();
  await page.waitForLoadState("networkidle");
  ok(
    (await page.locator("[data-gallery-image]").getAttribute("src")).endsWith(
      image,
    ),
    "shared navigation preserves the selected artwork",
  );
  ok(
    (await page
      .locator("[data-gallery-source]")
      .last()
      .getAttribute("aria-pressed")) === "true",
    "arrival synchronizes gallery selection",
  );
  if (await page.evaluate(() => "onpagereveal" in window)) {
    ok(
      await page.evaluate(() => window.__veliaShared === true),
      "native document transition used",
    );
    ok(
      await page.evaluate(() => window.__veliaTargets === 1),
      "one shared image target",
    );
    await page.waitForFunction(
      () => ![...document.images].some((img) => img.style.viewTransitionName),
      "capture names cleaned up",
    );
  }
  // A leftward gallery choice in RTL enters from the left, and reversing uses the other side.
  await page.locator("[data-gallery-source]").first().click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-gallery-source]")
        .getAttribute("aria-pressed") === "true",
  );
  const gallery = page.locator("[data-gallery-image]");
  ok(
    await gallery.evaluate((e) =>
      e
        .getAnimations()
        .some(
          (a) => a.effect.getKeyframes()[0].transform === "translateX(12px)",
        ),
    ),
    "gallery previous moves from its RTL side",
  );
  await page.waitForFunction(() =>
    document
      .querySelector("[data-gallery-image]")
      .getAnimations()
      .every((a) => a.playState !== "running"),
  );
  await page.locator("[data-gallery-source]").last().click();
  await page.waitForFunction(
    () =>
      document
        .querySelectorAll("[data-gallery-source]")[1]
        .getAttribute("aria-pressed") === "true",
  );
  ok(
    await gallery.evaluate((e) =>
      e
        .getAnimations()
        .some(
          (a) => a.effect.getKeyframes()[0].transform === "translateX(-12px)",
        ),
    ),
    "gallery next moves from its RTL side",
  );
  await page.locator('[data-product-tab="use"]').click();
  await page.keyboard.press("ArrowLeft");
  ok(
    await page.locator('[data-product-panel="reviews"]').isVisible(),
    "keyboard tabs commit immediately",
  );
  ok(
    await page
      .locator('[data-product-panel="reviews"]')
      .evaluate((e) => e.getAnimations().length === 0),
    "keyboard tab navigation has no delayed entrance",
  );
  await page.locator(".skin-product-buy-row [data-add-product]").click();
  await page.locator("[data-bag-open]").first().click();
  await page.waitForTimeout(400);
  const continuity = await page.evaluate(() => {
    const row = document.querySelector("[data-bag-dialog] [data-line-id]"),
      plus = row.querySelector("[data-line-plus]");
    plus.focus();
    plus.click();
    plus.click();
    return {
      same: row === document.querySelector("[data-bag-dialog] [data-line-id]"),
      focused: plus === document.activeElement,
      quantity: row.querySelector("[data-line-quantity]").textContent,
    };
  });
  ok(
    continuity.same && continuity.focused && continuity.quantity === "۳",
    "cart row and focus survive repeated quantity updates",
  );
  const removed = await page.evaluate(() => {
    document.querySelector("[data-bag-dialog] [data-remove]").click();
    return {
      lines: document.querySelectorAll("[data-bag-dialog] [data-line-id]")
        .length,
      ghosts: [
        ...document.querySelectorAll("[data-bag-dialog] [data-motion-ghost]"),
      ].map((e) => ({ inert: e.inert, hidden: e.getAttribute("aria-hidden") })),
    };
  });
  ok(
    removed.lines === 0 &&
      removed.ghosts.length > 0 &&
      removed.ghosts.every((g) => g.inert && g.hidden === "true"),
    "exit artwork has no interactive or accessible duplicate",
  );
  await page.locator("[data-bag-dialog] [data-undo]").click();
  ok(
    (await page.locator("[data-bag-dialog] [data-motion-ghost]").count()) === 0,
    "rapid undo clears the superseded exit",
  );
  await page.keyboard.press("Escape");
  await page.locator("[data-mega] summary").click();
  await page.waitForTimeout(60);
  await page.keyboard.press("Escape");
  ok(
    await page.locator("[data-mega]").evaluate((e) => !e.open),
    "menu closes semantically before its exit completes",
  );
  await page.locator("[data-mega] summary").click();
  ok(
    (await page.locator(".skin-header [data-motion-ghost]").count()) === 0,
    "reopening menu clears its exit artwork",
  );
  await page.keyboard.press("Escape");
  await page.goto(origin + "/demo/velia/", { waitUntil: "networkidle" });
  const art = page.locator("[data-skin-tilt]");
  const artRect = await art.boundingBox();
  await page.mouse.move(
    artRect.x + artRect.width * 0.8,
    artRect.y + artRect.height * 0.35,
  );
  await page.waitForFunction(
    () => document.querySelector("[data-skin-tilt]").style.transform !== "",
  );
  await page.mouse.move(1100, 900);
  await page.waitForFunction(
    () => document.querySelector("[data-skin-tilt]").style.transform === "",
  );
  ok(
    await art.evaluate((e) => e.style.willChange === ""),
    "pointer motion settles and releases its layer",
  );
  await page.goto(origin + "/demo/velia/shop/", { waitUntil: "networkidle" });
  await page.goto(origin + "/demo/velia/", { waitUntil: "networkidle" });
  ok(
    await page
      .locator(".velia-hero-line")
      .first()
      .evaluate((e) => e.getAnimations().length === 0),
    "hero introduction does not replay on navigation",
  );
  await page.goto(origin + "/demo/velia/checkout/", {
    waitUntil: "networkidle",
  });
  for (const [field, value] of [
    ["name", "کاربر نمونه"],
    ["phone", "09123456789"],
    ["city", "تهران"],
    ["postal", "1234567890"],
    ["address", "نشانی آزمایشی، کوچهٔ نمونه، پلاک ۱۲"],
  ])
    await page.locator(`[name="${field}"]`).fill(value);
  await page.locator("[data-checkout-next]").click();
  ok(
    await page
      .locator('[data-checkout-panel="2"]')
      .evaluate((e) =>
        e
          .getAnimations()
          .some(
            (a) => a.effect.getKeyframes()[0].transform === "translateX(-10px)",
          ),
      ),
    "forward checkout motion follows RTL direction",
  );
  await page.locator("[data-checkout-back]").click();
  ok(
    await page
      .locator('[data-checkout-panel="1"]')
      .evaluate((e) =>
        e
          .getAnimations()
          .some(
            (a) => a.effect.getKeyframes()[0].transform === "translateX(10px)",
          ),
      ),
    "backward checkout reverses direction",
  );
  await page.locator("[data-checkout-next]").click();
  await page.locator("[data-checkout-confirm]").click();
  const receiptMark = await page.locator(".skin-receipt-mark").boundingBox();
  ok(
    receiptMark.y >= 0 && receiptMark.y + receiptMark.height < 1000,
    "receipt confirmation is actually in view",
  );
  ok(
    await page
      .locator("[data-receipt-heading]")
      .evaluate((e) => e === document.activeElement),
    "receipt focus moves without hiding its confirmation",
  );
  await page.goto(origin + "/demo/velia/shop/", { waitUntil: "networkidle" });
  await page.locator('[data-skin-category="body"]').click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches &&
      document
        .querySelector("[data-product-grid]")
        .getAnimations({ subtree: true })
        .every((a) => a.playState !== "running"),
    null,
    { timeout: 2000 },
  );
  ok(
    await page.evaluate(() =>
      document
        .querySelector("[data-product-grid]")
        .getAnimations({ subtree: true })
        .every((a) => a.playState !== "running"),
    ),
    "changing reduced motion cancels animations",
  );
  await page.locator("[data-bag-open]").first().click();
  await page.keyboard.press("Escape");
  ok(
    await page
      .locator("[data-bag-open]")
      .first()
      .evaluate((e) => e === document.activeElement),
    "cart restores trigger focus",
  );
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.locator("[data-skin-theme]").click();
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        ["text", "muted", "green", "bg", "surface", "soft", "green-soft"].map(
          (n) => [n, s.getPropertyValue("--skin-" + n).trim()],
        ),
      );
    });
    const lum = (hex) => {
      const c = hex.replace("#", "");
      const full = c.length === 3 ? [...c].map((x) => x + x).join("") : c;
      const rgb = [0, 2, 4]
        .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    for (const [fg, bg] of [
      ["text", "bg"],
      ["muted", "bg"],
      ["muted", "surface"],
      ["muted", "soft"],
      ["green", "green-soft"],
      ["green", "surface"],
    ]) {
      const a = lum(tokens[fg]),
        b = lum(tokens[bg]);
      ok(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
        `${theme} ${fg}/${bg} text contrast`,
      );
    }
  }
  ok(runtimeErrors.length === 0, JSON.stringify(runtimeErrors));
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });
  const mp = await mobile.newPage();
  await mp.goto(origin + "/demo/velia/products/facial-cleanser/", {
    waitUntil: "networkidle",
  });
  await mp.locator(".skin-related").scrollIntoViewIfNeeded();
  await mp.locator("[data-mobile-purchase]").waitFor({ state: "visible" });
  await mp.locator("[data-mobile-purchase] button").focus();
  await mp.evaluate(() => scrollTo(0, 0));
  await mp.waitForFunction(
    () => document.querySelector("[data-mobile-purchase]").hidden,
  );
  ok(
    await mp
      .locator(".skin-product-buy-row [data-add-product]")
      .evaluate((e) => e === document.activeElement),
    "sticky exit restores focus to the primary purchase control",
  );
  await mp.locator(".skin-related").scrollIntoViewIfNeeded();
  await mp.locator("[data-mobile-purchase]").waitFor({ state: "visible" });
  await mp.emulateMedia({ reducedMotion: "reduce" });
  await mp.waitForFunction(() =>
    document
      .querySelector("[data-mobile-purchase]")
      .getAnimations()
      .every((a) => a.playState !== "running"),
  );
  ok(
    await mp.locator("[data-mobile-purchase]").isVisible(),
    "reduced motion preserves the current sticky purchase state",
  );
  await mobile.close();
  const nojs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await nojs.newPage();
  await staticPage.goto(origin + "/demo/velia/products/facial-cleanser/", {
    waitUntil: "networkidle",
  });
  ok(
    await staticPage.locator('[data-product-panel="use"]').isVisible(),
    "product information remains readable without JavaScript",
  );
  ok(
    !(await staticPage
      .locator(".skin-product-buy-row [data-add-product]")
      .isVisible()),
    "unavailable JS action hidden",
  );
  const report = {
    checks,
    scope:
      "Interrupted motion, shared artwork, RTL gallery, keyboard tabs, cart continuity, menu exit, spring reset, theme tokens, JavaScript-off product content",
  };
  await fs.writeFile(
    "verification-velia-motion.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await browser.close();
  server.close();
}
