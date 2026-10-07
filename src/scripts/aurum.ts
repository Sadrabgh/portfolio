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
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
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
  const sum = (items: Item[] = bag) =>
    items.reduce((total, i) => total + find(i.id)!.price * i.quantity, 0);
  function totals(
    items = bag,
    useDiscount = discount,
    delivery = shipping,
    wrapping = gift,
  ) {
    const subtotal = sum(items),
      reduction = useDiscount ? subtotal * 0.1 : 0;
    const deliveryCost = items.length
      ? delivery === "express"
        ? 35
        : subtotal - reduction >= 1500
          ? 0
          : 20
      : 0;
    const packaging = items.length && wrapping ? 15 : 0;
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
      arrow: "M4 12h15m-6-6 6 6-6 6",
    }[name] +
    '"/></svg>';
  const empty = () =>
    '<div class="au-empty"><h2>A little room for something good.</h2><p>Your bag is empty. Start with a piece you love.</p><a class="au-button" href="' +
    base +
    'shop/">Explore the collection ' +
    icon("arrow") +
    "</a></div>";
  function lines(items = bag, editable = true) {
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
          escape(item.option) +
          "</p><strong>" +
          money(p.price * item.quantity) +
          "</strong>" +
          (editable
            ? '<div class="au-line-tools"><div class="au-quantity"><button class="au-icon" data-quantity="-1" data-key="' +
              k +
              '" aria-label="Decrease ' +
              escape(p.name) +
              ' quantity"' +
              (item.quantity === 1 ? " disabled" : "") +
              ">" +
              icon("minus") +
              '</button><span aria-label="Quantity">' +
              item.quantity +
              '</span><button class="au-icon" data-quantity="1" data-key="' +
              k +
              '" aria-label="Increase ' +
              escape(p.name) +
              ' quantity"' +
              (bag
                .filter((i) => i.id === p.id)
                .reduce((n, i) => n + i.quantity, 0) >= p.stock
                ? " disabled"
                : "") +
              ">" +
              icon("plus") +
              "</button></div></div>"
            : "<p>Quantity " + item.quantity + "</p>") +
          "</div>" +
          (editable
            ? '<button class="au-icon" data-remove="' +
              k +
              '" aria-label="Remove ' +
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
          escape(i.option) +
          " · Qty " +
          i.quantity +
          "</small></span><strong>" +
          money(p.price * i.quantity) +
          "</strong></div>"
        );
      })
      .join("");
  function totalsHTML(t: ReturnType<typeof totals>) {
    return (
      '<div class="au-total-row"><span>Subtotal</span><strong>' +
      money(t.subtotal) +
      "</strong></div>" +
      (t.reduction
        ? '<div class="au-total-row"><span>AURUM10 · 10%</span><strong>−' +
          money(t.reduction) +
          "</strong></div>"
        : "") +
      '<div class="au-total-row"><span>Shipping</span><strong>' +
      (t.deliveryCost ? money(t.deliveryCost) : "Complimentary") +
      "</strong></div>" +
      (t.packaging
        ? '<div class="au-total-row"><span>Gift packaging</span><strong>' +
          money(t.packaging) +
          "</strong></div>"
        : "") +
      '<div class="au-total-row au-grand-total"><span>Total</span><strong>' +
      money(t.total) +
      "</strong></div>"
    );
  }
  function render() {
    const count = bag.reduce((n, i) => n + i.quantity, 0);
    $$("[data-bag-count]").forEach((el) => {
      el.textContent = String(count);
      if (el.classList.contains("au-count"))
        el.toggleAttribute("hidden", !count);
    });
    $$("[data-bag-lines]").forEach((el) => {
      el.innerHTML = bag.length ? lines() : empty();
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
        (selected ? "Unsave " : "Save ") + (p?.name || "piece"),
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
    button.innerHTML = message;
    button.setAttribute("aria-label", message);
    feedbackTimers.set(
      button,
      setTimeout(() => {
        button.innerHTML = prior;
        button.removeAttribute("aria-label");
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
        "Only " +
          p.stock +
          " pieces of " +
          p.name +
          " are available in this demo.",
      );
      return false;
    }
    const existing = bag.find((i) => i.id === id && i.option === option);
    if (existing) existing.quantity += quantity;
    else bag.push({ id, option, quantity });
    write(cartKey, bag);
    render();
    announce(p.name + " added to your bag.");
    if (!motion.matches)
      $$(".au-count").forEach((el) =>
        el.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.2)" },
            { transform: "scale(1)" },
          ],
          { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" },
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
        ? '<option value="" selected disabled>Choose an option</option>'
        : "") +
      p.options
        .map(
          (o) => '<option value="' + escape(o) + '">' + escape(o) + "</option>",
        )
        .join("") +
      '</select></label><input type="hidden" name="quantity" value="1"/><button class="au-button" type="submit">Add to bag ' +
      icon("plus") +
      '</button><p class="au-form-feedback" data-feedback role="status"></p></form><a class="au-text-link" href="' +
      escape(p.href) +
      '">See all details ' +
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
          (saved.includes(id) ? " saved." : " removed from saved pieces."),
      );
    }
    if (target.hasAttribute("data-remove")) {
      const id = target.dataset.remove!;
      const item = bag.find((i) => key(i) === id);
      bag = bag.filter((i) => key(i) !== id);
      write(cartKey, bag);
      render();
      announce(
        (item ? find(item.id)!.name : "Piece") + " removed from your bag.",
      );
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
      announce(p.name + " quantity updated.");
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
        ? "Added to your bag."
        : "That quantity exceeds the available pieces. Review your bag.";
      const local = $("[data-feedback]", form);
      if (local) local.textContent = message;
      const button = $<HTMLButtonElement>('button[type="submit"]', form);
      if (success && button) feedback(button, "Added to bag ✓");
    }
    if (form.hasAttribute("data-contact-form")) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const feedbackNode = $("[data-contact-feedback]", form);
      if (feedbackNode)
        feedbackNode.textContent =
          "Request preview complete. Nothing was sent or saved.";
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
        node.textContent = "Code changed. Apply it again to update your order.";
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
        ? "AURUM10 applied. A little 10% off this demo order."
        : "That code is not available. Try AURUM10.";
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
        "<h3>Contact & delivery</h3><p>" +
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
        (shipping === "express" ? "Express delivery" : "Standard delivery") +
        (gift ? " · Gift packaging" : "") +
        "</p>";
    checkoutForm.hidden = true;
    $("[data-review]")?.removeAttribute("hidden");
    $('[data-step="details"]')?.removeAttribute("aria-current");
    $('[data-step="review"]')?.setAttribute("aria-current", "step");
    $<HTMLElement>("#au-review-title")?.focus({ preventScroll: true });
  });
  $("[data-back-details]")?.addEventListener("click", () => {
    if (!checkoutForm) return;
    checkoutForm.hidden = false;
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
    };
    let stored = false;
    try {
      sessionStorage.setItem(receiptKey, JSON.stringify(receipt));
      stored = true;
    } catch {}
    bag = [];
    write(cartKey, bag);
    announce("Demo order complete.");
    if (stored) location.assign(base + "order/");
    else {
      const section = $("[data-checkout]");
      if (section) section.innerHTML = receiptHTML(receipt);
      const heading = $(".au-checkout-intro h1");
      if (heading) heading.textContent = "A little well chosen.";
    }
  });
  function receiptHTML(receipt: Receipt) {
    const t = totals(
      receipt.items,
      receipt.discount,
      receipt.shipping,
      receipt.gift,
    );
    return (
      '<div class="au-receipt-card"><div class="au-receipt-top"><div><h2>Demo order complete.</h2><p>' +
      escape(receipt.ref) +
      "</p></div><p>" +
      new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        receipt.time,
      ) +
      "</p></div>" +
      lines(receipt.items, false) +
      '<div class="au-totals">' +
      totalsHTML(t) +
      '</div><p class="au-note">No payment, email or delivery took place. Contact details are not included in this receipt.</p><a class="au-button" href="' +
      base +
      'shop/">Keep exploring ' +
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
        ["standard", "express"].includes(r.shipping)
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
      const query = String(values.get("q") || "")
        .trim()
        .toLowerCase();
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
      visible.forEach((card) => grid.append(card));
      const count = $("[data-result-count]", catalog!);
      if (count)
        count.textContent =
          visible.length + " " + (visible.length === 1 ? "piece" : "pieces");
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
