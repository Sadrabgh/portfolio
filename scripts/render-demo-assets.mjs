import { spawn } from "node:child_process";
import { chromium } from "playwright";
const root = process.cwd(),
  origin = "http://127.0.0.1:4949";
const server = spawn(process.execPath, [root + "/serve.mjs"], {
  env: { ...process.env, PORT: "4949" },
  stdio: "ignore",
});
let browser;
const errors = [];
try {
  for (let n = 0; n < 40; n++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
  });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem("demo-motion", "reduce");
    localStorage.setItem("demo-theme", "light");
  });
  for (const id of ["one", "pro", "studio"]) {
    await p.goto(origin + "/demo/luma/" + id + "/", {
      waitUntil: "networkidle",
    });
    await p.locator("[data-object-activate]").click();
    await p.waitForFunction(
      () => document.querySelector(".d-object").dataset.ready === "true",
    );
    await p.evaluate(() => {
      const module = document.querySelector(".d-object-module");
      document.body.prepend(module);
      const style = document.createElement("style");
      style.textContent =
        ".d-object-module,.d-object{width:1200px!important;margin:0!important;border:0!important;border-radius:0!important}.d-object-view{height:1000px!important;width:1200px!important;aspect-ratio:auto!important}.d-object-tools,.d-object-views,.d-object-status,.d-object-badge{display:none!important}";
      document.head.append(style);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    for (const color of ["lavender", "charcoal", "sand"]) {
      await p.locator("button[data-color=" + color + "]").click();
      // hidden controls still dispatch their real handlers during the rendering pass.
      await p.evaluate(() =>
        document.querySelector("[data-object-view=overview]").click(),
      );
      await p.waitForTimeout(200);
      await p
        .locator(".d-object canvas")
        .screenshot({
          path: root + "/public/art/luma-" + id + "-" + color + "-v9.png",
        });
      await p.evaluate(() =>
        document.querySelector("[data-object-view=pads]").click(),
      );
      await p.waitForTimeout(200);
      await p
        .locator(".d-object canvas")
        .screenshot({
          path:
            root + "/public/art/luma-" + id + "-" + color + "-detail-v9.png",
        });
    }
    console.log("Rendered " + id + " / all 3 colors + detail views");
  }
  if (errors.length) throw Error(errors.join("; "));
  console.log(
    "18 actual product renders created. Convert PNG to WebP before integrating.",
  );
} finally {
  await browser?.close();
  server.kill();
}
