import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, origin, launch } from "./v10-common.mjs";
let browser,
  checks = 0;
const errors = [],
  reflow = [];
const ok = (value, message) => {
  assert(value, message);
  checks++;
};
const routes = [
  "/",
  "/about/",
  "/work/",
  "/services/",
  "/contact/",
  "/work/form/",
  "/work/luma/",
  "/work/orbit/",
  "/work/medical/",
  "/work/velia/",
  "/work/rava/",
  "/work/avan/",
  "/privacy/",
  "/404.html",
];
try {
  browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  const go = (route) => p.goto(origin + route, { waitUntil: "networkidle" });
  for (const width of [320, 390, 768, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await go(route);
      await p.evaluate(() => document.fonts.ready);
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      if (overflow > 1) reflow.push({ width, route, overflow });
      ok(overflow <= 1, `overflow ${width} ${route}`);
    }
  }
  await go("/");
  await p.emulateMedia({ colorScheme: "dark" });
  await go("/");
  ok(
    (await p.locator("html").getAttribute("data-theme")) === "light",
    "first visit defaults to light even when the OS is dark",
  );
  const themeControl = p.locator(".site-header [data-theme-toggle]");
  ok(await themeControl.isVisible(), "theme choice is available in the header");
  await themeControl.focus();
  await p.keyboard.press("Enter");
  ok(
    (await p.locator("html").getAttribute("data-theme")) === "dark",
    "keyboard theme control enables dark mode",
  );
  ok(
    (await p.locator('[data-theme-toggle][aria-pressed="true"]').count()) === 2,
    "header and footer theme controls stay synchronized",
  );
  await go("/contact/");
  ok(
    (await p.locator("html").getAttribute("data-theme")) === "dark",
    "theme selection persists across navigation",
  );
  ok(
    await p.locator("#service").evaluate((element) => {
      const select = getComputedStyle(element),
        option = getComputedStyle(element.querySelector("option"));
      return (
        select.color === "rgb(255, 255, 255)" &&
        select.backgroundColor === "rgb(21, 21, 21)" &&
        option.color === select.color &&
        option.backgroundColor === select.backgroundColor
      );
    }),
    "native select and option text share a readable dark palette",
  );
  await p.locator(".site-header [data-theme-toggle]").click();
  await p.reload({ waitUntil: "networkidle" });
  ok(
    (await p.locator("html").getAttribute("data-theme")) === "light",
    "explicit light selection persists after reload",
  );
  await p.emulateMedia({ colorScheme: "light" });
  await go("/");
  const intro = await p.locator("h1").boundingBox();
  const portrait = await p.locator(".portrait-frame").boundingBox();
  ok(
    Math.abs(intro.y - 280) < 1 && Math.abs(intro.height - 264) < 4,
    "desktop intro proportions",
  );
  ok(
    Math.abs(portrait.width - 636) < 1 && Math.abs(portrait.height - 786) < 1,
    "reference portrait proportions",
  );
  await p
    .locator('.project-carousel [data-slide-index="6"]:not([data-clone]) a')
    .first()
    .focus();
  ok(
    (await p.locator(".project-carousel").getAttribute("data-slide")) === "6",
    "keyboard focus immediately reveals the offscreen original",
  );
  ok(
    await p
      .locator(".project-carousel .carousel-viewport")
      .evaluate((e) => e.scrollLeft === 0),
    "native focus does not offset the track",
  );
  await p.locator(".project-carousel").focus();
  await p.keyboard.press("ArrowLeft");
  ok(
    (await p.locator(".project-carousel").getAttribute("data-slide")) === "0",
    "RTL keyboard direction wraps",
  );
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    for (let i = 0; i < 9; i++)
      document.querySelector("[data-carousel-next]").click();
  });
  ok(
    (await p.locator(".project-carousel").getAttribute("data-slide")) === "2",
    "rapid repeated navigation preserves every action",
  );
  await p.waitForTimeout(1000);
  const visible = await p.locator(".project-carousel").evaluate((e) => {
    const view = e.querySelector(".carousel-viewport").getBoundingClientRect();
    return [...e.querySelectorAll("[data-slide-index]")].filter((s) => {
      const b = s.getBoundingClientRect();
      return b.left >= view.left - 1 && b.right <= view.right + 1;
    }).length;
  });
  ok(visible === 3, "infinite wrap retains three complete visible cards");
  await p.locator('[data-carousel-dot="2"]').click();
  ok(
    (await p.locator(".quote-carousel").getAttribute("data-slide")) === "2",
    "quote pagination",
  );
  await p.locator("[data-lightbox]").first().click();
  ok(
    await p.locator(".media-lightbox").evaluate((e) => e.open),
    "native lightbox",
  );
  await p.keyboard.press("Escape");
  ok(
    await p
      .locator("[data-lightbox]")
      .first()
      .evaluate((e) => e === document.activeElement),
    "lightbox returns focus",
  );
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.locator("[data-carousel-next]").click();
  ok(
    await p.evaluate(
      () =>
        document.getAnimations().every((a) => a.playState !== "running") &&
        !document.querySelector(".reveal-waiting"),
    ),
    "reduced motion settles running effects and exposes all content",
  );
  await go("/work/");
  await p.locator('[data-filter="interactive"]').click();
  ok(
    (await p.locator(".portfolio-grid-entry:not([hidden])").count()) === 1,
    "archive category filter",
  );
  await p.locator(".menu-toggle").click();
  ok(
    await p
      .locator(".menu-close")
      .evaluate((e) => e === document.activeElement),
    "menu focus is immediate",
  );
  await p.keyboard.press("Escape");
  ok(
    await p
      .locator(".menu-toggle")
      .evaluate((e) => e === document.activeElement),
    "menu returns focus",
  );
  await p.locator(".search-toggle").click();
  for (const [query, expected] of [
    ["نمونه کار", "/work/"],
    ["نمونه‌کار", "/work/"],
    ["نوا", "/work/medical/"],
    ["نِوا", "/work/medical/"],
    ["NEVA", "/work/medical/"],
    ["ریفت", "/work/luma/"],
    ["ريفْت", "/work/luma/"],
    ["RIFT", "/work/luma/"],
    ["ولو", "/work/orbit/"],
    ["وِلو", "/work/orbit/"],
    ["VELO", "/work/orbit/"],
  ]) {
    await p.locator("#site-query").fill(query);
    ok(
      (await p.locator(".search-results a").first().getAttribute("href")) ===
        expected,
      `search accepts Persian spelling variation: ${query}`,
    );
  }
  await p.keyboard.press("Escape");
  const group = p.locator(".nav-group").first();
  const trigger = await group.locator("summary").boundingBox();
  await group.locator("summary").hover();
  await p.mouse.move(
    trigger.x + trigger.width / 2,
    trigger.y + trigger.height + 9,
  );
  await p.waitForTimeout(400);
  ok(
    await group.evaluate((e) => e.open),
    "pointer can pause in the gap before entering the dropdown",
  );
  await group.locator(".nav-dropdown a").first().hover();
  ok(
    await group.evaluate((e) => e.open),
    "dropdown stays open when reached from its trigger",
  );
  await p.mouse.move(10, 700);
  await go("/contact/");
  await p.locator("button[type=submit]").click();
  ok(
    await p.locator("#name").evaluate((e) => e === document.activeElement),
    "validation focuses first error",
  );
  await p.locator("#name").fill("تست پروژه");
  await p.locator("#contact").fill("test@example.com");
  await p
    .locator("#message")
    .fill("درخواست آزمایشی برای بررسی ساخت خلاصه و تغییر اطلاعات پروژه.");
  await p.locator("#service").selectOption("02");
  await p.locator("button[type=submit]").click();
  ok(
    await p.locator(".request-result").isVisible(),
    "brief is produced without claiming delivery",
  );
  await p.locator("#company").fill("تغییر آزمایشی");
  ok(
    await p.locator(".request-result").evaluate((e) => e.hidden),
    "editing an optional field invalidates the old brief",
  );
  await p.locator("button[type=submit]").click();
  const waiting = p.waitForEvent("download");
  await p.locator("[data-download]").click();
  ok(
    (await waiting).suggestedFilename() === "project-request.txt",
    "brief download works",
  );
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await nojs.goto(origin + "/contact/");
  ok(
    await nojs.locator("button[type=submit]").isDisabled(),
    "no-JS form cannot leak personal data through native GET",
  );
  await nojs.goto(origin + "/");
  ok(
    (await nojs.locator(".portfolio-tile").count()) === 8,
    "no-JS portfolio preserves the eight projects",
  );
  ok(errors.length === 0, "no primary runtime errors: " + errors.join(", "));
  const report = {
    date: new Date().toISOString(),
    checks,
    routes: routes.length,
    widths: [320, 390, 768, 1440],
    errors,
    reflow,
    status: "passed",
  };
  await fs.writeFile(
    "verification-moonex.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  server.close();
}
