import fs from "node:fs/promises";
import sharp from "sharp";
import { launch, go, server } from "./v10-common.mjs";
const b = await launch();
async function ready(p) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images].filter((i) => i.getAttribute("src"));
    for (const i of images) i.loading = "eager";
    await Promise.all(images.map((i) => i.decode().catch(() => {})));
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
}
try {
  const p = await b.newPage({
    viewport: { width: 1440, height: 1058 },
    reducedMotion: "reduce",
  });
  for (const [route, w, h, name] of [
    ["", 1440, 1058, "desktop"],
    ["", 1440, 1600, "overview"],
    ["", 390, 1500, "mobile"],
    ["product/c01/", 1440, 1000, "detail"],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await go(p, "/demo/mora/" + route);
    await ready(p);
    const png = await p.screenshot();
    await fs.writeFile("output/mora/verification/final-" + name + ".png", png);
    const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
    for (const dir of ["public", "dist"])
      await fs.writeFile(dir + "/portfolio/mora-" + name + ".webp", webp);
  }
  await p.setViewportSize({ width: 1440, height: 1058 });
  await go(p, "/demo/mora/");
  await ready(p);
  await p.screenshot({
    path: "output/mora/verification/home-full.png",
    fullPage: true,
  });
  console.log("Clean final MORA portfolio captures saved.");
} finally {
  await b.close();
  await new Promise((r) => server.close(r));
}
