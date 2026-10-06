// اطلاعات صاحب سایت فقط در این فایل تغییر می‌کنند.
export const site = {
  brand: "استودیو طراحی",
  englishBrand: "DESIGN STUDIO",
  ownerName: "",
  description:
    "طراحی و اجرای سایت فروشگاهی و وب‌سایت اختصاصی؛ هماهنگ با هویت برند، با معرفی روشن محصولات و تجربهٔ خرید آسان روی موبایل و دسکتاپ.",
  email: "",
  telegram: "",
  github: "https://github.com/Sadrabgh",
  // Optional HTTPS form endpoint. See README for its contract.
  formEndpoint: "",
};
export const url = (path: string = "") =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
