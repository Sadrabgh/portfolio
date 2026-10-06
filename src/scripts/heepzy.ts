import { flip, crossfade, switchStep } from "../lib/heepzy/motion";
import { initScrollReveal } from "../lib/heepzy/scroll-reveal";
import {
  shoes,
  shoeById,
  shoeImage,
  art,
  money,
  shopUrl,
  moods,
  readFilters,
  filterShoes,
  normaliseDigits,
  type Filters,
} from "../data/heepzy";
import {
  cartCount,
  cartLines,
  cartTotals,
  cleanCart,
  type ShippingMethod,
} from "../lib/heepzy/pricing";
import {
  HeepzyStore,
  createReceipt,
  saveReceipt,
  readReceipt,
  type Receipt,
} from "../lib/heepzy/storage";
const all = <T extends Element = HTMLElement>(
  s: string,
  r: ParentNode = document,
) => Array.from(r.querySelectorAll<T>(s));
const one = <T extends Element = HTMLElement>(
  s: string,
  r: ParentNode = document,
) => r.querySelector<T>(s);
const store = new HeepzyStore(),
  reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let shippingMethod: ShippingMethod = "standard",
  checkoutStep = 1,
  reviewDigest = "",
  orderPlaced = false;
const dialogs = {
  cart: one<HTMLDialogElement>("[data-cart-dialog]")!,
  quick: one<HTMLDialogElement>("[data-quick-dialog]")!,
  zoom: one<HTMLDialogElement>("[data-zoom-dialog]")!,
  menu: one<HTMLDialogElement>("[data-menu-dialog]")!,
};
const returnFocus = new WeakMap<HTMLDialogElement, HTMLElement>();
const dialogMotion = new WeakMap<HTMLDialogElement, Animation>();
const pendingClose = new WeakMap<
  HTMLDialogElement,
  ReturnType<typeof setTimeout>
>();
function dialogRest(d: HTMLDialogElement) {
  return d.classList.contains("hp-drawer")
    ? "translateX(0)"
    : "translateY(0) scale(1)";
}
function dialogAway(d: HTMLDialogElement) {
  return d.classList.contains("hp-drawer")
    ? "translateX(-100%)"
    : "translateY(8px) scale(.97)";
}
function openDialog(d: HTMLDialogElement, t?: HTMLElement) {
  const closing = pendingClose.get(d);
  if (closing) {
    clearTimeout(closing);
    pendingClose.delete(d);
  } else if (d.open) return;
  if (t) returnFocus.set(d, t);
  const wasOpen = d.open;
  const current = wasOpen ? getComputedStyle(d) : null;
  const from = {
    opacity: current?.opacity || 0,
    transform: current?.transform || dialogAway(d),
  };
  dialogMotion.get(d)?.cancel();
  if (!d.open) d.showModal();
  if (!toastElement.hidden) placeToast();
  d.style.opacity = "1";
  d.style.transform = dialogRest(d);
  if (!reduced())
    dialogMotion.set(
      d,
      d.animate([from, { opacity: 1, transform: dialogRest(d) }], {
        duration: d.classList.contains("hp-drawer") ? 280 : 220,
        easing: "cubic-bezier(.32,.72,0,1)",
      }),
    );
}
function closeDialog(d: HTMLDialogElement, instant = false) {
  if (!d.open) return;
  const old = pendingClose.get(d);
  if (old) clearTimeout(old);
  const current = getComputedStyle(d),
    from = { opacity: current.opacity, transform: current.transform };
  dialogMotion.get(d)?.cancel();
  if (instant || reduced()) {
    d.close();
    return;
  }
  dialogMotion.set(
    d,
    d.animate([from, { opacity: 0, transform: dialogAway(d) }], {
      duration: 140,
      easing: "cubic-bezier(.25,1,.5,1)",
      fill: "forwards",
    }),
  );
  pendingClose.set(
    d,
    setTimeout(() => {
      pendingClose.delete(d);
      d.close();
    }, 140),
  );
}
Object.values(dialogs).forEach((d) => {
  one("[data-close-dialog]", d)?.addEventListener("click", () =>
    closeDialog(d),
  );
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog(d);
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
      closeDialog(d);
  });
  d.addEventListener("close", () => {
    dialogMotion.get(d)?.cancel();
    const timer = pendingClose.get(d);
    if (timer) clearTimeout(timer);
    pendingClose.delete(d);
    if (toastElement.parentElement === d) placeToast();
    d.style.transform = "";
    d.style.opacity = "";
    const t = returnFocus.get(d);
    if (t?.isConnected) t.focus({ preventScroll: true });
  });
});
all<HTMLButtonElement>("[data-open-cart]").forEach((b) => {
  b.disabled = false;
  b.addEventListener("click", () => openDialog(dialogs.cart, b));
});
all<HTMLButtonElement>("[data-open-menu]").forEach((b) => {
  b.disabled = false;
  b.addEventListener("click", () => openDialog(dialogs.menu, b));
});
const guest = one<HTMLDetailsElement>(".hp-guest");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && guest?.open) {
    guest.open = false;
    one<HTMLElement>("summary", guest)?.focus();
  }
});
document.addEventListener("click", (e) => {
  if (guest?.open && !guest.contains(e.target as Node)) guest.open = false;
});
let toastTimer: ReturnType<typeof setTimeout>,
  undoAction: (() => void) | null = null;
