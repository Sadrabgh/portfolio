import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";
import { launch, server, origin } from "./v10-common.mjs";
const browser = await launch();
const output = "output/aurum";
await fs.mkdir(output, { recursive: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1058 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(r.status() + " " + r.url());
});
const go = async (route) => {
  const response = await page.goto(origin + "/demo/aurum/" + route, {
    waitUntil: "networkidle",
  });
  assert.equal(response.status(), 200);
};
async function ready() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = "eager";
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
  });
}
async function fit() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Horizontal overflow on " + page.url(),
  );
}
async function capture(name, width, height, route = "") {
  await page.setViewportSize({ width, height });
  await go(route);
  await ready();
  await fit();
  const png = await page.screenshot();
  await fs.writeFile(output + "/" + name + ".png", png);
  const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
  await fs.writeFile("public/portfolio/aurum-" + name + ".webp", webp);
  await fs.writeFile("dist/portfolio/aurum-" + name + ".webp", webp);
}
try {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, w, h, route] of [
    ["desktop", 1440, 1058, ""],
    ["overview", 1440, 1600, ""],
    ["mobile", 390, 1500, ""],
    ["detail", 1440, 1000, "products/lume-ring/"],
  ])
    await capture(name, w, h, route);
  await go("");
  await ready();
  await page.screenshot({ path: output + "/home-full.png", fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("shop/");
  assert.equal(await page.locator("[data-product-card]:visible").count(), 6);
  await page.locator('[data-catalog] [name="q"]').fill("Halo");
  assert.equal(await page.locator("[data-product-card]:visible").count(), 1);
  await page.locator("[data-reset-filter]").first().click();
  await page.locator('[name="category"]').selectOption("necklaces");
  assert.equal(await page.locator("[data-product-card]:visible").count(), 2);
  await page.locator('[data-catalog] [name="q"]').fill("no-match");
  assert.ok(await page.locator("[data-empty-filter]").isVisible());
  await go("products/lume-ring/");
  await page.locator('[name="option"]').selectOption("US 7");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  assert.match(await page.locator("[data-feedback]").innerText(), /Added/);
  await page
    .getByRole("button", { name: "Save Lume Ring", exact: true })
    .click();
  await go("saved/");
  assert.equal(await page.locator("[data-saved-card]:visible").count(), 1);
  await go("cart/");
  assert.match(await page.locator("[data-bag-lines=page]").innerText(), /US 7/);
  await page
    .getByRole("button", { name: "Increase Lume Ring quantity", exact: true })
    .click();
  assert.equal(
    await page.locator("[data-bag-lines=page] .au-quantity span").innerText(),
    "2",
  );
  await page
    .getByRole("button", { name: "Decrease Lume Ring quantity", exact: true })
    .click();
  assert.equal(
    await page.locator("[data-bag-lines=page] .au-quantity span").innerText(),
    "1",
  );
  await go("products/sol-necklace/");
  await page.locator('[name="option"]').selectOption("18 inch");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await go("checkout/");
  await page.locator('[name="name"]').fill("Alex Example");
  await page.locator('[name="email"]').fill("alex@example.com");
  await page.locator('[name="address"]').fill("12 Example Street");
  await page.locator('[name="city"]').fill("Example City");
  await page.locator('[name="postal"]').fill("12345");
  await page.locator('[name="coupon"]').fill("AURUM10");
  await page.locator("[data-apply-code]").click();
  await page.locator('[name="gift"]').check();
  assert.match(
    await page.locator("[data-checkout-totals]").innerText(),
    /\$1,752/,
  );
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  assert.ok(await page.locator("[data-review]").isVisible());
  assert.match(
    await page.locator(".au-review-contact").innerText(),
    /Alex Example/,
  );
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  assert.equal(
    await page.locator('[name="name"]').inputValue(),
    "Alex Example",
  );
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  await page.locator("[data-place-order]").click();
  await page.waitForURL("**/order/");
  assert.match(
    await page.locator("[data-receipt]").innerText(),
    /Demo order complete/,
  );
  assert.match(await page.locator("[data-receipt]").innerText(), /US 7/);
  assert.match(await page.locator("[data-receipt]").innerText(), /18 inch/);
  const stored = await page.evaluate(() =>
    sessionStorage.getItem("aurum-receipt-v1"),
  );
  assert.ok(
    !stored.includes("Alex Example") &&
      !stored.includes("alex@example.com") &&
      !stored.includes("12 Example Street"),
  );
  await go("cart/");
  assert.match(
    await page.locator("[data-bag-lines=page]").innerText(),
    /Your bag is empty/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await go("");
  await fit();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  assert.ok(await page.locator("#au-menu").evaluate((el) => el.open));
  await page.keyboard.press("Escape");
  assert.ok(!(await page.locator("#au-menu").evaluate((el) => el.open)));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator("#au-global-query").fill("Cove");
  await page
    .getByRole("button", { name: "Submit search", exact: true })
    .click();
  await page.waitForURL("**/shop/?q=Cove");
  assert.equal(await page.locator("[data-product-card]:visible").count(), 1);
  await fit();
  await page
    .getByRole("button", { name: "Choose Cove Earrings", exact: true })
    .click();
  assert.ok(await page.locator("#au-quick").evaluate((el) => el.open));
  await page
    .locator("#au-quick")
    .getByRole("button", { name: "Add to bag", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close product", exact: true })
    .click();
  await page.getByRole("button", { name: "Open bag", exact: true }).click();
  assert.match(await page.locator("#au-bag").innerText(), /Cove Earrings/);
  await page
    .getByRole("button", {
      name: "Increase Cove Earrings quantity",
      exact: true,
    })
    .click();
  assert.equal(
    await page.locator("#au-bag .au-quantity span").innerText(),
    "2",
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await go("");
  await page.locator(".au-editorial").scrollIntoViewIfNeeded();
  assert.equal(
    await page
      .locator(".au-editorial")
      .evaluate((el) => el.getAnimations().length),
    0,
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await go("shop/");
  await fit();
  await go("products/lume-ring/");
  await fit();
  await go("checkout/");
  await fit();
  for (const route of [
    "collections/",
    "collections/everyday/",
    "story/",
    "journal/",
    "journal/finding-your-form/",
    "help/care/",
    "help/size-guide/",
    "contact/",
  ]) {
    await go(route);
    await fit();
  }
  const contact = page.locator("[data-contact-form]");
  await contact.locator('[name="name"]').fill("Example");
  await contact.locator('[name="email"]').fill("test@example.com");
  await contact.locator('[name="message"]').fill("A demonstration request.");
  await contact
    .getByRole("button", { name: "Preview your request", exact: true })
    .click();
  assert.match(
    await contact.locator("[data-contact-feedback]").innerText(),
    /Nothing was sent/,
  );
  for (const route of ["/", "/work/", "/work/aurum/"]) {
    const response = await page.goto(origin + route, {
      waitUntil: "networkidle",
    });
    assert.equal(response.status(), 200);
    assert.ok(
      await page
        .locator('a[href*="/work/aurum/"],a[href*="/demo/aurum/"]')
        .count(),
    );
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    output + "/basic.json",
    JSON.stringify(
      {
        status: "passed",
        checks: [
          "Astro source check and static build",
          "desktop/mobile layout and real UI captures",
          "search, category and empty state",
          "size selection and saved items",
          "bag quantity editing",
          "discount/shipping/gift totals",
          "checkout review and anonymous receipt",
          "mobile menu/search/quick purchase/cart",
          "reduced motion",
          "contact demonstration",
          "portfolio integration",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("AURUM basic checks passed; real UI captures saved.");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
