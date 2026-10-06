# Design Studio Portfolio

[مشاهدهٔ سایت](https://sadrabgh.github.io/portfolio/) · [ریپازیتوری](https://github.com/Sadrabgh/portfolio)

پرتفولیوی فارسی و راست‌چین با هشت نمونه‌کار مستقل: **ATELIERNO، RIFT، VELO، NEVA، ALBA، RAVA، AVAN و MORA**.

این پروژه با Astro و TypeScript ساخته شده و خروجی آن یک وب‌سایت استاتیک است. دموهای فروشگاهی شامل کاتالوگ، فیلتر، علاقه‌مندی‌ها، سبد خرید و سفارش آزمایشی هستند.

## اجرای محلی

Node.js 24 را نصب کنید، سپس:

```sh
npm ci
npm run dev
```

## بررسی و ساخت

```sh
npm run check
npm run build
npm run preview
```

خروجی قابل انتشار در `dist/` ساخته می‌شود. فایل‌های `src/` و `public/` سورس و دارایی‌های سایت‌اند؛ `dist/` و `node_modules/` در گیت ثبت نمی‌شوند.

## انتشار روی GitHub Pages

Workflow موجود در `.github/workflows/deploy.yml` پس از هر push به شاخهٔ `main`، وابستگی‌ها را نصب می‌کند، بررسی پایه را اجرا می‌کند و خروجی سایت را منتشر می‌کند. انتشار دستی از تب Actions نیز امکان‌پذیر است.

در تنظیمات ریپازیتوری، `Settings → Pages → Build and deployment → Source` باید روی **GitHub Actions** قرار داشته باشد. آدرس و مسیر پایهٔ سایت هنگام ساخت از تنظیمات Pages خوانده می‌شوند؛ تنظیم دستی نام کاربری یا ریپو در سورس لازم نیست.

برای ساخت محلی با آدرس انتشار دلخواه، متغیرهای `SITE_URL` و `SITE_BASE` را تنظیم کنید. در ریپوی `USERNAME.github.io` مسیر پایه `/` است؛ در یک ریپوی معمولی مثل `portfolio` مسیر پایه `/portfolio/` خواهد بود.

اطلاعات صاحب سایت و آدرس اختیاری ارسال فرم در `src/config.ts` قرار دارند. پرداخت و ثبت سفارش دموها آزمایشی است.

نشان و دارایی‌های هویت سایت اصلی با `npm run brand:build` بازسازی می‌شوند. فایل برداری اصلی و کاربردهای آن در [راهنمای هویت استودیو](docs/studio-identity.md) معرفی شده‌اند.

جزئیات بیشتر اجرای پروژه در [README فارسی](README.fa.md)، معنی نام‌ها در [راهنمای نام پروژه‌ها](docs/project-names.md) و منشأ دارایی‌ها در [ASSETS.md](ASSETS.md) و [LICENSE-ASSETS.md](LICENSE-ASSETS.md) ثبت شده است.
