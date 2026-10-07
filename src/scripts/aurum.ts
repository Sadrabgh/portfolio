import {
  money,
  number,
  optionText,
  normalizeSearch,
  delivery as deliveryRules,
} from "../data/aurum-locale";
import type { Jewel } from "../data/aurum";
type Product = Jewel & { image: string; href: string };
type Item = { id: string; option: string; quantity: number };
type Receipt = {
  ref: string;
  time: number;
  items: Item[];
  discount: boolean;
  shipping: "standard" | "express";
  gift: boolean;
  currency?: "toman";
  prices?: Record<string, number>;
};
const dataNode = document.querySelector<HTMLScriptElement>("#au-data");
if (dataNode) {
  const { products, base } = JSON.parse(dataNode.textContent || "{}") as {
    products: Product[];
    base: string;
  };
  const $ = <T extends Element = HTMLElement>(
    selector: string,
    scope: ParentNode = document,
  ) => scope.querySelector<T>(selector);
  const $$ = <T extends Element = HTMLElement>(
    selector: string,
    scope: ParentNode = document,
  ) => [...scope.querySelectorAll<T>(selector)];
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const find = (id: string) => products.find((p) => p.id === id);
  const key = (item: Item) => item.id + "::" + item.option;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const cartKey = "aurum-bag-v1",
    savedKey = "aurum-saved-v1",
    receiptKey = "aurum-receipt-v1";
  let memory: Record<string, unknown> = {};
  let storage: Storage | undefined;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      const candidate = window[name];
      candidate.setItem("aurum-probe", "1");
      candidate.removeItem("aurum-probe");
      storage = candidate;
      break;
    } catch {}
  }
  if (!storage) $("[data-storage-note]")?.removeAttribute("hidden");
  function read(name: string): unknown {
    try {
      return JSON.parse(storage?.getItem(name) || "null") ?? memory[name];
    } catch {
      return memory[name];
    }
  }
  function write(name: string, value: unknown) {
    memory[name] = value;
    try {
      storage?.setItem(name, JSON.stringify(value));
    } catch {
      $("[data-storage-note]")?.removeAttribute("hidden");
    }
  }
  function cleanCart(value: unknown): Item[] {
    if (!Array.isArray(value)) return [];
    const result: Item[] = [];
    const used = new Map<string, number>();
    for (const raw of value.slice(0, 50)) {
      if (!raw || typeof raw !== "object") continue;
      const p = find(raw.id);
      if (
        !p ||
        !p.options.includes(raw.option) ||
        !Number.isInteger(raw.quantity) ||
        raw.quantity < 1
      )
        continue;
      const remaining = p.stock - (used.get(p.id) || 0);
      const quantity = Math.min(raw.quantity, remaining);
      if (quantity < 1) continue;
      const existing = result.find(
        (i) => i.id === p.id && i.option === raw.option,
      );
      if (existing) existing.quantity += quantity;
      else result.push({ id: p.id, option: raw.option, quantity });
      used.set(p.id, (used.get(p.id) || 0) + quantity);
    }
    return result;
  }
  function cleanSaved(value: unknown): string[] {
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string => typeof id === "string" && !!find(id),
            ),
          ),
        ]
      : [];
  }
  let bag = cleanCart(read(cartKey));
  let saved = cleanSaved(read(savedKey));
  let discount = false;
  let shipping: "standard" | "express" = "standard";
  let gift = false;
  let placing = false;
  const sum = (items: Item[] = bag, prices?: Record<string, number>) =>
    items.reduce(
      (total, i) => total + (prices?.[i.id] ?? find(i.id)!.price) * i.quantity,
      0,
    );
  function totals(
    items = bag,
    useDiscount = discount,
    delivery = shipping,
    wrapping = gift,
    prices?: Record<string, number>,
    legacy = false,
  ) {
    const subtotal = sum(items, prices),
      reduction = useDiscount ? subtotal * 0.1 : 0;
    const deliveryCost = items.length
      ? delivery === "express"
        ? legacy
          ? 35
          : deliveryRules.express
        : subtotal - reduction >= (legacy ? 1500 : deliveryRules.threshold)
          ? 0
          : legacy
            ? 20
            : deliveryRules.standard
      : 0;
    const packaging =
      items.length && wrapping ? (legacy ? 15 : deliveryRules.gift) : 0;
    return {
      subtotal,
      reduction,
      deliveryCost,
      packaging,
      total: subtotal - reduction + deliveryCost + packaging,
    };
  }
  function announce(message: string) {
    const status = $("[data-status]");
    if (status) status.textContent = message;
  }
  const icon = (name: "plus" | "minus" | "close" | "arrow") =>
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="' +
    {
      plus: "M12 5v14M5 12h14",
      minus: "M5 12h14",
      close: "m6 6 12 12M18 6 6 18",
      arrow: "M20 12H5m6-6-6 6 6 6",
    }[name] +
    '"/></svg>';
  const empty = () =>
    '<div class="au-empty"><h2>جایی برای یک انتخاب تازه.</h2><p>سبد شما خالی است. از یک قطعهٔ محبوب شروع کنید.</p><a class="au-button" href="' +
    base +
    'shop/">کشف مجموعه ' +
    icon("arrow") +
    "</a></div>";
  function lines(
    items = bag,
    editable = true,
    prices?: Record<string, number>,
    format = money,
  ) {
    return items
      .map((item) => {
        const p = find(item.id)!;
        const k = escape(key(item));
        return (
          '<div class="au-line" data-line-key="' +
          k +
          '"><img src="' +
          escape(p.image) +
          '" width="95" height="105" alt="' +
          escape(p.name) +
          '"/><div class="au-line-info"><a href="' +
          escape(p.href) +
          '">' +
          escape(p.name) +
          "</a><p>" +
          escape(optionText(item.option)) +
          "</p><strong>" +
          format((prices?.[p.id] ?? p.price) * item.quantity) +
          "</strong>" +
          (editable
            ? '<div class="au-line-tools"><div class="au-quantity"><button class="au-icon" data-quantity="-1" data-key="' +
              k +
              '" aria-label="کاهش تعداد ' +
              escape(p.name) +
              '"' +
              (item.quantity === 1 ? " disabled" : "") +
              ">" +
              icon("minus") +
              '</button><span aria-label="تعداد">' +
              number(item.quantity) +
              '</span><button class="au-icon" data-quantity="1" data-key="' +
              k +
              '" aria-label="افزایش تعداد ' +
              escape(p.name) +
              '"' +
              (bag
                .filter((i) => i.id === p.id)
                .reduce((n, i) => n + i.quantity, 0) >= p.stock
                ? " disabled"
                : "") +
              ">" +
              icon("plus") +
              "</button></div></div>"
            : "<p>تعداد " + number(item.quantity) + "</p>") +
          "</div>" +
          (editable
            ? '<button class="au-icon" data-remove="' +
              k +
              '" aria-label="حذف ' +
              escape(p.name) +
              '">' +
              icon("close") +
              "</button>"
            : "") +
          "</div>"
        );
      })
      .join("");
  }
  const summaryLines = (items = bag) =>
    items
      .map((i) => {
        const p = find(i.id)!;
        return (
          '<div class="au-summary-line"><img src="' +
          escape(p.image) +
          '" width="58" height="65" alt="' +
          escape(p.name) +
          '"/><span>' +
          escape(p.name) +
          "<small>" +
          escape(optionText(i.option)) +
          " · تعداد " +
          number(i.quantity) +
          "</small></span><strong>" +
          money(p.price * i.quantity) +
          "</strong></div>"
        );
      })
      .join("");
  function totalsHTML(t: ReturnType<typeof totals>, format = money) {
    return (
      '<div class="au-total-row"><span>جمع محصولات</span><strong>' +
      format(t.subtotal) +
      "</strong></div>" +
      (t.reduction
        ? '<div class="au-total-row"><span>AURUM10 · ۱۰٪</span><strong>−' +
          format(t.reduction) +
          "</strong></div>"
        : "") +
      '<div class="au-total-row"><span>ارسال</span><strong>' +
      (t.deliveryCost ? format(t.deliveryCost) : "رایگان") +
      "</strong></div>" +
      (t.packaging
        ? '<div class="au-total-row"><span>بسته‌بندی هدیه</span><strong>' +
          format(t.packaging) +
          "</strong></div>"
        : "") +
      '<div class="au-total-row au-grand-total"><span>مبلغ نهایی</span><strong>' +
      format(t.total) +
      "</strong></div>"
    );
  }

  const activeMotion = new Map<Element, Animation>();
  function animate(el: Element, frames: Keyframe[], duration = 300) {
    activeMotion.get(el)?.cancel();
    if (motion.matches) return;
    const animation = el.animate(frames, {
      duration,
      easing: "cubic-bezier(.22,1,.36,1)",
    });
    activeMotion.set(el, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (activeMotion.get(el) === animation) activeMotion.delete(el);
      });
  }
  motion.addEventListener("change", () => {
    if (motion.matches) {
      activeMotion.forEach((a) => a.cancel());
      activeMotion.clear();
    }
  });
  function capture(elements: HTMLElement[]) {
    const positions = new Map<HTMLElement, DOMRect>();
    if (motion.matches) return positions;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width) positions.set(el, rect);
    }
    for (const el of elements) activeMotion.get(el)?.cancel();
    return positions;
  }
  function flow(elements: HTMLElement[], positions: Map<HTMLElement, DOMRect>) {
    if (motion.matches) return;
    const movements = elements.map((el) => ({
      el,
      old: positions.get(el),
      rect: el.getBoundingClientRect(),
    }));
    for (const { el, old, rect } of movements) {
      if (!rect.width) continue;
      if (!old)
        animate(
          el,
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ],
          240,
        );
      else {
        const x = old.left - rect.left,
          y = old.top - rect.top;
        if (Math.abs(x) + Math.abs(y) > 1)
          animate(
            el,
            [
              { transform: "translate(" + x + "px," + y + "px)" },
              { transform: "none" },
            ],
            360,
          );
      }
    }
  }
  function updateLines(container: HTMLElement) {
    const rows = $$<HTMLElement>("[data-line-key]", container);
    const positions = capture(rows);
    if (!bag.length) {
      if (!container.querySelector(".au-empty")) container.innerHTML = empty();
      return;
    }
    const existing = new Map(rows.map((row) => [row.dataset.lineKey!, row]));
    container.querySelector(".au-empty")?.remove();
    for (const row of rows)
      if (!bag.some((i) => key(i) === row.dataset.lineKey)) row.remove();
    bag.forEach((item, index) => {
      const p = find(item.id)!;
      let row = existing.get(key(item));
      if (!row) {
        const template = document.createElement("template");
        template.innerHTML = lines([item]);
        row = template.content.firstElementChild as HTMLElement;
      } else {
        const quantity = $(".au-quantity span", row)!;
        if (quantity.textContent !== number(item.quantity)) {
          quantity.textContent = number(item.quantity);
          animate(quantity, [{ opacity: 0.3 }, { opacity: 1 }], 180);
        }
        $(".au-line-info strong", row)!.textContent = money(
          p.price * item.quantity,
        );
        $<HTMLButtonElement>('[data-quantity="-1"]', row)!.disabled =
          item.quantity === 1;
        $<HTMLButtonElement>('[data-quantity="1"]', row)!.disabled =
          bag
            .filter((i) => i.id === p.id)
            .reduce((n, i) => n + i.quantity, 0) >= p.stock;
      }
      if (container.children[index] !== row)
        container.insertBefore(row, container.children[index] || null);
    });
    flow($$<HTMLElement>("[data-line-key]", container), positions);
  }

  function render() {
    const count = bag.reduce((n, i) => n + i.quantity, 0);
    $$("[data-bag-count]").forEach((el) => {
      el.textContent = number(count);
      if (el.classList.contains("au-count"))
        el.toggleAttribute("hidden", !count);
    });
    $$("[data-bag-lines]").forEach((el) => {
      updateLines(el);
    });
    $$("[data-subtotal]").forEach((el) => {
      el.textContent = money(sum());
    });
    $$<HTMLAnchorElement>("[data-checkout-link]").forEach((el) => {
      el.setAttribute("aria-disabled", String(!count));
      el.tabIndex = count ? 0 : -1;
    });
    $$<HTMLButtonElement>("[data-save]").forEach((button) => {
      const p = find(button.dataset.save!);
      const selected = saved.includes(button.dataset.save!);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute(
        "aria-label",
        (selected ? "حذف از علاقه‌مندی‌ها: " : "ذخیرهٔ ") +
          (p?.name || "محصول"),
      );
    });
    $$("[data-saved-card]").forEach((el) =>
      el.toggleAttribute(
        "hidden",
        !saved.includes((el as HTMLElement).dataset.savedCard!),
      ),
    );
    $("[data-saved-empty]")?.toggleAttribute("hidden", saved.length > 0);
    renderCheckout();
  }
  function renderCheckout() {
    $$("[data-summary-lines]").forEach((el) => (el.innerHTML = summaryLines()));
    $$("[data-checkout-totals]").forEach(
      (el) => (el.innerHTML = totalsHTML(totals())),
    );
    if (!bag.length && $("[data-checkout]")) {
      $("[data-checkout-empty]")?.removeAttribute("hidden");
      $("[data-checkout-form]")?.setAttribute("hidden", "");
      $("[data-review]")?.setAttribute("hidden", "");
    }
  }
  const feedbackTimers = new WeakMap<
    HTMLButtonElement,
    ReturnType<typeof setTimeout>
  >();
  function feedback(button: HTMLButtonElement, message: string) {
    const prior = button.dataset.original || button.innerHTML;
    button.dataset.original = prior;
    const timer = feedbackTimers.get(button);
    if (timer) clearTimeout(timer);
    button.style.minWidth = button.getBoundingClientRect().width + "px";
    button.innerHTML = message;
    animate(button, [{ opacity: 0.4 }, { opacity: 1 }], 180);
    button.setAttribute("aria-label", message);
    feedbackTimers.set(
      button,
      setTimeout(() => {
        button.innerHTML = prior;
        button.removeAttribute("aria-label");
        button.style.minWidth = "";
      }, 1500),
    );
  }
  function add(id: string, option: string, quantity: number) {
    const p = find(id);
    if (
      !p ||
      !p.options.includes(option) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    )
      return false;
    const current = bag
      .filter((i) => i.id === id)
      .reduce((n, i) => n + i.quantity, 0);
    if (current + quantity > p.stock) {
      announce(
        "تنها " +
          number(p.stock) +
          " قطعه از " +
          p.name +
          " در این فروشگاه نمایشی موجود است.",
      );
      return false;
    }
    const existing = bag.find((i) => i.id === id && i.option === option);
    if (existing) existing.quantity += quantity;
    else bag.push({ id, option, quantity });
    write(cartKey, bag);
    render();
    announce(p.name + " به سبد اضافه شد.");
    $$(".au-count").forEach((el) =>
      animate(
        el,
        [
          { transform: "scale(1)" },
          { transform: "scale(1.2)" },
          { transform: "scale(1)" },
        ],
        260,
      ),
    );
    return true;
  }
  function openDialog(id: string) {
    const dialog = $<HTMLDialogElement>("#" + id);
    if (!dialog || dialog.open) return;
    $$<HTMLDialogElement>("dialog[open]").forEach((d) => d.close());
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }
  function closeDialog(dialog: HTMLDialogElement) {
    dialog.close();
    document.body.style.overflow = "";
  }
  $$<HTMLDialogElement>("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      if (!$("dialog[open]")) document.body.style.overflow = "";
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        const e = event as MouseEvent;
        if (
          e.clientX < box.left ||
          e.clientX > box.right ||
          e.clientY < box.top ||
          e.clientY > box.bottom
        )
          closeDialog(dialog);
      }
    });
  });
  function quick(id: string) {
    const p = find(id);
    const body = $("[data-quick-body]");
    if (!p || !body) return;
    body.innerHTML =
      '<div class="au-quick-grid"><img src="' +
      escape(p.image) +
      '" width="640" height="640" alt="' +
      escape(p.name) +
      '"/><div><h2 id="au-quick-title">' +
      escape(p.name) +
      '</h2><span class="au-quick-price">' +
      money(p.price) +
      "</span><p>" +
      escape(p.description) +
      '</p><form data-product-form="' +
      escape(p.id) +
      '"><label>' +
      escape(p.optionLabel) +
      '<select name="option" required>' +
      (p.options.length > 1
        ? '<option value="" selected disabled>یک گزینه انتخاب کنید</option>'
        : "") +
      p.options
        .map(
          (o) =>
            '<option value="' +
            escape(o) +
            '">' +
            escape(optionText(o)) +
            "</option>",
        )
        .join("") +
      '</select></label><input type="hidden" name="quantity" value="1"/><button class="au-button" type="submit">افزودن به سبد ' +
      icon("plus") +
      '</button><p class="au-form-feedback" data-feedback role="status"></p></form><a class="au-text-link" href="' +
      escape(p.href) +
      '">مشاهدهٔ تمام جزئیات ' +
      icon("arrow") +
      "</a></div></div>";
    openDialog("au-quick");
  }
  document.addEventListener("click", (event) => {
    const target = (event.target as Element).closest<HTMLElement>("button,a");
    if (!target) return;
    if (target.hasAttribute("data-open")) openDialog(target.dataset.open!);
    if (target.hasAttribute("data-close")) {
      const dialog = target.closest<HTMLDialogElement>("dialog");
      if (dialog) closeDialog(dialog);
    }
    if (target.hasAttribute("data-quick")) quick(target.dataset.quick!);
    if (target.hasAttribute("data-save")) {
      const id = target.dataset.save!;
      if (!find(id)) return;
      saved = saved.includes(id)
        ? saved.filter((x) => x !== id)
        : [...saved, id];
      write(savedKey, saved);
      render();
      announce(
        find(id)!.name +
          (saved.includes(id) ? " ذخیره شد." : " از علاقه‌مندی‌ها حذف شد."),
      );
    }
    if (target.hasAttribute("data-remove")) {
      const id = target.dataset.remove!;
      const item = bag.find((i) => key(i) === id);
      bag = bag.filter((i) => key(i) !== id);
      write(cartKey, bag);
      render();
      announce((item ? find(item.id)!.name : "محصول") + " از سبد حذف شد.");
      $<HTMLAnchorElement>(
        "[data-bag-lines] .au-line-info a, [data-bag-lines] .au-empty a",
      )?.focus({ preventScroll: true });
    }
    if (target.hasAttribute("data-quantity")) {
      const k = target.dataset.key!;
      const item = bag.find((i) => key(i) === k);
      const delta = Number(target.dataset.quantity);
      if (!item) return;
      const p = find(item.id)!;
      const used = bag
        .filter((i) => i.id === item.id)
        .reduce((n, i) => n + i.quantity, 0);
      if (item.quantity + delta < 1 || used + delta > p.stock) return;
      const scope =
        target.closest("[data-bag-lines]")?.getAttribute("data-bag-lines") ||
        "page";
      item.quantity += delta;
      write(cartKey, bag);
      render();
      announce(p.name + "؛ تعداد به‌روز شد.");
      const newButton = $<HTMLButtonElement>(
        '[data-bag-lines="' +
          scope +
          '"] [data-line-key="' +
          CSS.escape(k) +
          '"] [data-quantity="' +
          delta +
          '"]',
      );
      if (newButton && !newButton.disabled)
        newButton.focus({ preventScroll: true });
      else
        $<HTMLAnchorElement>(
          '[data-bag-lines="' +
            scope +
            '"] [data-line-key="' +
            CSS.escape(k) +
            '"] a',
        )?.focus({ preventScroll: true });
    }
    if (target.getAttribute("aria-disabled") === "true") event.preventDefault();
  });
  document.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (form.hasAttribute("data-product-form")) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const success = add(
        form.dataset.productForm!,
        String(values.get("option")),
        Number(values.get("quantity") || 1),
      );
      const message = success
        ? "به سبد اضافه شد."
        : "این تعداد از موجودی نمایشی بیشتر است. سبد را بررسی کنید.";
      const local = $("[data-feedback]", form);
      if (local) local.textContent = message;
      const button = $<HTMLButtonElement>('button[type="submit"]', form);
      if (success && button) feedback(button, "به سبد اضافه شد ✓");
    }
    if (form.hasAttribute("data-contact-form")) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const feedbackNode = $("[data-contact-feedback]", form);
      if (feedbackNode)
        feedbackNode.textContent =
          "پیش‌نمایش درخواست کامل شد. پیام ارسال یا ذخیره نشده است.";
      form.reset();
    }
  });
  const checkoutForm = $<HTMLFormElement>("[data-checkout-form]");
  function syncCheckout() {
    if (!checkoutForm) return;
    const values = new FormData(checkoutForm);
    shipping = values.get("shipping") === "express" ? "express" : "standard";
    gift = values.get("gift") === "on";
    if (
      discount &&
      String(values.get("coupon")).trim().toUpperCase() !== "AURUM10"
    ) {
      discount = false;
      const node = $("[data-coupon-feedback]");
      if (node)
        node.textContent =
          "کد تغییر کرد. برای به‌روزرسانی سفارش دوباره آن را اعمال کنید.";
    }
    renderCheckout();
  }
  checkoutForm?.addEventListener("change", syncCheckout);
  $("[data-apply-code]")?.addEventListener("click", () => {
    if (!checkoutForm) return;
    const code = String(new FormData(checkoutForm).get("coupon") || "")
      .trim()
      .toUpperCase();
    discount = code === "AURUM10";
    const node = $("[data-coupon-feedback]");
    if (node)
      node.textContent = discount
        ? "کد AURUM10 اعمال شد؛ ۱۰٪ تخفیف برای سفارش آزمایشی."
        : "این کد در دسترس نیست. AURUM10 را امتحان کنید.";
    syncCheckout();
  });
  checkoutForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!checkoutForm.reportValidity() || !bag.length) return;
    syncCheckout();
    const values = new FormData(checkoutForm);
    const contact = $(".au-review-contact");
    if (contact)
      contact.innerHTML =
        "<h3>تماس و نشانی</h3><p>" +
        escape(String(values.get("name"))) +
        "<br/>" +
        escape(String(values.get("email"))) +
        "<br/>" +
        escape(String(values.get("address"))) +
        "<br/>" +
        escape(String(values.get("city"))) +
        " · " +
        escape(String(values.get("postal"))) +
        "</p><p>" +
        (shipping === "express" ? "ارسال سریع" : "ارسال عادی") +
        (gift ? " · بسته‌بندی هدیه" : "") +
        "</p>";
    checkoutForm.hidden = true;
    const review = $("[data-review]");
    review?.removeAttribute("hidden");
    if (review)
      animate(
        review,
        [
          { opacity: 0, transform: "translateX(-12px)" },
          { opacity: 1, transform: "none" },
        ],
        260,
      );
    $('[data-step="details"]')?.removeAttribute("aria-current");
    $('[data-step="review"]')?.setAttribute("aria-current", "step");
    $<HTMLElement>("#au-review-title")?.focus({ preventScroll: true });
  });
  $("[data-back-details]")?.addEventListener("click", () => {
    if (!checkoutForm) return;
    checkoutForm.hidden = false;
    animate(
      checkoutForm,
      [
        { opacity: 0, transform: "translateX(12px)" },
        { opacity: 1, transform: "none" },
      ],
      260,
    );
    $("[data-review]")?.setAttribute("hidden", "");
    $('[data-step="review"]')?.removeAttribute("aria-current");
    $('[data-step="details"]')?.setAttribute("aria-current", "step");
    $<HTMLInputElement>('input[name="name"]', checkoutForm)?.focus({
      preventScroll: true,
    });
  });
  $("[data-place-order]")?.addEventListener("click", () => {
    if (placing || !bag.length) return;
    placing = true;
    const random = [...crypto.getRandomValues(new Uint8Array(4))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const receipt: Receipt = {
      ref: "AU-" + random,
      time: Date.now(),
      items: bag.map((i) => ({ ...i })),
      discount,
      shipping,
      gift,
      currency: "toman",
      prices: Object.fromEntries(bag.map((i) => [i.id, find(i.id)!.price])),
    };
    let stored = false;
    try {
      sessionStorage.setItem(receiptKey, JSON.stringify(receipt));
      stored = true;
    } catch {}
    bag = [];
    write(cartKey, bag);
    announce("سفارش آزمایشی ثبت شد.");
    if (stored) location.assign(base + "order/");
    else {
      const section = $("[data-checkout]");
      if (section) section.innerHTML = receiptHTML(receipt);
      const heading = $(".au-checkout-intro h1");
      if (heading) heading.textContent = "انتخابی به سلیقهٔ شما.";
    }
  });
  function receiptHTML(receipt: Receipt) {
    const legacy = receipt.currency !== "toman";
    const prices = legacy
      ? {
          "lume-ring": 980,
          "cove-earrings": 1180,
          "sol-necklace": 950,
          "halo-band": 1240,
          "line-earrings": 760,
          "arc-necklace": 860,
        }
      : receipt.prices;
    const format = legacy ? (n: number) => number(n) + " دلار" : money;
    const t = totals(
      receipt.items,
      receipt.discount,
      receipt.shipping,
      receipt.gift,
      prices,
      legacy,
    );
    return (
      '<div class="au-receipt-card"><div class="au-receipt-top"><div><h2>سفارش آزمایشی ثبت شد.</h2><p>' +
      "<bdi>" +
      escape(receipt.ref) +
      "</bdi>" +
      "</p></div><p>" +
      new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
        receipt.time,
      ) +
      "</p></div>" +
      lines(receipt.items, false, prices, format) +
      (legacy ? '<p class="au-note">رسید نسخهٔ قبلی · مبالغ به دلار</p>' : "") +
      '<div class="au-totals">' +
      totalsHTML(t, format) +
      '</div><p class="au-note">پرداخت، ارسال ایمیل یا تحویل واقعی انجام نشده است. اطلاعات تماس در این رسید ثبت نمی‌شوند.</p><a class="au-button" href="' +
      base +
      'shop/">ادامهٔ انتخاب ' +
      icon("arrow") +
      "</a></div>"
    );
  }
  if ($("[data-receipt]")) {
    try {
      const r = JSON.parse(
        sessionStorage.getItem(receiptKey) || "null",
      ) as Receipt;
      if (
        r &&
        /^AU-[A-F0-9]{8}$/.test(r.ref) &&
        Number.isFinite(r.time) &&
        Array.isArray(r.items) &&
        cleanCart(r.items).length === r.items.length &&
        ["standard", "express"].includes(r.shipping) &&
        (r.currency !== "toman" ||
          (r.prices &&
            r.items.every(
              (i) => Number.isFinite(r.prices![i.id]) && r.prices![i.id] > 0,
            )))
      ) {
        r.items = cleanCart(r.items);
        r.discount = r.discount === true;
        r.gift = r.gift === true;
        $("[data-receipt]")!.innerHTML = receiptHTML(r);
      }
    } catch {}
  }
  const catalog = $("[data-catalog]");
  if (catalog) {
    const form = $<HTMLFormElement>("form", catalog)!;
    const grid = $("[data-product-grid]", catalog)!;
    const cards = $$<HTMLElement>("[data-product-card]", grid);
    function applyFilters(updateURL = true) {
      const values = new FormData(form);
      const query = normalizeSearch(String(values.get("q") || "").trim());
      const positions = capture(cards.filter((c) => !c.hidden));
      const category = String(values.get("category") || "all");
      const sort = String(values.get("sort") || "featured");
      const visible = cards.filter((card) => {
        const matches =
          (!query || card.dataset.term!.includes(query)) &&
          (category === "all" || card.dataset.category === category);
        card.hidden = !matches;
        return matches;
      });
      if (sort === "price-low")
        visible.sort(
          (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
        );
      else if (sort === "price-high")
        visible.sort(
          (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
        );
      else if (sort === "name")
        visible.sort((a, b) => a.dataset.term!.localeCompare(b.dataset.term!));
      visible.forEach((card, index) => {
        if (grid.children[index] !== card)
          grid.insertBefore(card, grid.children[index] || null);
      });
      flow(visible, positions);
      const count = $("[data-result-count]", catalog!);
      if (count) count.textContent = number(visible.length) + " محصول";
      $("[data-empty-filter]", catalog!)?.toggleAttribute(
        "hidden",
        visible.length > 0,
      );
      if (updateURL) {
        const params = new URLSearchParams();
        if (query) params.set("q", String(values.get("q")).trim());
        if (category !== "all") params.set("category", category);
        if (sort !== "featured") params.set("sort", sort);
        history.replaceState(
          null,
          "",
          location.pathname + (params.size ? "?" + params.toString() : ""),
        );
      }
    }
    function fromURL() {
      const params = new URLSearchParams(location.search);
      $<HTMLInputElement>('[name="q"]', form)!.value = params.get("q") || "";
      const cat = params.get("category") || "all";
      $<HTMLSelectElement>('[name="category"]', form)!.value = [
        "all",
        "rings",
        "earrings",
        "necklaces",
      ].includes(cat)
        ? cat
        : "all";
      const sort = params.get("sort") || "featured";
      $<HTMLSelectElement>('[name="sort"]', form)!.value = [
        "featured",
        "price-low",
        "price-high",
        "name",
      ].includes(sort)
        ? sort
        : "featured";
      applyFilters(false);
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });
    form.addEventListener("input", () => applyFilters());
    form.addEventListener("change", () => applyFilters());
    $$("[data-reset-filter]", catalog).forEach((button) =>
      button.addEventListener("click", () => {
        form.reset();
        applyFilters();
        $<HTMLInputElement>('[name="q"]', form)?.focus({ preventScroll: true });
      }),
    );
    window.addEventListener("popstate", fromURL);
    fromURL();
  }
  $$<HTMLFieldSetElement>("[data-client-enable]").forEach(
    (field) => (field.disabled = false),
  );
  window.addEventListener("storage", (event) => {
    if (event.key === cartKey || event.key === savedKey) {
      bag = cleanCart(read(cartKey));
      saved = cleanSaved(read(savedKey));
      render();
    }
  });
  render();
  const reveals = $$<HTMLElement>("[data-au-reveal]");
  const active = new Map<HTMLElement, Animation>();
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          if (motion.matches) continue;
          const animation = el.animate(
            [
              { opacity: 0, transform: "translateY(14px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" },
          );
          active.set(el, animation);
          animation.finished.catch(() => {}).finally(() => active.delete(el));
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    reveals.forEach((el) => observer.observe(el));
    motion.addEventListener("change", () => {
      if (motion.matches) {
        active.forEach((animation) => animation.cancel());
        active.clear();
      }
    });
  }
}
