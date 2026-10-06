import {
  skinProducts,
  skinMoney,
  shippingFee,
  shippingThreshold,
  sampleOrder,
} from "../data/velia";
import { url } from "../config";
export type DemoReceipt = {
  id: string;
  createdAt: number;
  lines: { id: string; quantity: number }[];
  promo: boolean;
  delivery: "standard" | "express";
};
const map = new Map(skinProducts.map((p) => [p.id, p]));
const storageKey = "velia-receipts-v1";
const safeRead = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw && raw.length < 60000 ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export function getReceipts(): DemoReceipt[] {
  const value = safeRead(storageKey);
  if (!Array.isArray(value)) return [];
  // ASVS 2.2.1: allowlisted, bounded receipt data is reconstructed; prices and receiver identity are never accepted from storage.
  return value.slice(0, 30).flatMap((r) => {
    if (
      !r ||
      typeof r !== "object" ||
      typeof r.id !== "string" ||
      !/^(?:AL|VL)-[A-Z0-9]{5,16}$/.test(r.id) ||
      !Number.isFinite(r.createdAt) ||
      r.createdAt < 0 ||
      !Array.isArray(r.lines)
    )
      return [];
    const seen = new Set<string>();
    const lines = r.lines
      .slice(0, 20)
      .flatMap((l: { id: unknown; quantity: unknown }) => {
        if (
          !l ||
          typeof l.id !== "string" ||
          !map.has(l.id) ||
          seen.has(l.id) ||
          !Number.isInteger(l.quantity) ||
          (l.quantity as number) < 1
        )
          return [];
        seen.add(l.id);
        return [{ id: l.id, quantity: Math.min(l.quantity as number, 50) }];
      });
    return lines.length
      ? [
          {
            id: r.id,
            createdAt: r.createdAt,
            lines,
            promo: r.promo === true,
            delivery:
              r.delivery === "express"
                ? ("express" as const)
                : ("standard" as const),
          },
        ]
      : [];
  });
}
export function receiptCost(r: DemoReceipt) {
  const subtotal = r.lines.reduce(
    (sum, l) => sum + map.get(l.id)!.price * l.quantity,
    0,
  );
  const discount = r.promo ? Math.round(subtotal * 0.1) : 0;
  const shipping =
    (subtotal >= shippingThreshold ? 0 : shippingFee) +
    (r.delivery === "express" ? 45000 : 0);
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
  };
}
export function saveReceipt(data: Omit<DemoReceipt, "id" | "createdAt">) {
  const receipt: DemoReceipt = {
    ...data,
    id: "AL-" + Date.now().toString(36).toUpperCase(),
    createdAt: Date.now(),
  };
  // ASVS 14.3.3: keep only product selections and demo metadata; no name, contact details, address or payment data.
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify([receipt, ...getReceipts()].slice(0, 30)),
    );
  } catch {}
  return receipt;
}
const sample: DemoReceipt = {
  id: sampleOrder.id,
  createdAt: new Date(2026, 9, 4, 10).getTime(),
  lines: sampleOrder.ids.map((id) => ({ id, quantity: 1 })),
  promo: false,
  delivery: "standard",
};
const allOrders = () => [...getReceipts(), sample];
const set = (selector: string, value: string) =>
  document.querySelectorAll(selector).forEach((e) => {
    e.textContent = value;
  });