const toastElement = one<HTMLElement>("[data-toast]")!;
const toastHome = toastElement.parentElement!;
function placeToast() {
  const host =
    Object.values(dialogs)
      .filter((d) => d.open)
      .at(-1) || toastHome;
  if (toastElement.parentElement !== host) host.append(toastElement);
}
function dismissToast() {
  const focused = toastElement.contains(document.activeElement);
  const scope = toastElement.closest("dialog") || one("[data-cart-page]");
  toastElement.hidden = true;
  undoAction = null;
  if (focused)
    one<HTMLElement>(
      "[data-cart-rows] button:not(:disabled),[data-cart-empty] a,[data-close-dialog]",
      scope || document,
    )?.focus({ preventScroll: true });
}
function toast(message: string, undo?: () => void) {
  clearTimeout(toastTimer);
  placeToast();
  one("span", toastElement)!.textContent = message;
  undoAction = undo || null;
  one<HTMLElement>("[data-undo]", toastElement)!.hidden = !undo;
  toastElement.hidden = false;
  toastTimer = setTimeout(
    () => {
      dismissToast();
    },
    undo ? 10000 : 5500,
  );
}
one("[data-dismiss-toast]")?.addEventListener("click", () => {
  dismissToast();
});
one("[data-undo]")?.addEventListener("click", () => {
  const action = undoAction;
  undoAction = null;
  action?.();
  dismissToast();
});
function updateFavourites() {
  all<HTMLButtonElement>("[data-favourite]").forEach((b) => {
    b.disabled = false;
    b.setAttribute(
      "aria-pressed",
      String(store.favourites.includes(b.dataset.favourite!)),
    );
  });
  all<HTMLElement>("[data-favourites-count]").forEach((n) => {
    n.textContent = String(store.favourites.length);
    n.hidden = !store.favourites.length;
  });
  const page = one("[data-favourites-page]");
  const focusedCard =
    document.activeElement?.closest<HTMLElement>("[data-card]");
  if (page) {
    all<HTMLElement>("[data-card]", page).forEach(
      (c) => (c.hidden = !store.favourites.includes(c.dataset.card!)),
    );
    one<HTMLElement>("[data-favourites-empty]", page)!.hidden =
      !!store.favourites.length;
    one("[data-favourites-status]", page)!.textContent = store.favourites.length
      ? `${new Intl.NumberFormat("fa-IR").format(store.favourites.length)} انتخاب ذخیره‌شده در ${store.mode === "session" ? "همین زبانه" : store.mode === "memory" ? "همین صفحه" : "این مرورگر"}.`
      : "قلب هر کفش را بزن تا اینجا پیدایش کنی.";
    if (focusedCard && page.contains(focusedCard) && focusedCard.hidden)
      one<HTMLElement>(
        "[data-card]:not([hidden]) [data-favourite],[data-favourites-empty] a",
        page,
      )?.focus({ preventScroll: true });
  }
}
function bindFavourites(root: ParentNode) {
  all<HTMLButtonElement>("[data-favourite]", root).forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = "1";
    b.disabled = false;
    b.addEventListener("click", () => {
      store.toggleFavourite(b.dataset.favourite!);
      b.setAttribute(
        "aria-label",
        `${store.favourites.includes(b.dataset.favourite!) ? "ذخیره شد" : "ذخیره در علاقه‌مندی‌ها"}: ${shoeById(b.dataset.favourite!)!.name}`,
      );
    });
  });
}
function bindProducts(root: ParentNode) {
  all<HTMLElement>("[data-product]", root).forEach((panel) => {
    if (panel.dataset.bound) return;
    panel.dataset.bound = "1";
    const p = shoeById(panel.dataset.product!)!;
    let colour = p.colours[0].id,
      size = "",
      angle = panel.dataset.angle || "1";
    const select = one<HTMLSelectElement>("[data-size]", panel)!,
      add = one<HTMLButtonElement>("[data-add]", panel)!,
      main = one<HTMLImageElement>("[data-product-image]", panel)!,
      message = one("[data-product-status]", panel)!;
    function image() {
      void crossfade(
        main,
        angle === "lifestyle"
          ? art("featured")
          : shoeImage(p, colour, Number(angle)),
        angle === "lifestyle"
          ? `${p.name} سفید و نارنجی، نمای روی پا`
          : `${p.name}، ${p.colours.find((c) => c.id === colour)!.label}، نمای ${angle}`,
      );
      all<HTMLButtonElement>(".hp-thumbs [data-angle]", panel).forEach((b) => {
        b.hidden =
          Number(b.dataset.angle) >
          p.colours.find((c) => c.id === colour)!.angles;
        b.setAttribute("aria-pressed", String(b.dataset.angle === angle));
        one<HTMLImageElement>("img", b)!.src = shoeImage(
          p,
          colour,
          Number(b.dataset.angle),
          true,
        );
        b.setAttribute(
          "aria-label",
          `نمای ${b.dataset.angle}، ${p.colours.find((c) => c.id === colour)!.label}`,
        );
      });
      panel.dataset.colour = colour;
      panel.dataset.angle = angle;
    }
    function selection() {
      all<HTMLOptionElement>("option[value]", select).forEach((o) => {
        if (o.value)
          o.disabled = !p.variants.find(
            (v) => v.colour === colour && v.size === Number(o.value),
          )?.stock;
      });
      const variant = p.variants.find(
        (v) => v.colour === colour && v.size === Number(size),
      );
      if (size && !variant?.stock) {
        size = "";
        select.value = "";
        message.textContent =
          "سایز قبلی در این رنگ موجود نیست؛ یک سایز دیگر انتخاب کن.";
      }
      const current = p.variants.find(
        (v) => v.colour === colour && v.size === Number(size),
      );
      add.disabled = !current?.stock;
      one("[data-stock]", panel)!.textContent = current
        ? `${new Intl.NumberFormat("fa-IR").format(current.stock)} جفت موجود · این رنگ و سایز`
        : "برای دیدن موجودی، سایزت را انتخاب کن.";
    }
    select.disabled = false;
    select.addEventListener("change", () => {
      size = select.value;
      message.textContent = "";
      selection();
    });
    all<HTMLButtonElement>(".hp-colours [data-colour]", panel).forEach((b) => {
      b.disabled = false;
      b.addEventListener("click", () => {
        colour = b.dataset.colour!;
        angle = "1";
        one("[data-colour-label]", panel)!.textContent = p.colours.find(
          (c) => c.id === colour,
        )!.label;
        all(".hp-colours [data-colour]", panel).forEach((n) =>
          n.setAttribute(
            "aria-pressed",
            String((n as HTMLElement).dataset.colour === colour),
          ),
        );
        message.textContent = "";
        selection();
        image();
      });
    });
    all<HTMLButtonElement>(".hp-thumbs [data-angle]", panel).forEach((b) => {
      b.disabled = false;
      b.addEventListener("click", () => {
        angle = b.dataset.angle!;
        image();
      });
    });
    const lifestyle = one<HTMLButtonElement>("[data-lifestyle]", panel);
    if (lifestyle) {
      lifestyle.disabled = false;
      lifestyle.addEventListener("click", () => {
        colour = p.colours[0].id;
        angle = "lifestyle";
        one("[data-colour-label]", panel)!.textContent = p.colours[0].label;
        all(".hp-colours [data-colour]", panel).forEach((n) =>
          n.setAttribute(
            "aria-pressed",
            String((n as HTMLElement).dataset.colour === colour),
          ),
        );
        selection();
        message.textContent =
          "نمای روی پا مخصوص سفید و نارنجی است؛ رنگ به همین گزینه تغییر کرد.";
        image();
      });
    }
    const zoom = one<HTMLButtonElement>("[data-zoom]", panel)!;
    zoom.disabled = false;
    zoom.addEventListener("click", () => {
      const img = one<HTMLImageElement>("[data-zoom-image]", dialogs.zoom)!;
      img.src = main.src;
      img.alt = main.alt;
      openDialog(dialogs.zoom, zoom);
    });
    add.addEventListener("click", () => {
      const variant = p.variants.find(
        (v) => v.colour === colour && v.size === Number(size),
      );
      if (!variant) return;
      const result = store.add(variant.sku);
      message.textContent = result.message;
      if (result.ok) {
        const trigger = dialogs.quick.open
          ? returnFocus.get(dialogs.quick)
          : add;
        if (dialogs.quick.open) dialogs.quick.close();
        openDialog(dialogs.cart, trigger);
      }
    });
    selection();
  });
  bindFavourites(root);
  updateFavourites();
}
bindProducts(document);
all<HTMLButtonElement>("[data-quick]").forEach((b) => {
  b.disabled = false;
  b.addEventListener("click", () => {
    const t = one<HTMLTemplateElement>(
      `template[data-product-template="${b.dataset.quick}"]`,
    )!;
    const content = one("[data-quick-content]")!;
    content.replaceChildren(t.content.cloneNode(true));
    bindProducts(content);
    openDialog(dialogs.quick, b);
  });
});
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (className) n.className = className;
  return n;
}
function renderCart() {
  all<HTMLElement>("[data-cart-count]").forEach((n) => {
    n.textContent = new Intl.NumberFormat("fa-IR").format(
      cartCount(store.cart),
    );
    n.hidden = !cartCount(store.cart);
  });
  const active = document.activeElement as HTMLElement | null,
    focusRow = active?.closest<HTMLElement>("[data-row-sku]"),
    focusScope = active?.closest<HTMLElement>("[data-cart-rows]"),
    focusSku = focusRow?.dataset.rowSku,
    focusIndex =
      focusScope && focusRow
        ? Array.from(focusScope.children).indexOf(focusRow)
        : -1,
    focusAction =
      active?.dataset.quantityAction ||
      (active?.classList.contains("hp-row-remove") ? "remove" : "link");
  all("[data-cart-rows]").forEach((container) => {
    container.replaceChildren();
    cartLines(store.cart).forEach((l) => {
      const row = element("article", "", "hp-cart-row");
      row.dataset.rowSku = l.sku;
      const img = element("img");
      img.src = shoeImage(l.product, l.variant.colour, 1, true);
      img.alt = `${l.product.name}، ${l.product.colours.find((c) => c.id === l.variant.colour)!.label}`;
      img.width = 96;
      img.height = 96;
      const info = element("div"),
        link = element("a");
      link.href = shopUrl(`product/${l.product.slug}/`);
      link.append(element("h3", l.product.name));
      info.append(
        link,
        element(
          "p",
          `${l.product.colours.find((c) => c.id === l.variant.colour)!.label} · سایز ${new Intl.NumberFormat("fa-IR").format(l.variant.size)}`,
        ),
      );
      const bottom = element("div", "", "hp-row-bottom"),
        quantity = element("div", "", "hp-quantity"),
        minus = element("button", "−"),
        plus = element("button", "+");
      minus.type = plus.type = "button";
      minus.dataset.quantityAction = "minus";
      plus.dataset.quantityAction = "plus";
      minus.setAttribute("aria-label", `کم کردن تعداد ${l.product.name}`);
      plus.setAttribute("aria-label", `زیاد کردن تعداد ${l.product.name}`);
      minus.disabled = l.quantity <= 1;
      plus.disabled = l.quantity >= l.variant.stock;
      minus.addEventListener("click", () =>
        store.quantity(l.sku, l.quantity - 1),
      );
      plus.addEventListener("click", () =>
        store.quantity(l.sku, l.quantity + 1),
      );
      quantity.append(
        minus,
        element("span", new Intl.NumberFormat("fa-IR").format(l.quantity)),
        plus,
      );
      const remove = element("button", "حذف", "hp-row-remove");
      remove.type = "button";
      remove.setAttribute(
        "aria-label",
        `حذف ${l.product.name}، سایز ${l.variant.size}`,
      );
      remove.addEventListener("click", () => {
        const removed = store.remove(l.sku);
        if (removed)
          toast("این انتخاب از سبد حذف شد.", () => {
            store.add(removed.sku, removed.quantity);
          });
      });
      bottom.append(
        quantity,
        element("strong", money(l.lineTotal), "hp-row-price"),
        remove,
      );
      info.append(bottom);
      row.append(img, info);
      container.append(row);
    });
  });
  all<HTMLElement>("[data-cart-empty]").forEach(
    (n) => (n.hidden = !!store.cart.items.length),
  );
  all<HTMLElement>("[data-cart-filled]").forEach(
    (n) => (n.hidden = !store.cart.items.length),
  );
  if (focusScope && focusSku) {
    const rows = all<HTMLElement>("[data-row-sku]", focusScope);
    const row =
      rows.find((n) => n.dataset.rowSku === focusSku) ||
      rows[Math.min(focusIndex, rows.length - 1)];
    const selector =
      focusAction === "remove"
        ? ".hp-row-remove"
        : focusAction === "link"
          ? "a"
          : '[data-quantity-action="' + focusAction + '"]';
    const candidate = row ? one<HTMLButtonElement>(selector, row) : null;
    const target =
      candidate && !candidate.disabled
        ? candidate
        : row
          ? one<HTMLElement>("button:not(:disabled),a", row)
          : one<HTMLElement>(
              "[data-cart-empty] a",
              focusScope.closest("dialog,[data-cart-page]") || document,
            );
    target?.focus({ preventScroll: true });
  }
  const totals = cartTotals(store.cart, shippingMethod);
  all("[data-summary]").forEach((s) => {
    all<HTMLElement>("[data-total]", s).forEach((n) => {
      const v = totals[n.dataset.total as keyof typeof totals];
      n.textContent =
        n.dataset.total === "shipping" && store.cart.items.length && v === 0
          ? "رایگان"
          : money(v);
    });
    const input = one<HTMLInputElement>("[data-coupon-input]", s)!;
    input.disabled = !store.cart.items.length;
    input.value = store.cart.promotionCode || "";
    one<HTMLButtonElement>("[data-coupon-apply]", s)!.disabled =
      !store.cart.items.length;
    one<HTMLElement>("[data-coupon-remove]", s)!.hidden =
      !store.cart.promotionCode;
    one<HTMLButtonElement>("[data-coupon-remove]", s)!.disabled = false;
    one("[data-coupon-status]", s)!.textContent = store.cart.promotionCode
      ? "RAVA10 · ۱۰٪ روی قیمت پس از تخفیف محصول"
      : "";
  });
  all<HTMLAnchorElement>("[data-checkout-link]").forEach((a) =>
    a.setAttribute(
      "aria-disabled",
      String(!store.cart.items.length || store.mode === "memory"),
    ),
  );
}
all("[data-summary]").forEach((s) => {
  one("[data-coupon-apply]", s)?.addEventListener("click", () => {
    const result = store.promotion(
      one<HTMLInputElement>("[data-coupon-input]", s)!.value,
    );
    one("[data-coupon-status]", s)!.textContent = result.message;
  });
  one("[data-coupon-remove]", s)?.addEventListener("click", () =>
    store.clearPromotion(),
  );
  one("[data-coupon-input]", s)?.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    if (e.key === "Enter") {
      e.preventDefault();
      one<HTMLButtonElement>("[data-coupon-apply]", s)?.click();
    }
  });
});
function persistenceNote() {
  one<HTMLElement>("[data-storage-note]")!.hidden = store.mode === "local";
  one("[data-storage-message]")!.textContent =
    store.mode === "session"
      ? "ذخیرهٔ مرورگر در دسترس نیست؛ انتخاب‌ها فقط در همین زبانه نگه‌داری می‌شوند."
      : "ذخیره‌سازی در دسترس نیست؛ سبد فقط در همین صفحه می‌ماند. برای ادامهٔ سفارش، ذخیره‌سازی را فعال کن.";
}
one("[data-storage-retry]")?.addEventListener("click", () => {
  toast(
    store.ensurePersistence()
      ? "ذخیره‌سازی دوباره در دسترس است."
      : "هنوز امکان ذخیره‌سازی وجود ندارد.",
  );
});
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>(
    "a[data-cart-link],a[data-checkout-link]",
  );
  if (!a) return;
  if (store.mode === "memory") {
    e.preventDefault();
    toast(
      "سبد در حافظهٔ همین صفحه است؛ برای ادامه، ذخیره‌سازی مرورگر را فعال کن.",
    );
    if (!dialogs.cart.open) openDialog(dialogs.cart, a);
  } else if (a.hasAttribute("data-checkout-link") && !store.cart.items.length) {
    e.preventDefault();
    toast("ابتدا یک محصول به سبد اضافه کن.");
  }
});
const homeCatalog = one("[data-home-catalog]");
if (homeCatalog) {
  all<HTMLButtonElement>("[data-home-mood]", homeCatalog).forEach((b) => {
    b.disabled = false;
    b.addEventListener("click", () => {
      const mood = b.dataset.homeMood!,
        list = shoes.filter((p) => mood === "all" || p.moods.includes(mood));
      flip(one<HTMLElement>(".hp-grid", homeCatalog)!, () =>
        all<HTMLElement>("[data-home-card]", homeCatalog).forEach(
          (c) =>
            (c.hidden = !list
              .slice(0, 6)
              .some((p) => p.id === c.dataset.homeCard)),
        ),
      );
      all("[data-home-mood]", homeCatalog).forEach((n) =>
        n.setAttribute(
          "aria-pressed",
          String((n as HTMLElement).dataset.homeMood === mood),
        ),
      );
      const a = one<HTMLAnchorElement>("[data-home-more]", homeCatalog)!;
      a.href = shopUrl(`catalog/${mood === "all" ? "" : `?mood=${mood}`}`);
      a.textContent = `دیدن همهٔ ${new Intl.NumberFormat("fa-IR").format(list.length)} انتخاب ←`;
      one("[data-home-count]", homeCatalog)!.textContent =
        `${moods.find((m) => m.id === mood)!.label} · ${new Intl.NumberFormat("fa-IR").format(list.length)} مدل`;
    });
  });
}
const filterForm = one<HTMLFormElement>("[data-filter-form]");
if (filterForm) {
  const cards = new Map(
    all<HTMLElement>("[data-catalog-grid] [data-card]").map((n) => [
      n.dataset.card!,
      n,
    ]),
  );
  let searchTimer: ReturnType<typeof setTimeout>;
  const fill = (f: Filters) => {
    for (const [key, value] of Object.entries(f)) {
      const field = filterForm.elements.namedItem(key) as
        HTMLInputElement | HTMLSelectElement | null;
      if (!field) continue;
      if (key === "available") (field as HTMLInputElement).checked = !!value;
      else
        field.value =
          (key === "min" && value === 0) ||
          (key === "max" && value === 20000000)
            ? ""
            : String(value);
    }
  };
  const params = () => {
    const p = new URLSearchParams();
    new FormData(filterForm).forEach((v, k) =>
      p.set(k, String(v).replace(/[٬,]/g, "")),
    );
    return p;
  };
  const canonical = (f: Filters) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (k === "available") {
        if (v) p.set(k, "1");
      } else if (
        v !== "" &&
        v !== "all" &&
        v !== "featured" &&
        !(k === "min" && v === 0) &&
        !(k === "max" && v === 20000000)
      )
        p.set(k, String(v));
    });
    return p;
  };
  const apply = (f: Filters) => {
    const visible = filterShoes(f),
      grid = one("[data-catalog-grid]")!;
    flip(grid as HTMLElement, () => {
      cards.forEach((c) => (c.hidden = true));
      visible.forEach((p) => {
        const c = cards.get(p.id)!;
        c.hidden = false;
        grid.append(c);
      });
    });
    one("[data-filter-count]")!.textContent =
      `${new Intl.NumberFormat("fa-IR").format(visible.length)} مدل برای انتخاب تو`;
    one<HTMLElement>("[data-filter-empty]")!.hidden = !!visible.length;
  };
  const commit = (replace = false) => {
    const f = readFilters(params());
    fill(f);
    apply(f);
    const q = canonical(f).toString(),
      target = location.pathname + (q ? "?" + q : "");
    if (target !== location.pathname + location.search)
      history[replace ? "replaceState" : "pushState"]({}, "", target);
  };
  fill(readFilters(new URLSearchParams(location.search)));
  apply(readFilters(new URLSearchParams(location.search)));
  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    commit();
  });
  filterForm.addEventListener("change", () => {
    clearTimeout(searchTimer);
    commit();
  });
  filterForm.addEventListener("input", (e) => {
    if ((e.target as HTMLInputElement).type === "checkbox") return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => commit(true), 230);
  });
  filterForm.addEventListener("reset", (event) => {
    event.preventDefault();
    clearTimeout(searchTimer);
    const f = readFilters(new URLSearchParams());
    fill(f);
    apply(f);
    if (location.search) history.pushState({}, "", location.pathname);
  });
  one("[data-clear-filters]")?.addEventListener("click", () =>
    filterForm.reset(),
  );
  window.addEventListener("popstate", () => {
    const f = readFilters(new URLSearchParams(location.search));
    fill(f);
    apply(f);
  });
}
const checkout = one("[data-checkout-page]"),
  form = one<HTMLFormElement>("[data-checkout-form]"),
  currentDigest = () =>
    JSON.stringify({ cart: store.cart, method: shippingMethod });
