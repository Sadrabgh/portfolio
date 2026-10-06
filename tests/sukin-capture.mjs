import fs from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { server, origin, launch } from "./v10-common.mjs";
const out = "output/playwright/sukin";
await fs.mkdir(out, { recursive: true });
let browser;
try {
  browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1058 } });
  const errors = [];
  const visualChecks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const open = async (route) => {
    await p.goto(origin + route, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(450);
  };
  await open("/demo/sukin/");
  await p.screenshot({ path: `${out}/desktop.png` });
  await p.setViewportSize({ width: 1440, height: 1600 });
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/overview.png` });
  await p.setViewportSize({ width: 1440, height: 1000 });
  await open("/demo/sukin/products/facial-cleanser/");
  await p.screenshot({ path: `${out}/detail.png` });
  await p.setViewportSize({ width: 390, height: 844 });
  const purchase = await p.locator("[data-detail-add]").boundingBox();
  assert(
    purchase.y + purchase.height <= 844,
    "mobile purchase button fits the first product viewport",
  );
  visualChecks.push(
    "Product purchase button fits the first 390 × 844 viewport.",
  );
  await p.screenshot({ path: `${out}/mobile-detail.png` });
  await open("/demo/sukin/");
  await p.screenshot({ path: `${out}/mobile.png` });
  await p.setViewportSize({ width: 390, height: 1500 });
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/mobile-long.png` });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator('[data-add-product="facial-cleanser"]').click();
  await p.locator('[data-add-product="cream-cleanser"]').click();
  await p.locator(".skin-header [data-bag-open]").click();
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${out}/bag.png` });
  await p.keyboard.press("Escape");
  await p.locator("[data-skin-theme]").click();
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/mobile-dark.png` });
  const luminance = (hex) => {
    const raw = hex.trim().replace("#", "");
    const c =
      raw.length === 3
        ? [...raw].map((character) => character + character).join("")
        : raw;
    const rgb = [0, 2, 4]
      .map((index) => parseInt(c.slice(index, index + 2), 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const theme of ["light", "dark"]) {
    await p.evaluate((value) => {
      document.documentElement.dataset.sukinTheme = value;
    }, theme);
    const palette = await p.evaluate(() =>
      Object.fromEntries(
        ["bg", "surface", "text", "muted", "green", "green-soft", "error"].map(
          (key) => [
            key,
            getComputedStyle(document.documentElement)
              .getPropertyValue("--skin-" + key)
              .trim(),
          ],
        ),
      ),
    );
    for (const [foreground, background] of [
      ["text", "bg"],
      ["text", "surface"],
      ["muted", "bg"],
      ["muted", "surface"],
      ["green", "green-soft"],
      ["error", "surface"],
    ]) {
      const values = [
        luminance(palette[foreground]),
        luminance(palette[background]),
      ].sort((a, b) => b - a);
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert(
        ratio >= 4.5,
        `${theme}: ${foreground} on ${background} contrast ${ratio}`,
      );
      visualChecks.push(
        `${theme}: ${foreground}/${background} contrast ${ratio.toFixed(2)}:1.`,
      );
    }
  }
  for (const width of [320, 390]) {
    await p.setViewportSize({ width, height: 844 });
    await p.locator(".skin-header [data-bag-open]").click();
    await p.waitForTimeout(350);
    assert(
      await p
        .locator("[data-bag-dialog]")
        .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1),
      "mobile cart content fits its dialog",
    );
    assert(
      await p
        .locator("[data-bag-dialog] [data-line-plus]")
        .first()
        .evaluate((button) => button.getBoundingClientRect().width >= 44),
      "quantity button has a 44px touch target",
    );
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press("Tab");
      assert(
        await p
          .locator("[data-bag-dialog]")
          .evaluate(
            (dialog) =>
              document.activeElement === document.body ||
              dialog.contains(document.activeElement),
          ),
        "active page controls remain inside the native modal",
      );
    }
    await p.locator("[data-skin-theme]").evaluate((button) => {
      if (button instanceof HTMLButtonElement) button.focus();
    });
    assert(
      await p
        .locator("[data-skin-theme]")
        .evaluate((button) => button !== document.activeElement),
      "modal makes background controls inert",
    );
    await p.keyboard.press("Escape");
    visualChecks.push(
      `${width}px cart: no internal horizontal overflow, 44px quantity controls and trapped keyboard focus.`,
    );
  }
  assert(errors.length === 0, errors.join("; "));
  await fs.writeFile(
    `${out}/visual-checks.json`,
    JSON.stringify({ status: "passed", visualChecks, errors }, null, 2),
  );
  console.log(JSON.stringify({ out, errors }, null, 2));
  if (process.argv.includes("--portfolio")) {
    for (const [source, target] of [
      ["desktop", "desktop"],
      ["overview", "overview"],
      ["detail", "detail"],
      ["mobile-long", "mobile"],
    ]) {
      await sharp(`${out}/${source}.png`)
        .webp({ quality: 88 })
        .toFile(`public/portfolio/sukin-${target}.webp`);
    }
    console.log("Saved four actual portfolio screenshots.");
  }
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