const create = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
) => {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  return e;
};
function renderOrders(filter = "all") {
  const orders = allOrders();
  set("[data-order-count]", skinMoney(orders.length));
  document.querySelectorAll("[data-orders-list]").forEach((list) => {
    const shown = orders.filter(
      (r) =>
        filter === "all" ||
        (filter === "preparing" ? r.id === sample.id : r.id !== sample.id),
    );
    list.replaceChildren(
      ...shown.map((r) => {
        const link = create("a", "velia-order-row");
        link.href =
          url("demo/velia/account/order/") + "?id=" + encodeURIComponent(r.id);
        const art = create("div", "velia-order-thumbnails");
        r.lines.slice(0, 3).forEach((l) => {
          const p = map.get(l.id)!;
          const img = create("img");
          img.src = url(`art/velia/${p.cardImage || p.image}.webp`);
          img.alt = p.name;
          img.width = 74;
          img.height = 90;
          art.append(img);
        });
        const info = create("div", "velia-order-info");
        const id = create("b", "", r.id);
        id.dir = "ltr";
        info.append(
          id,
          create(
            "small",
            "",
            new Date(r.createdAt).toLocaleDateString("fa-IR"),
          ),
        );
        const cost = create("div", "velia-order-cost");
        cost.append(
          create(
            "span",
            "velia-status-pill",
            r.id === sample.id ? "در حال آماده‌سازی" : "ثبت‌شده",
          ),
          create("b", "", skinMoney(receiptCost(r).total) + " تومان"),
          create("small", "", "جزئیات سفارش ←"),
        );
        link.append(art, info, cost);
        return link;
      }),
    );
    document
      .querySelectorAll<HTMLElement>("[data-orders-empty]")
      .forEach((e) => {
        e.hidden = !!shown.length;
      });
  });
}
function accountState(active: boolean) {
  document
    .querySelectorAll<HTMLAnchorElement>("[data-account-entry]")
    .forEach((link) => {
      link.href = url(
        active ? "demo/velia/account/" : "demo/velia/account/login/",
      );
    });
  document
    .querySelectorAll<HTMLElement>("[data-account-content]")
    .forEach((e) => {
      e.hidden = !active;
    });
  document.querySelectorAll<HTMLElement>("[data-account-gate]").forEach((e) => {
    e.hidden = active;
  });
}
export function initStoreAccount() {
  let active = false;
  try {
    active = sessionStorage.getItem("velia-demo-account") === "open";
  } catch {}
  accountState(active);
  renderOrders();
  document
    .querySelectorAll<HTMLElement>("[data-demo-login]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        try {
          sessionStorage.setItem("velia-demo-account", "open");
        } catch {}
        if (button.hasAttribute("data-login-redirect")) {
          location.assign(url("demo/velia/account/"));
          return;
        }
        accountState(true);
        document
          .querySelector<HTMLElement>(".velia-account-main h2")
          ?.setAttribute("tabindex", "-1");
        document
          .querySelector<HTMLElement>(".velia-account-main h2")
          ?.focus({ preventScroll: true });
      }),
    );
  document.querySelectorAll("[data-demo-logout]").forEach((button) =>
    button.addEventListener("click", () => {
      try {
        sessionStorage.removeItem("velia-demo-account");
      } catch {}
      accountState(false);
      document.querySelector<HTMLElement>("[data-demo-login]")?.focus();
    }),
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-order-filter]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        document
          .querySelectorAll("[data-order-filter]")
          .forEach((e) => e.setAttribute("aria-pressed", String(e === button)));
        renderOrders(button.dataset.orderFilter);
      }),
    );
  const selectedId =
    new URLSearchParams(location.search).get("id") || sample.id;
  const selected = allOrders().find((r) => r.id === selectedId);
  const detail = document.querySelector<HTMLElement>("[data-order-detail]");
  if (detail) {
    detail.hidden = !selected;
    document.querySelector<HTMLElement>("[data-order-not-found]")!.hidden =
      !!selected;
    if (selected) {
      const cost = receiptCost(selected);
      set("[data-order-detail-id]", selected.id);
      set(
        "[data-order-detail-status]",
        selected.id === sample.id ? "در حال آماده‌سازی" : "ثبت‌شده",
      );
      set("[data-order-detail-total]", skinMoney(cost.total));
      set("[data-order-detail-subtotal]", skinMoney(cost.subtotal));
      set("[data-order-detail-discount]", skinMoney(cost.discount));
      set(
        "[data-order-detail-shipping]",
        cost.shipping ? skinMoney(cost.shipping) + " تومان" : "رایگان",
      );
      document
        .querySelector("[data-timeline-preparing]")
        ?.toggleAttribute("data-complete", selected.id === sample.id);
      const list = detail.querySelector("[data-order-detail-lines]")!;
      list.replaceChildren(
        ...selected.lines.map((l) => {
          const p = map.get(l.id)!;
          const row = create("article", "velia-order-product");
          const img = create("img");
          img.src = url(`art/velia/${p.cardImage || p.image}.webp`);
          img.alt = p.name;
          img.width = 85;
          img.height = 100;
          const copy = create("div");
          const a = create("a", "", p.name);
          a.href = url(`demo/velia/products/${p.id}/`);
          copy.append(
            a,
            create(
              "small",
              "",
              p.size + " · " + skinMoney(l.quantity) + " عدد",
            ),
          );
          row.append(
            img,
            copy,
            create("b", "", skinMoney(p.price * l.quantity) + " تومان"),
          );
          return row;
        }),
      );
      document
        .querySelector("[data-order-rebuy]")
        ?.addEventListener("click", () =>
          window.dispatchEvent(
            new CustomEvent("velia:rebuy", { detail: selected.lines }),
          ),
        );
    }
  }
  document
    .querySelector("[data-return-request]")
    ?.addEventListener("click", () => {
      set(
        "[data-return-status]",
        "درخواست بازگشت نمونه نمایش داده شد. برای شرایط، صفحهٔ بازگشت و تعویض را ببین؛ درخواستی به شبکه ارسال نشد.",
      );
    });
  const tracking = document.querySelector<HTMLFormElement>(
    "[data-tracking-form]",
  );
  tracking?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!tracking.reportValidity()) return;
    const id = (new FormData(tracking).get("order")?.toString() || "")
      .trim()
      .toUpperCase();
    const r = allOrders().find((item) => item.id === id);
    const result = document.querySelector<HTMLElement>(
      "[data-tracking-result]",
    )!;
    result.hidden = !r;
    set(
      "[data-tracking-status]",
      r
        ? "وضعیت سفارش نمونه پیدا شد."
        : "این شماره در سفارش‌های همین مرورگر پیدا نشد. شماره را بررسی کن.",
    );
    if (r) {
      set("[data-tracking-id]", r.id);
      set(
        "[data-tracking-state]",
        r.id === sample.id ? "در حال آماده‌سازی" : "ثبت‌شده",
      );
      const a = document.querySelector<HTMLAnchorElement>(
        "[data-tracking-link]",
      )!;
      a.href =
        url("demo/velia/account/order/") + "?id=" + encodeURIComponent(r.id);
    }
  });
  document
    .querySelectorAll<HTMLFormElement>("[data-demo-form]")
    .forEach((form) =>
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const type = form.dataset.demoForm;
        const status = form.querySelector<HTMLElement>("[data-form-status]")!;
        if (type === "review") {
          const values = new FormData(form);
          const review = create("article", "velia-review");
          const top = create("div");
          const rating = Math.max(
            1,
            Math.min(5, Number(values.get("rating")) || 5),
          );
          // ASVS 1.2.1: form data enters textContent only, including reviews and names.
          top.append(
            create(
              "b",
              "",
              (values.get("name")?.toString() || "").slice(0, 40),
            ),
            create("span", "", "★".repeat(rating) + "☆".repeat(5 - rating)),
          );
          review.append(
            top,
            create(
              "p",
              "",
              (values.get("message")?.toString() || "").slice(0, 500),
            ),
          );
          document.querySelector("[data-review-list]")?.append(review);
        }
        status.textContent =
          type === "profile"
            ? "تغییرات در همین صفحه پیش‌نمایش شدند؛ اطلاعات شخصی ذخیره نشده است."
            : type === "newsletter"
              ? "عضویت نمونه با موفقیت نمایش داده شد؛ ایمیلی ذخیره یا ارسال نشد."
              : type === "review"
                ? "دیدگاه نمونه در این صفحه نمایش داده شد؛ پس از بارگذاری دوباره باقی نمی‌ماند."
                : "پیام آزمایشی بررسی شد؛ اطلاعاتی ذخیره یا ارسال نشده است.";
        if (type === "profile") {
          const name = (new FormData(form).get("name")?.toString() || "")
            .trim()
            .slice(0, 70);
          set(".velia-account-person b", name);
          set(".velia-account-person>span", name.slice(0, 1));
        } else form.reset();
      }),
    );
  document
    .querySelectorAll<HTMLInputElement>("[data-demo-preference]")
    .forEach((input) => {
      const key = "velia-pref-" + input.dataset.demoPreference;
      try {
        const v = localStorage.getItem(key);
        if (v !== null) input.checked = v === "true";
      } catch {}
      input.addEventListener("change", () => {
        try {
          localStorage.setItem(key, String(input.checked));
        } catch {}
      });
    });
  initAddresses();
}
function initAddresses() {
  const form = document.querySelector<HTMLFormElement>("[data-address-form]");
  if (!form) return;
  let editing: string | null = null;
  const label = form.elements.namedItem("label") as HTMLInputElement;
  const address = form.elements.namedItem("address") as HTMLTextAreaElement;
  const open = (id: string | null) => {
    editing = id;
    form.hidden = false;
    form.reset();
    const card = id
      ? document.querySelector<HTMLElement>(`[data-address-card="${id}"]`)
      : null;
    label.value = card?.querySelector("h3")?.textContent || "";
    address.value =
      card?.querySelector("[data-address-text]")?.textContent || "";
    set("[data-address-form-title]", id ? "ویرایش نشانی" : "نشانی جدید");
    label.focus();
  };
  document
    .querySelector("[data-address-new]")
    ?.addEventListener("click", () => open(null));
  document
    .querySelector("[data-address-cancel]")
    ?.addEventListener("click", () => {
      form.hidden = true;
      document.querySelector<HTMLElement>("[data-address-new]")?.focus();
    });
  document
    .querySelector("[data-address-list]")
    ?.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const edit = target?.closest<HTMLElement>("[data-address-edit]");
      if (edit) open(edit.dataset.addressEdit!);
      const remove = target?.closest<HTMLElement>("[data-address-remove]");
      if (remove) {
        const card = remove.closest<HTMLElement>("[data-address-card]")!;
        card.hidden = true;
        const status = document.querySelector("[data-address-status]")!;
        const undo = create("button", "skin-text-button", "برگرداندن");
        undo.type = "button";
        undo.addEventListener("click", () => {
          card.hidden = false;
          status.replaceChildren();
          card.querySelector<HTMLElement>("button")?.focus();
        });
        status.replaceChildren(
          create("span", "", "نشانی از پیش‌نمایش حذف شد. "),
          undo,
        );
        undo.focus();
      }
    });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const city = (form.elements.namedItem("city") as HTMLInputElement).value
      .trim()
      .slice(0, 50);
    const name = label.value.trim().slice(0, 30);
    const copy = city + "، " + address.value.trim().slice(0, 300);
    let card = editing
      ? document.querySelector<HTMLElement>(`[data-address-card="${editing}"]`)
      : null;
    if (card) {
      card.querySelector("h3")!.textContent = name;
      card.querySelector("[data-address-text]")!.textContent = copy;
    } else {
      const id = "preview-" + Date.now();
      card = create("article", "velia-address-card");
      card.dataset.addressCard = id;
      const top = create("div");
      top.append(create("h3", "", name));
      const p = create("p", "", copy);
      p.dataset.addressText = "";
      const actions = create("div", "velia-address-actions");
      const edit = create("button", "", "ویرایش");
      edit.type = "button";
      edit.dataset.addressEdit = id;
      const remove = create("button", "", "حذف");
      remove.type = "button";
      remove.dataset.addressRemove = id;
      actions.append(edit, remove);
      card.append(
        top,
        p,
        create("small", "", "نشانی آزمایشی — فقط در صفحهٔ جاری"),
        actions,
      );
      document.querySelector("[data-address-list]")?.append(card);
    }
    form.hidden = true;
    form.reset();
    set(
      "[data-address-status]",
      "نشانی در صفحهٔ جاری پیش‌نمایش شد؛ در مرورگر ذخیره نشده است.",
    );
    card.querySelector<HTMLElement>("button")?.focus();
  });
}
