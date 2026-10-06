import {
  skinProducts,
  skinMoney,
  shippingFee,
  shippingThreshold,
} from "../data/velia";
import { url } from "../config";
import { skinCollections } from "../data/velia";
import { initStoreAccount, saveReceipt } from "./velia-account";
import {
  motionMedia as motion,
  motionPlay as animate,
  easing,
  cancelMotion,
  swapValue,
  visualGhost,
  revealPanel,
  initTabIndicator,
  initMegaMotion,
  initPointerMotion,
  initHeroMotion,
  initMobilePurchase,
  animateReceipt,
  purchaseFeedback,
  captureLayout,
} from "./velia-motion";

type CartLine = { id: string; quantity: number };
type StoredCart = { lines: CartLine[]; promo: boolean };
const root = document.documentElement;
const productMap = new Map(
  skinProducts.map((product) => [product.id, product]),
);
const addTimers = new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>();
const announcer = document.querySelector<HTMLElement>("[data-skin-announcer]");
const bagDialog =
  document.querySelector<HTMLDialogElement>("[data-bag-dialog]");
const read = (key: string): unknown => {
  try {
    const value = localStorage.getItem(key);
    return value && value.length < 20000 ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};
// ASVS 14.3.3: store only allowlisted product IDs, bounded quantities and appearance preferences; never checkout identity data.
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
// ASVS 2.2.1: treat stored cart contents as untrusted and reconstruct them from the fixed catalog.
function validatedCart(value: unknown): StoredCart {
  const result: StoredCart = { lines: [], promo: false };
  if (!value || typeof value !== "object") return result;
  const candidate = value as Partial<StoredCart>;
  if (!Array.isArray(candidate.lines)) return result;
  const seen = new Set<string>();
  candidate.lines.slice(0, skinProducts.length).forEach((line) => {
    if (
      !line ||
      typeof line !== "object" ||
      typeof line.id !== "string" ||
      !Number.isInteger(line.quantity)
    )
      return;
    const product = productMap.get(line.id);
    if (!product || !product.stock || line.quantity < 1 || seen.has(line.id))
      return;
    seen.add(line.id);
    result.lines.push({
      id: line.id,
      quantity: Math.min(line.quantity, product.stock),
    });
  });
  result.promo = candidate.promo === true && result.lines.length > 0;
  return result;
}
function validatedFavourites(value: unknown) {
  return new Set<string>(
    Array.isArray(value)
      ? value
          .slice(0, skinProducts.length)
          .filter(
            (id): id is string => typeof id === "string" && productMap.has(id),
          )
      : [],
  );
}
let cart = validatedCart(read("velia-cart-v1"));
let favourites = validatedFavourites(read("velia-favourites-v1"));
let removedLine: CartLine | null = null;
let detailQuantity = 1;
let orderComplete = false;
let deliveryMode: "standard" | "express" = "standard";
let announcementFrame = 0;
function announce(message: string) {
  cancelAnimationFrame(announcementFrame);
  if (!announcer) return;
  announcer.textContent = "";
  announcementFrame = requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}
function totals() {
  const subtotal = cart.lines.reduce(
    (sum, line) => sum + productMap.get(line.id)!.price * line.quantity,
    0,
  );
  const discount = cart.promo ? Math.round(subtotal * 0.1) : 0;
  const shipping = !subtotal
    ? 0
    : (subtotal >= shippingThreshold ? 0 : shippingFee) +
      (deliveryMode === "express" ? 45000 : 0);
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    quantity: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
function text(surface: ParentNode, selector: string, value: string) {
  // ASVS 1.2.1: all user-derived and stored values are rendered through textContent, never HTML.
  surface.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}
function setHidden(surface: ParentNode, selector: string, hidden: boolean) {
  surface.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.hidden = hidden;
  });
}
let cartRendered = false;
function renderBag() {
  const cost = totals();
  const active =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const activeSurface = active?.closest<HTMLElement>("[data-bag-surface]");
  const activeLine =
    active?.closest<HTMLElement>("[data-line-id]")?.dataset.lineId;
  const activeAction = active?.hasAttribute("data-line-plus")
    ? "[data-line-plus]"
    : active?.hasAttribute("data-line-minus")
      ? "[data-line-minus]"
      : active?.hasAttribute("data-remove")
        ? "[data-remove]"
        : "";
  document
    .querySelectorAll<HTMLElement>("[data-bag-count]")
    .forEach((count) => {
      const next = skinMoney(cost.quantity);
      if (count.textContent !== next)
        animate(
          count,
          [
            { transform: "scale(1)" },
            { transform: "scale(1.22)" },
            { transform: "scale(1)" },
          ],
          { duration: 240, easing: "cubic-bezier(.22,1,.36,1)" },
        );
      count.textContent = next;
      count
        .closest("[data-bag-open]")
        ?.setAttribute("aria-label", `بازکردن سبد خرید؛ ${next} محصول`);
    });
  document
    .querySelectorAll<HTMLElement>("[data-bag-surface]")
    .forEach((surface) => {
      surface
        .querySelectorAll("[data-motion-ghost]")
        .forEach((ghost) => ghost.remove());
      const anchors = [
        ...surface.querySelectorAll<HTMLElement>(
          "[data-bag-undo], [data-bag-empty], .skin-shipping-message, .skin-shipping-progress, .skin-promo, .skin-promo-result, .skin-totals, .skin-checkout-link, .skin-bag-hint",
        ),
      ];
      const layout = captureLayout(surface, [
        ...surface.querySelectorAll<HTMLElement>("[data-line-id]"),
        ...anchors,
      ]);
      let nextRows: HTMLElement[] = [];
      text(surface, "[data-bag-quantity]", skinMoney(cost.quantity));
      const lines = surface.querySelector("[data-bag-lines]");
      const template =
        document.querySelector<HTMLTemplateElement>("#skin-bag-row");
      if (lines && template) {
        const existingRows = new Map(
          [
            ...lines.querySelectorAll<HTMLElement>(":scope > [data-line-id]"),
          ].map((row) => [row.dataset.lineId!, row]),
        );
        existingRows.forEach((row, id) => {
          if (!cart.lines.some((line) => line.id === id)) {
            if (cartRendered)
              visualGhost(row, surface, layout.previous.get(row)?.rect, {
                duration: 180,
                easing: easing.enter,
                transform: "translateX(-18px) scale(.985)",
                opacity: layout.previous.get(row)?.opacity,
              });
            row.remove();
          }
        });
        setHidden(surface, "[data-bag-empty]", cart.lines.length > 0);
        setHidden(surface, "[data-bag-filled]", cart.lines.length === 0);
        const rows = cart.lines.map((line) => {
          const product = productMap.get(line.id)!;
          const row =
            existingRows.get(line.id) ||
            (
              template.content.cloneNode(true) as DocumentFragment
            ).querySelector<HTMLElement>(".skin-bag-row")!;
          row.dataset.lineId = line.id;
          row.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
            link.href = url(`demo/velia/products/${product.id}/`);
          });
          const image = row.querySelector("img")!;
          image.src = url(
            `art/velia/${product.cardImage || product.image}.webp`,
          );
          image.alt = product.name;
          text(row, ".skin-bag-product-name", product.name);
          text(
            row,
            "[data-line-size]",
            `${product.size} · ${skinMoney(line.quantity)} عدد`,
          );
          swapValue(
            row.querySelector<HTMLElement>("[data-line-price]")!,
            `${skinMoney(product.price * line.quantity)} تومان`,
          );
          swapValue(
            row.querySelector<HTMLElement>("[data-line-quantity]")!,
            skinMoney(line.quantity),
          );
          const minus =
            row.querySelector<HTMLButtonElement>("[data-line-minus]")!;
          const plus =
            row.querySelector<HTMLButtonElement>("[data-line-plus]")!;
          minus.disabled = line.quantity <= 1;
          plus.disabled = line.quantity >= product.stock;
          minus.setAttribute("aria-label", `کاهش تعداد ${product.name}`);
          plus.setAttribute("aria-label", `افزایش تعداد ${product.name}`);
          row
            .querySelector("[data-remove]")!
            .setAttribute("aria-label", `حذف ${product.name}`);
          return row;
        });
        rows.forEach((row, index) => {
          if (lines.children[index] !== row)
            lines.insertBefore(row, lines.children[index] || null);
        });
        nextRows = rows;
      }
      setHidden(surface, "[data-bag-undo]", !removedLine);
      if (removedLine)
        text(
          surface,
          "[data-undo-copy]",
          `${productMap.get(removedLine.id)!.name} از سبد برداشته شد.`,
        );
      for (const [selector, value] of [
        ["[data-subtotal]", cost.subtotal],
        ["[data-discount]", cost.discount],
        ["[data-total]", cost.total],
      ] as const) {
        surface
          .querySelectorAll<HTMLElement>(selector)
          .forEach((node) => swapValue(node, skinMoney(value)));
      }
      text(
        surface,
        "[data-shipping]",
        cost.shipping ? `${skinMoney(cost.shipping)} تومان` : "رایگان",
      );
      setHidden(surface, "[data-discount-row]", !cart.promo);
      text(
        surface,
        "[data-shipping-message]",
        cost.subtotal >= shippingThreshold
          ? deliveryMode === "express"
            ? "ارسال استاندارد رایگان؛ هزینهٔ ارسال سریع ۴۵٬۰۰۰ تومان است."
            : "ارسال استاندارد این انتخاب‌ها رایگان است."
          : `${skinMoney(shippingThreshold - cost.subtotal)} تومان تا ارسال استاندارد رایگان`,
      );
      const progress = surface.querySelector<HTMLElement>(
        "[data-shipping-progress]",
      );
      if (progress) {
        progress.style.transform = `scaleX(${Math.min(1, cost.subtotal / shippingThreshold)})`;
        progress.parentElement?.setAttribute(
          "aria-valuenow",
          String(Math.min(shippingThreshold, cost.subtotal)),
        );
      }
      if (cart.promo) {
        text(surface, "[data-promo-result]", "تخفیف ۱۰٪ روی محصولات اعمال شد.");
        surface
          .querySelector("[data-promo-result]")
          ?.removeAttribute("data-error");
      } else {
        text(surface, "[data-promo-result]", "");
      }
      if (cartRendered) layout.finish([...nextRows, ...anchors]);
    });
  if (activeSurface && activeLine && activeAction) {
    const restored = activeSurface.querySelector<HTMLButtonElement>(
      `[data-line-id="${activeLine}"] ${activeAction}`,
    );
    if (restored && !restored.disabled) restored.focus({ preventScroll: true });
    else if (restored?.disabled)
      activeSurface
        .querySelector<HTMLButtonElement>(
          `[data-line-id="${activeLine}"] [data-remove]`,
        )
        ?.focus({ preventScroll: true });
    else
      activeSurface
        .querySelector<HTMLButtonElement>("[data-undo]")
        ?.focus({ preventScroll: true });
  }
  refreshPurchaseControls();
  cartRendered = true;
  if (!orderComplete) {
    setHidden(document, "[data-checkout-empty]", cart.lines.length > 0);
    setHidden(document, "[data-checkout-layout]", cart.lines.length === 0);
  }
}
function persistCart() {
  if (!cart.lines.length) cart.promo = false;
  write("velia-cart-v1", cart);
  renderBag();
}
function refreshPurchaseControls() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-add-product]")
    .forEach((button) => {
      const product = productMap.get(button.dataset.addProduct || "");
      if (!product) return;
      const existing =
        cart.lines.find((line) => line.id === product.id)?.quantity || 0;
      const full = existing >= product.stock;
      button.disabled = !product.stock || full;
      if (!addTimers.has(button))
        text(
          button,
          "[data-add-label]",
          !product.stock
            ? "فعلاً ناموجود"
            : full
              ? "تمام موجودی در سبد"
              : "افزودن به سبد",
        );
    });
  const detail = document.querySelector<HTMLElement>("[data-product-detail]");
  if (detail) {
    const product = productMap.get(detail.dataset.productDetail || "")!;
    const remaining =
      product.stock -
      (cart.lines.find((line) => line.id === product.id)?.quantity || 0);
    detailQuantity = Math.max(1, Math.min(detailQuantity, remaining));
    text(detail, "[data-detail-quantity]", skinMoney(detailQuantity));
    const minus = detail.querySelector<HTMLButtonElement>(
      "[data-detail-minus]",
    )!;
    const plus = detail.querySelector<HTMLButtonElement>("[data-detail-plus]")!;
    minus.disabled = detailQuantity <= 1;
    plus.disabled = detailQuantity >= remaining;
    if (product.stock) {
      text(
        detail,
        "[data-detail-stock-note]",
        remaining < 1
          ? "تمام موجودی این محصول در سبد توست."
          : `${skinMoney(remaining)} عدد قابل انتخاب؛ تعداد در سبد هم قابل تغییر است.`,
      );
    }
  }
}
function addProduct(button: HTMLButtonElement) {
  const product = productMap.get(button.dataset.addProduct || "");
  if (!product || !product.stock) return;
  const quantity = button.hasAttribute("data-detail-add") ? detailQuantity : 1;
  const line = cart.lines.find((item) => item.id === product.id);
  if ((line?.quantity || 0) + quantity > product.stock) {
    announce("این تعداد از موجودی محصول بیشتر است.");
    return;
  }
  if (line) line.quantity += quantity;
  else cart.lines.push({ id: product.id, quantity });
  clearTimeout(addTimers.get(button));
  button.dataset.added = "";
  purchaseFeedback(button, true);
  text(button, "[data-add-label]", "به سبد اضافه شد");
  addTimers.set(
    button,
    setTimeout(() => {
      delete button.dataset.added;
      purchaseFeedback(button, false);
      addTimers.delete(button);
      refreshPurchaseControls();
    }, 1500),
  );
  persistCart();
  announce(`${skinMoney(quantity)} عدد ${product.name} به سبد اضافه شد.`);
}
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const add = target.closest<HTMLButtonElement>("[data-add-product]");
  if (add) {
    addProduct(add);
    return;
  }
  const bagOpen = target.closest<HTMLAnchorElement>("[data-bag-open]");
  if (bagOpen && bagDialog) {
    event.preventDefault();
    renderBag();
    if (!bagDialog.open) bagDialog.showModal();
    return;
  }
  const close = target.closest("[data-dialog-close]");
  if (close) {
    close.closest<HTMLDialogElement>("dialog")?.close();
    return;
  }
  const row = target.closest<HTMLElement>("[data-line-id]");
  if (row) {
    const line = cart.lines.find((item) => item.id === row.dataset.lineId);
    if (!line) return;
    const product = productMap.get(line.id)!;
    if (target.closest("[data-remove]")) {
      removedLine = { ...line };
      cart.lines = cart.lines.filter((item) => item.id !== line.id);
      persistCart();
      announce(`${product.name} از سبد برداشته شد. امکان برگرداندن وجود دارد.`);
      return;
    }
    if (target.closest("[data-line-plus]") && line.quantity < product.stock) {
      line.quantity++;
      persistCart();
      announce(`تعداد ${product.name}: ${skinMoney(line.quantity)}`);
      return;
    }
    if (target.closest("[data-line-minus]") && line.quantity > 1) {
      line.quantity--;
      persistCart();
      announce(`تعداد ${product.name}: ${skinMoney(line.quantity)}`);
      return;
    }
  }
  if (target.closest("[data-undo]") && removedLine) {
    const old = removedLine;
    const existing = cart.lines.find((item) => item.id === old.id);
    if (existing)
      existing.quantity = Math.min(
        productMap.get(old.id)!.stock,
        existing.quantity + old.quantity,
      );
    else cart.lines.push(old);
    removedLine = null;
    persistCart();
    announce("محصول به سبد برگشت.");
    return;
  }
  if (target.closest("[data-remove-promo]")) {
    cart.promo = false;
    persistCart();
    announce("کد تخفیف برداشته شد.");
    return;
  }
  if (target.closest("[data-detail-plus]")) {
    detailQuantity++;
    refreshPurchaseControls();
    return;
  }
  if (target.closest("[data-detail-minus]")) {
    detailQuantity = Math.max(1, detailQuantity - 1);
    refreshPurchaseControls();
    return;
  }
});
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
});
document
  .querySelectorAll<HTMLFormElement>("[data-promo-form]")
  .forEach((form) => {
    const input = form.querySelector<HTMLInputElement>("input")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = input.value.trim().toUpperCase();
      const surface = form.closest("[data-bag-surface]")!;
      if (code !== "ALBA10" || !cart.lines.length) {
        text(
          surface,
          "[data-promo-result]",
          code
            ? "این کد معتبر نیست. کد ALBA10 را امتحان کن."
            : "ابتدا کد تخفیف را بنویس.",
        );
        surface
          .querySelector("[data-promo-result]")
          ?.setAttribute("data-error", "");
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      cart.promo = true;
      persistCart();
      announce("تخفیف ده درصد اعمال شد.");
    });
    input.addEventListener("input", () =>
      input.removeAttribute("aria-invalid"),
    );
  });

