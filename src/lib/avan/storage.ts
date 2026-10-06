import { products, variantById, storePolicy } from "../../data/avan";
import { couponCode, cartPricing } from "./pricing";
import type { CartLine } from "./pricing";
import { sanitizeComparison } from "./comparison";
export const STATE_KEY = "avan:v1:state",
  RECEIPT_KEY = "avan:v1:receipt";
export interface StoreState {
  version: 1;
  cart: CartLine[];
  wishlist: string[];
  compare: string[];
  coupon: string;
}
export const emptyState = (): StoreState => ({
  version: 1,
  cart: [],
  wishlist: [],
  compare: [],
  coupon: "",
});
const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
// ASVS 1.5.2 / 2.2.1: validate persisted JSON, retain only known models and bounded integer quantities.
export function sanitizeState(raw: unknown): {
  state: StoreState;
  notices: string[];
} {
  const state = emptyState(),
    notices: string[] = [];
  const value = record(raw);
  if (!value)
    return {
      state,
      notices: raw === null ? [] : ["دادهٔ ذخیره‌شده معتبر نبود و پاک شد."],
    };
  if (value.version !== 1 && value.version !== 0)
    return { state, notices: ["نسخهٔ ذخیره‌شده قابل استفاده نبود و پاک شد."] };
  const source = value.version === 0 ? value.items : value.cart;
  if (Array.isArray(source))
    for (const rawLine of source.slice(0, 60)) {
      const line = record(rawLine),
        sku = line?.sku,
        quantity = value.version === 0 ? line?.qty : line?.quantity;
      if (
        typeof sku !== "string" ||
        typeof quantity !== "number" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      ) {
        notices.push("ردیف نامعتبر از سبد پاک شد.");
        continue;
      }
      const item = variantById(sku);
      if (!item || !item.variant.stock) {
        notices.push("کالای ناشناخته یا ناموجود از سبد پاک شد.");
        continue;
      }
      const old = state.cart.find((l) => l.sku === sku),
        total = Math.min(
          item.variant.stock,
          (old?.quantity || 0) + Math.min(quantity, 999),
        );
      if (total < quantity + (old?.quantity || 0))
        notices.push("تعداد با موجودی فعلی هماهنگ شد.");
      if (value.version === 1 && line?.priceAtAdd !== item.variant.price)
        notices.push(
          "قیمت یک انتخاب با قیمت فعلی هماهنگ شد؛ پیش از ثبت بازبینی کن.",
        );
      if (old) old.quantity = total;
      else
        state.cart.push({
          sku,
          quantity: total,
          priceAtAdd: item.variant.price,
        });
    }
  if (Array.isArray(value.wishlist))
    state.wishlist = products
      .filter(
        (p) => value.wishlist instanceof Array && value.wishlist.includes(p.id),
      )
      .map((p) => p.id);
  state.compare = sanitizeComparison(value.compare);
  if (
    typeof value.coupon === "string" &&
    couponCode(value.coupon) === storePolicy.coupon
  )
    state.coupon = storePolicy.coupon;
  if (value.version === 0)
    notices.push("سبد نسخهٔ قبلی به نسخهٔ جدید منتقل شد.");
  return { state, notices: [...new Set(notices)] };
}
export interface Receipt {
  version: 1;
  id: string;
  createdAt: string;
  items: CartLine[];
  coupon: string;
  amounts: ReturnType<typeof cartPricing>;
}
// ASVS 14.3.3: the receipt schema cannot contain recipient fields or arbitrary payload properties.
export function sanitizeReceipt(raw: unknown): Receipt | null {
  const value = record(raw);
  if (
    !value ||
    value.version !== 1 ||
    typeof value.id !== "string" ||
    !/^AV-[a-zA-Z0-9-]{4,60}$/.test(value.id) ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    return null;
  const { state, notices } = sanitizeState({
    version: 1,
    cart: value.items,
    coupon: value.coupon,
  });
  if (!state.cart.length || notices.length) return null;
  return {
    version: 1,
    id: value.id,
    createdAt: value.createdAt,
    items: state.cart,
    coupon: state.coupon,
    amounts: cartPricing(state.cart, state.coupon),
  };
}
export class AvanStore {
  state: StoreState = emptyState();
  mode: "local" | "session" | "memory" = "memory";
  notices: string[] = [];
  receipt: Receipt | null = null;
  private storage: Storage | null = null;
  private host: Window;
  constructor(host: Window) {
    this.host = host;
    for (const key of ["localStorage", "sessionStorage"] as const) {
      try {
        const storage = host[key];
        storage.setItem(STATE_KEY + ":probe", "1");
        storage.removeItem(STATE_KEY + ":probe");
        this.storage = storage;
        this.mode = key === "localStorage" ? "local" : "session";
        break;
      } catch {}
    }
    this.reload();
    try {
      this.receipt = sanitizeReceipt(
        this.read(host.sessionStorage, RECEIPT_KEY),
      );
    } catch {}
  }
  private read(storage: Storage, key: string) {
    try {
      const text = storage.getItem(key);
      if (!text) return null;
      if (text.length > 100000) return undefined;
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  reload() {
    if (!this.storage) return;
    let raw = this.read(this.storage, STATE_KEY);
    if (raw === null) raw = this.read(this.storage, "avan:v0:state");
    const result = sanitizeState(raw);
    this.state = result.state;
    this.notices = result.notices;
    this.save();
  }
  save() {
    if (this.storage)
      try {
        this.storage.setItem(STATE_KEY, JSON.stringify(this.state));
        return;
      } catch {}
    if (this.mode === "local")
      try {
        this.storage = this.host.sessionStorage;
        this.storage.setItem(STATE_KEY, JSON.stringify(this.state));
        this.mode = "session";
        return;
      } catch {}
    this.storage = null;
    this.mode = "memory";
  }
  add(sku: string, quantity: number) {
    const item = variantById(sku);
    if (!item?.variant.stock || !Number.isInteger(quantity) || quantity < 1)
      return false;
    const line = this.state.cart.find((l) => l.sku === sku);
    if (line && line.quantity >= item.variant.stock) return false;
    if (line)
      line.quantity = Math.min(item.variant.stock, line.quantity + quantity);
    else
      this.state.cart.push({
        sku,
        quantity: Math.min(item.variant.stock, quantity),
        priceAtAdd: item.variant.price,
      });
    this.save();
    return true;
  }
  update(sku: string, quantity: number) {
    const line = this.state.cart.find((l) => l.sku === sku),
      item = variantById(sku);
    if (!line || !item || !Number.isInteger(quantity) || quantity < 1) return;
    line.quantity = Math.min(quantity, item.variant.stock);
    this.state.cart = this.state.cart.filter((l) => l.quantity > 0);
    this.save();
  }
  saveReceipt(receipt: Receipt) {
    this.receipt = sanitizeReceipt(receipt);
    if (!this.receipt) return false;
    try {
      this.host.sessionStorage.setItem(
        RECEIPT_KEY,
        JSON.stringify(this.receipt),
      );
      return true;
    } catch {
      return false;
    }
  }
  validate() {
    const result = sanitizeState(this.state);
    this.state = result.state;
    this.save();
    return result.notices;
  }
  fingerprint() {
    return JSON.stringify({
      cart: this.state.cart,
      coupon: this.state.coupon,
      amounts: cartPricing(this.state.cart, this.state.coupon),
    });
  }
}
