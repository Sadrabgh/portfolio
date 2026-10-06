import { storePolicy, variantById } from "../../data/avan";
import { normalizeDigits } from "./catalog";
export interface CartLine {
  sku: string;
  quantity: number;
  priceAtAdd: number;
}
export const couponCode = (value: string) =>
  normalizeDigits(value).trim().toUpperCase();
export function calculatePricing(subtotal: number, coupon: string = "") {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0 || subtotal > 1000000000)
    throw Error("Invalid concept subtotal");
  const discount =
    subtotal && couponCode(coupon) === storePolicy.coupon
      ? Math.min(Math.floor(subtotal / 10), storePolicy.discountCap)
      : 0;
  const net = subtotal - discount,
    shipping =
      subtotal === 0
        ? 0
        : net >= storePolicy.freeShippingThreshold
          ? 0
          : storePolicy.shipping;
  return { subtotal, discount, net, shipping, total: net + shipping };
}
export function cartPricing(lines: CartLine[], coupon = "") {
  return calculatePricing(
    lines.reduce(
      (sum, line) =>
        sum + (variantById(line.sku)?.variant.price || 0) * line.quantity,
      0,
    ),
    coupon,
  );
}