function flipCards(grid: HTMLElement, change: () => void) {
  grid
    .querySelectorAll("[data-motion-ghost]")
    .forEach((ghost) => ghost.remove());
  const cards = Array.from(
    grid.querySelectorAll<HTMLElement>("[data-skin-card]"),
  );
  const host = grid.closest<HTMLElement>("[data-results-surface]") || grid;
  const empty = host.querySelector<HTMLElement>("[data-no-results]");
  const layout = captureLayout(host, [
    ...cards.filter((card) => !card.hidden),
    ...(empty ? [empty] : []),
  ]);
  change();
  if (motion.matches) return;
  let exits = 0;
  cards
    .filter((card) => card.hidden && layout.previous.has(card))
    .forEach((card) => {
      const frame = layout.previous.get(card)!,
        rect = frame.rect;
      if (exits < 4 && rect.bottom > 0 && rect.top < innerHeight) {
        const shown = card.hidden;
        card.hidden = false;
        visualGhost(card, grid, rect, {
          duration: 180,
          easing: easing.enter,
          opacity: frame.opacity,
        });
        card.hidden = shown;
        exits++;
      }
    });
  layout.finish([
    ...cards.filter((card) => !card.hidden),
    ...(empty ? [empty] : []),
  ]);
}
function syncFavourites() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-favourite]")
    .forEach((button) => {
      const selected = favourites.has(button.dataset.favourite || "");
      const product = productMap.get(button.dataset.favourite || "");
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute(
        "aria-label",
        `${selected ? "برداشتن از ذخیره‌ها:" : "ذخیرهٔ"} ${product?.name || ""}`,
      );
    });
  document
    .querySelectorAll<HTMLElement>("[data-favourites-count]")
    .forEach((count) => {
      count.textContent = skinMoney(favourites.size);
      count.hidden = !favourites.size;
    });
  text(document, "[data-account-saved-count]", skinMoney(favourites.size));
  const savedGrid = document.querySelector<HTMLElement>("[data-saved-grid]");
  if (savedGrid) {
    flipCards(savedGrid, () => {
      savedGrid.hidden = !favourites.size;
      savedGrid
        .querySelectorAll<HTMLElement>("[data-skin-card]")
        .forEach((card) => {
          card.hidden = !favourites.has(card.dataset.skinCard || "");
        });
    });
    setHidden(document, "[data-saved-empty]", favourites.size > 0);
    text(document, "[data-saved-results]", skinMoney(favourites.size));
  }
}
document
  .querySelectorAll<HTMLButtonElement>("[data-favourite]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.favourite!;
      if (!productMap.has(id)) return;
      if (favourites.has(id)) favourites.delete(id);
      else favourites.add(id);
      write("velia-favourites-v1", [...favourites]);
      syncFavourites();
      animate(
        button.querySelector("svg")!,
        [
          { transform: "scale(1)" },
          { transform: "scale(1.2)" },
          { transform: "scale(1)" },
        ],
        { duration: 250, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      if (button.closest<HTMLElement>("[data-skin-card]")?.hidden) {
        (
          document.querySelector<HTMLButtonElement>(
            "[data-saved-grid] [data-skin-card]:not([hidden]) [data-favourite]",
          ) || document.querySelector<HTMLAnchorElement>("[data-saved-empty] a")
        )?.focus({ preventScroll: true });
      }
      announce(
        `${productMap.get(id)!.name} ${favourites.has(id) ? "برای بعد ذخیره شد." : "از ذخیره‌ها برداشته شد."}`,
      );
    }),
  );

