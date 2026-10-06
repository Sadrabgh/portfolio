import type { Furniture } from "../data/mora";
import {
  animate,
  motion,
  captureLayout,
  settleLayout,
  swapImage,
  confirmControl,
  setupEditorialMotion,
} from "./mora-motion";
interface Selection {
  v: 1;
  cart: Record<string, number>;
  saved: string[];
  compare: string[];
  coupon: boolean;
}
interface Receipt {
  id: string;
  at: number;
  cart: Record<string, number>;
  coupon: boolean;
  delivery: "standard" | "pickup";
}
const payload = JSON.parse(
  document.querySelector("#mr-data")?.textContent || "{}",
) as {
  products: Furniture[];
  collections: { id: string; ids: string[] }[];
  base: string;
};
const { products, collections, base } = payload;
const get = (id: string) => products.find((p) => p.id === id);
const href = (path = "") => base + path;
const asset = (name: string, w = 400) =>
  base.replace(/demo\/mora\/$/, "") + "images/mora/" + name + "-" + w + ".webp";
const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const money = (n: number) => fmt(n) + " تومان";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);
const all = <T extends Element = HTMLElement>(selector: string) =>
  Array.from(document.querySelectorAll<T>(selector));
const digits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
const initial = (): Selection => ({
  v: 1,
  cart: {},
  saved: [],
  compare: [],
  coupon: false,
});
function validCart(raw: unknown): Record<string, number> {
  const cart: Record<string, number> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return cart;
  for (const [id, q] of Object.entries(raw)) {
    const p = get(id);
    if (
      p &&
      p.stock > 0 &&
      typeof q === "number" &&
      Number.isSafeInteger(q) &&
      q > 0
    )
      cart[id] = Math.min(q, p.stock);
  }
  return cart;
}
function sanitize(raw: unknown): Selection {
  if (!raw || typeof raw !== "object" || (raw as { v?: unknown }).v !== 1)
    return initial();
  const r = raw as Partial<Selection>;
  const ids = (value: unknown) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string => typeof id === "string" && !!get(id),
            ),
          ),
        ]
      : [];
  return {
    v: 1,
    cart: validCart(r.cart),
    saved: ids(r.saved),
    compare: ids(r.compare).slice(0, 3),
    coupon: r.coupon === true,
  };
}
const key = "mora:v1:store";
let mode: "local" | "session" | "memory" = "local";
let state = initial();
try {
  state = sanitize(JSON.parse(localStorage.getItem(key) || "null"));
  localStorage.setItem("mora:probe", "1");
  localStorage.removeItem("mora:probe");
} catch {
  mode = "session";
  try {
    state = sanitize(JSON.parse(sessionStorage.getItem(key) || "null"));
    sessionStorage.setItem("mora:probe", "1");
    sessionStorage.removeItem("mora:probe");
  } catch {
    mode = "memory";
  }
}
function persist() {
  const data = JSON.stringify(state);
  try {
    if (mode === "local") {
      localStorage.setItem(key, data);
      return;
    }
  } catch {
    mode = "session";
  }
  try {
    if (mode !== "memory") {
      sessionStorage.setItem(key, data);
      mode = "session";
      return;
    }
  } catch {
    mode = "memory";
  }
  $("[data-storage-note]")?.removeAttribute("hidden");
}
if (mode !== "local") $("[data-storage-note]")?.removeAttribute("hidden");
let toastTimer = 0,
  toastHideTimer = 0;
function toast(text: string) {
  const el = $(".mr-toast");
  if (!el) return;
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  el.textContent = text;
  if (el.hidden) {
    el.hidden = false;
    void el.offsetWidth;
  }
  el.dataset.visible = "true";
  toastTimer = window.setTimeout(() => {
    delete el.dataset.visible;
    toastHideTimer = window.setTimeout(() => {
      el.hidden = true;
    }, 200);
  }, 3000);
}
function totals(
  cart = state.cart,
  coupon = state.coupon,
  delivery: "standard" | "pickup" = "standard",
) {
  const subtotal = Object.entries(cart).reduce(
    (sum, [id, q]) => sum + (get(id)?.price || 0) * q,
    0,
  );
  const discount = coupon ? Math.min(Math.floor(subtotal * 0.1), 3000000) : 0;
  const shipping =
    subtotal === 0 || delivery === "pickup" || subtotal - discount >= 70000000
      ? 0
      : 500000;
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
  };
}
const totalHTML = (t: ReturnType<typeof totals>) =>
  `<div class="mr-totals"><div><span>مجموع محصولات</span><span>${money(t.subtotal)}</span></div>${t.discount ? "<div><span>تخفیف MORA10</span><span>− " + money(t.discount) + "</span></div>" : ""}<div><span>تحویل</span><span>${t.shipping ? money(t.shipping) : "بدون هزینه"}</span></div><div><strong>مبلغ آزمایشی</strong><strong>${money(t.total)}</strong></div></div>`;
