import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, origin, launch } from "./v10-common.mjs";

let browser,
  checks = 0;
const errors = [],
  observations = [];
const directory = "output/heepzy/scroll-reveal-600";
const ok = (value, label) => {
  assert(value, label);
  checks++;
};
const state = (element) => ({
  opacity: getComputedStyle(element).opacity,
  transform: getComputedStyle(element).transform,
  waiting: element.classList.contains("hp-reveal-waiting"),
  animations: element
    .getAnimations()
    .filter((a) => a.playState === "running")
    .map((a) => ({
      duration: a.effect.getTiming().duration,
      frames: a.effect.getKeyframes(),
    })),
});
try {
  await fs.mkdir(directory, { recursive: true });
  browser = await launch();
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/demo/rava/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    ok(
      await page
        .locator(".hp-hero")
        .evaluate(
          (e) =>
            getComputedStyle(e).opacity === "1" &&
            e.getAnimations().length === 0,
        ),
      "hero is immediately readable at " + width,
    );
    const waiting = await page
      .locator("[data-rava-reveal].hp-reveal-waiting")
      .count();
    ok(
      waiting > 0,
      "below-viewport marketing sections await scroll at " + width,
    );
    const targets = page.locator("[data-rava-reveal]");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    for (let i = 0; i < (await targets.count()); i++) {
      const target = targets.nth(i);
      if (
        !(await target.evaluate((e) =>
          e.classList.contains("hp-reveal-waiting"),
        ))
      )
        continue;
      await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
      await target.evaluate((e) =>
        e.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      await page.waitForFunction(
        (index) =>
          document
            .querySelectorAll("[data-rava-reveal]")
            [index].getAnimations()
            .some((a) => a.playState === "running"),
        i,
      );
      const during = await target.evaluate(state);
      observations.push({ width, target: i, ...during });
      ok(
        during.animations.length === 1 && during.animations[0].duration === 600,
        "reveal lasts exactly 600 ms at " + width + "/" + i,
      );
      ok(
        during.animations[0].frames[0].opacity === "0" &&
          during.animations[0].frames[0].transform === "translateY(14px)",
        "fade-in up starts from transparent at " + width + "/" + i,
      );
      if (width === 390 && i === 3)
        await page.screenshot({ path: directory + "/mobile-during.png" });
      await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
      await page.waitForTimeout(650);
      ok(
        await target.evaluate(
          (e) =>
            getComputedStyle(e).opacity === "1" &&
            getComputedStyle(e).transform === "none" &&
            !e.classList.contains("hp-reveal-waiting"),
        ),
        "reveal settles cleanly at " + width + "/" + i,
      );
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(30);
      await target.evaluate((e) =>
        e.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      await page.waitForTimeout(40);
      ok(
        await target.evaluate((e) => e.getAnimations().length === 0),
        "scroll-up/down does not replay at " + width + "/" + i,
      );
    }
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no horizontal overflow at " + width,
    );
    await page.screenshot({ path: directory + `/settled-${width}.png` });
    await page.close();
  }
  const focusPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  focusPage.on("pageerror", (e) => errors.push(e.message));
  await focusPage.goto(origin + "/demo/rava/", { waitUntil: "networkidle" });
  await focusPage
    .locator(".hp-drops a")
    .first()
    .evaluate((e) => e.focus());
  ok(
    await focusPage
      .locator(".hp-drops")
      .evaluate(
        (e) =>
          e.contains(document.activeElement) &&
          getComputedStyle(e).opacity === "1" &&
          getComputedStyle(e).transform === "none" &&
          e.getAnimations().length === 0,
      ),
    "keyboard focus reveals the link immediately",
  );
  await focusPage.reload({ waitUntil: "networkidle" });
  await focusPage.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await focusPage.reload({ waitUntil: "networkidle" });
  const cdp = await focusPage.context().newCDPSession(focusPage);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
  await focusPage
    .locator(".hp-drops")
    .evaluate((e) =>
      e.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  await focusPage.waitForFunction(() =>
    document
      .querySelector(".hp-drops")
      .getAnimations()
      .some((a) => a.playState === "running"),
  );
  await focusPage.emulateMedia({ reducedMotion: "reduce" });
  await focusPage.waitForTimeout(50);
  ok(
    await focusPage
      .locator("[data-rava-reveal]")
      .evaluateAll((elements) =>
        elements.every(
          (e) =>
            getComputedStyle(e).opacity === "1" &&
            getComputedStyle(e).transform === "none" &&
            e.getAnimations().length === 0 &&
            !e.classList.contains("hp-reveal-waiting"),
        ),
      ),
    "changing reduced-motion mid-reveal settles active and waiting content",
  );
  await focusPage.close();
  for (const mode of ["reduced", "no-js", "no-observer"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: mode !== "no-js",
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    if (mode === "no-observer")
      await context.addInitScript(() => {
        delete window.IntersectionObserver;
      });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/demo/rava/", { waitUntil: "networkidle" });
    ok(
      await page
        .locator("[data-rava-reveal]")
        .evaluateAll((elements) =>
          elements.every(
            (e) =>
              getComputedStyle(e).opacity === "1" &&
              getComputedStyle(e).transform === "none" &&
              !e.classList.contains("hp-reveal-waiting"),
          ),
        ),
      "all content survives " + mode,
    );
    await context.close();
  }
  ok(errors.length === 0, "no runtime errors");
  const report = {
    status: "passed",
    checks,
    observations,
    errors,
    scope:
      "Desktop Chrome with 320/390/1440 viewports; actual 600 ms WAAPI effects at 10% playback; one-shot scrolling, focus, live reduced motion, no JS and absent IntersectionObserver. No physical device claim.",
  };
  await fs.writeFile(
    directory + "/report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      status: "passed",
      checks,
      observedReveals: observations.length,
      errors,
    }),
  );
} finally {
  await browser?.close();
  server.close();
}