const grid = document.querySelector<HTMLElement>("[data-product-grid]");
const search = document.querySelector<HTMLInputElement>("#skin-search");
const sort = document.querySelector<HTMLSelectElement>("[data-skin-sort]");
const filterDialog = document.querySelector<HTMLDialogElement>(
  "[data-filter-dialog]",
);
const filterForm =
  document.querySelector<HTMLFormElement>("[data-filter-form]");
const budget = filterForm?.querySelector<HTMLInputElement>('[name="budget"]');
const available =
  filterForm?.querySelector<HTMLInputElement>('[name="available"]');
const skinType =
  filterForm?.querySelector<HTMLSelectElement>('[name="skinType"]');
const baseCategory = grid?.dataset.catalogCategory || "all";
const catalogIds = new Set(
  [...(grid?.querySelectorAll<HTMLElement>("[data-skin-card]") || [])].map(
    (card) => card.dataset.skinCard,
  ),
);
let category = baseCategory,
  maximum = 800000,
  onlyAvailable = false,
  selectedSkinType = "all";
const params = new URLSearchParams(location.search);
const categories = new Set([
  "all",
  "cleanser",
  "moisturiser",
  "serum",
  "sun",
  "body",
]);
if (baseCategory === "all" && categories.has(params.get("category") || ""))
  category = params.get("category")!;
