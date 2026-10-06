import fs from "node:fs/promises";
import { chromium } from "playwright";

const font = await fs.readFile(
  "node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2",
);
const capture = await fs.readFile("public/portfolio/form-desktop.webp");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
  args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="fa" dir="rtl"><head><style>
  @font-face{font-family:Vazir;src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-weight:100 900}
  *{box-sizing:border-box}body{margin:0;background:#10121b;color:#eff0f8;font-family:Vazir,sans-serif;width:1200px;height:630px;padding:55px 65px;overflow:hidden}
  header{display:flex;gap:18px;align-items:center;font-size:21px;font-weight:650}svg{width:48px;height:48px}main{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin-top:55px}
  .label{font-size:16px;color:#a4afff;margin:0 0 17px}h1{font-size:61px;font-weight:750;line-height:1.65;margin:0;letter-spacing:-1px}h1 span{color:#a4afff}p{font-size:19px;color:#afb4c8;line-height:2.1;margin:21px 0 0}
  .studio{border:1px solid #30364b;background:#1d2130;border-radius:20px;padding:20px;height:365px;overflow:hidden;box-shadow:0 25px 50px #0004;transform:rotate(-2deg)}
  .studio-label{display:flex;justify-content:space-between;font-size:13px;color:#afb4c8;margin-bottom:18px}.window{border:1px solid #576079;border-radius:10px;overflow:hidden;background:#181b27}.toolbar{text-align:center;padding:7px;font-size:12px;color:#959cb5;border-bottom:1px solid #30364b}img{display:block;width:100%;height:315px;object-fit:cover;object-position:top}
  </style></head><body><header><svg viewBox="0 0 64 64"><g fill="none" stroke="#a4afff" stroke-width="4" stroke-linecap="round"><path d="M24 13h-3q-6 0-6 7v5q0 7-5 7 5 0 5 7v5q0 7 6 7h3M40 13h3q6 0 6 7v5q0 7 5 7-5 0-5 7v5q0 7-6 7h-3"/></g><rect x="28" y="28" width="8" height="8" rx="2" fill="#a4afff"/></svg><span>طراح مستقل وب</span></header><main><div><div class="label">طراحی رابط · توسعهٔ وب</div><h1>طراحیِ فکرشده.<br><span>اجرایِ دقیق.</span></h1><p>از ایدهٔ بصری، تا جزئیات مرورگر.</p></div><div class="studio"><div class="studio-label"><span>از ساختار، تا تجربه</span><span dir="ltr">FORM / CONCEPT 01</span></div><div class="window"><div class="toolbar" dir="ltr">form.design</div><img src="data:image/webp;base64,${capture.toString("base64")}" alt=""></div></div></main></body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
  });
  await page.screenshot({ path: "public/portfolio/social.png" });
  console.log("Created public/portfolio/social.png (1200 × 630)");
} finally {
  await browser.close();
}
