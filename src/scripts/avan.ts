import {
  productById,
  variantById,
  categories,
  usages,
  colors,
  formatMoney,
  minimumPrice,
  storePolicy,
} from "../data/avan";
import {
  emptyQuery,
  parseQuery,
  queryParams,
  catalogResults,
  ancAvailable,
  parseAmount,
} from "../lib/avan/catalog";
import { cartPricing, couponCode } from "../lib/avan/pricing";
import type { CartLine } from "../lib/avan/pricing";
import { comparisonDecision } from "../lib/avan/comparison";
import { AvanStore, STATE_KEY } from "../lib/avan/storage";
import type { Receipt } from "../lib/avan/storage";
import { recipientErrors, recipientFields } from "../lib/avan/checkout";
import type { RecipientField } from "../lib/avan/checkout";
import { avanUrl, photoProps } from "../lib/avan/paths";
import { createMotion } from "../lib/avan/motion";
import {
  optional,
  required,
  element,
  button,
  link,
  image,
  setImage,
  makeCard,
  specValue,
  openDialog,
  closeDialog,
  bindDialogs,
  clearDialogs,
} from "../lib/avan/ui";

let cleanup: (() => void) | undefined;
function init() {
  if (!document.body.classList.contains("av")) return;
  cleanup?.();
  const controller = new AbortController(),
    { signal } = controller,
    store = new AvanStore(window);
  let undone: CartLine | null = null,
    pendingCompare = "",
    announceTimer = 0;
  const cleanups: (() => void)[] = [];
  const motion = createMotion(signal);
  const announce = (message: string) => {
    clearTimeout(announceTimer);
    const node = required("[data-live-status]");
    node.textContent = "";
    announceTimer = window.setTimeout(() => (node.textContent = message), 30);
  };
  const storageNote = () => {
    const node = required("[data-storage-note]");
    node.hidden = store.mode === "local";
    node.textContent =
      store.mode === "session"
        ? "ذخیره‌سازی دائمی در دسترس نیست؛ انتخاب‌ها فقط در همین نشست مرورگر حفظ می‌شوند."
        : "ذخیره‌سازی مسدود است؛ سبد و خرید در همین صفحه انجام می‌شوند. با خروج یا بازخوانی، انتخاب‌ها پاک می‌شوند.";
  };
  const enable = (root: ParentNode = document) => {
    for (const node of root.querySelectorAll<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLButtonElement
      | HTMLTextAreaElement
    >("input:disabled,select:disabled,button:disabled,textarea:disabled"))
      node.disabled = false;
  };
  document.body.classList.add("av-js");
  enable();
  bindDialogs(signal);
  const dialog = (selector: string) => required<HTMLDialogElement>(selector);
  const refreshControls = () => {
    for (const node of document.querySelectorAll<HTMLElement>(
      "[data-save-model]",
    )) {
      const saved = store.state.wishlist.includes(node.dataset.saveModel!);
      node.setAttribute("aria-pressed", String(saved));
      node.classList.toggle("selected", saved);
    }
    for (const node of document.querySelectorAll<HTMLElement>(
      "[data-compare-model]",
    ))
      node.setAttribute(
        "aria-pressed",
        String(store.state.compare.includes(node.dataset.compareModel!)),
      );
    const count = store.state.cart.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );
    for (const node of document.querySelectorAll<HTMLElement>(
      "[data-cart-count]",
    )) {
      node.textContent = new Intl.NumberFormat("fa").format(count);
      node.hidden = count === 0;
    }
    storageNote();
  };
  function summary(lines: CartLine[], coupon: string) {
    const wrapper = element("div", "amount-summary"),
      amounts = cartPricing(lines, coupon);
    for (const [label, value] of [
      ["جمع کالاها", amounts.subtotal],
      ["تخفیف", amounts.discount],
      ["ارسال", amounts.shipping],
      ["مبلغ نهایی", amounts.total],
    ] as const) {
      const row = element("div");
      row.append(
        element("span", "", label),
        element(
          "strong",
          "",
          value === 0 && label === "ارسال" && lines.length
            ? "رایگان"
            : formatMoney(value),
        ),
      );
      wrapper.append(row);
    }
    return wrapper;
  }
  function choiceLines(lines: CartLine[]) {
    const wrapper = element("div", "choice-lines");
    for (const line of lines) {
      const item = variantById(line.sku)!;
      const row = element("div", "choice-line");
      row.append(
        element("bdi", "", item.product.code),
        element(
          "span",
          "",
          `${item.variant.name} · ${new Intl.NumberFormat("fa").format(line.quantity)} عدد`,
        ),
        element("strong", "", formatMoney(line.quantity * item.variant.price)),
      );
      wrapper.append(row);
    }
    return wrapper;
  }
  function empty(title: string, description: string) {
    const node = element("div", "empty-state");
    node.append(
      element("h2", "", title),
      element("p", "", description),
      link("دیدن محصولات", "shop/", "btn"),
    );
    return node;
  }
  function renderReceipt(root: HTMLElement, receipt: Receipt | null) {
    root.classList.remove("empty-state");
    root.replaceChildren();
    if (!receipt) {
      root.append(
        empty(
          "رسیدی برای نمایش وجود ندارد.",
          "پس از ثبت سفارش آزمایشی، رسید غیرشخصی اینجا نمایش داده می‌شود.",
        ),
      );
      return;
    }
    const panel = element("section", "receipt-panel");
    panel.append(
      element("h2", "", "سفارش آزمایشی ثبت شد."),
      element(
        "p",
        "",
        "پرداخت و ارسال واقعی انجام نمی‌شود. اطلاعات شخصی در این رسید وجود ندارد.",
      ),
      element("bdi", "receipt-id", receipt.id),
      choiceLines(receipt.items),
      summary(receipt.items, receipt.coupon),
      link("ادامهٔ کشف محصولات", "shop/", "btn secondary"),
    );
    root.append(panel);
    motion.enter(panel);
  }
  function renderCart() {
    for (const root of document.querySelectorAll<HTMLElement>(
      "[data-cart-content]",
    )) {
      const before = motion.captureCart(root);
      const focus =
        document.activeElement instanceof HTMLElement &&
        root.contains(document.activeElement)
          ? {
              sku:
                document.activeElement.dataset.cartQuantity ||
                document.activeElement.dataset.removeSku,
              remove: document.activeElement.hasAttribute("data-remove-sku"),
            }
          : null;
      root.classList.remove("empty-state");
      root.replaceChildren();
      if (!store.state.cart.length)
        root.append(
          empty(
            "سبد تو هنوز خالی است.",
            "از محصولی شروع کن که به روزهای تو می‌آید.",
          ),
        );
      else {
        const lines = element("div", "cart-lines");
        for (const line of store.state.cart) {
          const { product, variant } = variantById(line.sku)!;
          const row = element("article", "cart-line");
          row.dataset.cartLine = line.sku;
          const photo = link(
            "",
            `product/${product.id}/?color=${variant.color}`,
          );
          photo.append(
            image(variant.images[0], `${product.code}، ${variant.name}`),
          );
          const content = element("div", "cart-line-content");
          content.append(
            link(product.code, `product/${product.id}/?color=${variant.color}`),
            element("p", "", `${product.title} · ${variant.name}`),
            element("strong", "", formatMoney(variant.price)),
          );
          const label = element("label", "", "تعداد "),
            select = element("select");
          select.dataset.cartQuantity = line.sku;
          select.setAttribute(
            "aria-label",
            `تعداد ${product.code} ${variant.name}`,
          );
          for (let n = 1; n <= variant.stock; n++) {
            const option = element(
              "option",
              "",
              new Intl.NumberFormat("fa").format(n),
            );
            option.value = String(n);
            option.selected = n === line.quantity;
            select.append(option);
          }
          label.append(select);
          content.append(
            label,
            button("حذف", "data-remove-sku", line.sku, "text-button"),
          );
          row.append(
            photo,
            content,
            element(
              "strong",
              "line-total",
              formatMoney(variant.price * line.quantity),
            ),
          );
          lines.append(row);
        }
        root.append(lines);
        const coupon = element("form", "coupon-form");
        coupon.dataset.couponForm = "";
        const label = element("label", "", "کد تخفیف نمونه"),
          input = element("input");
        input.name = "coupon";
        input.maxLength = 30;
        input.autocomplete = "off";
        input.value = store.state.coupon;
        label.append(input);
        const submit = element("button", "btn secondary", "اعمال کد");
        submit.type = "submit";
        coupon.append(label, submit);
        if (store.state.coupon)
          coupon.append(button("برداشتن تخفیف", "data-remove-coupon"));
        coupon.append(
          element(
            "p",
            "coupon-feedback",
            store.state.coupon
              ? "AVAN10 فعال است؛ ۱۰٪ تا سقف ۶۰۰٬۰۰۰ تومان."
              : "کد AVAN10 برای این نمونه در دسترس است.",
          ),
        );
        root.append(
          coupon,
          summary(store.state.cart, store.state.coupon),
          link("ادامهٔ خرید آزمایشی", "checkout/", "btn"),
        );
      }
      if (undone)
        root.append(button("بازگرداندن کالای حذف‌شده", "data-undo-cart"));
      if (focus?.sku) {
        const target = root.querySelector<HTMLElement>(
          `[data-cart-quantity="${focus.sku}"]`,
        );
        (target || root.querySelector<HTMLElement>("button,a"))?.focus();
      }
      motion.moveCart(root, before);
    }
  }
  function renderWishlist() {
    const root = optional("[data-wishlist-content]");
    if (!root) return;
    const before = motion.captureGrid(root);
    const restoreFocus = root.contains(document.activeElement);
    root.classList.remove("empty-state");
    root.replaceChildren();
    if (!store.state.wishlist.length)
      root.append(
        empty(
          "هنوز مدلی ذخیره نکرده‌ای.",
          "با دکمهٔ قلب، مدل‌ها را برای بعد نگه دار.",
        ),
      );
    else {
      const grid = element("div", "product-grid");
      for (const id of store.state.wishlist)
        grid.append(makeCard(productById(id)!));
      root.append(grid);
    }
    refreshControls();
    if (restoreFocus) root.querySelector<HTMLElement>("button,a")?.focus();
    motion.moveGrid(root, before);
  }
  function renderCompare() {
    const root = optional("[data-compare-content]");
    if (!root) return;
    root.replaceChildren();
    const selected = store.state.compare.map((id) => productById(id)!);
    const previousModels = root.dataset.motionModels;
    const models = store.state.compare.join(",");
    root.dataset.motionModels = models;
    if (!selected.length) {
      root.append(
        empty(
          "هنوز مدلی برای مقایسه انتخاب نکرده‌ای.",
          "از کنترل بالا یا صفحهٔ محصول، تا سه مدل هم‌گروه انتخاب کن.",
        ),
      );
      return;
    }
    const scroller = element("div", "table-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute(
      "aria-label",
      "جدول مقایسه؛ برای دیدن مدل‌های بیشتر به طرفین پیمایش کن",
    );
    const table = element("table");
    table.style.setProperty("--av-compare-columns", String(selected.length));
    const head = element("thead"),
      header = element("tr");
    const title = element("th", "", "مشخصات");
    title.scope = "col";
    header.append(title);
    for (const p of selected) {
      const cell = element("th");
      cell.scope = "col";
      cell.append(
        image(p.variants[0].images[0], p.code, "product-art", "170px"),
        element("bdi", "", p.code),
        element("p", "", p.title),
        link("انتخاب رنگ", `product/${p.id}/`),
        button("حذف مدل", "data-remove-compare", p.id, "text-button"),
      );
      header.append(cell);
    }
    head.append(header);
    table.append(head);
    const body = element("tbody");
    const keys = [
      ...new Map(
        selected.flatMap((p) => p.specs).map((spec) => [spec.key, spec]),
      ).values(),
    ];
    const priceRow = element("tr"),
      priceTitle = element("th", "", "قیمت از");
    priceTitle.scope = "row";
    priceRow.append(priceTitle);
    for (const p of selected)
      priceRow.append(element("td", "", formatMoney(minimumPrice(p))));
    priceRow.dataset.different = String(
      new Set(selected.map(minimumPrice)).size > 1,
    );
    body.append(priceRow);
    for (const spec of keys) {
      const row = element("tr"),
        label = element("th", "", spec.label);
      label.scope = "row";
      row.append(label);
      const values = selected.map((p) =>
        p.specs.find((s) => s.key === spec.key),
      );
      row.dataset.different = String(
        new Set(values.map((s) => JSON.stringify([s?.value, s?.unit]))).size >
          1,
      );
      for (const value of values) {
        const td = element("td");
        td.append(specValue(value));
        row.append(td);
      }
      body.append(row);
    }
    table.append(body);
    scroller.append(table);
    root.append(scroller);
    root.classList.toggle(
      "show-differences",
      !!optional<HTMLInputElement>("[data-only-differences]")?.checked,
    );
    refreshControls();
    if (previousModels !== undefined && previousModels !== models)
      motion.enter(scroller);
  }
  const checkouts = new Map<
    HTMLElement,
    { refresh: () => void; erase: () => void; restart: () => void }
  >();
  function refresh() {
    renderCart();
    renderWishlist();
    renderCompare();
    refreshControls();
    for (const checkout of checkouts.values()) checkout.refresh();
  }
  function compare(id: string, trigger: HTMLElement) {
    const decision = comparisonDecision(store.state.compare, id);
    if (decision === "different-group") {
      pendingCompare = id;
      openDialog(dialog("[data-reset-dialog]"), trigger);
    } else if (decision === "added") {
      store.state.compare.push(id);
      store.save();
      renderCompare();
      refreshControls();
      motion.feedback(trigger, "به مقایسه اضافه شد");
      announce("مدل به مقایسه اضافه شد.");
    } else
      announce(
        decision === "duplicate"
          ? "این مدل از قبل در مقایسه است."
          : decision === "limit"
            ? "مقایسه تا سه مدل ممکن است؛ یکی را حذف کن."
            : "این محصول قابل مقایسه نیست.",
      );
  }
  function openCart(trigger: HTMLElement) {
    renderCart();
    openDialog(dialog("[data-cart-dialog]"), trigger);
  }
  function setupCheckout(root: HTMLElement) {
    if (checkouts.has(root)) return;
    const form = required<HTMLFormElement>("[data-checkout-form]", root),
      next = required<HTMLButtonElement>("[data-checkout-next]", root),
      back = required<HTMLButtonElement>("[data-checkout-back]", root),
      heading = required("[data-checkout-heading]", root),
      change = required("[data-checkout-change]", root),
      errors = required("[data-errors]", root);
    let step = 0,
      reviewed = "",
      submitted = false;
    const fields = Object.fromEntries(
      recipientFields.map((key) => [
        key,
        required<HTMLInputElement | HTMLTextAreaElement>(
          `[name="${key}"]`,
          form,
        ),
      ]),
    ) as Record<RecipientField, HTMLInputElement | HTMLTextAreaElement>;
    enable(root);
    const draw = () => {
      required("[data-checkout-summary]", root).replaceChildren(
        choiceLines(store.state.cart),
        summary(store.state.cart, store.state.coupon),
      );
      for (const node of root.querySelectorAll<HTMLElement>("[data-step]")) {
        node.classList.toggle("active", Number(node.dataset.step) === step);
        if (Number(node.dataset.step) === step)
          node.setAttribute("aria-current", "step");
        else node.removeAttribute("aria-current");
      }
      required("[data-checkout-info]", root).hidden = step !== 0;
      required("[data-checkout-shipping]", root).hidden = step !== 1;
      required("[data-checkout-review]", root).hidden = step !== 2;
      heading.textContent = [
        "اطلاعات دریافت‌کننده",
        "ارسال و خلاصه",
        "بازبینی نهایی",
      ][step];
      next.textContent = [
        "ادامه و بررسی ارسال",
        "ادامه و بازبینی",
        "ثبت سفارش آزمایشی",
      ][step];
      next.disabled = !store.state.cart.length || submitted;
      back.hidden = step === 0;
      back.disabled = submitted;
    };
    const showStep = (value: number) => {
      const forward = value > step;
      step = value;
      draw();
      heading.focus();
      motion.step(
        required(
          [
            "[data-checkout-info]",
            "[data-checkout-shipping]",
            "[data-checkout-review]",
          ][step],
          root,
        ),
        forward,
      );
    };
    const erase = () => {
      form.reset();
      submitted = false;
      step = 0;
      reviewed = "";
      errors.hidden = true;
      for (const key of recipientFields) {
        fields[key].removeAttribute("aria-invalid");
        required(`[data-error="${key}"]`, root).textContent = "";
      }
      draw();
    };
    checkouts.set(root, {
      refresh: () => {
        if (submitted) return;
        if (step === 2 && reviewed !== store.fingerprint()) {
          step = 1;
          change.textContent =
            "سبد یا مبلغ تغییر کرده است؛ خلاصهٔ تازه را دوباره بازبینی کن.";
        }
        draw();
      },
      erase,
      restart: () => {
        if (!submitted) return;
        required(".checkout-layout", root).hidden = false;
        required(".steps", root).hidden = false;
        const receipt = required("[data-checkout-receipt]", root);
        receipt.hidden = true;
        receipt.replaceChildren();
        change.textContent = "";
        erase();
      },
    });
    draw();
    back.addEventListener("click", () => showStep(Math.max(0, step - 1)), {
      signal,
    });
    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        if (submitted || !store.state.cart.length) return;
        const notices = store.validate();
        if (step === 0) {
          const values = Object.fromEntries(
            recipientFields.map((key) => [key, fields[key].value]),
          ) as Record<RecipientField, string>;
          const invalid = recipientErrors(values);
          errors.replaceChildren();
          errors.hidden = Object.keys(invalid).length === 0;
          for (const key of recipientFields) {
            const message = invalid[key] || "";
            fields[key].setAttribute("aria-invalid", String(!!message));
            required(`[data-error="${key}"]`, root).textContent = message;
            if (message) {
              const anchor = element("a", "", message);
              anchor.href = "#" + fields[key].id;
              anchor.addEventListener(
                "click",
                (event) => {
                  event.preventDefault();
                  fields[key].focus();
                },
                { signal },
              );
              errors.append(anchor);
            }
          }
          if (!errors.hidden) {
            errors.focus();
            return;
          }
          change.textContent = notices.join(" ");
          showStep(1);
          return;
        }
        if (step === 1) {
          if (!store.state.cart.length) {
            draw();
            return;
          }
          reviewed = store.fingerprint();
          showStep(2);
          return;
        }
        if (notices.length || reviewed !== store.fingerprint()) {
          change.textContent =
            "سبد، موجودی یا مبلغ تغییر کرده است؛ دوباره بازبینی کن.";
          showStep(1);
          return;
        }
        // ASVS 14.3.3: explicit receipt fields only; recipient inputs never enter storage or a URL.
        submitted = true;
        next.disabled = true;
        const receipt: Receipt = {
          version: 1,
          id:
            "AV-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 8),
          createdAt: new Date().toISOString(),
          items: store.state.cart.map((line) => ({ ...line })),
          coupon: store.state.coupon,
          amounts: cartPricing(store.state.cart, store.state.coupon),
        };
        const persisted = store.saveReceipt(receipt);
        if (!store.receipt) {
          submitted = false;
          change.textContent = "ثبت رسید انجام نشد؛ انتخاب‌ها حفظ شده‌اند.";
          draw();
          return;
        }
        store.state.cart = [];
        store.state.coupon = "";
        store.save();
        form.reset();
        refreshControls();
        renderCart();
        if (persisted && store.mode !== "memory") {
          window.location.assign(avanUrl("order/"));
          return;
        }
        required(".checkout-layout", root).hidden = true;
        required(".steps", root).hidden = true;
        const output = required("[data-checkout-receipt]", root);
        output.hidden = false;
        renderReceipt(output, store.receipt);
        output.tabIndex = -1;
        output.focus();
        announce("رسید نمونه در همین صفحه ثبت شد.");
      },
      { signal },
    );
  }
  const standalone = optional("[data-checkout-root]");
  if (standalone) setupCheckout(standalone);
  function inlineCheckout(trigger: HTMLElement) {
    if (!store.state.cart.length) {
      announce("ابتدا محصولی به سبد اضافه کن.");
      return;
    }
    const host = required("[data-inline-checkout-host]");
    if (!host.children.length) {
      const template = optional<HTMLTemplateElement>(
        "[data-checkout-template]",
      );
      if (!template) {
        closeDialog(dialog("[data-cart-dialog]"));
        standalone?.scrollIntoView();
        return;
      }
      host.append(template.content.cloneNode(true));
      setupCheckout(required("[data-checkout-root]", host));
    }
    checkouts.get(required("[data-checkout-root]", host))?.restart();
    openDialog(dialog("[data-inline-checkout]"), trigger);
  }
  function quickView(id: string, trigger: HTMLElement) {
    const p = productById(id);
    if (!p) return;
    const host = required("[data-quick-content]");
    host.replaceChildren();
    required("#av-quick-title").textContent = p.code;
    const photo = image(
      p.variants[0].images[0],
      `${p.code}، ${p.variants[0].name}`,
      "quick-photo",
      "400px",
    );
    const photoStage = element("div", "quick-photo-stage");
    photoStage.append(photo);
    let photoSequence = 0;
    const loadPhoto = async (source: string, alt: string) => {
      const token = ++photoSequence;
      const props = photoProps(source);
      if (photo.getAttribute("src") === props.src) {
        photo.alt = alt;
        return;
      }
      const candidate = new Image();
      Object.assign(candidate, props, { sizes: photo.sizes });
      try {
        await candidate.decode();
        if (token !== photoSequence || signal.aborted || !photo.isConnected)
          return;
        motion.swapPhoto(photo, () => setImage(photo, source, alt));
      } catch {
        if (token === photoSequence)
          announce("تصویر این رنگ بارگذاری نشد؛ نمای قبلی حفظ شد.");
      }
    };
    const title = element("h3", "", p.title),
      price = element("p", "quick-price"),
      select = element("select"),
      quantity = element("select"),
      add = button("افزودن به سبد", "data-quick-add", "", "btn"),
      label = element("label", "", "رنگ "),
      qtyLabel = element("label", "", "تعداد ");
    select.setAttribute("aria-label", "رنگ محصول");
    quantity.setAttribute("aria-label", "تعداد محصول");
    for (const v of p.variants) {
      const option = element("option", "", v.name);
      option.value = v.id;
      select.append(option);
    }
    const update = () => {
      const v = p.variants.find((v) => v.id === select.value)!;
      void loadPhoto(v.images[0], `${p.code}، ${v.name}`);
      price.textContent = formatMoney(v.price) + (v.stock ? "" : " · ناموجود");
      quantity.replaceChildren();
      for (let n = 1; n <= v.stock; n++) {
        const option = element("option", "", String(n));
        option.value = String(n);
        quantity.append(option);
      }
      quantity.disabled = !v.stock;
      add.disabled = !v.stock;
    };
    select.addEventListener("change", update, { signal });
    add.addEventListener(
      "click",
      () => {
        if (store.add(select.value, Number(quantity.value))) {
          closeDialog(dialog("[data-quick-dialog]"));
          refresh();
          openCart(trigger);
          motion.feedback(trigger, "به سبد اضافه شد");
          announce("انتخاب به سبد اضافه شد.");
        } else {
          motion.feedback(add, "سقف موجودی در سبد");
          announce(
            "حداکثر موجودی این رنگ در سبد است؛ تعداد را در سبد بررسی کن.",
          );
        }
      },
      { signal },
    );
    label.append(select);
    qtyLabel.append(quantity);
    host.append(
      photoStage,
      title,
      element("p", "", p.description),
      price,
      label,
      qtyLabel,
      add,
      link("مشخصات و همهٔ نماها", `product/${p.id}/`, "card-link"),
    );
    update();
    openDialog(dialog("[data-quick-dialog]"), trigger);
  }
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("button,a");
      if (!target) return;
      if (target.dataset.saveModel) {
        const id = target.dataset.saveModel;
        if (!productById(id)) return;
        store.state.wishlist = store.state.wishlist.includes(id)
          ? store.state.wishlist.filter((value) => value !== id)
          : [...store.state.wishlist, id];
        store.save();
        renderWishlist();
        refreshControls();
        motion.feedback(
          target,
          store.state.wishlist.includes(id) ? "ذخیره شد" : "برداشته شد",
        );
        announce(
          store.state.wishlist.includes(id)
            ? "مدل ذخیره شد."
            : "مدل از علاقه‌مندی‌ها حذف شد.",
        );
      }
      if (target.dataset.compareModel)
        compare(target.dataset.compareModel, target);
      if (target.hasAttribute("data-compare-selected"))
        compare(
          required<HTMLSelectElement>("[data-compare-select]").value,
          target,
        );
      if (target.hasAttribute("data-confirm-comparison") && pendingCompare) {
        store.state.compare = [pendingCompare];
        pendingCompare = "";
        store.save();
        closeDialog(dialog("[data-reset-dialog]"));
        renderCompare();
        refreshControls();
        announce("گروه مقایسه تغییر کرد.");
      }
      if (target.dataset.removeCompare) {
        store.state.compare = store.state.compare.filter(
          (id) => id !== target.dataset.removeCompare,
        );
        store.save();
        renderCompare();
        refreshControls();
        required<HTMLSelectElement>("[data-compare-select]").focus();
        announce("مدل از مقایسه حذف شد.");
      }
      if (target.dataset.quickView) quickView(target.dataset.quickView, target);
      if (target.dataset.removeSku) {
        undone =
          store.state.cart.find(
            (line) => line.sku === target.dataset.removeSku,
          ) || null;
        store.state.cart = store.state.cart.filter(
          (line) => line.sku !== target.dataset.removeSku,
        );
        store.save();
        refresh();
        announce("کالا حذف شد؛ امکان بازگردانی وجود دارد.");
      }
      if (target.hasAttribute("data-undo-cart") && undone) {
        store.add(undone.sku, undone.quantity);
        undone = null;
        refresh();
        announce("کالا به سبد بازگشت.");
      }
      if (target.hasAttribute("data-remove-coupon")) {
        store.state.coupon = "";
        store.save();
        refresh();
        announce("تخفیف برداشته شد.");
      }
      if (target instanceof HTMLAnchorElement) {
        const pathname = new URL(target.href).pathname;
        if (pathname === new URL(avanUrl("cart/"), location.origin).pathname) {
          event.preventDefault();
          openCart(target);
        }
        if (
          pathname ===
            new URL(avanUrl("checkout/"), location.origin).pathname &&
          store.mode === "memory"
        ) {
          event.preventDefault();
          inlineCheckout(target);
        }
      }
    },
    { signal },
  );
  document.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.dataset.cartQuantity) {
        store.update(target.dataset.cartQuantity, Number(target.value));
        refresh();
        announce("تعداد و مبلغ سبد به‌روز شد.");
      }
      if (
        target instanceof HTMLInputElement &&
        target.hasAttribute("data-only-differences")
      )
        renderCompare();
    },
    { signal },
  );
  document.addEventListener(
    "submit",
    (event) => {
      if (
        !(event.target instanceof HTMLFormElement) ||
        !event.target.hasAttribute("data-coupon-form")
      )
        return;
      event.preventDefault();
      const form = event.target,
        input = required<HTMLInputElement>("[name=coupon]", form),
        code = couponCode(input.value);
      if (code !== storePolicy.coupon) {
        required(".coupon-feedback", form).textContent =
          "این کد معتبر نیست." +
          (store.state.coupon
            ? " تخفیف قبلی همچنان فعال است."
            : " از AVAN10 استفاده کن.");
        announce("کد تخفیف معتبر نیست.");
        return;
      }
      store.state.coupon = code;
      store.save();
      refresh();
      announce("تخفیف نمونه اعمال شد.");
    },
    { signal },
  );
  window.addEventListener(
    "storage",
    (event) => {
      if (
        (event.key === STATE_KEY || event.key === null) &&
        store.mode === "local"
      ) {
        store.reload();
        refresh();
        announce(
          "انتخاب‌ها با تغییرات پنجرهٔ دیگر هماهنگ شدند. " +
            store.notices.join(" "),
        );
      }
    },
    { signal },
  );
  setupCatalog();
  setupProduct();
  setupGuide();
  refresh();
  const order = optional("[data-order-content]");
  if (order) renderReceipt(order, store.receipt);
  if (store.notices.length) announce(store.notices.join(" "));
  function setupCatalog() {
    const root = optional("[data-catalog-results]");
    if (!root) return;
    const filters = required("#av-filters"),
      search = required<HTMLInputElement>("#search"),
      sort = required<HTMLSelectElement>("#sort"),
      min = required<HTMLInputElement>("#priceMin"),
      max = required<HTMLInputElement>("#priceMax"),
      error = required("[data-filter-error]");
    let query = parseQuery(new URLSearchParams(location.search)),
      timer = 0;
    const fields = () => {
      search.value = query.q;
      sort.value = query.sort;
      min.value = query.priceMin === undefined ? "" : String(query.priceMin);
      max.value = query.priceMax === undefined ? "" : String(query.priceMax);
      for (const input of filters.querySelectorAll<HTMLInputElement>(
        "input[type=checkbox]",
      ))
        input.checked = ["category", "use", "color"].includes(input.name)
          ? (
              query[input.name as "category" | "use" | "color"] as string[]
            ).includes(input.value)
          : Boolean(query[input.name as "stock" | "anc"]);
      required(".anc-filter", filters).hidden = !ancAvailable(query);
    };
    const draw = (historyMode: "push" | "replace" | null) => {
      const matches = catalogResults(query);
      const before = motion.captureGrid(root);
      root.replaceChildren(
        ...matches.map(({ product, variant }) => makeCard(product, variant)),
      );
      refreshControls();
      if (historyMode !== "replace") motion.moveGrid(root, before);
      required("[data-result-count]").textContent =
        new Intl.NumberFormat("fa").format(matches.length) + " مدل";
      required("[data-no-results]").hidden = matches.length > 0;
      const chips = required("[data-filter-chips]");
      chips.replaceChildren();
      const add = (text: string, key: string, value = "") => {
        const chip = button(text + " ×", "data-chip-key", key, "filter-chip");
        chip.dataset.chipValue = value;
        chips.append(chip);
      };
      if (query.q) add("جست‌وجو: " + query.q, "q");
      for (const id of query.category)
        add(categories.find((c) => c.id === id)!.name, "category", id);
      for (const id of query.use)
        add(usages.find((u) => u.id === id)!.name, "use", id);
      for (const id of query.color) add(colors[id].name, "color", id);
      if (query.priceMin !== undefined)
        add("از " + formatMoney(query.priceMin), "priceMin");
      if (query.priceMax !== undefined)
        add("تا " + formatMoney(query.priceMax), "priceMax");
      if (query.stock) add("فقط موجود", "stock");
      if (query.anc) add("حذف نویز فعال", "anc");
      const params = queryParams(query).toString(),
        href = location.pathname + (params ? "?" + params : "");
      if (historyMode && href !== location.pathname + location.search)
        history[historyMode === "push" ? "pushState" : "replaceState"](
          null,
          "",
          href,
        );
      fields();
      announce(matches.length + " مدل پیدا شد.");
    };
    const read = () => {
      for (const input of [min, max]) {
        const invalid =
          input.value.trim() !== "" && parseAmount(input.value) === undefined;
        input.setAttribute("aria-invalid", String(invalid));
        if (invalid) {
          error.textContent = "قیمت را به تومان، از صفر تا ۵۰ میلیون وارد کن.";
          return;
        }
      }
      error.textContent = "";
      const params = new URLSearchParams();
      params.set("q", search.value);
      params.set("sort", sort.value);
      params.set("priceMin", min.value);
      params.set("priceMax", max.value);
      for (const input of filters.querySelectorAll<HTMLInputElement>(
        "input[type=checkbox]:checked",
      ))
        params.append(
          input.name,
          ["stock", "anc"].includes(input.name) ? "1" : input.value,
        );
      const hadAnc = query.anc;
      query = parseQuery(params);
      draw("push");
      if (hadAnc && !ancAvailable(query))
        announce("فیلتر حذف نویز برای این دسته کاربرد ندارد و برداشته شد.");
    };
    search.addEventListener(
      "input",
      () => {
        clearTimeout(timer);
        timer = window.setTimeout(read, 160);
      },
      { signal },
    );
    for (const control of [...filters.querySelectorAll("input"), sort])
      control.addEventListener(
        "change",
        () => {
          clearTimeout(timer);
          read();
        },
        { signal },
      );
    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const reset = event.target.closest("[data-filter-reset]"),
          chip = event.target.closest<HTMLElement>("[data-chip-key]");
        if (reset) {
          clearTimeout(timer);
          query = emptyQuery();
          error.textContent = "";
          draw("push");
          search.focus();
        }
        if (chip) {
          const key = chip.dataset.chipKey!;
          if (["category", "use", "color"].includes(key))
            query[key as "category" | "use" | "color"] = query[
              key as "category" | "use" | "color"
            ].filter((id) => id !== chip.dataset.chipValue) as never;
          else if (key === "q") query.q = "";
          else if (key === "stock" || key === "anc") query[key] = false;
          else if (key === "priceMin" || key === "priceMax") delete query[key];
          draw("push");
          search.focus();
        }
      },
      { signal },
    );
    window.addEventListener(
      "popstate",
      () => {
        clearTimeout(timer);
        query = parseQuery(new URLSearchParams(location.search));
        draw("replace");
      },
      { signal },
    );
    draw("replace");
    cleanups.push(() => clearTimeout(timer));
    const marker = document.createComment("AVAN filters home");
    filters.before(marker);
    const panel = dialog("[data-filters-dialog]"),
      host = required("[data-filter-host]"),
      media = matchMedia("(max-width:767px)");
    const move = () => {
      if (media.matches) host.append(filters);
      else {
        if (panel.open) closeDialog(panel);
        marker.after(filters);
      }
    };
    required("[data-open-filters]").addEventListener(
      "click",
      (event) => openDialog(panel, event.currentTarget as HTMLElement),
      { signal },
    );
    media.addEventListener("change", move, { signal });
    move();
    cleanups.push(() => {
      marker.after(filters);
      marker.remove();
    });
  }
  function setupProduct() {
    const root = optional("[data-product]");
    if (!root) return;
    const p = productById(root.dataset.product!)!;
    let v =
        p.variants.find(
          (v) => v.color === new URLSearchParams(location.search).get("color"),
        ) || p.variants[0],
      index = 0,
      sequence = 0;
    const quantity = required<HTMLSelectElement>("#quantity", root),
      add = required<HTMLButtonElement>("[data-add-to-cart]", root),
      photo = required<HTMLImageElement>(".main-image img", root),
      status = required("[data-gallery-status]", root),
      zoom = required<HTMLAnchorElement>(".gallery-zoom", root);
    const load = async () => {
      const token = ++sequence,
        source = v.images[index],
        alt = `${p.code}، ${v.name}، نمای ${index + 1}`;
      const props = photoProps(source),
        candidate = new Image();
      Object.assign(candidate, props, { sizes: photo.sizes });
      status.textContent =
        "در حال آماده‌شدن نمای " +
        new Intl.NumberFormat("fa").format(index + 1) +
        "…";
      try {
        await new Promise<void>((resolve, reject) => {
          candidate.onload = () => resolve();
          candidate.onerror = () => reject(Error("image"));
          if (candidate.complete && candidate.naturalWidth) resolve();
        });
        if (candidate.decode) await candidate.decode();
        if (token !== sequence || signal.aborted) return;
        if (photo.getAttribute("src") !== props.src)
          motion.swapPhoto(photo, () => setImage(photo, source, alt));
        else photo.alt = alt;
        zoom.href = props.src;
        status.textContent = `نمای ${new Intl.NumberFormat("fa").format(index + 1)} از ${new Intl.NumberFormat("fa").format(v.images.length)} · ${v.name}`;
        photo.dataset.sku = v.id;
      } catch {
        if (token !== sequence || signal.aborted) return;
        status.textContent =
          "این تصویر بارگذاری نشد؛ نمای دیگری را انتخاب کن. تصویر قبلی نمایش داده می‌شود.";
      }
    };
    const update = () => {
      required("[data-product-price]", root).textContent = formatMoney(v.price);
      const stock = required("[data-product-stock]", root);
      stock.textContent = v.stock
        ? `موجود · ${new Intl.NumberFormat("fa").format(v.stock)} عدد در رنگ ${v.name}`
        : "این رنگ ناموجود است";
      stock.classList.toggle("unavailable", !v.stock);
      required("[data-color-label]", root).textContent = v.name;
      for (const input of root.querySelectorAll<HTMLInputElement>(
        "input[name=color]",
      )) {
        input.checked = input.value === v.id;
        input.closest("label")?.classList.toggle("selected", input.checked);
      }
      const previousQuantity =
        quantity.dataset.sku === v.id ? Number(quantity.value) : 1;
      quantity.dataset.sku = v.id;
      quantity.replaceChildren();
      for (let n = 1; n <= v.stock; n++) {
        const option = element(
          "option",
          "",
          new Intl.NumberFormat("fa").format(n),
        );
        option.value = String(n);
        option.selected = n === Math.min(v.stock, previousQuantity || 1);
        quantity.append(option);
      }
      quantity.disabled = !v.stock;
      add.disabled = !v.stock;
      for (const thumbnail of root.querySelectorAll<HTMLElement>(
        "[data-gallery-sku]",
      )) {
        thumbnail.hidden = thumbnail.dataset.gallerySku !== v.id;
        thumbnail.setAttribute(
          "aria-current",
          String(
            Number(thumbnail.dataset.galleryIndex) === index &&
              thumbnail.dataset.gallerySku === v.id,
          ),
        );
      }
      void load();
    };
    root.addEventListener(
      "change",
      (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.name === "color") {
          v = p.variants.find((v) => v.id === target.value)!;
          index = 0;
          update();
        }
      },
      { signal },
    );
    const navigate = (value: number) => {
      index = (value + v.images.length) % v.images.length;
      update();
    };
    root.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const thumbnail = event.target.closest<HTMLElement>(
          "[data-gallery-index]",
        );
        if (thumbnail) {
          event.preventDefault();
          index = Number(thumbnail.dataset.galleryIndex);
          update();
        }
        if (event.target.closest("[data-gallery-prev]")) navigate(index - 1);
        if (event.target.closest("[data-gallery-next]")) navigate(index + 1);
      },
      { signal },
    );
    required(".gallery", root).addEventListener(
      "keydown",
      (event) => {
        if (
          !(event instanceof KeyboardEvent) ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        navigate(index + (event.key === "ArrowLeft" ? 1 : -1));
      },
      { signal },
    );
    add.addEventListener(
      "click",
      () => {
        if (store.add(v.id, Number(quantity.value))) {
          refresh();
          openCart(add);
          motion.feedback(add, "به سبد اضافه شد");
          announce("انتخاب به سبد اضافه شد.");
        } else {
          openCart(add);
          motion.feedback(add, "سقف موجودی در سبد");
          announce(
            "حداکثر موجودی این رنگ در سبد است؛ تعداد را در سبد بررسی کن.",
          );
        }
      },
      { signal },
    );
    zoom.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const host = required("[data-zoom-content]");
        host.replaceChildren(photo.cloneNode(true));
        openDialog(dialog("[data-zoom-dialog]"), zoom);
      },
      { signal },
    );
    update();
    cleanups.push(() => sequence++);
  }
  function setupGuide() {
    const form = optional<HTMLFormElement>("[data-guide-form]");
    if (!form) return;
    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        const data = new FormData(form),
          category = data.get("category"),
          use = data.get("use"),
          budget = parseAmount(String(data.get("budget") || "")),
          root = required("[data-guide-results]");
        const before = motion.captureGrid(root);
        root.replaceChildren();
        if (
          typeof category !== "string" ||
          typeof use !== "string" ||
          budget === undefined
        ) {
          root.append(
            element(
              "p",
              "field-error",
              "دسته، کاربرد و بودجهٔ معتبر را انتخاب کن.",
            ),
          );
          root.tabIndex = -1;
          root.focus();
          return;
        }
        const params = new URLSearchParams({
            category,
            use,
            priceMax: String(budget),
            stock: "1",
          }),
          query = parseQuery(params),
          matches = catalogResults(query);
        root.append(
          element(
            "h2",
            "",
            matches.length
              ? "گزینه‌های نزدیک به انتخاب تو"
              : "گزینهٔ موجودی با این بودجه و کاربرد پیدا نشد.",
          ),
          element(
            "p",
            "",
            matches.length
              ? "این مدل‌ها کاربرد انتخابی تو را دارند و رنگ موجودشان در بودجه است."
              : "بودجه یا کاربرد را تغییر بده؛ مدل نامرتبط پیشنهاد نمی‌کنیم.",
          ),
          link(
            "بررسی این انتخاب در محصولات",
            "shop/?" + queryParams(query),
            "card-link",
          ),
        );
        const grid = element("div", "product-grid");
        for (const { product, variant } of matches)
          grid.append(makeCard(product, variant));
        root.append(grid);
        motion.moveGrid(root, before);
        refreshControls();
        root.tabIndex = -1;
        root.focus();
        announce(matches.length + " گزینهٔ منطبق پیدا شد.");
      },
      { signal },
    );
  }
  cleanup = () => {
    controller.abort();
    clearTimeout(announceTimer);
    for (const fn of cleanups) fn();
    for (const checkout of checkouts.values()) checkout.erase();
    clearDialogs();
  };
}
init();
window.addEventListener("pagehide", () => cleanup?.());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) init();
});