maximum = Math.min(
  800000,
  Math.max(295000, Number(params.get("budget")) || 800000),
);
onlyAvailable = params.get("available") === "1";
if (["all", "خشک", "مختلط", "معمولی"].includes(params.get("skin") || ""))
  selectedSkinType = params.get("skin")!;
if (
  sort &&
  ["price-low", "price-high", "name", "recommended"].includes(
    params.get("sort") || "",
  )
)
  sort.value = params.get("sort")!;
if (search) search.value = (params.get("q") || "").slice(0, 80);
const normalized = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u200c\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
function filterProducts(updateUrl = true) {
  if (!grid) return;
  const query = normalized(search?.value || "");
  const products = skinProducts.filter(
    (product) =>
      catalogIds.has(product.id) &&
      (category === "all" || product.category === category) &&
      (selectedSkinType === "all" ||
        product.skinType.includes(selectedSkinType) ||
        product.skinType === "همهٔ انواع") &&
      product.price <= maximum &&
      (!onlyAvailable || product.stock > 0) &&
      (!query ||
        normalized(
          `${product.name} ${product.note} ${product.english} ${product.categoryLabel} ${product.texture} ${product.skinType}`,
        ).includes(query)),
  );
  if (sort?.value === "price-low") products.sort((a, b) => a.price - b.price);
  else if (sort?.value === "price-high")
    products.sort((a, b) => b.price - a.price);
  else if (sort?.value === "name")
    products.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  const ids = new Set(products.map((product) => product.id));
  flipCards(grid, () => {
    setHidden(document, "[data-no-results]", products.length > 0);
    grid.querySelectorAll<HTMLElement>("[data-skin-card]").forEach((card) => {
      card.hidden = !ids.has(card.dataset.skinCard || "");
    });
    products.forEach((product, index) => {
      const card = grid.querySelector(`[data-skin-card="${product.id}"]`);
      if (card && grid.children[index] !== card)
        grid.insertBefore(card, grid.children[index] || null);
    });
  });
  text(document, "[data-results-count]", skinMoney(products.length));
  document
    .querySelectorAll<HTMLButtonElement>("[data-skin-category]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.skinCategory === category),
      ),
    );
  setHidden(document, "[data-no-results]", products.length > 0);
  const applied =
    Number(maximum < 800000) +
    Number(onlyAvailable) +
    Number(selectedSkinType !== "all");
  text(document, "[data-filter-count]", skinMoney(applied));
  setHidden(document, "[data-filter-count]", !applied);
  setHidden(
    document,
    "[data-active-filters]",
    !applied && !query && category === "all",
  );
  text(
    document,
    "[data-filter-description]",
    [
      query ? `جست‌وجو: ${search?.value}` : "",
      onlyAvailable ? "فقط موجود" : "",
      selectedSkinType !== "all" ? `پوست ${selectedSkinType}` : "",
      maximum < 800000 ? `تا ${skinMoney(maximum)} تومان` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "دسته‌بندی انتخاب‌شده",
  );
  if (updateUrl) {
    const next = new URL(location.href);
    if (category === "all") next.searchParams.delete("category");
    else next.searchParams.set("category", category);
    if (query) next.searchParams.set("q", (search?.value || "").slice(0, 80));
    else next.searchParams.delete("q");
    maximum < 800000
      ? next.searchParams.set("budget", String(maximum))
      : next.searchParams.delete("budget");
    onlyAvailable
      ? next.searchParams.set("available", "1")
      : next.searchParams.delete("available");
    selectedSkinType !== "all"
      ? next.searchParams.set("skin", selectedSkinType)
      : next.searchParams.delete("skin");
    sort?.value && sort.value !== "recommended"
      ? next.searchParams.set("sort", sort.value)
      : next.searchParams.delete("sort");
    history.replaceState(null, "", next);
  }
  if (updateUrl) announce(`${skinMoney(products.length)} محصول پیدا شد.`);
}
document
  .querySelectorAll<HTMLButtonElement>("[data-skin-category]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      category = button.dataset.skinCategory!;
      filterProducts();
    }),
  );
