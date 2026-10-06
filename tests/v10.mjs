import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { server, dist, origin, launch, go } from "./v10-common.mjs";
let browser;
let checks = 0;
const errors = [],
  badResponses = [],
  reflow = [],
  models = {};
const ok = (value, message) => {
  assert(value, message);
  checks++;
};
const hash = async (p) =>
  createHash("sha256")
    .update(
      await p
        .locator("[data-model-viewport] canvas")
        .evaluate((c) => c.toDataURL()),
    )
    .digest("hex");
async function files(dir) {
  let a = [];
  for (const f of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    a.push(...(f.isDirectory() ? await files(p) : [p]));
  }
  return a;
}
const html = (await files(dist)).filter(
  (f) => f.endsWith(".html") && !f.endsWith("404.html"),
);
const allRoutes = html.map(
  (f) =>
    "/" +
    path
      .relative(dist, f)
      .replace(/index\.html$/, "")
      .replaceAll("\\", "/"),
);
const redirects = [];
const routes = [];
for (let i = 0; i < html.length; i++) {
  const text = await fs.readFile(html[i], "utf8");
  const target = text.match(
    /<meta http-equiv="refresh" content="\d+;url=([^" ]+)"/i,
  )?.[1];
  if (target) redirects.push({ from: allRoutes[i], to: target });
  else routes.push(allRoutes[i]);
}
try {
  for (const f of html) {
    const text = await fs.readFile(f, "utf8");
    for (const m of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!m[1].startsWith("/")) continue;
      const u = new URL(m[1], origin);
      let target = path.join(dist, decodeURIComponent(u.pathname));
      if (u.pathname.endsWith("/")) target = path.join(target, "index.html");
      ok(
        await fs.stat(target).then(
          () => true,
          () => false,
        ),
        `local resource ${u.pathname} from ${f}`,
      );
    }
  }
  browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1058 } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(r.url());
  });
  await p.addInitScript(() => {
    localStorage.setItem("demo-motion", "reduce");
    localStorage.setItem("demo-theme", "light");
  });
  for (const redirect of redirects) {
    ok(
      routes.includes(redirect.to),
      "redirect destination exists " + redirect.from,
    );
    await go(p, redirect.from);
    await p.waitForURL(origin + redirect.to);
    ok(
      (await p.locator("h1").count()) === 1,
      "redirect reaches real page " + redirect.from,
    );
  }
  console.log("Checking all routes and mobile layout…");
  for (const width of process.env.V10_FLOWS_ONLY || process.env.V10_REFLOW_ONLY
    ? []
    : [1440, 390]) {
    await p.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      const res = await go(p, route);
      ok(res.status() === 200, "route " + route);
      ok((await p.locator("h1").count()) === 1, "one h1 " + route);
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 2,
      );
      if (overflow) reflow.push({ route, width });
      ok(!overflow, "horizontal page overflow " + width + " " + route);
      await p
        .locator("img")
        .evaluateAll((ims) => ims.forEach((i) => (i.loading = "eager")));
      await p
        .waitForFunction(
          () =>
            Array.from(document.images)
              .filter((i) => i.getAttribute("src"))
              .every((i) => i.complete && i.naturalWidth > 0),
          null,
          { timeout: 8000 },
        )
        .catch(async (e) => {
          console.log(
            "Image failure",
            route,
            await p.locator("img").evaluateAll((ims) =>
              ims
                .filter((i) => !i.complete || !i.naturalWidth)
                .map((i) => ({
                  src: i.src,
                  loading: i.loading,
                  hidden: i.hidden,
                })),
            ),
          );
          throw e;
        });
      ok(true, "images loaded " + route);
    }
  }
  if (!process.env.V10_REFLOW_ONLY) {
    console.log("Checking theme, keyboard and primary flows…");
    await p.setViewportSize({ width: 1280, height: 900 });
    for (const brand of ["atelier", "rift", "velo", "neva"]) {
      await go(p, `/demo/${brand}/`);
      await p.locator("[data-theme-toggle]").click();
      ok(
        (await p.locator("html").getAttribute("data-demo-theme")) === "dark",
        "theme " + brand,
      );
      ok(
        await p.evaluate(
          () =>
            getComputedStyle(document.body).backgroundColor !==
            "rgb(247, 247, 245)",
        ),
        "brand palette " + brand,
      );
      await p.locator("[data-theme-toggle]").click();
    }
    await go(p, "/demo/atelier/");
    await p.locator("[data-cover-view]").nth(1).click();
    await p.waitForFunction(() =>
      document
        .querySelector("[data-cover-image]")
        .src.includes("pavilion-interior"),
    );
    ok(
      (await p
        .locator("[data-cover-view]")
        .nth(1)
        .getAttribute("aria-pressed")) === "true",
      "journal changes image and selected perspective together",
    );
    // Architecture archive, native photo dialog, independent maquettes, inquiry validation and edit.
    await go(p, "/demo/atelier/projects/");
    await p.locator("[data-house-filter=residential]").click();
    ok(
      (await p.locator("[data-house]:visible").count()) === 1,
      "architecture archive filter",
    );
    await p.locator("[data-house]:visible h2 a").click();
    ok(p.url().includes("/coast/"), "filtered project");
    await p.locator('[data-photo-open="1"]').click();
    ok(
      await p.locator(".photo-dialog").evaluate((d) => d.open),
      "native gallery",
    );
    await p.keyboard.press("ArrowLeft");
    ok(
      (await p.locator("[data-photo-caption]").textContent()).includes(
        "بیرونی",
      ),
      "RTL photo navigation",
    );
    await p.keyboard.press("Escape");
    ok(
      await p
        .locator('[data-photo-open="1"]')
        .evaluate((e) => e === document.activeElement),
      "photo return focus",
    );
    for (const id of ["pavilion", "coast", "atrium"]) {
      await go(p, `/demo/atelier/projects/${id}/`);
      await p.waitForSelector("[data-ready=true]");
      const h = await hash(p);
      models[id] = h;
      await p.locator("[data-explode]").click();
      ok((await hash(p)) !== h, "roof control " + id);
      await p.locator("[data-camera=top]").click();
      ok((await hash(p)) !== h, "top view " + id);
      await p.locator("[data-light]").click();
      ok(
        (await p.locator("[data-light]").getAttribute("aria-pressed")) ===
          "true",
        "lighting " + id,
      );
    }
    ok(
      new Set(Object.values(models)).size === 3,
      "different architecture maquettes",
    );
    await go(p, "/demo/atelier/inquiry/");
    await p.locator("[type=submit]").click();
    ok(
      (await p.locator("[name=name]").getAttribute("aria-invalid")) === "true",
      "inquiry error",
    );
    await p.locator("[name=name]").fill("نام آزمایشی");
    await p
      .locator("textarea[name=description]")
      .fill("فضایی برای کار و گفت‌وگوی روزمره");
    await p.locator("[type=submit]").click();
    ok(await p.locator("[data-inquiry-review]").isVisible(), "inquiry review");
    await p.locator("[data-inquiry-back]").click();
    ok(
      (await p.locator("textarea[name=description]").inputValue()) ===
        "فضایی برای کار و گفت‌وگوی روزمره",
      "inquiry edit preserves data",
    );
    await p.locator("[type=submit]").click();
    await p.locator("[data-inquiry-confirm]").click();
    ok(
      (await p.locator("#architecture-status").textContent()).includes(
        "ذخیره نشده",
      ),
      "honest inquiry state",
    );
    ok(
      await p.locator("[data-inquiry-success]").isVisible(),
      "inquiry confirmation has a clear completion state",
    );
    await p.locator("[data-inquiry-restart]").click();
    ok(
      (await p.locator("[data-inquiry-edit]").isVisible()) &&
        (await p.locator("[name=name]").inputValue()) === "",
      "new inquiry starts with cleared data",
    );
    await go(p, "/demo/rift/");
    await p.locator("[data-look-add]").click();
    ok(
      !(await p.locator("[data-cart-dialog]").evaluate((d) => d.open)),
      "incomplete look does not open cart",
    );
    await p.locator("[data-look-item=shell] [data-look-size=M]").click();
    await p.locator("[data-look-add]").click();
    ok(
      (await p.locator("[data-cart-count]").textContent()) === "۰",
      "partial look adds neither garment",
    );
    ok(
      await p
        .locator("[data-look-item=cargo] [data-look-size=XL]")
        .isDisabled(),
      "look builder respects stock",
    );
    await p.locator("[data-look-item=cargo] [data-look-size=M]").click();
    await p.locator("[data-look-add]").click();
    ok(
      (await p.locator("[data-cart-lines] .cart-line").count()) === 2,
      "complete look adds both garments",
    );
    await p.locator("[data-action=remove]").first().click();
    await p.locator("[data-action=remove]").first().click();
    await p.keyboard.press("Escape");
    // RIFT inventory, variants, persistence, filter reset, review and success.
    await go(p, "/demo/rift/catalog/");
    const quickTrigger = p.locator("[data-quick-view=shell]").first();
    await quickTrigger.click();
    ok(
      await p.locator("[data-quick-dialog]").isVisible(),
      "quick selection opens from catalog",
    );
    await p.keyboard.press("Escape");
    ok(
      await quickTrigger.evaluate((el) => el === document.activeElement),
      "quick selection restores keyboard focus",
    );
    await quickTrigger.click();
    await p.locator("[data-quick-add]").click();
    ok(
      (await p.locator("[data-quick-status]").textContent()).includes("ابتدا"),
      "quick selection requires a size",
    );
    ok(
      await p.locator("[data-quick-size=XL]").isDisabled(),
      "quick selection respects unavailable stock",
    );
    await p.locator("[data-quick-color=silver]").click();
    ok(
      (await p.locator("[data-quick-image]").getAttribute("src")).includes(
        "shell-silver",
      ),
      "quick selection updates image",
    );
    ok(
      (await p.locator("[data-quick-details]").getAttribute("href")).includes(
        "color=silver",
      ),
      "quick selection preserves color in details link",
    );
    await p.locator("[data-quick-size=M]").click();
    await p.locator("[data-quick-add]").click();
    ok(
      await p.locator("[data-cart-dialog]").isVisible(),
      "quick selection opens cart after addition",
    );
    ok(
      (await p.locator("[data-cart-lines]").textContent()).includes("نقره‌ای"),
      "quick selection adds the chosen variant",
    );
    await p.locator("[data-action=remove]").click();
    await p.keyboard.press("Escape");
    await go(p, "/demo/rift/products/shell/");
    await p.locator("[data-add-cart]").click();
    ok(
      (await p.locator("[data-product-status]").textContent()).includes(
        "ابتدا",
      ),
      "size required",
    );
    ok(
      await p.locator("[data-product-size=XL]").isDisabled(),
      "unavailable size",
    );
    await p.locator("[data-product-color=silver]").click();
    ok(
      (await p.locator("[data-product-image]").getAttribute("src")).includes(
        "shell-silver",
      ),
      "matching variant photo",
    );
    await p.locator("[data-product-size=M]").click();
    await p.locator("[data-add-cart]").click();
    ok(
      await p.locator("[data-cart-dialog]").evaluate((d) => d.open),
      "cart opens",
    );
    ok(
      (await p.locator(".cart-line img").getAttribute("src")).includes(
        "shell-silver",
      ),
      "matching cart photo",
    );
    await p.locator("[data-action=plus]").click();
    ok(
      (await p.locator("[data-cart-total]").textContent()).includes(
        "۶٬۹۰۰٬۰۰۰",
      ),
      "cart totals",
    );
    await p.keyboard.press("Escape");
    ok(
      await p
        .locator("[data-add-cart]")
        .evaluate((e) => e === document.activeElement),
      "cart return focus",
    );
    await p.locator("[data-product-color=black]").click();
    await p.locator("[data-product-size=L]").click();
    await p.locator("[data-add-cart]").click();
    ok((await p.locator(".cart-line").count()) === 2, "separate cart variants");
    await p.keyboard.press("Escape");
    await go(p, "/demo/rift/catalog/");
    await p.locator("[name=category]").selectOption("essentials");
    await p.locator("[name=color]").selectOption("rose");
    ok(await p.locator("[data-catalog-empty]").isVisible(), "catalog empty");
    await p.locator("[data-catalog-reset]").click();
    ok(
      (await p.locator("[data-product-card]:visible").count()) === 4,
      "filter reset",
    );
    await p.locator("[name=size]").selectOption("S");
    ok(
      (await p.locator("[data-product-card]:visible").count()) === 3,
      "size availability filter",
    );
    await p.locator("[name=budget]").selectOption("2000000");
    ok(
      (await p.locator("[data-product-card]:visible").count()) === 1,
      "budget filter",
    );
    await go(p, "/demo/rift/checkout/");
    ok(
      (await p.locator("[data-checkout-lines] .cart-line").count()) === 2,
      "cart persisted",
    );
    await p.locator("[type=submit]").click();
    ok(
      (await p.locator("[name=name]").getAttribute("aria-invalid")) === "true",
      "checkout error",
    );
    await p.locator("[name=name]").fill("نمونه آزمایشی");
    await p.locator("[name=phone]").fill("۰۹۱۲۳۴۵۶۷۸۹");
    await p
      .locator("[name=address]")
      .fill("نشانی آزمایشی، خیابان نمونه، پلاک ۱۰");
    await p.locator("[type=submit]").click();
    ok(
      await p.locator("[data-checkout-review]").isVisible(),
      "checkout review",
    );
    await p.locator("[data-order-edit]").click();
    ok(
      (await p.locator("[name=address]").inputValue()).includes(
        "نشانی آزمایشی",
      ),
      "checkout edit",
    );
    await p.locator("[type=submit]").click();
    await p.locator("[data-order-confirm]").click();
    ok(await p.locator("[data-order-success]").isVisible(), "demo receipt");
    ok(
      (await p.locator("[data-checkout-total]").textContent()).includes(
        "۱۰٬۳۵۰٬۰۰۰",
      ),
      "receipt retains original total",
    );
    await p.screenshot({
      path: "captures/v10/rift-receipt.png",
      fullPage: true,
    });
    ok(
      (await p.locator("[name=name]").inputValue()) === "",
      "PII cleared after receipt",
    );
    ok(
      (await p.evaluate(() => localStorage.getItem("rift-cart-v10"))) === "[]",
      "cart cleared",
    );
    await go(p, "/demo/rift/checkout/");
    ok(await p.locator("[data-checkout-empty]").isVisible(), "empty checkout");
    // VELO actual geometry, controls, drag, config, save/load and capture.
    await go(p, "/demo/velo/");
    await p.waitForSelector("[data-ready=true]");
    const original = await hash(p);
    await p.locator("[data-velo-color=ink]").click();
    ok((await hash(p)) !== original, "live color geometry");
    const ink = await hash(p);
    await p.locator("[data-velo-model=tour]").click();
    ok((await hash(p)) !== ink, "tour equipment changes geometry");
    ok(
      !(await p.locator("[data-config-advanced]").evaluate((el) => el.open)),
      "advanced choices begin collapsed",
    );
    await p.locator("[data-config-advanced] summary").click();
    ok(
      await p.locator("[data-velo-finish=gloss]").isVisible(),
      "advanced disclosure reveals configuration",
    );
    await p.locator("[data-velo-finish=gloss]").click();
    await p.locator("[data-velo-size=L]").click();
    await p.locator("[data-velo-environment=park]").click();
    ok(
      (await p.locator("[data-velo-code]").textContent()) === "TOUR / INK / L",
      "config summary code",
    );
    await p.locator("[data-velo-save]").first().click();
    await p.locator("[data-velo-color=cyan]").click();
    await p.locator("[data-velo-load]").click();
    ok(
      (await p
        .locator("[data-velo-color=ink]")
        .getAttribute("aria-pressed")) === "true",
      "config restored",
    );
    const sharedConfig = await p.locator("[data-velo-share-link]").inputValue();
    ok(
      [
        "model=tour",
        "color=ink",
        "finish=gloss",
        "size=L",
        "environment=park",
      ].every((part) => sharedConfig.includes(part)),
      "share link contains the full selection",
    );
    await go(p, new URL(sharedConfig).pathname + new URL(sharedConfig).search);
    await p.waitForSelector("[data-ready=true]");
    ok(
      (await p.evaluate(() => JSON.stringify(window.__veloConfig))) ===
        JSON.stringify({
          model: "tour",
          color: "ink",
          finish: "gloss",
          size: "L",
          environment: "park",
        }),
      "shared link restores the exact configuration",
    );
    ok(
      (await p.locator("[data-velo-live-model]").textContent()) === "TOUR",
      "live description follows shared model",
    );
    await p.locator("[data-velo-summary]").click();
    ok(
      (await p.locator("[data-velo-summary-list]").textContent()).includes(
        "TOUR",
      ),
      "config review",
    );
    await p.keyboard.press("Escape");
    let h = await hash(p);
    await p.locator("[data-velo-chapter=battery]").click();
    ok(
      (await p.locator("[data-velo-story-title]").textContent()).includes(
        "بدنه",
      ),
      "showroom chapter coordinates camera and narrative",
    );
    await p.locator(".model-tools > summary").click();
    ok(
      await p.locator("[data-camera=drive]").isVisible(),
      "model tools disclosure reveals advanced camera controls",
    );
    await p.locator("[data-camera=drive]").click();
    ok((await hash(p)) !== h, "detail camera");
    await p.locator("[data-reset]").click();
    h = await hash(p);
    await p.locator("[data-explode]").click();
    ok((await hash(p)) !== h, "exploded parts");
    await p.locator("[data-reset]").click();
    h = await hash(p);
    await p.locator("[data-model-viewport]").scrollIntoViewIfNeeded();
    const b = await p.locator("[data-model-viewport]").boundingBox();
    // Start on the canvas background; the new layout puts a detail button at its center.
    const dragStart = { x: b.x + b.width * 0.18, y: b.y + b.height * 0.3 };
    ok(
      await p.evaluate(
        ({ x, y }) =>
          !!document.elementFromPoint(x, y)?.closest("[data-model-viewport]") &&
          !document.elementFromPoint(x, y)?.closest("button"),
        dragStart,
      ),
      "drag starts on visible canvas outside detail controls",
    );
    await p.mouse.move(dragStart.x, dragStart.y);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width * 0.38, dragStart.y, {
      steps: 8,
    });
    await p.mouse.up();
    ok((await hash(p)) !== h, "pointer rotates entire model");
    await p.locator("[data-static]").click();
    h = await hash(p);
    await p.waitForTimeout(250);
    ok((await hash(p)) === h, "static view");
    const download = p.waitForEvent("download");
    await p.locator("[data-capture]").click();
    ok(
      (await download).suggestedFilename().includes("tour-ink"),
      "actual canvas capture",
    );
    // Full motion remains opt-in controllable and camera movement progresses over time.
    await p.locator("[data-static]").click();
    await p.locator("[data-motion-toggle]").click();
    ok(
      (await p.locator("html").getAttribute("data-demo-motion")) === "full",
      "full motion enabled",
    );
    await p.locator("[data-camera=cockpit]").click();
    await p.waitForTimeout(100);
    const movingHash = await hash(p);
    await p.waitForTimeout(800);
    ok(
      (await hash(p)) !== movingHash,
      "camera transition moves through frames",
    );
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.waitForFunction(
      () => document.documentElement.dataset.demoMotion === "reduce",
    );
    ok(
      (await p.locator("html").getAttribute("data-demo-motion")) === "reduce",
      "system reduced motion",
    );
    await p.locator("[data-motion-toggle]").click();
    ok(
      (await p.locator("html").getAttribute("data-demo-motion")) === "reduce",
      "system preference cannot be overridden",
    );
    await p.emulateMedia({ reducedMotion: "no-preference" });
    for (const brand of ["atelier", "rift", "velo", "neva"]) {
      await go(p, `/demo/${brand}/`);
      await p.locator("[data-motion-toggle]").click();
      await p.waitForTimeout(1100);
      ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        "full-motion layout " + brand,
      );
      await p.locator("[data-motion-toggle]").click();
    }
    // NEVA nearest slots, errors, review, no PII, reschedule before replacing original and cancel dialog.
    await go(p, "/demo/neva/");
    const nearestLinks = await p
      .locator("[data-nearest-book=general]")
      .evaluateAll((links) => links.map((link) => link.href));
    const nearest = nearestLinks[0];
    ok(
      nearestLinks.length === 2 &&
        nearestLinks.every((href) => href === nearest),
      "hero and doctor card use the same nearest time",
    );
    ok(
      nearest.includes("date=") && nearest.includes("time="),
      "nearest live schedule link",
    );
    await go(p, nearest);
    ok(
      await p.locator('[data-booking-step="2"]').isVisible(),
      "preselected doctor schedule",
    );
    await p.locator("[data-book-nearest]").click();
    await p.locator("[data-book-next]").click();
    await p.locator("[data-book-next]").click();
    ok(
      (await p.locator("#patient-name").getAttribute("aria-invalid")) ===
        "true",
      "booking validation",
    );
    await p.locator("#patient-name").fill("نام آزمایشی");
    await p.locator("#patient-phone").fill("09123456789");
    await p.locator("[data-book-next]").click();
    ok(
      await p.locator('[data-booking-step="4"]').isVisible(),
      "booking review",
    );
    await p.screenshot({
      path: "captures/v10/neva-review.png",
      fullPage: true,
    });
    await p.locator('[data-book-edit="3"]').click();
    ok(
      (await p.locator("#patient-name").inputValue()) === "نام آزمایشی",
      "booking edit preserves name",
    );
    await p.locator("[data-book-next]").click();
    await p.locator("[data-book-next]").click();
    ok(await p.locator("[data-book-success]").isVisible(), "booking success");
    const appointments = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("neva-demo-appointments-v10")),
    );
    ok(appointments.length === 1, "one appointment");
    ok(
      Object.keys(appointments[0]).sort().join(",") ===
        "date,doctor,id,status,time",
      "no contact info stored",
    );
    await go(p, "/demo/neva/appointments/");
    await p.locator(".appointment-card a").click();
    ok(
      (
        await p.evaluate(() =>
          JSON.parse(localStorage.getItem("neva-demo-appointments-v10")),
        )
      )[0].id === appointments[0].id,
      "original preserved during reschedule",
    );
    await p.locator("[data-book-nearest]").click();
    await p.locator("[data-book-next]").click();
    await p.locator("#patient-name").fill("نام آزمایشی");
    await p.locator("#patient-phone").fill("09123456789");
    await p.locator("[data-book-next]").click();
    await p.locator("[data-book-next]").click();
    ok(
      (
        await p.evaluate(() =>
          JSON.parse(localStorage.getItem("neva-demo-appointments-v10")),
        )
      ).length === 1,
      "reschedule replaces one row",
    );
    await go(p, "/demo/neva/appointments/");
    await p.locator("[data-cancel-appointment]").click();
    ok(
      await p.locator("[data-cancel-dialog]").evaluate((d) => d.open),
      "cancel confirmation",
    );
    await p.locator("[data-cancel-close]").first().click();
    ok(
      (await p.locator(".appointment-card").count()) === 1,
      "cancel dismissed",
    );
    await p.locator("[data-cancel-appointment]").click();
    await p.locator("[data-cancel-confirm]").click();
    ok(
      (await p.locator(".appointment-card").count()) === 0,
      "active cancel removed",
    );
    await p.locator("[data-appointment-filter=all]").click();
    ok(
      (await p.locator(".appointment-card").textContent()).includes("لغوشده"),
      "cancel history",
    );
    // Text enlargement, dark mode, narrow menu and native scroll.
  }
  console.log("Checking 200% text and dark layout…");
  for (const width of process.env.V10_FLOWS_ONLY ? [] : [1440, 760, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    for (const route of [
      "/demo/atelier/",
      "/demo/atelier/projects/pavilion/",
      "/demo/rift/",
      "/demo/rift/products/shell/",
      "/demo/rift/checkout/",
      "/demo/velo/",
      "/demo/neva/",
      "/demo/neva/book/?doctor=skin",
    ]) {
      await go(p, route);
      await p.locator("[data-theme-toggle]").click();
      await p.addStyleTag({ content: "html{font-size:200%!important}" });
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 2,
      );
      if (overflow) reflow.push({ route, width, text: "200%" });
      if (overflow)
        console.log(
          "Overflow",
          route,
          width,
          await p.locator("body *").evaluateAll((es) =>
            es
              .filter((e) => {
                const b = e.getBoundingClientRect();
                return (b.width && b.left < -2) || b.right > innerWidth + 2;
              })
              .slice(0, 15)
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                text: e.textContent.slice(0, 40),
                left: e.getBoundingClientRect().left,
                right: e.getBoundingClientRect().right,
              })),
          ),
        );
      ok(!overflow, "200% reflow " + width + " " + route);
    }
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await go(p, "/demo/neva/");
  await p.locator("[data-menu-toggle]").click();
  ok(await p.locator(".brand-nav").isVisible(), "mobile menu");
  await p.keyboard.press("Escape");
  ok(!(await p.locator(".brand-nav").isVisible()), "menu escape");
  await go(p, "/demo/velo/");
  ok(
    await p
      .locator("[data-model-viewport]")
      .evaluate((e) => getComputedStyle(e).touchAction === "pan-y"),
    "native vertical touch scroll",
  );
  // The Moonex portfolio presents eight real projects through its manual carousel.
  await go(p, "/");
  ok(
    (await p.locator('[data-carousel-kind="projects"]').count()) === 1,
    "main project carousel",
  );
  ok(
    (await p
      .locator(".project-carousel [data-slide-index]:not([data-clone])")
      .count()) === 8,
    "eight original project slides",
  );
  await go(p, "/work/orbit/");
  ok((await p.locator("h1").textContent()).includes("ولو"), "updated case");
  ok(
    (await p.locator('a[href$="/demo/velo/"]').count()) > 0,
    "case opens actual VELO demo",
  );
  ok(errors.length === 0, "no runtime errors " + errors.join(" / "));
  ok(
    badResponses.length === 0,
    "no broken requests " + badResponses.join(" / "),
  );
  await browser.close();
  browser = undefined;
  // Fallback must reflect configuration even without WebGL; no-JS forms cannot submit PII by GET.
  browser = await launch();
  const fallback = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await fallback.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/i.test(type) ? null : native.call(this, type, ...args);
    };
  });
  await go(fallback, "/demo/velo/");
  ok(
    (await fallback.locator("[data-ready=fallback]").count()) === 1,
    "no WebGL fallback",
  );
  await fallback.locator("[data-velo-model=step]").click();
  await fallback.locator("[data-velo-color=ink]").click();
  ok(
    (await fallback.locator(".model-fallback").getAttribute("src")).includes(
      "velo-step-ink",
    ),
    "fallback variant sync",
  );
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  for (const [route, selector] of [
    ["/demo/neva/book/", "[data-book-next]"],
    ["/demo/atelier/inquiry/", "[type=submit]"],
    ["/demo/rift/checkout/", "[type=submit]"],
  ]) {
    await go(nojs, route);
    ok(await nojs.locator(selector).isDisabled(), "noJS guarded " + route);
  }
  const report = {
    version: 10,
    date: new Date().toISOString(),
    checks,
    routes: routes.length,
    redirects,
    reflow,
    errors,
    badResponses,
    models,
    status: "passed",
  };
  await fs.writeFile(
    process.env.V10_FLOWS_ONLY
      ? "verification-v10-flows.json"
      : process.env.V10_REFLOW_ONLY
        ? "verification-v10-reflow.json"
        : "verification-v10.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  server.close();
}
