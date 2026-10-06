import {
  garmentStock,
  garments,
  sizes,
  garmentImage,
  money,
} from "../data/brands";
import { url } from "../config";
type Line = { id: string; color: string; size: string; quantity: number };
const key = "rift-cart-v10";
const product = (id: string) => garments.find((x) => x.id === id);
function read(): Line[] {
  try {
    const a = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(a)
      ? a
          .filter(
            (x) =>
              product(x.id)?.colors.some((c) => c.id === x.color) &&
              sizes.includes(x.size) &&
              garmentStock[x.id][x.size] >= x.quantity &&
              Number.isInteger(x.quantity) &&
              x.quantity > 0 &&
              x.quantity <= 9,
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
let cart = read();
const sum = () =>
  cart.reduce((s, l) => s + product(l.id)!.price * l.quantity, 0);
const dialog = document.querySelector<HTMLDialogElement>("[data-cart-dialog]");
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    const status = document.querySelector("[data-cart-status]");
    if (status) status.textContent = "سبد فقط تا پایان این صفحه حفظ می‌شود.";
  }
  render();
}
function lineElement(l: Line, editable = false) {
  const p = product(l.id)!;
  const c = p.colors.find((c) => c.id === l.color)!;
  const row = document.createElement("article");
  row.className = "cart-line";
  const im = document.createElement("img");
  im.src = url(garmentImage(l.id, l.color));
  im.alt = p.name + " " + c.label;
  const body = document.createElement("div");
  const h = document.createElement("h3");
  h.textContent = p.name;
  const meta = document.createElement("p");
  meta.textContent = `${c.label} / ${l.size} / ${l.quantity.toLocaleString("fa-IR")} عدد`;
  const price = document.createElement("p");
  price.textContent = money(p.price * l.quantity);
  body.append(h, meta, price);
  if (editable) {
    const controls = document.createElement("div");
    controls.className = "cart-quantity";
    for (const [act, txt, label] of [
      ["minus", "−", "کاهش تعداد"],
      ["plus", "+", "افزایش تعداد"],
      ["remove", "حذف", "حذف محصول"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = txt;
      b.setAttribute("aria-label", `${label} ${p.name} ${c.label} ${l.size}`);
      b.dataset.action = act;
      b.dataset.line = [l.id, l.color, l.size].join(":");
      if (act === "plus") b.disabled = l.quantity >= garmentStock[l.id][l.size];
      if (act === "minus") b.disabled = l.quantity <= 1;
      if (act === "remove") b.className = "remove";
      controls.append(b);
    }
    body.append(controls);
  }
  row.append(im, body);
  return row;
}
function render() {
  document
    .querySelectorAll("[data-cart-count]")
    .forEach(
      (x) =>
        (x.textContent = cart
          .reduce((s, l) => s + l.quantity, 0)
          .toLocaleString("fa-IR")),
    );
  const lines = document.querySelector("[data-cart-lines]");
  if (lines) {
    lines.replaceChildren(...cart.map((l) => lineElement(l, true)));
    if (!cart.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "هنوز محصولی انتخاب نکرده‌اید.";
      lines.append(p);
    }
  }
  document
    .querySelectorAll("[data-cart-total]")
    .forEach((x) => (x.textContent = money(sum())));
  const bottom = document.querySelector<HTMLElement>("[data-cart-bottom]");
  if (bottom) bottom.hidden = !cart.length;
  if (
    document.querySelector<HTMLElement>("[data-order-success]")?.hidden !==
    false
  ) {
    document
      .querySelector("[data-checkout-lines]")
      ?.replaceChildren(...cart.map((l) => lineElement(l)));
    const total = document.querySelector("[data-checkout-total]");
    if (total) total.textContent = money(sum());
  }
  const form = document.querySelector<HTMLFormElement>("[data-checkout-form]");
  const empty = document.querySelector<HTMLElement>("[data-checkout-empty]");
  if (
    form &&
    empty &&
    document.querySelector<HTMLElement>("[data-order-success]")?.hidden !==
      false
  ) {
    form.hidden = !cart.length;
    empty.hidden = !!cart.length;
  }
}
render();
// A look is committed atomically: neither garment is added on a partial selection.
document.querySelectorAll<HTMLElement>("[data-lookbook]").forEach(look => {
  const rows = [...look.querySelectorAll<HTMLElement>("[data-look-item]")];
  const choices = new Map(rows.map(row => {
    const p = product(row.dataset.lookItem!)!;
    return [p.id, {color: p.colors[0].id, size: ""}];
  }));
  const add = look.querySelector<HTMLButtonElement>("[data-look-add]")!;
  const status = look.querySelector<HTMLElement>("[data-look-status]")!;
  add.disabled = false;
  rows.forEach(row => {
    const p = product(row.dataset.lookItem!)!;
    const selected = choices.get(p.id)!;
    let revision = 0;
    row.querySelectorAll<HTMLButtonElement>("[data-look-color]").forEach(b => b.addEventListener("click", async () => {
      const color = p.colors.find(c=>c.id===b.dataset.lookColor);
      if(!color) return;
      selected.color = color.id;
      row.querySelectorAll("[data-look-color]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
      row.querySelector("[data-look-color-label]")!.textContent = color.label;
      const token = ++revision;
      const image = row.querySelector<HTMLImageElement>("[data-look-image]")!;
      const next = new Image(); next.src = url(garmentImage(p.id,color.id));
      try { await next.decode(); } catch { return; }
      if(token!==revision) return;
      image.getAnimations().forEach(a=>a.cancel());
      image.src = next.src; image.alt = `${p.name} · ${color.label}`;
      if(document.documentElement.dataset.demoMotion!=="reduce") image.animate([{opacity:.45},{opacity:1}],{duration:180});
    }));
    row.querySelectorAll<HTMLButtonElement>("[data-look-size]").forEach(b=>b.addEventListener("click",()=>{
      if(!sizes.includes(b.dataset.lookSize!) || !garmentStock[p.id][b.dataset.lookSize!]) return;
      selected.size=b.dataset.lookSize!;
      row.querySelectorAll("[data-look-size]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
      status.dataset.state="ready";
      status.textContent=rows.every(r=>choices.get(r.dataset.lookItem!)!.size)?"ترکیب شما آمادهٔ افزودن است.":"اندازهٔ محصول دیگر را هم انتخاب کن.";
    }));
  });
  add.addEventListener("click",()=>{
    // ASVS 2.2.1: validate known variants, sizes and stock before mutating any line.
    for(const row of rows){
      const p=product(row.dataset.lookItem!)!; const c=choices.get(p.id)!;
      if(!p.colors.some(v=>v.id===c.color)||!sizes.includes(c.size)||!garmentStock[p.id][c.size]){
        status.dataset.state="error"; status.textContent=`اندازهٔ ${p.name} را انتخاب کن.`;
        row.querySelector<HTMLButtonElement>("[data-look-size]:not(:disabled)")?.focus(); return;
      }
      const line=cart.find(l=>l.id===p.id&&l.color===c.color&&l.size===c.size);
      if(line&&line.quantity>=Math.min(9,garmentStock[p.id][c.size])){
        status.dataset.state="error";status.textContent=`${p.name} به سقف موجودی فرضی رسیده است. ترکیب اضافه نشد.`;return;
      }
    }
    rows.forEach(row=>{
      const id=row.dataset.lookItem!;const c=choices.get(id)!;
      const line=cart.find(l=>l.id===id&&l.color===c.color&&l.size===c.size);
      if(line) line.quantity++; else cart.push({id,...c,quantity:1});
    });
    save();status.dataset.state="ready";status.textContent="هر دو محصول به سبد اضافه شدند.";
    dialog?.showModal();
  });
  addEventListener("brand-motion",()=>look.querySelectorAll("img").forEach(i=>i.getAnimations().forEach(a=>a.cancel())));
});
document
  .querySelectorAll("[data-cart-open]")
  .forEach((b) => b.addEventListener("click", () => dialog?.showModal()));
document
  .querySelector("[data-cart-close]")
  ?.addEventListener("click", () => dialog?.close());
dialog?.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>("[data-action]");
  if (!b) return;
  const index = cart.findIndex(
    (l) => [l.id, l.color, l.size].join(":") === b.dataset.line,
  );
  if (index < 0) return;
  const id = b.dataset.line!,
    act = b.dataset.action;
  if (act === "remove") cart.splice(index, 1);
  else
    cart[index].quantity = Math.min(
      garmentStock[cart[index].id][cart[index].size],
      Math.max(1, cart[index].quantity + (act === "plus" ? 1 : -1)),
    );
  save();
  const next = dialog.querySelector<HTMLButtonElement>(
    `[data-line="${id}"][data-action="${act}"]`,
  );
  (next && !next.disabled
    ? next
    : dialog.querySelector<HTMLButtonElement>("[data-action]:not(:disabled)") ||
      dialog.querySelector<HTMLButtonElement>("[data-cart-close]")
  )?.focus();
  const status = document.querySelector("[data-cart-status]");
  if (status)
    status.textContent =
      act === "remove" ? "محصول از سبد حذف شد." : "تعداد به‌روز شد.";
});
window.addEventListener("storage", (e) => {
  if (e.key === key) {
    cart = read();
    save();
    const s = document.querySelector("[data-order-status]");
    if (s)
      s.textContent =
        "سبد در تب دیگر تغییر کرد؛ پیش از ثبت دوباره بازبینی کنید.";
    const review = document.querySelector<HTMLElement>(
        "[data-checkout-review]",
      ),
      edit = document.querySelector<HTMLElement>("[data-checkout-edit]");
    if (review && edit) {
      review.hidden = true;
      edit.hidden = false;
    }
  }
});
const quickDialog = document.querySelector<HTMLDialogElement>("[data-quick-dialog]");
if (quickDialog) {
  let selected = garments[0], color = selected.colors[0].id, size = "";
  const image = quickDialog.querySelector<HTMLImageElement>("[data-quick-image]")!;
  const add = quickDialog.querySelector<HTMLButtonElement>("[data-quick-add]")!;
  const status = quickDialog.querySelector<HTMLElement>("[data-quick-status]")!;
  const details = quickDialog.querySelector<HTMLAnchorElement>("[data-quick-details]")!;
  function selectColor(id: string) {
    // ASVS 1.2.1, 1.2.2: only catalog variants can generate image and detail URLs.
    const variant = selected.colors.find((c) => c.id === id);
    if (!variant) return;
    color = id;
    image.src = url(garmentImage(selected.id, color));
    image.alt = `${selected.name} · ${variant.label}`;
    quickDialog!.querySelector("[data-quick-color-label]")!.textContent = ` · ${variant.label}`;
    quickDialog!.querySelectorAll<HTMLButtonElement>("[data-quick-color]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.quickColor === color)));
    const target = new URL(url(`demo/rift/products/${selected.id}/`), location.origin);
    target.searchParams.set("color", color);
    details.href = target.href;
  }
  document.querySelectorAll<HTMLButtonElement>("[data-quick-view]").forEach((trigger) => {
    trigger.disabled = !product(trigger.dataset.quickView || "");
    trigger.addEventListener("click", () => {
      const p = product(trigger.dataset.quickView || "");
      if (!p) return;
      selected = p;
      size = "";
      add.textContent = "افزودن به سبد";
      status.dataset.state = "";
      status.textContent = "برای افزودن، اندازهٔ موجود را انتخاب کنید.";
      quickDialog!.querySelector("[data-quick-code]")!.textContent = p.en;
      quickDialog!.querySelector("[data-quick-title]")!.textContent = p.name;
      quickDialog!.querySelector("[data-quick-description]")!.textContent = `${p.desc} ${p.fabric} · ${p.fit}`;
      quickDialog!.querySelector("[data-quick-price]")!.textContent = money(p.price);
      const colors = quickDialog!.querySelector("[data-quick-colors]")!;
      colors.replaceChildren();
      p.colors.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.quickColor = c.id;
        b.setAttribute("aria-label", c.label);
        b.style.setProperty("--swatch", c.hex);
        const swatch = document.createElement("span");
        const label = document.createElement("small");
        label.textContent = c.label;
        b.append(swatch, label);
        b.addEventListener("click", () => selectColor(c.id));
        colors.append(b);
      });
      const options = quickDialog!.querySelector("[data-quick-sizes]")!;
      options.replaceChildren();
      sizes.forEach((s) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = s;
        b.disabled = !garmentStock[p.id][s];
        b.setAttribute("aria-label", `${s}${b.disabled ? " · ناموجود" : ""}`);
        b.setAttribute("aria-pressed", "false");
        b.dataset.quickSize = s;
        b.addEventListener("click", () => {
          size = s;
          options.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          status.dataset.state = "ready";
          status.textContent = `اندازهٔ ${s} انتخاب شد.`;
          add.textContent = `افزودن به سبد · ${s}`;
        });
        options.append(b);
      });
      selectColor(p.colors[0].id);
      quickDialog!.showModal();
    });
  });
  quickDialog.querySelector("[data-quick-close]")!.addEventListener("click", () => quickDialog.close());
  add.addEventListener("click", () => {
    // ASVS 2.2.1: the demo still enforces catalog sizes and available stock.
    if (!sizes.includes(size) || !garmentStock[selected.id][size]) {
      status.dataset.state = "error";
      status.textContent = "ابتدا یکی از اندازه‌های موجود را انتخاب کنید.";
      quickDialog.querySelector<HTMLButtonElement>("[data-quick-size]:not(:disabled)")?.focus();
      return;
    }
    const line = cart.find((l) => l.id === selected.id && l.color === color && l.size === size);
    if (line && line.quantity >= garmentStock[selected.id][size]) {
      status.dataset.state = "error";
      status.textContent = "تعداد انتخاب‌شده به موجودی فرضی این اندازه رسیده است.";
      return;
    }
    if (line) line.quantity++;
    else cart.push({id: selected.id, color, size, quantity: 1});
    save();
    quickDialog.close();
    dialog?.showModal();
  });
}
const app = document.querySelector<HTMLElement>("[data-product]");
if (app) {
  const p = product(app.dataset.product!)!;
  let color = p.colors[0].id,
    size = "";
  const status = app.querySelector<HTMLElement>("[data-product-status]")!;
  const image = app.querySelector<HTMLImageElement>("[data-product-image]")!;
  const zoom = document.querySelector<HTMLImageElement>("[data-zoom-image]")!;
  const add = app.querySelector<HTMLButtonElement>("[data-add-cart]")!;
  add.disabled = false;
  function chooseColor(id: string) {
    // ASVS 1.2.1: accept known variants and render labels through textContent.
    const c = p.colors.find((c) => c.id === id);
    if (!c) return;
    color = id;
    image.src = url(garmentImage(p.id, id));
    image.alt = p.name + " · " + c.label;
    zoom.src = image.src;
    zoom.alt = image.alt;
    image.getAnimations().forEach(a=>a.cancel());
    if(document.documentElement.dataset.demoMotion!=="reduce") image.animate([{opacity:.45},{opacity:1}],{duration:180});
    app!.querySelector("[data-color-name]")!.textContent = c.label;
    app!
      .querySelectorAll<HTMLElement>("[data-product-color],[data-product-thumb]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String((b.dataset.productColor || b.dataset.productThumb) === id)),
      );
  }
  const requestedColor = new URLSearchParams(location.search).get("color");
  chooseColor(requestedColor || color);
  addEventListener("brand-motion",()=>image.getAnimations().forEach(a=>a.cancel()));
  app
    .querySelectorAll<HTMLElement>("[data-product-color],[data-product-thumb]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        chooseColor(b.dataset.productColor || b.dataset.productThumb!),
      ),
    );
  app.querySelectorAll<HTMLElement>("[data-product-size]").forEach((b) =>
    b.addEventListener("click", () => {
      size = b.dataset.productSize!;
      app
        .querySelectorAll("[data-product-size]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      status.dataset.state = "ready";
      status.textContent = `اندازهٔ ${size} انتخاب شد.`;
      add.textContent = `افزودن به سبد · ${size}`;
    }),
  );
  add.addEventListener("click", () => {
    if (!size) {
      status.dataset.state = "error";
      status.textContent = "ابتدا اندازه را انتخاب کنید.";
      app
        .querySelector<HTMLButtonElement>("[data-product-size]:not(:disabled)")
        ?.focus();
      return;
    }
    const line = cart.find(
      (l) => l.id === p.id && l.color === color && l.size === size,
    );
    if (line && line.quantity >= garmentStock[p.id][size]) {
      status.textContent =
        "تعداد انتخاب‌شده به موجودی فرضی این اندازه رسیده است.";
      return;
    }
    if (line) line.quantity++;
    else cart.push({ id: p.id, color, size, quantity: 1 });
    save();
    status.textContent = `${p.name}، ${p.colors.find((c) => c.id === color)!.label}، ${size} به سبد اضافه شد.`;
    dialog?.showModal();
  });
  const zd = document.querySelector<HTMLDialogElement>("[data-image-dialog]");
  app
    .querySelector("[data-product-zoom]")
    ?.addEventListener("click", () => zd?.showModal());
  document
    .querySelector("[data-image-close]")
    ?.addEventListener("click", () => zd?.close());
}
const filter = document.querySelector<HTMLFormElement>("[data-catalog]");
if (filter) {
  const selects = [...filter.querySelectorAll<HTMLSelectElement>("select")];
  function restoreFilters() {
    const params = new URLSearchParams(location.search);
    selects.forEach((select) => {
      const value = params.get(select.name);
      select.value = value && [...select.options].some((option) => option.value === value) ? value : select.options[0].value;
    });
  }
  function apply() {
    const f = new FormData(filter!);
    const category = f.get("category"),
      color = f.get("color"),
      size = f.get("size"),
      budget = f.get("budget");
    let count = 0;
    const cards = [
      ...document.querySelectorAll<HTMLElement>("[data-product-card]"),
    ];
    cards.forEach((c) => {
      c.hidden =
        !(category === "all" || c.dataset.category === category) ||
        !(
          color === "all" ||
          c.dataset.colors!.split(" ").includes(String(color))
        );
      c.hidden =
        c.hidden ||
        !(
          size === "all" || c.dataset.sizes!.split(" ").includes(String(size))
        ) ||
        !(budget === "all" || Number(c.dataset.price) <= Number(budget));
      if (!c.hidden) count++;
    });
    const sort = f.get("sort");
    cards.sort((a, b) =>
      sort === "low"
        ? Number(a.dataset.price) - Number(b.dataset.price)
        : sort === "high"
          ? Number(b.dataset.price) - Number(a.dataset.price)
          : garments.findIndex((p) => p.price === Number(a.dataset.price)) -
            garments.findIndex((p) => p.price === Number(b.dataset.price)),
    );
    cards.forEach((c) =>
      document.querySelector("[data-catalog-grid]")?.append(c),
    );
    const active = selects.filter((select) => select.name !== "sort" && select.value !== "all").length;
    document.querySelector("[data-catalog-status]")!.textContent =
      `${count.toLocaleString("fa-IR")} محصول${active ? ` · ${active.toLocaleString("fa-IR")} فیلتر فعال` : " · تمام فرم‌های کالکشن"}`;
    document.querySelector<HTMLElement>("[data-catalog-empty]")!.hidden =
      count > 0;
  }
  function updateFilters() {
    apply();
    // ASVS 1.2.2: URLSearchParams encodes allowlisted select values.
    const target = new URL(location.href);
    selects.forEach((select) => {
      if (select.value === select.options[0].value) target.searchParams.delete(select.name);
      else target.searchParams.set(select.name, select.value);
    });
    history.replaceState(null, "", target);
  }
  restoreFilters();
  apply();
  filter.addEventListener("change", updateFilters);
  filter.addEventListener("reset", () => queueMicrotask(updateFilters));
  addEventListener("popstate", () => { restoreFilters(); apply(); });
  document
    .querySelector("[data-catalog-reset]")
    ?.addEventListener("click", () => filter.reset());
}
const checkout = document.querySelector<HTMLFormElement>(
  "[data-checkout-form]",
);
if (checkout) {
  const edit = checkout.querySelector<HTMLElement>("[data-checkout-edit]")!,
    review = checkout.querySelector<HTMLElement>("[data-checkout-review]")!,
    success = document.querySelector<HTMLElement>("[data-order-success]")!;
  checkout.querySelector<HTMLButtonElement>("[type=submit]")!.disabled = false;
  let snapshot = "";
  function steps(n: number) {
    document
      .querySelectorAll<HTMLElement>("[data-checkout-step]")
      .forEach((x) => {
        if (Number(x.dataset.checkoutStep) === n)
          x.setAttribute("aria-current", "step");
        else x.removeAttribute("aria-current");
      });
  }
  checkout.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!cart.length) return;
    let first: HTMLElement | undefined;
    for (const name of ["name", "phone", "address"]) {
      const input = checkout.elements.namedItem(name) as HTMLInputElement;
      const val = input.value
        .trim()
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      const valid =
        name === "phone"
          ? /^09\d{9}$/.test(val.replace(/[\s-]/g, ""))
          : val.length >= (name === "name" ? 2 : 10);
      input.setAttribute("aria-invalid", String(!valid));
      checkout.querySelector(`[data-checkout-error="${name}"]`)!.textContent =
        valid
          ? ""
          : name === "phone"
            ? "شمارهٔ آزمایشی را با ۱۱ رقم و شروع ۰۹ وارد کنید."
            : name === "name"
              ? "نام را با دست‌کم دو حرف وارد کنید."
              : "نشانی را با دست‌کم ده حرف وارد کنید.";
      if (!valid && !first) first = input;
    }
    if (first) {
      first.focus();
      return;
    }
    const list = checkout.querySelector("[data-order-review]")!;
    list.replaceChildren();
    for (const [label, key] of [
      ["نام", "name"],
      ["شماره", "phone"],
      ["نشانی", "address"],
    ]) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = (
        checkout.elements.namedItem(key) as HTMLInputElement
      ).value;
      list.append(dt, dd);
    }
    snapshot = JSON.stringify(cart);
    edit.hidden = true;
    review.hidden = false;
    steps(2);
    review.focus();
  });
  checkout.querySelector("[data-order-edit]")?.addEventListener("click", () => {
    review.hidden = true;
    edit.hidden = false;
    steps(1);
    (checkout.elements.namedItem("name") as HTMLElement).focus();
  });
  checkout
    .querySelector("[data-order-confirm]")
    ?.addEventListener("click", () => {
      if (snapshot !== JSON.stringify(read())) {
        cart = read();
        render();
        review.hidden = true;
        edit.hidden = false;
        steps(1);
        document.querySelector("[data-order-status]")!.textContent =
          "سبد تغییر کرده است. دوباره بازبینی کنید.";
        return;
      }
      document
        .querySelector("[data-order-receipt]")!
        .replaceChildren(...cart.map((l) => lineElement(l)));
      document.querySelector("[data-order-code]")!.textContent =
        "RIFT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      checkout.reset();
      checkout.hidden = true;
      success.hidden = false;
      checkout.querySelector("[data-order-review]")?.replaceChildren();
      const editBasket = document.querySelector<HTMLElement>(
        ".checkout-summary [data-cart-open]",
      );
      if (editBasket) editBasket.hidden = true;
      cart = [];
      save();
      document.querySelector<HTMLElement>("[data-checkout-empty]")!.hidden =
        true;
      steps(3);
      success.focus();
    });
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    cart = read();
    render();
  }
});