const empty = (title: string, text = "") =>
  `<div class="mr-empty"><h2>${title}</h2><p>${text}</p><a class="mr-btn" href="${href("shop/")}">دیدن محصولات ←</a></div>`;
function lineHTML(id: string, q: number, editable = true) {
  const p = get(id)!;
  return `<div class="mr-cart-line" data-cart-line="${id}"><img src="${asset(p.image)}" alt="${esc(p.name)}" width="400" height="400"/><div><a href="${href("product/" + id + "/")}"><h3>${esc(p.name)}</h3><span class="mr-code" dir="ltr">${p.code}</span></a><p>${money(p.price * q)}${q > 1 ? " / " + fmt(q) + " عدد" : ""}</p></div>${editable ? `<div class="mr-line-actions"><div class="mr-qty-tools"><button data-qty="${id}" data-delta="-1" aria-label="کم‌کردن تعداد ${p.code}" ${q <= 1 ? "disabled" : ""}>−</button><span aria-label="تعداد">${fmt(q)}</span><button data-qty="${id}" data-delta="1" aria-label="بیشترکردن تعداد ${p.code}" ${q >= p.stock ? "disabled" : ""}>+</button></div><button class="mr-text-button mr-remove" data-remove="${id}">حذف</button></div>` : `<span>${fmt(q)} عدد</span>`}</div>`;
}
function couponHTML() {
  return `<form class="mr-coupon"><label for="mr-coupon-input">کد نمونه: MORA10</label><div><input id="mr-coupon-input" name="coupon" placeholder="MORA10" value="${state.coupon ? "MORA10" : ""}" maxlength="20"/><button type="submit" class="mr-outline">اعمال</button></div>${state.coupon ? '<button type="button" class="mr-text-button" data-remove-coupon>حذف تخفیف</button>' : ""}</form>`;
}
let checkoutStep = 0,
  reviewFingerprint = "",
  busy = false;
const fingerprint = () =>
  JSON.stringify([Object.entries(state.cart).sort(), state.coupon, delivery()]);