let searchTimer: ReturnType<typeof setTimeout>;
search?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => filterProducts(), 160);
});
document
  .querySelector("[data-skin-search]")
  ?.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(searchTimer);
    filterProducts();
  });
sort?.addEventListener("change", () => filterProducts());
document.querySelector("[data-filter-open]")?.addEventListener("click", () => {
  if (budget) budget.value = String(maximum);
  if (available) available.checked = onlyAvailable;
  if (skinType) skinType.value = selectedSkinType;
  text(document, "[data-budget-label]", skinMoney(maximum));
  filterDialog?.showModal();
});
budget?.addEventListener("input", () =>
  text(document, "[data-budget-label]", skinMoney(Number(budget.value))),
);
filterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  maximum = Math.min(800000, Math.max(295000, Number(budget?.value) || 800000));
  onlyAvailable = !!available?.checked;
  selectedSkinType = ["all", "خشک", "مختلط", "معمولی"].includes(
    skinType?.value || "",
  )
    ? skinType!.value
    : "all";
  filterProducts();
  filterDialog?.close();
});
document.querySelector("[data-filter-reset]")?.addEventListener("click", () => {
  if (budget) budget.value = "800000";
  if (available) available.checked = false;
  if (skinType) skinType.value = "all";
  text(document, "[data-budget-label]", skinMoney(800000));
});
document.querySelectorAll("[data-clear-filters]").forEach((button) =>
  button.addEventListener("click", () => {
    category = baseCategory;
    maximum = 800000;
    onlyAvailable = false;
    selectedSkinType = "all";
    if (search) search.value = "";
    if (sort) sort.value = "recommended";
    filterProducts();
  }),
);