function checkoutWarning(text: string) {
  if (checkout) one("[data-checkout-warning]", checkout)!.textContent = text;
}
function validateFields() {
  if (!form) return false;
  const errors: Record<string, string> = {};
  all<HTMLInputElement | HTMLTextAreaElement>(
    "[data-private-field]",
    form,
  ).forEach((f) => {
    const key = f.dataset.privateField!,
      value = normaliseDigits(f.value).trim();
    if (key === "name" && value.length < 3)
      errors[key] = "نام کامل را با حداقل ۳ حرف بنویس.";
    if (key === "mobile" && !/^09\d{9}$/.test(value))
      errors[key] = "یک شمارهٔ موبایل ۱۱ رقمی معتبر بنویس.";
    if (key === "city" && value.length < 2) errors[key] = "نام شهر را بنویس.";
    if (key === "postal" && !/^\d{10}$/.test(value))
      errors[key] = "کد پستی باید ۱۰ رقم باشد.";
    if (key === "address" && value.length < 10)
      errors[key] = "نشانی را با حداقل ۱۰ حرف بنویس.";
    f.setAttribute("aria-invalid", String(!!errors[key]));
    one(`[data-field-error="${key}"]`, form)!.textContent = errors[key] || "";
  });
  if (Object.keys(errors).length)
    one<HTMLElement>("[aria-invalid=true]", form)?.focus();
  return !Object.keys(errors).length;
}
function renderReview() {
  if (!checkout) return;
  const c = one("[data-checkout-review-rows]", checkout)!;
  c.replaceChildren();
  cartLines(store.cart).forEach((l) => {
    const row = element("div", "", "hp-receipt-row");
    row.append(
      element(
        "span",
        `${l.product.name} · ${l.product.colours.find((c) => c.id === l.variant.colour)!.label} · سایز ${l.variant.size} · ${l.quantity} جفت`,
      ),
      element("strong", money(l.lineTotal)),
    );
    c.append(row);
  });
}
function updateCheckout(external = false) {
  if (!checkout || orderPlaced) return;
  const empty = !store.cart.items.length,
    blocked = store.mode === "memory";
  one<HTMLElement>("[data-checkout-content]", checkout)!.hidden = empty;
  one<HTMLElement>("[data-checkout-empty]", checkout)!.hidden = !empty;
  all<HTMLInputElement | HTMLTextAreaElement>(
    "[data-private-field]",
    checkout,
  ).forEach((f) => (f.disabled = empty || blocked));
  all<HTMLInputElement>("[name=shipping],[data-review-ack]", checkout).forEach(
    (f) => (f.disabled = empty || blocked),
  );
  one<HTMLButtonElement>("[data-next-step]", checkout)!.disabled =
    empty || blocked;
  one<HTMLButtonElement>("[data-back-step]", checkout)!.disabled = false;
  const ack = one<HTMLInputElement>("[data-review-ack]", checkout)!;
  if (checkoutStep === 2 && reviewDigest !== currentDigest()) {
    ack.checked = false;
    reviewDigest = currentDigest();
    checkoutWarning(
      external
        ? "سبد در زبانهٔ دیگر تغییر کرد؛ خلاصه و مبلغ نهایی را دوباره بررسی کن."
        : "انتخاب‌ها یا روش ارسال تغییر کرده‌اند؛ خلاصه را دوباره بررسی کن.",
    );
  } else if (blocked)
    checkoutWarning(
      "بدون ذخیره‌سازی، ادامهٔ سفارش ممکن نیست. تنظیم مرورگر را اصلاح کن و «تلاش دوباره» را بزن.",
    );
  one<HTMLButtonElement>("[data-confirm-order]", checkout)!.disabled =
    empty || blocked || !ack.checked || checkoutStep !== 2;
  renderReview();
}
if (checkout && form) {
  one("[data-next-step]", form)?.addEventListener("click", () => {
    if (
      !store.ensurePersistence() ||
      !store.cart.items.length ||
      !validateFields()
    )
      return;
    switchStep(form, 2, checkoutStep);
    checkoutStep = 2;
    reviewDigest = currentDigest();
    checkoutWarning("رنگ، سایز و مبلغ نهایی را بررسی کن.");
    updateCheckout();
    one<HTMLInputElement>("[name=shipping]", form)?.focus();
  });
  one("[data-back-step]", form)?.addEventListener("click", () => {
    switchStep(form, 1, checkoutStep);
    checkoutStep = 1;
    one<HTMLInputElement>("[data-review-ack]", form)!.checked = false;
    one<HTMLInputElement>("[data-private-field]", form)?.focus();
  });
  all<HTMLInputElement>("[name=shipping]", form).forEach((f) =>
    f.addEventListener("change", () => {
      shippingMethod = f.value as ShippingMethod;
      renderCart();
      updateCheckout();
    }),
  );
  one("[data-review-ack]", form)?.addEventListener("change", () =>
    updateCheckout(),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (orderPlaced || checkoutStep !== 2) return;
    const digest = currentDigest();
    if (
      !one<HTMLInputElement>("[data-review-ack]", form)!.checked ||
      reviewDigest !== digest
    ) {
      checkoutWarning("خلاصهٔ فعلی را تأیید کن.");
      updateCheckout();
      return;
    }
    if (
      !validateFields() ||
      !store.ensurePersistence() ||
      !store.cart.items.length
    )
      return;
    if (digest !== currentDigest()) {
      updateCheckout();
      return;
    }
    const snapshot = cleanCart(store.cart);
    if (!snapshot.items.length) return;
    orderPlaced = true;
    one<HTMLButtonElement>("[data-confirm-order]", form)!.disabled = true;
    const receipt = createReceipt(snapshot, shippingMethod),
      saved = saveReceipt(receipt);
    all<HTMLInputElement | HTMLTextAreaElement>(
      "[data-private-field]",
      form,
    ).forEach((f) => (f.value = ""));
    form.reset();
    store.clearCart();
    if (saved) location.assign(shopUrl("order/"));
    else {
      one<HTMLElement>("[data-checkout-content]", checkout)!.hidden = true;
      one<HTMLElement>("[data-checkout-empty]", checkout)!.hidden = true;
      const area = one<HTMLElement>("[data-inline-receipt]", checkout)!;
      area.hidden = false;
      area.append(receiptView(receipt));
      checkoutWarning(
        "رسید فقط در این صفحه نمایش داده می‌شود؛ ذخیرهٔ نشست در دسترس نیست و با تازه‌سازی صفحه از بین می‌رود.",
      );
      area.scrollIntoView({ behavior: reduced() ? "instant" : "smooth" });
    }
  });
}
function receiptView(r: Receipt) {
  const wrapper = element("section", "", "hp-receipt"),
    header = element("div", "", "hp-receipt-header"),
    title = element("div");
  title.append(
    element("h2", "انتخابت ثبت شد."),
    element("p", "سفارش نمایشی · بدون پرداخت و ارسال واقعی", "hp-fine"),
  );
  const id = element("div", r.id, "hp-receipt-id");
  id.dir = "ltr";
  header.append(title, id);
  wrapper.append(header);
  r.lines.forEach((l) => {
    const p = shoes.find((p) => p.variants.some((v) => v.sku === l.sku))!,
      v = p.variants.find((v) => v.sku === l.sku)!;
    const row = element("div", "", "hp-receipt-row");
    row.append(
      element(
        "span",
        `${p.name} · ${p.colours.find((c) => c.id === v.colour)!.label} · سایز ${v.size} · ${l.quantity} جفت`,
      ),
      element("strong", money(l.unitPrice * l.quantity)),
    );
    wrapper.append(row);
  });
  const dl = element("dl"),
    labels: Record<string, string> = {
      subtotal: "جمع محصولات",
      discount: "تخفیف کد",
      afterDiscount: "پس از تخفیف",
      shipping: "ارسال",
      total: "مبلغ نهایی",
    };
  Object.entries(r.totals).forEach(([k, v]) => {
    const div = element("div");
    div.append(
      element("dt", labels[k]),
      element("dd", k === "shipping" && v === 0 ? "رایگان" : money(v)),
    );
    dl.append(div);
  });
  wrapper.append(
    dl,
    element(
      "p",
      `${r.method === "express" ? "ارسال سریع" : "ارسال استاندارد"}${r.promotionCode ? " · کد " + r.promotionCode : ""}`,
      "hp-fine",
    ),
    element(
      "p",
      "رسید فقط در همین زبانه نگه‌داری می‌شود. اطلاعات دریافت‌کننده ذخیره نشده است.",
      "hp-fine",
    ),
  );
  const a = element("a", "ادامهٔ کشف کفش‌ها ←", "hp-button");
  a.href = shopUrl("catalog/");
  wrapper.append(a);
  return wrapper;
}
const receiptPage = one("[data-receipt-page]");
if (receiptPage) {
  const r = readReceipt();
  if (r) {
    receiptPage.append(receiptView(r));
    one<HTMLElement>("[data-receipt-empty]")!.hidden = true;
  }
}
store.subscribe((external) => {
  renderCart();
  updateFavourites();
  persistenceNote();
  updateCheckout(external);
});
renderCart();
updateFavourites();
persistenceNote();
updateCheckout();
initScrollReveal();
