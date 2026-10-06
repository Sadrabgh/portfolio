import { shoeById, variantBySku } from "../../data/heepzy";
import {
  cleanCart,
  emptyCart,
  cartLines,
  cartTotals,
  totalsForSubtotal,
  type CartState,
  type ShippingMethod,
} from "./pricing";
export const CART_KEY = "rava-cart-v1",
  FAV_KEY = "rava-favourites-v1",
  RECEIPT_KEY = "rava-receipt-v1";
export type Persistence = "local" | "session" | "memory";
function storage(type: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return window[type];
  } catch {
    return null;
  }
}
function usable(store: Storage | null) {
  if (!store) return false;
  try {
    const key = "rava-storage-probe-v1";
    store.setItem(key, "1");
    const ok = store.getItem(key) === "1";
    store.removeItem(key);
    return ok;
  } catch {
    return false;
  }
}
function read(store: Storage | null, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw && raw.length <= 40000 ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
const cleanFavourites = (raw: unknown): string[] =>
  Array.isArray(raw)
    ? [
        ...new Set(
          raw.filter(
            (v): v is string => typeof v === "string" && !!shoeById(v),
          ),
        ),
      ].slice(0, 12)
    : [];
export class HeepzyStore {
  cart: CartState = emptyCart();
  favourites: string[] = [];
  mode: Persistence = "memory";
  private local = storage("localStorage");
  private session = storage("sessionStorage");
  private listeners = new Set<(external: boolean) => void>();
  constructor() {
    const localOk = usable(this.local),
      sessionOk = usable(this.session);
    const fallback = read(this.session, CART_KEY),
      fallbackFav = read(this.session, FAV_KEY);
    const hasFallback =
      !!fallback &&
      typeof fallback === "object" &&
      (fallback as { version?: number }).version === 1;
    const chosen =
      hasFallback && sessionOk
        ? this.session
        : localOk
          ? this.local
          : sessionOk
            ? this.session
            : null;
    this.cart = cleanCart(read(chosen, CART_KEY));
    this.favourites = cleanFavourites(read(chosen, FAV_KEY));
    this.mode =
      chosen === this.local && localOk
        ? "local"
        : chosen === this.session && sessionOk
          ? "session"
          : "memory";
    if (hasFallback && sessionOk && localOk) {
      this.cart = cleanCart(fallback);
      this.favourites = cleanFavourites(fallbackFav);
      this.mode = "local";
    }
    this.persist();
    window.addEventListener("storage", (e) => {
      if (this.mode !== "local" || e.storageArea !== this.local) return;
      if (e.key === CART_KEY) {
        const next = cleanCart(read(this.local, CART_KEY));
        if (JSON.stringify(next) !== JSON.stringify(this.cart)) {
          this.cart = next;
          this.notify(true);
        }
      } else if (e.key === FAV_KEY) {
        this.favourites = cleanFavourites(read(this.local, FAV_KEY));
        this.notify(true);
      }
    });
  }
  subscribe(fn: (external: boolean) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify(external = false) {
    this.listeners.forEach((fn) => fn(external));
  }
  private persist() {
    const write = (s: Storage | null) => {
      if (!s) return false;
      try {
        s.setItem(CART_KEY, JSON.stringify(this.cart));
        s.setItem(FAV_KEY, JSON.stringify(this.favourites));
        return true;
      } catch {
        return false;
      }
    };
    if (this.mode === "local" && write(this.local)) {
      try {
        this.session?.removeItem(CART_KEY);
        this.session?.removeItem(FAV_KEY);
      } catch {}
      return;
    }
    if (
      (this.mode === "local" || this.mode === "session") &&
      write(this.session)
    ) {
      this.mode = "session";
      return;
    }
    this.mode = "memory";
  }
  private commit() {
    this.cart = cleanCart(this.cart);
    this.persist();
    this.notify();
  }
  add(sku: string, quantity = 1) {
    const match = variantBySku(sku);
    if (
      !match ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      match.variant.stock < 1
    )
      return { ok: false, message: "این انتخاب موجود نیست." };
    const existing = this.cart.items.find((i) => i.sku === sku);
    const current = existing?.quantity || 0;
    if (current >= match.variant.stock)
      return { ok: false, message: "به سقف موجودی این سایز و رنگ رسیده‌ای." };
    const next = Math.min(current + quantity, match.variant.stock);
    if (existing) existing.quantity = next;
    else this.cart.items.push({ sku, quantity: next });
    this.commit();
    return { ok: true, message: "انتخابت به سبد اضافه شد." };
  }
  quantity(sku: string, value: number) {
    const line = this.cart.items.find((i) => i.sku === sku),
      match = variantBySku(sku);
    if (!line || !match || !Number.isInteger(value) || value < 1) return false;
    line.quantity = Math.min(value, match.variant.stock);
    this.commit();
    return true;
  }
  remove(sku: string) {
    const removed = this.cart.items.find((i) => i.sku === sku);
    this.cart.items = this.cart.items.filter((i) => i.sku !== sku);
    if (!this.cart.items.length) this.cart.promotionCode = null;
    this.commit();
    return removed ? { ...removed } : undefined;
  }
  promotion(value: string) {
    if (!this.cart.items.length)
      return { ok: false, message: "ابتدا یک محصول به سبد اضافه کن." };
    if (value.trim().toUpperCase() !== "RAVA10")
      return { ok: false, message: "این کد معتبر نیست. کد نمونه: RAVA10" };
    this.cart.promotionCode = "RAVA10";
    this.commit();
    return { ok: true, message: "۱۰٪ تخفیف نمونه اعمال شد." };
  }
  clearPromotion() {
    this.cart.promotionCode = null;
    this.commit();
  }
  toggleFavourite(id: string) {
    if (!shoeById(id)) return;
    this.favourites = this.favourites.includes(id)
      ? this.favourites.filter((v) => v !== id)
      : [...this.favourites, id];
    this.commit();
  }
  clearCart() {
    this.cart = emptyCart();
    this.commit();
  }
  ensurePersistence() {
    // A permission change can replace a previously inaccessible browser getter.
    this.local = storage("localStorage");
    this.session = storage("sessionStorage");
    this.mode = usable(this.local)
      ? "local"
      : usable(this.session)
        ? "session"
        : "memory";
    this.persist();
    this.notify();
    return this.mode !== "memory";
  }
}
export interface Receipt {
  version: 1;
  id: string;
  createdAt: string;
  lines: { sku: string; quantity: number; unitPrice: number }[];
  promotionCode: "RAVA10" | null;
  method: ShippingMethod;
  totals: ReturnType<typeof totalsForSubtotal>;
}
export function createReceipt(
  cart: CartState,
  method: ShippingMethod,
): Receipt {
  return {
    version: 1,
    id: "RV-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    lines: cartLines(cart).map((l) => ({
      sku: l.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
    promotionCode: cart.promotionCode,
    method,
    totals: cartTotals(cart, method),
  };
}
export function saveReceipt(receipt: Receipt) {
  const s = storage("sessionStorage");
  try {
    s?.setItem(RECEIPT_KEY, JSON.stringify(receipt));
    return !!s;
  } catch {
    return false;
  }
}
export function readReceipt(): Receipt | null {
  const raw = read(storage("sessionStorage"), RECEIPT_KEY);
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    r.version !== 1 ||
    typeof r.id !== "string" ||
    !/^RV-[A-Z0-9]{8}$/.test(r.id) ||
    typeof r.createdAt !== "string" ||
    !Number.isFinite(Date.parse(r.createdAt)) ||
    !Array.isArray(r.lines) ||
    !r.lines.length ||
    r.lines.length > 216 ||
    !["standard", "express"].includes(String(r.method))
  )
    return null;
  const lines = r.lines.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const l = row as Record<string, unknown>;
    if (
      typeof l.sku !== "string" ||
      !variantBySku(l.sku) ||
      !Number.isInteger(l.quantity) ||
      Number(l.quantity) < 1 ||
      Number(l.quantity) > 20 ||
      !Number.isInteger(l.unitPrice) ||
      Number(l.unitPrice) < 1 ||
      Number(l.unitPrice) > 20000000
    )
      return [];
    return [
      {
        sku: l.sku,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      },
    ];
  });
  if (lines.length !== r.lines.length) return null;
  const promotionCode = r.promotionCode === "RAVA10" ? "RAVA10" : null,
    method = r.method as ShippingMethod;
  const result: Receipt = {
    version: 1,
    id: r.id,
    createdAt: r.createdAt,
    lines,
    promotionCode,
    method,
    totals: totalsForSubtotal(
      lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
      promotionCode,
      method,
    ),
  };
  saveReceipt(result);
  return result;
}