const galleryImage = document.querySelector<HTMLImageElement>(
  "[data-gallery-image]",
);
const zoomImage = document.querySelector<HTMLImageElement>("[data-zoom-image]");
const zoomDialog =
  document.querySelector<HTMLDialogElement>("[data-zoom-dialog]");
let galleryRequest = 0;
const galleryButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-gallery-source]"),
];
document
  .querySelectorAll<HTMLButtonElement>("[data-gallery-source]")
  .forEach((button) =>
    button.addEventListener("click", async () => {
      if (!galleryImage) return;
      if (button.getAttribute("aria-pressed") === "true") {
        galleryRequest++;
        return;
      }
      const source = button.dataset.gallerySource!;
      const previousIndex = galleryButtons.findIndex(
        (item) => item.getAttribute("aria-pressed") === "true",
      );
      const direction = galleryButtons.indexOf(button) > previousIndex ? -1 : 1;
      const request = ++galleryRequest;
      const pending = new Image();
      pending.src = source;
      try {
        await pending.decode();
      } catch {
        return;
      }
      if (request !== galleryRequest) return;
      const current = getComputedStyle(galleryImage);
      const start = { opacity: current.opacity, transform: current.transform };
      const transitioning = galleryImage
        .getAnimations()
        .some((a) => a.playState === "running");
      cancelMotion(galleryImage, "gallery");
      galleryImage.src = source;
      if (zoomImage) zoomImage.src = source;
      document
        .querySelectorAll("[data-gallery-source]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      animate(
        galleryImage,
        [
          transitioning
            ? start
            : { opacity: 0.55, transform: `translateX(${direction * 12}px)` },
          { opacity: 1, transform: "none" },
        ],
        { duration: 240, easing: easing.move },
        "gallery",
      );
      announce(button.getAttribute("aria-label") || "تصویر محصول تغییر کرد.");
    }),
  );
document
  .querySelector("[data-zoom-open]")
  ?.addEventListener("click", () => zoomDialog?.showModal());
document
  .querySelectorAll<HTMLElement>("[data-skin-tilt]")
  .forEach(initPointerMotion);

function syncTheme() {
  const dark = root.dataset.veliaTheme === "dark";
  document.querySelectorAll("[data-skin-theme]").forEach((button) => {
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute(
      "aria-label",
      dark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک",
    );
  });
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#202220" : "#efedf1");
}
let themeFrame = 0;
function changeTheme(theme: string) {
  cancelAnimationFrame(themeFrame);
  root.dataset.skinThemeSwitching = "";
  root.dataset.veliaTheme = theme === "dark" ? "dark" : "light";
  syncTheme();
  void root.offsetHeight;
  themeFrame = requestAnimationFrame(
    () => delete root.dataset.skinThemeSwitching,
  );
}
document.querySelector("[data-skin-theme]")?.addEventListener("click", () => {
  const theme = root.dataset.veliaTheme === "dark" ? "light" : "dark";
  changeTheme(theme);
  try {
    localStorage.setItem("velia-theme", theme);
  } catch {}
});
window.addEventListener("storage", (event) => {
  if (event.key === "velia-cart-v1") {
    cart = validatedCart(read("velia-cart-v1"));
    removedLine = null;
    renderBag();
  }
  if (event.key === "velia-favourites-v1") {
    favourites = validatedFavourites(read("velia-favourites-v1"));
    syncFavourites();
  }
  if (event.key === "velia-theme") changeTheme(event.newValue || "light");
});

