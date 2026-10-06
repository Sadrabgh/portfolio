import { avanUrl, photoProps } from "./paths";
import {
  formatMoney,
  categories,
  minimumPrice,
  inStock,
} from "../../data/avan";
import type { AudioProduct, Variant, Specification } from "../../data/avan";
export const optional = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
) => root.querySelector<T>(selector);
export const required = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T => {
  const value = optional<T>(selector, root);
  if (!value) throw Error("Missing AVAN element " + selector);
  return value;
};
// ASVS 1.2.1: user-visible dynamic strings use textContent; no user HTML is interpreted.
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
export function button(
  text: string,
  attribute: string,
  value = "",
  className = "btn secondary",
) {
  const node = element("button", className, text);
  node.type = "button";
  node.setAttribute(attribute, value);
  return node;
}
export function link(text: string, path: string, className = "") {
  const node = element("a", className, text);
  node.href = avanUrl(path);
  return node;
}
export function image(
  source: string,
  alt: string,
  className = "product-art",
  sizes = "160px",
) {
  const node = element("img", className);
  const props = photoProps(source);
  Object.assign(node, props, {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  });
  return node;
}
export function setImage(node: HTMLImageElement, source: string, alt: string) {
  Object.assign(node, photoProps(source), { alt });
}
export function makeCard(product: AudioProduct, variant?: Variant) {
  const template = required<HTMLTemplateElement>("[data-product-templates]");
  const source = required<HTMLElement>("[data-product-card]", template.content);
  const card = source.cloneNode(true) as HTMLElement;
  card.dataset.productCard = product.id;
  required(".model-label", card).textContent = product.code;
  required(".card-body > small", card).textContent = categories.find(
    (category) => category.id === product.category,
  )!.name;
  required("h3 a", card).textContent = product.title;
  required("[data-card-price]", card).textContent =
    "از " + formatMoney(minimumPrice(product));
  const stock = required("[data-card-stock]", card);
  stock.textContent = inStock(product)
    ? "رنگ موجود دارد"
    : "ناموجود در هر دو رنگ";
  stock.classList.toggle("unavailable", !inStock(product));
  setImage(
    required<HTMLImageElement>(".product-frame img", card),
    product.variants[0].images[0],
    `${product.title} ${product.code}، ${product.variants[0].name}`,
  );
  const swatches = required(".swatches", card);
  swatches.replaceChildren(
    ...product.variants.map((variant) => {
      const swatch = element("b");
      swatch.style.background = variant.hex;
      swatch.title = variant.name;
      return swatch;
    }),
  );
  for (const anchor of card.querySelectorAll<HTMLAnchorElement>("a"))
    anchor.href = avanUrl(`product/${product.id}/`);
  const save = required("[data-save-model]", card),
    compare = required("[data-compare-model]", card),
    quick = required("[data-quick-view]", card);
  save.dataset.saveModel = product.id;
  save.setAttribute("aria-label", `ذخیرهٔ ${product.code}`);
  quick.dataset.quickView = product.id;
  if (!product.compareGroup) compare.remove();
  else {
    compare.dataset.compareModel = product.id;
    compare.setAttribute("aria-label", `مقایسهٔ ${product.code}`);
  }
  if (variant) {
    setImage(
      required<HTMLImageElement>(".product-frame img", card),
      variant.images[0],
      `${product.title} ${product.code}، ${variant.name}`,
    );
    required("[data-card-price]", card).textContent = formatMoney(
      variant.price,
    );
    required("[data-card-color]", card).textContent = variant.name;
    required("[data-card-stock]", card).textContent = variant.stock
      ? "این رنگ موجود است"
      : "این رنگ ناموجود است";
    stock.classList.toggle("unavailable", !variant.stock);
    card.dataset.matchedSku = variant.id;
    for (const anchor of card.querySelectorAll<HTMLAnchorElement>("a"))
      anchor.href = avanUrl(`product/${product.id}/?color=${variant.color}`);
  }
  for (const control of card.querySelectorAll<HTMLButtonElement>(
    "button[data-requires-js]",
  ))
    control.disabled = false;
  return card;
}
export function specValue(spec: Specification | undefined) {
  const node = element("span");
  if (!spec) {
    node.textContent = "ثبت نشده";
    return node;
  }
  if (spec.value === null) node.textContent = "کاربرد ندارد";
  else if (typeof spec.value === "boolean")
    node.textContent = spec.value ? "دارد" : "ندارد";
  else if (
    typeof spec.value === "number" ||
    spec.unit ||
    /Bluetooth|USB|IPX|AUX|DC/.test(String(spec.value))
  ) {
    const bdi = element(
      "bdi",
      "",
      `${spec.value}${spec.unit ? " " + spec.unit : ""}`,
    );
    bdi.dir = "ltr";
    node.append(bdi);
  } else node.textContent = String(spec.value);
  return node;
}
type DialogState = {
  trigger: HTMLElement | null;
  overflow: string;
  inert: { node: HTMLElement; value: boolean; aria: string | null }[];
};
const dialogs = new Map<HTMLDialogElement, DialogState>();
export function openDialog(
  dialog: HTMLDialogElement,
  trigger: HTMLElement | null = document.activeElement as HTMLElement,
) {
  for (const current of dialogs.keys())
    if (current !== dialog) closeDialog(current);
  if (dialog.open) return;
  const state: DialogState = {
    trigger,
    overflow: document.body.style.overflow,
    inert: [],
  };
  dialogs.set(dialog, state);
  document.body.style.overflow = "hidden";
  if (typeof dialog.showModal === "function") dialog.showModal();
  else {
    dialog.setAttribute("open", "");
    dialog.dataset.fallback = "true";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    for (const node of [...document.body.children])
      if (
        node instanceof HTMLElement &&
        node !== dialog &&
        node.tagName !== "SCRIPT"
      ) {
        state.inert.push({
          node,
          value: node.inert,
          aria: node.getAttribute("aria-hidden"),
        });
        node.inert = true;
        node.setAttribute("aria-hidden", "true");
      }
  }
  dialog.addEventListener(
    "close",
    () => {
      if (!dialog.open) restoreDialog(dialog);
    },
    { once: true },
  );
  (
    dialog.querySelector<HTMLElement>(
      "[autofocus],button,input,select,[tabindex]",
    ) || dialog
  ).focus();
}
function restoreDialog(dialog: HTMLDialogElement) {
  const state = dialogs.get(dialog);
  if (!state) return;
  dialogs.delete(dialog);
  document.body.style.overflow = state.overflow;
  for (const item of state.inert) {
    item.node.inert = item.value;
    if (item.aria === null) item.node.removeAttribute("aria-hidden");
    else item.node.setAttribute("aria-hidden", item.aria);
  }
  if (state.trigger?.isConnected) state.trigger.focus();
}
export function closeDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  restoreDialog(dialog);
}
export function bindDialogs(signal: AbortSignal) {
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const close = event.target.closest("[data-close-dialog]");
      if (close) {
        const dialog = close.closest("dialog");
        if (dialog) closeDialog(dialog);
      }
      if (event.target instanceof HTMLDialogElement && event.target.open) {
        const rect = event.target.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          closeDialog(event.target);
      }
    },
    { signal },
  );
  for (const dialog of document.querySelectorAll<HTMLDialogElement>(
    ".av dialog",
  ))
    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        closeDialog(dialog);
      },
      { signal },
    );
  document.addEventListener(
    "keydown",
    (event) => {
      const dialog = [...dialogs.keys()].at(-1);
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog(dialog);
        return;
      }
      if (event.key !== "Tab") return;
      const targets = [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ].filter((e) => e.getClientRects().length);
      const first = targets[0],
        last = targets.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    },
    { signal },
  );
}
export function clearDialogs() {
  for (const dialog of [...dialogs.keys()]) closeDialog(dialog);
}
