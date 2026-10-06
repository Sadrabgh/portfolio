import { normalizeDigits } from "./catalog";
export const recipientFields = [
  "name",
  "phone",
  "city",
  "postal",
  "address",
] as const;
export type RecipientField = (typeof recipientFields)[number];
// ASVS 2.2.1, 14.3.3: bounded input validation; this object stays in the current form only.
export function recipientErrors(values: Record<RecipientField, string>) {
  const errors: Partial<Record<RecipientField, string>> = {};
  if (values.name.trim().length < 2 || values.name.length > 80)
    errors.name = "نام نمونه را با ۲ تا ۸۰ نویسه وارد کن.";
  if (!/^09\d{9}$/.test(normalizeDigits(values.phone).replace(/[\s-]/g, "")))
    errors.phone = "شمارهٔ نمونه باید ۱۱ رقم و با ۰۹ شروع شود.";
  if (values.city.trim().length < 2 || values.city.length > 80)
    errors.city = "نام شهر را با ۲ تا ۸۰ نویسه وارد کن.";
  if (!/^\d{10}$/.test(normalizeDigits(values.postal).replace(/[\s-]/g, "")))
    errors.postal = "کد پستی نمونه باید ۱۰ رقم باشد.";
  if (values.address.trim().length < 10 || values.address.length > 240)
    errors.address = "نشانی نمونه را با ۱۰ تا ۲۴۰ نویسه وارد کن.";
  return errors;
}