function delivery(): "standard" | "pickup" {
  return $<HTMLInputElement>("[name=delivery]:checked")?.value === "pickup"
    ? "pickup"
    : "standard";
}
function renderSummary() {
  const target = $("[data-checkout-summary]");
  if (!target) return;
  const rows = Object.entries(state.cart)
    .map(
      ([id, q]) =>
        `<div class="mr-summary-item"><span>${get(id)!.name} × ${fmt(q)}</span><span>${money(get(id)!.price * q)}</span></div>`,
    )
    .join("");
  target.innerHTML =
    "<h2>خلاصهٔ انتخاب</h2>" +
    rows +
    totalHTML(totals(state.cart, state.coupon, delivery())) +
    `<small>برای تغییر تعداد یا کد تخفیف، <a href="${href("cart/")}">سبد را بازبینی کن</a>.</small>`;
  const isEmpty = Object.keys(state.cart).length === 0;
  $("[data-checkout]")?.toggleAttribute("hidden", isEmpty);
  $("[data-checkout-empty]")?.toggleAttribute("hidden", !isEmpty);
}
let cartRendered = false;
function renderCart() {
  const drawerRoot = $("[data-drawer-content]"),
    cartRoot = $("[data-cart-content]");
  const drawerBefore = captureLayout(
    cartRendered ? drawerRoot : null,
    "[data-cart-line]",
    "data-cart-line",
  );
  const cartBefore = captureLayout(
    cartRendered ? cartRoot : null,
    "[data-cart-line]",
    "data-cart-line",
  );
  const entries = Object.entries(state.cart),
    count = entries.reduce((sum, [, q]) => sum + q, 0);
  all("[data-cart-count]").forEach((el) => {
    const updated = el.textContent?.trim() !== fmt(count);
    el.textContent = fmt(count);
    if (el.classList.contains("mr-count")) {
      el.hidden = count === 0;
      if (updated && count > 0 && cartRendered)
        animate(el, [{ scale: ".85" }, { scale: "1" }], 180);
    }
  });
  const lines = entries.map(([id, q]) => lineHTML(id, q)).join("");
  const drawer = $("[data-drawer-content]");
  if (drawer)
    drawer.innerHTML = count
      ? lines +
        `<div class="mr-summary">${totalHTML(totals())}<a class="mr-btn" href="${href("checkout/")}">ادامهٔ سفارش آزمایشی ←</a></div>`
      : empty("سبد تو هنوز خالی است.", "از یک قطعهٔ دوست‌داشتنی شروع کن.");
  const cart = $("[data-cart-content]");
  if (cart) {
    cart.className = "";
    cart.innerHTML = count
      ? `<div class="mr-cart-layout"><div>${lines}<a class="mr-text-link" href="${href("shop/")}">ادامهٔ انتخاب ←</a></div><aside class="mr-summary"><h2>خلاصهٔ سبد</h2>${totalHTML(totals())}${couponHTML()}<a class="mr-btn" href="${href("checkout/")}">ادامهٔ سفارش آزمایشی ←</a><small>ارسال معمول؛ دریافت حضوری در مرحلهٔ بعد بدون هزینه است.</small></aside></div>`
      : empty("سبد تو هنوز خالی است.", "مدل دلخواهت را در فروشگاه پیدا کن.");
  }
  if (cartRendered) {
    settleLayout(
      drawerRoot,
      "[data-cart-line]",
      "data-cart-line",
      drawerBefore,
      true,
    );
    settleLayout(
      cartRoot,
      "[data-cart-line]",
      "data-cart-line",
      cartBefore,
      true,
    );
  }
  cartRendered = true;
  renderSummary();
  if (checkoutStep === 2 && reviewFingerprint !== fingerprint()) {
    setStep(1);
    toast("سبد تغییر کرده؛ سفارش را دوباره بازبینی کن.");
  }
}
function renderPreferences() {
  all<HTMLButtonElement>("[data-save]").forEach((el) =>
    el.setAttribute(
      "aria-pressed",
      String(state.saved.includes(el.dataset.save!)),
    ),
  );
  all<HTMLButtonElement>("[data-compare]").forEach((el) =>
    el.setAttribute(
      "aria-pressed",
      String(state.compare.includes(el.dataset.compare!)),
    ),
  );
  const wish = $("[data-wishlist]");
  if (wish) {
    Array.from(wish.children).forEach(
      (el) =>
        ((el as HTMLElement).hidden = !state.saved.includes(
          (el as HTMLElement).dataset.product!,
        )),
    );
    $("[data-wishlist-empty]")?.toggleAttribute(
      "hidden",
      state.saved.length > 0,
    );
  }
  let bar = $(".mr-compare-bar");
  if (state.compare.length && document.body.dataset.page !== "compare") {
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "mr-compare-bar";
      document.body.append(bar);
    }
    bar.innerHTML = `<span>${fmt(state.compare.length)} مدل برای مقایسه</span><a href="${href("compare/")}">دیدن مقایسه ←</a>`;
  } else bar?.remove();
  const target = $("[data-compare-content]");
  if (target) {
    target.className = "";
    if (!state.compare.length) {
      target.innerHTML = empty(
        "یک مدل برای شروع انتخاب کن.",
        "نشان مقایسه را در کارت مدل دلخواهت بزن.",
      );
      return;
    }
    const selected = state.compare.map((id) => get(id)!);
    target.innerHTML = `<div class="mr-compare-scroll" tabindex="0" role="region" aria-label="جدول مقایسه، قابل پیمایش"><table class="mr-compare-table"><thead><tr><th scope="col">مشخصات</th>${selected.map((p) => `<th scope="col"><img src="${asset(p.image)}" alt="${p.name}" width="160" height="130"/><a href="${href("product/" + p.id + "/")}"><h3>${p.name}</h3><span dir="ltr">${p.code}</span></a><br/><button class="mr-text-button" data-compare="${p.id}" aria-label="حذف ${p.code} از مقایسه">حذف از مقایسه</button></th>`).join("")}</tr></thead><tbody>${[
      ["قیمت", (p: Furniture) => money(p.price)],
      ["رنگ و متریال", (p: Furniture) => p.finish],
      [
        "عرض × عمق × ارتفاع",
        (p: Furniture) => p.dimensions.map(fmt).join(" × ") + " سانتی‌متر",
      ],
      [
        "موجودی",
        (p: Furniture) =>
          p.stock ? "موجود / " + fmt(p.stock) + " عدد" : "ناموجود",
      ],
      ["مراقبت", (p: Furniture) => p.care],
    ]
      .map(
        ([title, value]) =>
          `<tr><th scope="row">${title}</th>${selected.map((p) => "<td>" + (value as (p: Furniture) => string)(p) + "</td>").join("")}</tr>`,
      )
      .join(
        "",
      )}<tr><th scope="row">انتخاب</th>${selected.map((p) => `<td><button class="mr-btn" data-add="${p.id}" ${p.stock ? "" : "disabled"}>${p.stock ? "افزودن به سبد" : "ناموجود"}</button></td>`).join("")}</tr></tbody></table></div>`;
  }
}
function changed() {
  persist();
  renderCart();
  renderPreferences();
}
function add(id: string, q = 1) {
  const p = get(id);
  if (!p || !p.stock) {
    toast("این مدل فعلاً موجود نیست.");
    return false;
  }
  const available = p.stock - (state.cart[id] || 0);
  if (available < q) {
    toast("تعداد انتخابی از موجودی این مدل بیشتر است.");
    return false;
  }
  state.cart[id] = (state.cart[id] || 0) + q;
  changed();
  toast(p.code + " به سبد اضافه شد.");
  return true;
}
function save(id: string) {
  if (!get(id)) return;
  const index = state.saved.indexOf(id);
  if (index < 0) state.saved.push(id);
  else state.saved.splice(index, 1);
  changed();
  toast(index < 0 ? "مدل در انتخاب‌ها ذخیره شد." : "مدل از انتخاب‌ها حذف شد.");
}
function compare(id: string) {
  if (!get(id)) return;
  const index = state.compare.indexOf(id);
  if (index >= 0) state.compare.splice(index, 1);
  else if (state.compare.length >= 3) {
    toast("تا سه مدل قابل مقایسه است؛ ابتدا یکی را حذف کن.");
    return;
  } else state.compare.push(id);
  changed();
  toast(index >= 0 ? "مدل از مقایسه حذف شد." : "مدل به مقایسه اضافه شد.");
}
const dialogRequests = new WeakMap<HTMLDialogElement, number>();
let zoomRequest = 0;
function openDialog(id: string, source?: HTMLImageElement) {
  const dialog = $<HTMLDialogElement>("#" + id);
  if (!dialog || (dialog.open && dialog.dataset.phase !== "closing")) return;
  const token = (dialogRequests.get(dialog) || 0) + 1;
  dialogRequests.set(dialog, token);
  const from = source?.getBoundingClientRect();
  if (id === "mr-cart") renderCart();
  dialog.style.setProperty("--mr-panel-time", motion.panelIn + "ms");
  dialog.dataset.phase = "opening";
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = "hidden";
  const pose =
    id === "mr-zoom"
      ? "none"
      : id === "mr-menu"
        ? "translateY(-14px)"
        : "translateX(-100%)";
  animate(
    dialog,
    [
      { opacity: id === "mr-cart" ? 1 : 0.4, transform: pose },
      { opacity: 1, transform: "none" },
    ],
    motion.panelIn,
    "cubic-bezier(.32,.72,0,1)",
  );
  if (from && id === "mr-zoom") {
    const image = dialog.querySelector<HTMLImageElement>("img")!;
    const to = image.getBoundingClientRect();
    if (to.width && to.height)
      animate(
        image,
        [
          {
            transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px,${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${from.width / to.width},${from.height / to.height})`,
          },
          { transform: "none" },
        ],
        motion.panelIn,
      );
  }
  requestAnimationFrame(() => {
    if (dialogRequests.get(dialog) === token) dialog.dataset.phase = "open";
  });
}
async function closeDialog(dialog: HTMLDialogElement) {
  if (!dialog.open || dialog.dataset.phase === "closing") return;
  const token = (dialogRequests.get(dialog) || 0) + 1;
  dialogRequests.set(dialog, token);
  dialog.style.setProperty("--mr-panel-time", motion.panelOut + "ms");
  dialog.dataset.phase = "closing";
  const pose =
    dialog.id === "mr-zoom"
      ? "none"
      : dialog.id === "mr-menu"
        ? "translateY(-14px)"
        : "translateX(-100%)";
  const a = animate(
    dialog,
    [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: pose },
    ],
    motion.panelOut,
  );
  if (a) await a.finished.catch(() => {});
  if (dialogRequests.get(dialog) !== token) return;
  dialog.close();
  delete dialog.dataset.phase;
  document.body.style.overflow = "";
}
all<HTMLDialogElement>("dialog").forEach((d) => {
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    void closeDialog(d);
  });
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      void closeDialog(d);
  });
  d.addEventListener("close", () => {
    dialogRequests.set(d, (dialogRequests.get(d) || 0) + 1);
    delete d.dataset.phase;
    document.body.style.overflow = "";
  });
});
document.addEventListener("click", async (e) => {
  const el = (e.target as Element).closest<HTMLElement>("button,a");
  if (!el) return;
  if (el.hasAttribute("data-open-cart")) openDialog("mr-cart");
  if (el.hasAttribute("data-open-menu")) openDialog("mr-menu");
  if (el.hasAttribute("data-close")) {
    const d = el.closest("dialog");
    if (d) void closeDialog(d);
  }
  if (el.dataset.add) {
    let q = 1;
    if (el.hasAttribute("data-product-buy"))
      q = Number($<HTMLSelectElement>("#mr-product-qty")?.value || 1);
    if (add(el.dataset.add, q))
      confirmControl(el, get(el.dataset.add)!.code + " به سبد اضافه شد");
  }
  if (el.dataset.save) {
    save(el.dataset.save);
    const icon = el.querySelector("svg");
    if (icon) animate(icon, [{ scale: ".86" }, { scale: "1" }], 200);
  }
  if (el.dataset.compare) compare(el.dataset.compare);
  if (el.dataset.remove) {
    const nextFocus =
      el
        .closest("[data-cart-line]")
        ?.nextElementSibling?.querySelector<HTMLButtonElement>("button") ||
      el
        .closest("[data-cart-line]")
        ?.previousElementSibling?.querySelector<HTMLButtonElement>("button");
    const nextId =
      nextFocus?.closest<HTMLElement>("[data-cart-line]")?.dataset.cartLine;
    delete state.cart[el.dataset.remove];
    changed();
    toast("محصول از سبد حذف شد.");
    if (nextId)
      $<HTMLButtonElement>(`[data-cart-line="${nextId}"] button`)?.focus();
  }
  if (el.dataset.qty) {
    const id = el.dataset.qty,
      p = get(id)!;
    const q = (state.cart[id] || 0) + Number(el.dataset.delta);
    if (q >= 1 && q <= p.stock) {
      state.cart[id] = q;
      changed();
      const selector = `[data-qty="${id}"][data-delta="${el.dataset.delta}"]`;
      $<HTMLButtonElement>(selector)?.focus();
    }
  }
  if (el.hasAttribute("data-remove-coupon")) {
    state.coupon = false;
    changed();
    toast("تخفیف حذف شد.");
  }
  if (el.dataset.bundle) {
    const c = collections.find((x) => x.id === el.dataset.bundle);
    if (c) {
      const list = c.ids.map((id) => get(id)!).filter((p) => p.stock > 0);
      if (list.some((p) => (state.cart[p.id] || 0) >= p.stock)) {
        toast("موجودی یکی از مدل‌های کالکشن در سبدت تکمیل شده.");
        return;
      }
      list.forEach((p) => (state.cart[p.id] = (state.cart[p.id] || 0) + 1));
      changed();
      toast("مدل‌های موجود کالکشن به سبد اضافه شدند.");
    }
  }
  if (el.dataset.zoom) {
    const token = ++zoomRequest,
      candidate = new Image();
    candidate.src = asset(el.dataset.zoom, 1600);
    el.setAttribute("aria-busy", "true");
    try {
      await candidate.decode();
    } catch {
      el.removeAttribute("aria-busy");
      toast("تصویر باز نشد؛ دوباره امتحان کن.");
      return;
    }
    el.removeAttribute("aria-busy");
    if (token !== zoomRequest || !el.isConnected) return;
    const img = $<HTMLImageElement>("#mr-zoom img");
    if (img) {
      img.src = candidate.src;
      img.alt = el.querySelector("img")?.alt || "نمای محصول";
      openDialog(
        "mr-zoom",
        el.querySelector<HTMLImageElement>("img") || undefined,
      );
    }
  }
  if (el.hasAttribute("data-next")) {
    if (checkoutStep === 0 && !validateInfo()) return;
    if (checkoutStep === 1) {
      reviewFingerprint = fingerprint();
      reviewAddress();
    }
    setStep(checkoutStep + 1);
  }
  if (el.hasAttribute("data-back")) setStep(checkoutStep - 1);
  if (el.hasAttribute("data-edit-address")) setStep(0);
});
document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement;
  if (form.matches(".mr-coupon")) {
    e.preventDefault();
    const code = String(new FormData(form).get("coupon") || "")
      .trim()
      .toUpperCase();
    if (code === "MORA10") {
      state.coupon = true;
      changed();
      toast("تخفیف ۱۰ درصدی تا سقف ۳ میلیون اعمال شد.");
    } else toast("کد معتبر نمونه MORA10 است.");
  }
});
window.addEventListener("storage", (e) => {
  if (mode === "local" && (e.key === key || e.key === null)) {
    try {
      state = sanitize(JSON.parse(localStorage.getItem(key) || "null"));
    } catch {
      state = initial();
    }
    renderCart();
    renderPreferences();
  }
});
const filter = $<HTMLFormElement>("#mr-filter");
if (filter) {
  const params = new URLSearchParams(location.search);
  for (const name of ["q", "category", "material", "price", "sort"]) {
    const input = filter.elements.namedItem(name) as
      HTMLInputElement | HTMLSelectElement | null;
    if (input && params.has(name)) input.value = params.get(name)!;
  }
  const check = filter.elements.namedItem("stock") as HTMLInputElement;
  if (check) check.checked = params.get("stock") === "1";
  const grid = $("[data-catalog]")!,
    cards = all<HTMLElement>("[data-catalog] [data-product]");
  function applyFilter(withMotion = true) {
    const form = new FormData(filter!),
      query = String(form.get("q") || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const category = String(form.get("category") || "all"),
      material = String(form.get("material") || "all"),
      range = String(form.get("price") || "all"),
      sort = String(form.get("sort") || "default"),
      inStock = form.has("stock");
    const before = captureLayout(
      withMotion ? grid : null,
      "[data-product]",
      "data-product",
    );
    const sorted = [...cards].sort((a, b) =>
      sort === "low"
        ? Number(a.dataset.price) - Number(b.dataset.price)
        : sort === "high"
          ? Number(b.dataset.price) - Number(a.dataset.price)
          : cards.indexOf(a) - cards.indexOf(b),
    );
    for (const card of sorted) {
      const price = Number(card.dataset.price);
      const matches =
        (!query || card.dataset.search!.toLowerCase().includes(query)) &&
        (category === "all" || card.dataset.category === category) &&
        (material === "all" || card.dataset.material === material) &&
        (!inStock || Number(card.dataset.stock) > 0) &&
        (range === "all" ||
          (range === "low" && price <= 15000000) ||
          (range === "mid" && price > 15000000 && price <= 30000000) ||
          (range === "high" && price > 30000000));
      card.hidden = !matches;
      grid.append(card);
    }
    const visible = cards.filter((c) => !c.hidden);
    $("[data-results]")!.textContent = fmt(visible.length) + " محصول";
    $("[data-no-results]")!.hidden = visible.length > 0;
    if (withMotion)
      settleLayout(grid, "[data-product]", "data-product", before);
    const out = new URLSearchParams();
    if (query) out.set("q", query);
    for (const [name, value] of [
      ["category", category],
      ["material", material],
      ["price", range],
      ["sort", sort],
    ])
      if (value !== "all" && value !== "default") out.set(name, value);
    if (inStock) out.set("stock", "1");
    history.replaceState(
      null,
      "",
      location.pathname + (out.size ? "?" + out : "") + location.hash,
    );
  }
  filter.addEventListener("submit", (e) => e.preventDefault());
  filter.addEventListener("input", () => applyFilter());
  filter.addEventListener("reset", () => setTimeout(() => applyFilter(), 0));
  $("[data-reset-filter]")?.addEventListener("click", () => filter.reset());
  applyFilter(false);
}
const feature = $("[data-feature]");
if (feature) {
  const featured = [products[0], products[2], products[1], products[4]];
  let index = 0,
    request = 0;
  all<HTMLButtonElement>("[data-slide]").forEach((button) =>
    button.addEventListener("click", async () => {
      index =
        (index + Number(button.dataset.slide) + featured.length) %
        featured.length;
      const p = featured[index],
        token = ++request;
      const candidate = new Image();
      candidate.src = asset(p.image, 400);
      try {
        await candidate.decode();
      } catch {
        return;
      }
      if (token !== request) return;
      const img = feature.querySelector<HTMLImageElement>(
        "img:not(.mr-image-echo)",
      )!;
      swapImage(
        img,
        candidate.src,
        p.name + " " + p.code,
        -Number(button.dataset.slide),
      );
      for (const selector of [
        "[data-feature-name]",
        "[data-feature-code]",
        "[data-feature-price]",
      ]) {
        const label = feature.querySelector(selector)!;
        animate(
          label,
          [
            { opacity: 0.55, transform: "translateY(4px)" },
            { opacity: 1, transform: "none" },
          ],
          200,
        );
      }
      feature.querySelector("[data-feature-code]")!.textContent = p.code;
      feature.querySelector("[data-feature-name]")!.textContent = p.name;
      feature.querySelector("[data-feature-price]")!.textContent = money(
        p.price,
      );
      feature.querySelector("[data-slide-count]")!.textContent =
        String(index + 1).padStart(2, "0") + " / 04";
      feature.querySelector<HTMLAnchorElement>("[data-feature-link]")!.href =
        href("product/" + p.id + "/");
      feature.querySelector<HTMLAnchorElement>("[data-feature-buy]")!.href =
        href("product/" + p.id + "/");
      feature.querySelector<HTMLElement>("[data-feature-add]")!.dataset.add =
        p.id;
    }),
  );
}
function setStep(next: number) {
  const sections = all<HTMLElement>("[data-step]");
  if (!sections.length) return;
  const previousStep = checkoutStep;
  checkoutStep = Math.max(0, Math.min(2, next));
  if (previousStep === checkoutStep) return;
  sections.forEach((el, i) => (el.hidden = i !== checkoutStep));
  all(".mr-steps li").forEach((el, i) =>
    i === checkoutStep
      ? el.setAttribute("aria-current", "step")
      : el.removeAttribute("aria-current"),
  );
  const current = sections[checkoutStep];
  current.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  animate(
    current,
    [
      {
        opacity: 0.3,
        transform: `translateX(${checkoutStep > previousStep ? -12 : 12}px)`,
      },
      { opacity: 1, transform: "none" },
    ],
    motion.step,
  );
  renderSummary();
}
function validateInfo() {
  const form = $<HTMLFormElement>("#mr-checkout-form");
  if (!form) return false;
  const data = new FormData(form),
    phone = digits(String(data.get("phone") || "")).replace(/[\s-]/g, ""),
    postal = digits(String(data.get("postal") || "")).replace(/\s/g, "");
  const checks: [string, boolean, string][] = [
    [
      "fullName",
      String(data.get("fullName") || "").trim().length >= 3,
      "نام و نام خانوادگی را کامل بنویس.",
    ],
    [
      "phone",
      /^09\d{9}$/.test(phone),
      "شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود.",
    ],
    [
      "city",
      String(data.get("city") || "").trim().length >= 2,
      "نام شهر را بنویس.",
    ],
    ["postal", /^\d{10}$/.test(postal), "کد پستی باید ۱۰ رقم باشد."],
    [
      "address",
      String(data.get("address") || "").trim().length >= 10,
      "نشانی را با جزئیات بیشتری بنویس.",
    ],
  ];
  checks.forEach(([name, ok]) =>
    (form.elements.namedItem(name) as HTMLElement).setAttribute(
      "aria-invalid",
      String(!ok),
    ),
  );
  const failed = checks.find(([, ok]) => !ok),
    error = $("[data-form-error]")!;
  error.hidden = !failed;
  if (failed) {
    error.textContent = failed[2];
    (form.elements.namedItem(failed[0]) as HTMLElement).focus();
    return false;
  }
  return true;
}
function reviewAddress() {
  const form = $<HTMLFormElement>("#mr-checkout-form")!,
    data = new FormData(form),
    target = $("[data-review-address]")!;
  target.replaceChildren();
  for (const text of [
    data.get("fullName"),
    data.get("phone"),
    data.get("city") + " / " + data.get("address"),
    "کد پستی: " + data.get("postal"),
    delivery() === "pickup" ? "دریافت حضوری نمونه" : "ارسال معمول نمونه",
  ]) {
    const p = document.createElement("p");
    p.textContent = String(text);
    target.append(p);
  }
}
function validReceipt(value: unknown): Receipt | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Partial<Receipt>;
  if (
    typeof r.id !== "string" ||
    !/^MORA-[A-Z0-9]{8}$/.test(r.id) ||
    typeof r.at !== "number" ||
    !Number.isFinite(r.at) ||
    r.at < 0 ||
    r.at > Date.now() + 60000 ||
    !["standard", "pickup"].includes(r.delivery || "")
  )
    return null;
  const cart = validCart(r.cart);
  if (!Object.keys(cart).length) return null;
  return {
    id: r.id,
    at: r.at,
    cart,
    coupon: r.coupon === true,
    delivery: r.delivery!,
  };
}
function receiptHTML(r: Receipt) {
  return `<div class="mr-receipt"><div class="mr-receipt-top"><div><span class="mr-eyebrow">THANK YOU FOR MAKING ROOM.</span><h2>انتخابت ثبت شد.</h2></div><div class="mr-receipt-code"><span dir="ltr">${r.id}</span><br/>${new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(r.at)}</div></div>${Object.entries(
    r.cart,
  )
    .map(([id, q]) => lineHTML(id, q, false))
    .join(
      "",
    )}${totalHTML(totals(r.cart, r.coupon, r.delivery))}<p>${r.delivery === "pickup" ? "دریافت حضوری نمونه" : "ارسال معمول نمونه"} / سفارش آزمایشی؛ پرداخت و ارسال واقعی انجام نمی‌شود. اطلاعات دریافت‌کننده در رسید ذخیره نشده است.</p><a class="mr-btn mr-outline" href="${href("shop/")}">بازگشت به انتخاب‌ها ←</a></div>`;
}
try {
  const r = validReceipt(
    JSON.parse(sessionStorage.getItem("mora:v1:receipt") || "null"),
  );
  if (r && $("[data-order-content]")) {
    $("[data-order-content]")!.className = "";
    $("[data-order-content]")!.innerHTML = receiptHTML(r);
  }
} catch {}
$<HTMLFormElement>("#mr-checkout-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const form = e.currentTarget as HTMLFormElement,
    error = $("[data-final-error]")!;
  if (checkoutStep !== 2) return;
  if (!validateInfo()) {
    setStep(0);
    return;
  }
  if (reviewFingerprint !== fingerprint()) {
    setStep(1);
    toast("انتخاب‌ها تغییر کرده؛ دوباره بازبینی کن.");
    return;
  }
  if (!(form.elements.namedItem("consent") as HTMLInputElement).checked) {
    error.hidden = false;
    error.textContent = "برای ثبت، آزمایشی‌بودن سفارش را تأیید کن.";
    (form.elements.namedItem("consent") as HTMLInputElement).focus();
    return;
  }
  if (!Object.keys(state.cart).length) {
    renderCart();
    return;
  }
  busy = true;
  const id =
    "MORA-" +
    Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) =>
      n.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
  const receipt: Receipt = {
    id,
    at: Date.now(),
    cart: { ...state.cart },
    coupon: state.coupon,
    delivery: delivery(),
  };
  let saved = false;
  try {
    const data = JSON.stringify(receipt);
    sessionStorage.setItem("mora:v1:receipt", data);
    saved = sessionStorage.getItem("mora:v1:receipt") === data;
  } catch {}
  const inline = $("[data-inline-receipt]")!;
  inline.innerHTML = receiptHTML(receipt);
  inline.hidden = false;
  form.hidden = true;
  $("[data-checkout-summary]")!.hidden = true;
  all(".mr-steps").forEach((el) => (el.hidden = true));
  state.cart = {};
  state.coupon = false;
  persist();
  all("[data-cart-count]").forEach((el) => {
    el.textContent = "۰";
    el.hidden = true;
  });
  if (saved) {
    location.assign(href("order/"));
  } else {
    inline.querySelector("h2")?.setAttribute("tabindex", "-1");
    inline.querySelector<HTMLElement>("h2")?.focus();
  }
});
all<HTMLInputElement>("[name=delivery]").forEach((input) =>
  input.addEventListener("change", () => renderSummary()),
);
$<HTMLFormElement>("#mr-contact-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const result = $("[data-contact-result]")!;
  result.hidden = false;
  result.textContent =
    "فرم معتبر است. در این نمونه‌کار، پیام ارسال یا ذخیره نمی‌شود.";
  toast("فرم نمونه بررسی شد.");
});
renderCart();
renderPreferences();
setupEditorialMotion();
