import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const at = (file) => path.join(root, file);
const destination = "public/portfolio/brand";
const mark = await fs.readFile(at("src/assets/brand/studio-mark.svg"), "utf8");
const geometry = mark.match(/<g\b[\s\S]*<\/g>/)?.[0];
if (!geometry) throw new Error("The studio mark must contain its shared geometry.");
const svg = (contents, viewBox = "0 0 64 64") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${contents}</svg>\n`;
await fs.mkdir(at(destination), { recursive: true });
const save = (name, contents) => fs.writeFile(at(`${destination}/${name}`), contents);
await save("studio-mark.svg", mark.replace('aria-hidden="true"', 'role="img" aria-label="نشان استودیو طراحی"'));
const favicon = svg(`<style>.tile{fill:#fff}.mark{color:#151515}@media(prefers-color-scheme:dark){.tile{fill:#151515}.mark{color:#fff}}</style><rect class="tile" width="64" height="64" rx="13"/><g class="mark">${geometry}</g>`);
await save("favicon.svg", favicon);
// Keep the root and previous icon URL consistent for bookmarks and old clients.
await fs.writeFile(at("public/favicon.svg"), favicon);
await fs.writeFile(at("public/portfolio/favicon.svg"), favicon);
const fineGeometry = geometry.replace('stroke-width="7"', 'stroke-width="0.7"');
const placements = [
  ["profile-pattern.svg", "0 0 362 525", [[-42, 3, 3.8], [81, 190, 3.8], [-42, 377, 3.8]]],
  ["projects-pattern.svg", "0 0 291 443", [[25, -21, 3.3], [-65, 151, 3.3], [25, 323, 3.3]]],
];
for (const [name, viewBox, positions] of placements) {
  await save(name, svg(`<g color="#151515" opacity=".18">${positions.map(([x, y, scale]) => `<g transform="translate(${x} ${y}) scale(${scale})">${fineGeometry}</g>`).join("")}</g>`, viewBox));
}
const regular = await fs.readFile(at("src/assets/fonts/yekan-bakh/YekanBakhFaNum-Regular.woff"));
const semibold = await fs.readFile(at("src/assets/fonts/yekan-bakh/YekanBakhFaNum-SemiBold.woff"));
const fontCSS = `@font-face{font-family:Yekan;src:url(data:font/woff;base64,${regular.toString("base64")});font-weight:400}@font-face{font-family:Yekan;src:url(data:font/woff;base64,${semibold.toString("base64")});font-weight:600}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
  args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
  ${fontCSS}
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f8f7f4;color:#151515;font-family:Yekan,Tahoma,sans-serif;padding:44px 58px;display:flex;flex-direction:column;overflow:hidden}
  header,footer{display:flex;align-items:center;justify-content:space-between}header{height:64px}.signature{display:flex;gap:14px;align-items:center}.signature svg{width:56px;height:56px}.signature b{font-size:24px;font-weight:600}.tag{font-family:Arial,sans-serif;font-size:12px;letter-spacing:.16em}
  main{flex:1;display:grid;grid-template-columns:1.35fr 1fr;gap:32px;align-items:center}.eyebrow{font-size:18px;color:#666;margin:0 0 16px}h1{font-size:61px;line-height:1.55;font-weight:600;letter-spacing:-1px;margin:0}h1 span{display:block}p{margin:22px 0 0;font-size:22px;line-height:1.8;color:#666}
  .art{height:348px;position:relative;display:grid;place-items:center;direction:ltr}.outline{position:absolute;width:280px;height:280px;border:1px solid #dddcd7;border-radius:54px}.outline:first-child{transform:translate(-44px,-24px)}.outline:nth-child(2){transform:translate(44px,24px)}.main-mark{width:250px;height:250px;padding:18px;background:#151515;border-radius:44px;color:#f8f7f4;position:relative}.main-mark svg{width:100%;height:100%}.accent{position:absolute;width:18px;height:18px;background:#d83824;border-radius:4px;right:14px;top:40px}
  footer{padding-top:20px;border-top:1px solid #d8d7d2;font-size:16px}footer small{font-size:16px;color:#666}.address{font-family:Arial,sans-serif;font-size:16px;letter-spacing:.02em}
  </style></head><body><header><div class="signature">${mark}<b>استودیو طراحی</b></div><span class="tag" dir="ltr">DESIGN / BUILD / COMMERCE</span></header><main><div><div class="eyebrow">طراحی سایت فروشگاهی و وب‌سایت اختصاصی</div><h1><span>فروشگاه شما،</span><span>با هویت خودتان.</span></h1><p>طراحی فکرشده، اجرای دقیق، تجربهٔ خرید روان.</p></div><div class="art" aria-hidden="true"><div class="outline"></div><div class="outline"></div><div class="main-mark">${mark}</div><span class="accent"></span></div></main><footer><small>هماهنگ با برند شما، روی موبایل و دسکتاپ</small><span class="address" dir="ltr">sadrabgh.github.io/portfolio</span></footer></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: at("public/portfolio/social-studio.png") });
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<html><body style="margin:0;background:#fff;color:#151515;width:180px;height:180px">${svg(`<rect width="80" height="80" fill="#fff"/><g transform="translate(8 8)">${geometry}</g>`, "0 0 80 80")}</body></html>`);
  await page.screenshot({ path: at(`${destination}/apple-touch-icon.png`) });
  console.log("Studio identity generated: shared SVG mark, icons, two patterns, 1200 × 630 social card.");
} finally {
  await browser.close();
}