const checkoutForm = document.querySelector<HTMLFormElement>(
  "[data-checkout-form]",
);
const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (character) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(character)))
    .replace(/[٠-٩]/g, (character) => String("٠١٢٣٤٥٦٧٨٩".indexOf(character)));
if (checkoutForm) {
  checkoutForm.noValidate = true;
  const field = (name: string) =>
    checkoutForm.elements.namedItem(name) as
      HTMLInputElement | HTMLTextAreaElement;
  const validate = () => {
    let first: HTMLInputElement | HTMLTextAreaElement | null = null;
    // ASVS 2.2.1: bounded demonstration input. No form submission, network request or personal-data persistence exists.
    for (const name of ["name", "phone", "city", "postal", "address"]) {
      const input = field(name);
      let error = "";
      const value = input.value.trim();
      if (!value) error = "این مورد را کامل کن.";
      else if (name === "name" && (value.length < 3 || value.length > 70))
        error = "نام را با ۳ تا ۷۰ نویسه بنویس.";
      else if (name === "city" && (value.length < 2 || value.length > 50))
        error = "نام شهر را کامل بنویس.";
      else if (name === "address" && (value.length < 10 || value.length > 300))
        error = "نشانی کامل را با حداقل ۱۰ نویسه بنویس.";
      else if (
        name === "phone" &&
        !/^09\d{9}$/.test(digits(value).replace(/[\s-]/g, ""))
      )
        error = "شمارهٔ همراه ۱۱ رقمی و با ۰۹ شروع می‌شود.";
      else if (
        name === "postal" &&
        !/^\d{10}$/.test(digits(value).replace(/[\s-]/g, ""))
      )
        error = "کد پستی باید ۱۰ رقم باشد.";
      text(checkoutForm, `[data-error-for="${name}"]`, error);
      input.setAttribute("aria-invalid", String(!!error));
      if (error && !first) first = input;
    }
    if (first) {
      first.focus();
      announce("اطلاعات مشخص‌شده را اصلاح کن.");
      return false;
    }
    return true;
  };
  let currentStep: 1 | 2 = 1;
  const step = (number: 1 | 2) => {
    const direction = number > currentStep ? -1 : 1;
    currentStep = number;
    checkoutForm
      .querySelectorAll<HTMLElement>("[data-checkout-panel]")
      .forEach((panel) => {
        panel.hidden = panel.dataset.checkoutPanel !== String(number);
        cancelMotion(panel, "panel");
        if (!panel.hidden) revealPanel(panel, direction);
      });
    checkoutForm
      .querySelectorAll<HTMLElement>("[data-checkout-step]")
      .forEach((item) =>
        item.toggleAttribute(
          "data-active",
          item.dataset.checkoutStep === String(number),
        ),
      );
  };
  const review = () => {
    if (!cart.lines.length || !validate()) return;
    const name = field("name").value.trim();
    text(checkoutForm, "[data-review-name]", name);
    text(checkoutForm, "[data-review-phone]", field("phone").value.trim());
    text(
      checkoutForm,
      "[data-review-delivery]",
      deliveryMode === "express"
        ? "ارسال سریع · نمایشی"
        : "ارسال استاندارد · نمایشی",
    );
    text(
      checkoutForm,
      "[data-review-address]",
      `${field("city").value.trim()}، ${field("address").value.trim()} · کد پستی ${field("postal").value.trim()}`,
    );
    step(2);
    checkoutForm
      .querySelector<HTMLElement>("[data-review-heading]")
      ?.focus({ preventScroll: true });
  };
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    review();
  });
  checkoutForm
    .querySelector("[data-checkout-next]")
    ?.addEventListener("click", review);
  checkoutForm
    .querySelector("[data-checkout-back]")
    ?.addEventListener("click", () => {
      step(1);
      field("name").focus({ preventScroll: true });
    });
  checkoutForm
    .querySelector("[data-checkout-confirm]")
    ?.addEventListener("click", () => {
      if (orderComplete || !cart.lines.length || !validate()) return;
      const cost = totals();
      const receipt = saveReceipt({
        lines: cart.lines.map((line) => ({ ...line })),
        promo: cart.promo,
        delivery: deliveryMode,
      });
      orderComplete = true;
      text(document, "[data-order-id]", receipt.id);
      const receiptLink = document.querySelector<HTMLAnchorElement>(
        "[data-receipt-link]",
      );
      if (receiptLink)
        receiptLink.href =
          url("demo/velia/account/order/") +
          "?id=" +
          encodeURIComponent(receipt.id);
      text(document, "[data-order-total]", skinMoney(cost.total));
      text(document, "[data-order-quantity]", skinMoney(cost.quantity));
      setHidden(document, "[data-order-receipt]", false);
      setHidden(document, "[data-checkout-layout]", true);
      text(document, "[data-checkout-heading] h1", "انتخابت کامل شد.");
      setHidden(document, "[data-checkout-heading] .skin-breadcrumb", true);
      checkoutForm.reset();
      checkoutForm
        .querySelectorAll(
          "[data-review-name],[data-review-phone],[data-review-address]",
        )
        .forEach((element) => {
          element.textContent = "";
        });
      cart = { lines: [], promo: false };
      removedLine = null;
      persistCart();
      const heading = document.querySelector<HTMLElement>(
        "[data-receipt-heading]",
      );
      const receiptPanel = document.querySelector<HTMLElement>(
        "[data-order-receipt]",
      )!;
      window.scrollTo({
        top: Math.max(
          0,
          receiptPanel.getBoundingClientRect().top + scrollY - 90,
        ),
        behavior: "instant",
      });
      heading?.focus({ preventScroll: true });
      animateReceipt(receiptPanel);
      announce("سفارش آزمایشی کامل شد. پرداخت واقعی انجام نشده است.");
    });
  checkoutForm.addEventListener("input", (event) => {
    const input = event.target;
    if (
      input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement
    ) {
      input.removeAttribute("aria-invalid");
      text(checkoutForm, `[data-error-for="${input.name}"]`, "");
    }
  });
}
syncTheme();
renderBag();
syncFavourites();
filterProducts(false);
initStoreAccount();

