import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { server, origin, launch } from "./v10-common.mjs";
let browser,
  checks = 0;
const errors = [],
  metrics = [];
const ok = (v, label) => {
  assert(v, label);
  checks++;
};
try {
  browser = await launch();
  for (const width of [320, 390, 768, 1440]) {
    const p = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(origin + "/", { waitUntil: "networkidle" });
    const carousel = p.locator(".project-carousel");
    await carousel.locator("[data-carousel-next]").waitFor();
    ok(
      (await carousel
        .locator("[data-slide-index]:not([data-clone])")
        .count()) === 8,
      "eight original carousel slides " + width,
    );
    ok(
      await carousel
        .locator("[data-clone]")
        .evaluateAll((es) =>
          es.every(
            (e) =>
              e.getAttribute("aria-hidden") === "true" &&
              Array.from(e.querySelectorAll("a,button,input,[tabindex]")).every(
                (n) => n.tabIndex < 0,
              ),
          ),
        ),
      "clones excluded from keyboard and assistive technology " + width,
    );
    await carousel.scrollIntoViewIfNeeded();
    for (let i = 0; i < 5; i++)
      await carousel.locator("[data-carousel-next]").click();
    ok(
      (await carousel.getAttribute("data-slide")) === "5",
      "RAVA reachable through carousel " + width,
    );
    const link = carousel.locator(
      '[data-slide-index="5"]:not([data-clone]) .tile-image',
    );
    ok(
      (await link.getAttribute("href")).endsWith("/work/rava/"),
      "real RAVA case link " + width,
    );
    await link.locator("img").evaluateAll(async (es) => {
      for (const e of es) e.loading = "eager";
      await Promise.all(es.map((e) => e.decode().catch(() => null)));
    });
    ok(
      await link
        .locator("img")
        .evaluateAll((es) => es.every((e) => e.complete && e.naturalWidth > 0)),
      "RAVA cover images decode " + width,
    );
    await carousel.locator("[data-carousel-next]").click();
    ok(
      (await carousel.getAttribute("data-slide")) === "6",
      "AVAN reachable through carousel " + width,
    );
    const avan = carousel.locator(
      '[data-slide-index="6"]:not([data-clone]) .tile-image',
    );
    ok(
      (await avan.getAttribute("href")).endsWith("/work/avan/"),
      "real AVAN case link " + width,
    );
    await avan.locator("img").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
    ok(
      await avan
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.naturalWidth > 0),
        ),
      "AVAN images decode " + width,
    );
    await carousel.locator("[data-carousel-next]").click();
    ok((await carousel.getAttribute("data-slide")) === "7", "MORA reachable " + width);
    ok((await carousel.locator('[data-slide-index="7"]:not([data-clone]) .tile-image').getAttribute("href")).endsWith("/work/mora/"), "MORA case link " + width);
    await carousel.locator("[data-carousel-next]").click();
    ok(
      (await carousel.getAttribute("data-slide")) === "0",
      "carousel wraps after eight " + width,
    );
    await carousel.focus();
    await p.keyboard.press("ArrowLeft");
    ok(
      (await carousel.getAttribute("data-slide")) === "1",
      "RTL keyboard navigation " + width,
    );
    await p.goto(origin + "/work/", { waitUntil: "networkidle" });
    ok(
      (await p.locator(".portfolio-grid [data-portfolio-item]").count()) === 8,
      "eight archive projects " + width,
    );
    await p.locator("[data-filter=commerce]").click();
    ok(
      (await p
        .locator(".portfolio-grid [data-portfolio-item]:visible")
        .count()) === 5,
      "five commerce projects " + width,
    );
    ok(
      await p
        .locator('.portfolio-grid .tile-image[href$="/work/rava/"]')
        .isVisible(),
      "RAVA in commerce filter " + width,
    );
    await p.locator("[data-filter=interactive]").click();
    ok(
      (await p
        .locator(".portfolio-grid [data-portfolio-item]:visible")
        .count()) === 1,
      "other categories still filter " + width,
    );
    await p.locator("[data-filter=all]").click();
    await p.locator('.portfolio-grid .tile-image[href$="/work/rava/"]').click();
    await p.waitForURL("**/work/rava/");
    ok(
      (await p.locator("h1").textContent()).includes("راوا"),
      "RAVA case heading " + width,
    );
    ok(
      (await p.locator('main a[href$="/demo/rava/"]').count()) > 0,
      "case opens actual demo " + width,
    );
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    ok(overflow <= 1, "case does not overflow " + width);
    metrics.push({ width, overflow });
    await p.goto(origin + "/work/avan/", { waitUntil: "networkidle" });
    ok(
      (await p.locator("h1").textContent()).includes("آوان"),
      "AVAN case heading " + width,
    );
    ok(
      (await p.locator('main a[href$="/demo/avan/"]').count()) > 0,
      "case opens AVAN " + width,
    );
    ok(
      await p
        .locator(".showcase-next a")
        .getAttribute("href")
        .then((href) => href.endsWith("/work/mora/")),
      "AVAN continues to MORA " + width,
    );
    ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "AVAN case reflow " + width,
    );
    await p.close();
  }
  ok(errors.length === 0, "no browser errors");
  await fs.mkdir("output/heepzy", { recursive: true });
  await fs.writeFile(
    "output/heepzy/gallery-report.json",
    JSON.stringify(
      {
        status: "passed",
        checks,
        metrics,
        errors,
        scope:
          "Current eight-project carousel, archive filters and portfolio integration",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "passed", checks, metrics }));
} finally {
  await browser?.close();
  server.close();
}
