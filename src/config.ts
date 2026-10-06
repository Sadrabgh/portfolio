// اطلاعات صاحب سایت فقط در این فایل تغییر می‌کنند.
export const site = {
  brand: "استودیو طراحی",
  englishBrand: "DESIGN STUDIO",
  ownerName: "",
  description:
    "طراحی و توسعهٔ وب‌سایت اختصاصی برای معرفی کسب‌وکار، فروش محصول و تجربه‌های تعاملی سه‌بعدی.",
  email: "",
  telegram: "",
  github: "",
  // Optional HTTPS form endpoint. See README for its contract.
  formEndpoint: "",
};
export const url = (path: string = "") =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