function addLines(lines: { id: string; quantity: number }[]) {
  let added = 0;
  lines.slice(0, skinProducts.length).forEach((line) => {
    const p = productMap.get(line.id);
    if (!p?.stock) return;
    const quantity = Number.isInteger(line.quantity)
      ? Math.max(1, Math.min(line.quantity, p.stock))
      : 1;
    const existing = cart.lines.find((l) => l.id === p.id);
    const before = existing?.quantity || 0;
    const after = Math.min(p.stock, before + quantity);
    if (after === before) return;
    if (existing) existing.quantity = after;
    else cart.lines.push({ id: p.id, quantity: after });
    added += after - before;
  });
  removedLine = null;
  persistCart();
  announce(
    added
      ? `${skinMoney(added)} محصول به سبد اضافه شد.`
      : "این انتخاب‌ها تا حد موجودی در سبد هستند.",
  );
  bagDialog?.showModal();
  return added;
}
document
  .querySelectorAll<HTMLButtonElement>("[data-add-collection]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const collection = skinCollections.find(
        (c) => c.id === button.dataset.addCollection,
      );
      if (!collection) return;
      addLines(collection.ids.map((id) => ({ id, quantity: 1 })));
    }),
  );
window.addEventListener("velia:rebuy", (event) => {
  const data = (event as CustomEvent).detail;
  if (Array.isArray(data))
    addLines(
      data.filter(
        (l) => l && typeof l.id === "string" && Number.isInteger(l.quantity),
      ),
    );
});
document
  .querySelector("[data-menu-open]")
  ?.addEventListener("click", () =>
    document
      .querySelector<HTMLDialogElement>("[data-menu-dialog]")
      ?.showModal(),
  );
document
  .querySelectorAll<HTMLDetailsElement>("[data-mega]")
  .forEach(initMegaMotion);
const tabs = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-product-tab]"),
];
const positionTabIndicator = initTabIndicator(tabs);
function chooseTab(button: HTMLButtonElement, focus = false) {
  const previousIndex = tabs.findIndex(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  const direction = tabs.indexOf(button) > previousIndex ? -1 : 1;
  tabs.forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document
    .querySelectorAll<HTMLElement>("[data-product-panel]")
    .forEach((panel) => {
      panel.hidden = panel.dataset.productPanel !== button.dataset.productTab;
      cancelMotion(panel, "panel");
      if (!panel.hidden) revealPanel(panel, direction, focus);
    });
  positionTabIndicator?.(button, !focus);
  if (focus) button.focus();
}
tabs.forEach((button, index) => {
  button.addEventListener("click", () => chooseTab(button));
  button.addEventListener("keydown", (e) => {
    let next = index;
    if (e.key === "ArrowLeft") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowRight")
      next = (index + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    chooseTab(tabs[next], true);
  });
});
document
  .querySelectorAll<HTMLInputElement>('[name="delivery"]')
  .forEach((input) =>
    input.addEventListener("change", () => {
      deliveryMode = input.value === "express" ? "express" : "standard";
      renderBag();
    }),
  );
const purchase = document.querySelector(".skin-product-purchase");
const mobilePurchase = document.querySelector<HTMLElement>(
  "[data-mobile-purchase]",
);
if (purchase && mobilePurchase) {
  initMobilePurchase(mobilePurchase, purchase);
}
initHeroMotion();
if (!motion.matches) {
  const editorial = document.querySelector(".velia-editorial-banner");
  if (editorial) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        animate(
          editorial,
          [
            { opacity: 0.5, transform: "translateY(15px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(editorial);
  }
}
