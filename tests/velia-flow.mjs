import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { server, origin, launch } from "./v10-common.mjs";

const out = "output/playwright/velia-flow";
await fs.mkdir(out, { recursive: true });
const browser = await launch();
let checks = 0;
const measurements = [];
const runtimeErrors = [];
const ok = (value, message) => {
  assert(value, message);
  checks++;
};
const settle = (page, selector) =>
  page.waitForFunction(
    (s) =>
      document
        .querySelector(s)
        .getAnimations({ subtree: true })
        .every((a) => a.playState !== "running") &&
      !document.querySelector(s).querySelector("[data-motion-ghost]"),
    selector,
  );
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
    page.on("pageerror", (error) =>
      runtimeErrors.push(`${name}: ${error.message}`),
    );
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("velia-flow-seeded")) {
        localStorage.setItem(
          "velia-cart-v1",
          JSON.stringify({
            lines: [
              { id: "facial-cleanser", quantity: 1 },
              { id: "body-milk", quantity: 1 },
              { id: "rosehip-oil", quantity: 1 },
            ],
            promo: false,
          }),
        );
        sessionStorage.setItem("velia-flow-seeded", "1");
      }
      addEventListener("pagereveal", (event) => {
        if (!event.viewTransition) return;
        event.viewTransition.ready
          .then(() => {
            const style = (target) =>
              getComputedStyle(document.documentElement, target).animationName;
            window.__veliaFlowTransition = {
              root: style("::view-transition-new(root)"),
              header: style("::view-transition-new(velia-header)"),
              page: style("::view-transition-new(velia-page)"),
              direction: document.documentElement.dataset.veliaNavigation,
            };
          })
          .catch(() => {});
      });
    });
    await page.goto(origin + "/demo/velia/cart/", { waitUntil: "networkidle" });
    // Keep the following summary in view to check the visible movement, too.
    await page.evaluate(() => {
      const rect = document
        .querySelector('[data-bag-surface="page"] .skin-totals')
        .getBoundingClientRect();
      scrollTo({
        top: Math.max(0, rect.top + scrollY - innerHeight * 0.55),
        behavior: "instant",
      });
    });
    const removal = await page.evaluate(() => {
      const s = document.querySelector('[data-bag-surface="page"]');
      const read = () => ({
        height: s.getBoundingClientRect().height,
        summary: s.querySelector(".skin-totals").getBoundingClientRect().top,
      });
      const before = read();
      const button = s.querySelector("[data-remove]");
      button.focus({ preventScroll: true });
      button.click();
      return {
        before,
        immediate: read(),
        lines: s.querySelectorAll("[data-line-id]").length,
        focused: document.activeElement === s.querySelector("[data-undo]"),
      };
    });
    ok(removal.lines === 2, `${name}: deletion updates the cart immediately`);
    ok(removal.focused, `${name}: deletion keeps focus on undo`);
    ok(
      Math.abs(removal.before.height - removal.immediate.height) < 1,
      `${name}: cart surface has no initial size jump`,
    );
    ok(
      Math.abs(removal.before.summary - removal.immediate.summary) < 1,
      `${name}: visible total has no initial position jump`,
    );
    await page.waitForTimeout(80);
    const middle = await page
      .locator('[data-bag-surface="page"]')
      .evaluate((e) => e.getBoundingClientRect().height);
    await settle(page, '[data-bag-surface="page"]');
    const final = await page
      .locator('[data-bag-surface="page"]')
      .evaluate((e) => e.getBoundingClientRect().height);
    ok(
      middle < removal.before.height && middle > final,
      `${name}: cart height moves through an intermediate state`,
    );
    ok(
      final < removal.before.height - 20,
      `${name}: removal settles at the actual content size`,
    );
    measurements.push({ name, cart: { ...removal, middle, final } });
    await page.screenshot({ path: `${out}/${name}-cart.png` });
    const restore = await page.evaluate(() => {
      const s = document.querySelector('[data-bag-surface="page"]');
      const before = s.getBoundingClientRect().height;
      s.querySelector("[data-undo]").click();
      return { before, immediate: s.getBoundingClientRect().height };
    });
    ok(
      Math.abs(restore.before - restore.immediate) < 1,
      `${name}: undo expands from the displayed size`,
    );
    await page.waitForTimeout(70);
    const interrupted = await page.evaluate(() => {
      const s = document.querySelector('[data-bag-surface="page"]');
      const before = s.getBoundingClientRect().height;
      s.querySelector("[data-remove]").click();
      return {
        before,
        immediate: s.getBoundingClientRect().height,
        lines: s.querySelectorAll("[data-line-id]").length,
      };
    });
    ok(
      Math.abs(interrupted.before - interrupted.immediate) < 1 &&
        interrupted.lines === 2,
      `${name}: a second deletion retargets the expansion`,
    );
    await settle(page, '[data-bag-surface="page"]');
    await page.evaluate(() => {
      const s = document.querySelector('[data-bag-surface="page"]');
      while (s.querySelector("[data-remove]"))
        s.querySelector("[data-remove]").click();
    });
    ok(
      await page
        .locator('[data-bag-surface="page"] [data-bag-empty]')
        .isVisible(),
      `${name}: the last item changes to the empty state immediately`,
    );
    await settle(page, '[data-bag-surface="page"]');
    ok(
      await page
        .locator('[data-bag-surface="page"]')
        .evaluate(
          (e) => !e.style.height && getComputedStyle(e).overflow !== "clip",
        ),
      `${name}: resizing leaves no locked height or clipping`,
    );
    await page.locator('[data-bag-surface="page"] [data-undo]').click();
    await settle(page, '[data-bag-surface="page"]');
    ok(
      (await page
        .locator('[data-bag-surface="page"] [data-line-id]')
        .count()) === 1,
      `${name}: the last item can be restored`,
    );

    await page.goto(origin + "/demo/velia/shop/", { waitUntil: "networkidle" });
    const filtering = await page.evaluate(() => {
      const s = document.querySelector("[data-results-surface]");
      const before = s.getBoundingClientRect().height;
      const button = document.querySelector('[data-skin-category="body"]');
      button.focus({ preventScroll: true });
      button.click();
      return {
        before,
        immediate: s.getBoundingClientRect().height,
        count: s.querySelectorAll("[data-skin-card]:not([hidden])").length,
        focused: document.activeElement === button,
      };
    });
    ok(
      filtering.count === 5 && filtering.focused,
      `${name}: a filter immediately selects its items and keeps focus`,
    );
    ok(
      Math.abs(filtering.before - filtering.immediate) < 1,
      `${name}: a filter preserves the starting results size`,
    );
    await page.waitForTimeout(80);
    const filterMiddle = await page
      .locator("[data-results-surface]")
      .evaluate((e) => e.getBoundingClientRect().height);
    const rapid = await page.evaluate(() => {
      const s = document.querySelector("[data-results-surface]");
      const before = s.getBoundingClientRect().height;
      for (const category of ["serum", "sun", "all"])
        document.querySelector(`[data-skin-category="${category}"]`).click();
      return {
        before,
        immediate: s.getBoundingClientRect().height,
        count: s.querySelectorAll("[data-skin-card]:not([hidden])").length,
      };
    });
    ok(
      filterMiddle < filtering.before,
      `${name}: results resize between frames`,
    );
    ok(
      Math.abs(rapid.before - rapid.immediate) < 1 && rapid.count === 20,
      `${name}: rapid filters retarget without snapping or stale results`,
    );
    await settle(page, "[data-results-surface]");
    const filterFinal = await page
      .locator("[data-results-surface]")
      .evaluate((e) => e.getBoundingClientRect().height);
    ok(
      Math.abs(filterFinal - filtering.before) < 1,
      `${name}: repeated filters restore the full natural layout`,
    );
    measurements.push({
      name,
      filter: { ...filtering, middle: filterMiddle, rapid, final: filterFinal },
    });
    await page.locator("[data-skin-search] input").fill("محصولی که وجود ندارد");
    await page.locator("[data-no-results]").waitFor({ state: "visible" });
    await settle(page, "[data-results-surface]");
    ok(
      (await page.locator("[data-skin-card]:not([hidden])").count()) === 0 &&
        (await page.locator("[data-no-results]").isVisible()),
      `${name}: no-results resizing settles correctly`,
    );
    await page.locator("[data-no-results] [data-clear-filters]").click();
    await settle(page, "[data-results-surface]");
    ok(
      (await page
        .locator("[data-product-grid] [data-skin-card]:not([hidden])")
        .count()) === 20,
      `${name}: recovery from no results restores the catalog`,
    );
    await page.screenshot({ path: `${out}/${name}-catalog.png` });

    await page.evaluate(() => {
      for (const id of ["body-milk", "rosehip-oil"])
        document
          .querySelector(`[data-skin-card="${id}"] [data-add-product]`)
          .click();
    });
    await page.locator("[data-bag-open]").first().click();
    await settle(page, "[data-bag-dialog]");
    await page.evaluate(() => {
      const dialog = document.querySelector("[data-bag-dialog]");
      const rect = dialog.querySelector(".skin-totals").getBoundingClientRect();
      dialog.scrollTop += Math.max(0, rect.top - innerHeight * 0.5);
    });
    const drawer = await page.evaluate(() => {
      const s = document.querySelector("[data-bag-dialog] [data-bag-surface]");
      const read = () => ({
        height: s.getBoundingClientRect().height,
        summary: s.querySelector(".skin-totals").getBoundingClientRect().top,
      });
      const before = read();
      s.querySelector("[data-remove]").click();
      return {
        before,
        immediate: read(),
        count: s.querySelectorAll("[data-line-id]").length,
      };
    });
    ok(drawer.count === 2, `${name}: drawer deletion commits immediately`);
    ok(
      Math.abs(drawer.before.height - drawer.immediate.height) < 1,
      `${name}: drawer size starts continuously`,
    );
    ok(
      Math.abs(drawer.before.summary - drawer.immediate.summary) < 1,
      `${name}: drawer totals start continuously`,
    );
    await settle(page, "[data-bag-dialog]");
    ok(
      await page
        .locator("[data-bag-dialog] [data-bag-surface]")
        .evaluate(
          (e) => !e.style.height && getComputedStyle(e).overflow !== "clip",
        ),
      `${name}: drawer resizing releases the surface`,
    );
    await page.screenshot({ path: `${out}/${name}-drawer.png` });
    await page.keyboard.press("Escape");
    ok(
      await page
        .locator("[data-bag-open]")
        .first()
        .evaluate((e) => e === document.activeElement),
      `${name}: drawer returns focus after its changes`,
    );

    await page.locator(".skin-logo").click();
    await page.waitForURL("**/demo/velia/", { waitUntil: "networkidle" });
    if (await page.evaluate(() => "onpagereveal" in window)) {
      await page.waitForFunction(() => window.__veliaFlowTransition?.page);
      const transition = await page.evaluate(
        () => window.__veliaFlowTransition,
      );
      ok(
        transition.root === "none" && transition.header === "none",
        `${name}: the page transition keeps the shell still`,
      );
      ok(
        transition.page === "velia-page-in" &&
          transition.direction === "forward",
        `${name}: new content transitions separately`,
      );
    }
    await page.locator('.velia-hero-copy a[href$="/shop/"]').click();
    await page.waitForURL("**/demo/velia/shop/", { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    if (await page.evaluate(() => "onpagereveal" in window)) {
      await page.waitForFunction(
        () => window.__veliaFlowTransition?.direction === "back",
      );
      ok(
        await page.evaluate(
          () => document.documentElement.dataset.veliaNavigation === "back",
        ),
        `${name}: browser back reverses the page direction`,
      );
    }
    await page.locator('.velia-hero-copy a[href$="/shop/"]').click();
    await page.waitForURL("**/demo/velia/shop/", { waitUntil: "networkidle" });
    await page.locator('[data-skin-category="body"]').click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page, "[data-results-surface]");
    ok(
      (await page
        .locator("[data-product-grid] [data-skin-card]:not([hidden])")
        .count()) === 5,
      `${name}: reduced motion cancels resizing without changing the selection`,
    );
    ok(
      await page
        .locator("[data-results-surface]")
        .evaluate(
          (e) =>
            !e.style.height && e.getAnimations({ subtree: true }).length === 0,
        ),
      `${name}: reduced motion leaves a natural, immediate layout`,
    );
    await context.close();
    await fs.rename(await video.path(), path.join(out, `${name}.webm`));
  }
  ok(runtimeErrors.length === 0, JSON.stringify(runtimeErrors));
  const report = { checks, widths: [390, 1440], measurements, runtimeErrors };
  await fs.writeFile(
    "verification-velia-flow.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({ checks, widths: report.widths, runtimeErrors }, null, 2),
  );
} finally {
  await browser.close();
  server.close();
}
