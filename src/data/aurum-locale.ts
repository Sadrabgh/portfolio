export const number = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);
export const money = (value: number) => number(Math.round(value)) + " تومان";
const options: Record<string, string> = {
  "One size": "تک‌سایز",
  "US 5": "۵ آمریکا",
  "US 6": "۶ آمریکا",
  "US 7": "۷ آمریکا",
  "US 8": "۸ آمریکا",
  "16 inch": "۱۶ اینچ · حدود ۴۱ سانتی‌متر",
  "18 inch": "۱۸ اینچ · حدود ۴۶ سانتی‌متر",
};
export const optionText = (value: string) => options[value] ?? value;
const categoryNames: Record<string, string> = {
  rings: "انگشتر",
  earrings: "گوشواره",
  necklaces: "گردنبند",
};
export const categoryText = (value: string) => categoryNames[value] ?? value;
export const delivery = {
  threshold: 60000000,
  standard: 120000,
  express: 240000,
  gift: 180000,
};
export const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670\u200c]/g, "")
    .replace(/\s+/g, " ")
    .trim();
