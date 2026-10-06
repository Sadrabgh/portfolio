import { variantBySku, shoePrice } from "../../data/heepzy";
export interface CartItem {
  sku: string;
  quantity: number;
}
export interface CartState {
  version: 1;
  items: CartItem[];
  promotionCode: "RAVA10" | null;
}
export type ShippingMethod = "standard" | "express";
export const emptyCart = (): CartState => ({
  version: 1,
  items: [],
  promotionCode: null,
});
export function cleanCart(value: unknown): CartState {
  const clean = emptyCart();
  if (!value || typeof value !== "object") return clean;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !Array.isArray(raw.items) || raw.items.length > 216)
    return clean;
  for (const row of raw.items) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    if (
      typeof item.sku !== "string" ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) <= 0
    )
      continue;
    const match = variantBySku(item.sku);
    if (!match || match.variant.stock === 0) continue;
    const existing = clean.items.find((i) => i.sku === item.sku);
    const count = Math.min(Number(item.quantity), match.variant.stock);
    if (existing)
      existing.quantity = Math.min(
        existing.quantity + count,
        match.variant.stock,
      );
    else clean.items.push({ sku: item.sku, quantity: count });
  }
  clean.promotionCode =
    clean.items.length && raw.promotionCode === "RAVA10" ? "RAVA10" : null;
  return clean;
}
export function totalsForSubtotal(
  subtotal: number,
  promotionCode: string | null,
  method: ShippingMethod = "standard",
) {
  const discount = promotionCode === "RAVA10" ? Math.floor(subtotal * 0.1) : 0;
  const afterDiscount = subtotal - discount;
  const shipping =
    subtotal === 0
      ? 0
      : method === "express"
        ? 150000
        : afterDiscount >= 10000000
          ? 0
          : 90000;
  return {
    subtotal,
    discount,
    afterDiscount,
    shipping,
    total: afterDiscount + shipping,
  };
}
export function cartLines(cart: CartState) {
  return cart.items.flatMap((item) => {
    const match = variantBySku(item.sku);
    return match
      ? [
          {
            ...item,
            ...match,
            unitPrice: shoePrice(match.product),
            lineTotal: shoePrice(match.product) * item.quantity,
          },
        ]
      : [];
  });
}
export const cartTotals = (
  cart: CartState,
  method: ShippingMethod = "standard",
) =>
  totalsForSubtotal(
    cartLines(cart).reduce((n, l) => n + l.lineTotal, 0),
    cart.promotionCode,
    method,
  );
export const cartCount = (cart: CartState) =>
  cart.items.reduce((n, i) => n + i.quantity, 0);
