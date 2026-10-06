// Motion changes presentation only. Focus, prices and purchase state update immediately.
const curve = "cubic-bezier(.22,1,.36,1)";
type GridSnapshot = {
  rect: DOMRect;
  items: Map<string, { node: HTMLElement; rect: DOMRect }>;
};
type NativeTransition = {
  ready: Promise<unknown>;
  finished: Promise<unknown>;
  skipTransition: () => void;
};
export function createMotion(signal: AbortSignal) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map<HTMLElement, Animation>();
  const layers = new Set<HTMLImageElement>();
  const layerExits = new WeakMap<HTMLImageElement, Animation>();
  const gridLayers = new Set<HTMLElement>();
  let nativeTransition: NativeTransition | undefined;
  let pendingPhoto: HTMLImageElement | null = null;
  const feedbackTimers = new Map<HTMLElement, number>();
  const reveals = [
    ...document.querySelectorAll<HTMLElement>("[data-marketing-reveal]"),
  ];
  let observer: IntersectionObserver | undefined;
  const supported = () =>
    !media.matches && typeof HTMLElement.prototype.animate === "function";
  const cancel = (node: HTMLElement) => {
    active.get(node)?.cancel();
    active.delete(node);
  };
  function animate(node: HTMLElement, frames: Keyframe[], duration: number) {
    cancel(node);
    if (!supported() || !node.isConnected) return;
    const animation = node.animate(frames, { duration, easing: curve });
    active.set(node, animation);
    animation.finished
      .then(() => {
        if (active.get(node) === animation) active.delete(node);
      })
      .catch(() => {});
    return animation;
  }
  function show(node: HTMLElement) {
    node.classList.remove("av-reveal-pending");
    node.dataset.revealSeen = "true";
    observer?.unobserve(node);
  }
  function reveal(node: HTMLElement) {
    if (!node.classList.contains("av-reveal-pending")) return;
    show(node);
    animate(
      node,
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "none" },
      ],
      700,
    );
  }
  if (supported() && typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      },
      { rootMargin: "0px 0px 40px 0px", threshold: 0.01 },
    );
    for (const node of reveals) {
      // Restored scroll positions and already visible sections never flash or hide.
      if (
        node.dataset.revealSeen ||
        node.getBoundingClientRect().top < innerHeight
      )
        show(node);
      else {
        node.classList.add("av-reveal-pending");
        observer.observe(node);
      }
    }
  }
  document.addEventListener(
    "focusin",
    (event) => {
      const node =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-marketing-reveal]")
          : null;
      if (node) {
        show(node);
        cancel(node);
      }
    },
    { signal },
  );
  const settle = () => {
    if (media.matches) nativeTransition?.skipTransition();
    for (const node of [...active.keys()]) cancel(node);
    for (const layer of layers) layer.remove();
    layers.clear();
    for (const layer of gridLayers) layer.remove();
    gridLayers.clear();
    for (const node of reveals) show(node);
    observer?.disconnect();
  };
  media.addEventListener(
    "change",
    () => {
      if (media.matches) settle();
    },
    { signal },
  );
  signal.addEventListener(
    "abort",
    () => {
      settle();
      for (const [node, timer] of feedbackTimers) {
        clearTimeout(timer);
        delete node.dataset.feedback;
        delete node.dataset.feedbackVisible;
      }
      feedbackTimers.clear();
    },
    { once: true },
  );
  // Same-origin native image continuity; other navigation and unsupported browsers stay immediate.
  document.addEventListener(
    "click",
    (event) => {
      pendingPhoto = null;
      if (media.matches || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const destination = new URL(anchor.href);
      if (
        destination.origin !== location.origin ||
        !destination.pathname.includes("/demo/avan/product/") ||
        destination.searchParams.get("color") === "ivory"
      )
        return;
      const photo = anchor
        .closest("[data-product-card],.hero")
        ?.querySelector<HTMLImageElement>("img:not(.av-photo-layer)");
      if (!photo || photo.currentSrc.includes("ivory")) return;
      const rect = photo.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight && rect.width)
        pendingPhoto = photo;
    },
    { signal, capture: true },
  );
  window.addEventListener(
    "pageswap",
    (raw) => {
      const event = raw as Event & { viewTransition?: NativeTransition };
      const transition = event.viewTransition;
      if (!transition) return;
      nativeTransition = transition;
      transition.ready.catch(() => {});
      if (media.matches || !pendingPhoto?.isConnected) {
        transition.skipTransition();
        return;
      }
      const photo = pendingPhoto;
      const main = document.querySelector<HTMLImageElement>(
        ".main-image img:not(.av-photo-layer)",
      );
      if (main && main !== photo) main.style.viewTransitionName = "none";
      photo.style.viewTransitionName = "avan-product";
      const reset = () => {
        photo.style.removeProperty("view-transition-name");
        main?.style.removeProperty("view-transition-name");
        nativeTransition = undefined;
      };
      transition.finished.then(reset, reset);
    },
    { signal },
  );
  window.addEventListener(
    "pagereveal",
    (raw) => {
      const transition = (raw as Event & { viewTransition?: NativeTransition })
        .viewTransition;
      if (!transition) return;
      nativeTransition = transition;
      transition.ready.catch(() => {});
      if (media.matches) transition.skipTransition();
      transition.finished.then(
        () => {
          nativeTransition = undefined;
        },
        () => {
          nativeTransition = undefined;
        },
      );
    },
    { signal },
  );
  for (const details of document.querySelectorAll<HTMLDetailsElement>(
    ".mobile-menu,.prose details",
  )) {
    const syncDisclosure = () => {
      if (!details.open && details.contains(document.activeElement))
        details.querySelector<HTMLElement>("summary")?.focus();
      for (const child of details.children)
        if (child instanceof HTMLElement && child.tagName !== "SUMMARY")
          child.inert = !details.open;
    };
    syncDisclosure();
    details.addEventListener("toggle", syncDisclosure, { signal });
  }
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]"))
        return;
      const menu =
        document.querySelector<HTMLDetailsElement>(".mobile-menu[open]");
      if (menu) {
        menu.open = false;
        menu.querySelector<HTMLElement>("summary")?.focus();
      }
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      const menu =
        document.querySelector<HTMLDetailsElement>(".mobile-menu[open]");
      if (menu && event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
    },
    { signal },
  );
  return {
    swapPhoto(node: HTMLImageElement, update: () => void) {
      const parent = node.parentElement;
      if (!supported() || !parent || !node.isConnected) {
        update();
        return;
      }
      const opacity = getComputedStyle(node).opacity;
      cancel(node);
      const previous = node.cloneNode(true) as HTMLImageElement;
      previous.removeAttribute("id");
      for (const key of Object.keys(previous.dataset))
        delete previous.dataset[key];
      previous.alt = "";
      previous.setAttribute("aria-hidden", "true");
      previous.classList.add("av-photo-layer");
      Object.assign(previous.style, {
        left: node.offsetLeft + "px",
        top: node.offsetTop + "px",
        width: node.offsetWidth + "px",
        height: node.offsetHeight + "px",
        opacity,
      });
      parent.append(previous);
      layers.add(previous);
      // At most two outgoing layers and one current image, including rapid reversal.
      const outgoing = [...layers].filter(
        (layer) => layer.parentElement === parent,
      );
      // Retain the strongest visible layers on reversal; restart each fade from its current opacity.
      outgoing.sort(
        (a, b) =>
          Number(getComputedStyle(b).opacity) -
          Number(getComputedStyle(a).opacity),
      );
      for (const layer of outgoing.slice(2)) {
        cancel(layer);
        layer.remove();
        layers.delete(layer);
      }
      update();
      animate(node, [{ opacity: 0 }, { opacity: 1 }], 200);
      for (const layer of outgoing.slice(0, 2)) {
        const fading = animate(
          layer,
          [
            { opacity: Number(getComputedStyle(layer).opacity) },
            { opacity: 0 },
          ],
          200,
        );
        if (!fading) continue;
        layerExits.set(layer, fading);
        fading.finished
          .then(() => {
            if (layerExits.get(layer) !== fading) return;
            layer.remove();
            layers.delete(layer);
          })
          .catch(() => {});
      }
    },
    captureGrid(root: HTMLElement): GridSnapshot {
      return {
        rect: root.getBoundingClientRect(),
        items: new Map(
          [...root.querySelectorAll<HTMLElement>("[data-product-card]")]
            .filter((node) => node.getClientRects().length)
            .map((node) => [
              node.dataset.productCard!,
              { node, rect: node.getBoundingClientRect() },
            ]),
        ),
      };
    },
    moveGrid(root: HTMLElement, before: GridSnapshot) {
      if (!supported() || !before.items.size || !root.getClientRects().length)
        return;
      const after = new Map(
        [...root.querySelectorAll<HTMLElement>("[data-product-card]")].map(
          (node) => [node.dataset.productCard!, node],
        ),
      );
      for (const [id, node] of after) {
        if (node.contains(document.activeElement)) continue;
        const old = before.items.get(id),
          rect = node.getBoundingClientRect();
        if (old) {
          const oldPhoto =
            old.node.querySelector<HTMLImageElement>(".product-frame img");
          const newPhoto =
            node.querySelector<HTMLImageElement>(".product-frame img");
          if (
            oldPhoto?.complete &&
            oldPhoto.naturalWidth &&
            newPhoto &&
            oldPhoto.getAttribute("src") !== newPhoto.getAttribute("src")
          ) {
            const target = {
              src: newPhoto.src,
              srcset: newPhoto.srcset,
              sizes: newPhoto.sizes,
              alt: newPhoto.alt,
              width: newPhoto.width,
              height: newPhoto.height,
            };
            Object.assign(newPhoto, {
              src: oldPhoto.src,
              srcset: oldPhoto.srcset,
              alt: oldPhoto.alt,
            });
            newPhoto.setAttribute("aria-busy", "true");
            const candidate = new Image();
            Object.assign(candidate, target);
            candidate
              .decode()
              .then(() => {
                if (signal.aborted || !newPhoto.isConnected) return;
                newPhoto.removeAttribute("aria-busy");
                this.swapPhoto(newPhoto, () => Object.assign(newPhoto, target));
              })
              .catch(() => {
                if (!newPhoto.isConnected) return;
                newPhoto.removeAttribute("aria-busy");
                const note = document.createElement("span");
                note.className = "photo-error";
                note.textContent = "تصویر رنگ تازه آماده نشد؛ نمای رنگ قبلی";
                newPhoto.parentElement?.append(note);
              });
          }
          const x = old.rect.left - rect.left,
            y = old.rect.top - rect.top;
          if (Math.abs(x) + Math.abs(y) > 0.5)
            animate(
              node,
              [
                { transform: `translate(${x}px,${y}px)` },
                { transform: "none" },
              ],
              220,
            );
        } else
          animate(
            node,
            [
              { opacity: 0.8, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
            180,
          );
      }
      // Decorative exit clones have no IDs, data actions, keyboard targets or accessible content.
      const removed = [...before.items]
        .filter(
          ([id, item]) =>
            !after.has(id) &&
            item.rect.bottom > 0 &&
            item.rect.top < innerHeight,
        )
        .slice(0, 8);
      if (!removed.length) return;
      const layer = document.createElement("div");
      layer.className = "av-grid-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.inert = true;
      Object.assign(layer.style, {
        left: before.rect.left + scrollX + "px",
        top: before.rect.top + scrollY + "px",
        width: before.rect.width + "px",
      });
      for (const [, item] of removed) {
        const copy = item.node.cloneNode(true) as HTMLElement;
        for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")])
          for (const attribute of [...node.attributes])
            if (attribute.name === "id" || attribute.name.startsWith("data-"))
              node.removeAttribute(attribute.name);
        for (const control of copy.querySelectorAll<HTMLElement>(
          "a,button,input,select,[tabindex]",
        )) {
          control.tabIndex = -1;
          if (control instanceof HTMLButtonElement) control.disabled = true;
        }
        Object.assign(copy.style, {
          position: "absolute",
          left: item.rect.left - before.rect.left + "px",
          top: item.rect.top - before.rect.top + "px",
          width: item.rect.width + "px",
          height: item.rect.height + "px",
        });
        layer.append(copy);
      }
      for (const old of gridLayers) {
        cancel(old);
        old.remove();
      }
      gridLayers.clear();
      document.body.append(layer);
      gridLayers.add(layer);
      animate(
        layer,
        [{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }],
        160,
      )
        ?.finished.then(() => {
          layer.remove();
          gridLayers.delete(layer);
        })
        .catch(() => {});
    },
    enter(node: HTMLElement | null) {
      if (!node || node.contains(document.activeElement)) return;
      const current = active.has(node) ? getComputedStyle(node) : null;
      animate(
        node,
        [
          {
            opacity: current?.opacity ?? 0.85,
            transform: current?.transform ?? "translateY(4px)",
          },
          { opacity: 1, transform: "none" },
        ],
        180,
      );
    },
    captureCart(root: HTMLElement) {
      return new Map(
        [...root.querySelectorAll<HTMLElement>("[data-cart-line]")]
          .filter((node) => node.getClientRects().length)
          .map((node) => [
            node.dataset.cartLine!,
            node.getBoundingClientRect(),
          ]),
      );
    },
    moveCart(root: HTMLElement, before: Map<string, DOMRect>) {
      if (!supported() || !root.getClientRects().length) return;
      for (const node of root.querySelectorAll<HTMLElement>(
        "[data-cart-line]",
      )) {
        const old = before.get(node.dataset.cartLine!);
        if (!old) continue;
        const now = node.getBoundingClientRect(),
          x = old.left - now.left,
          y = old.top - now.top;
        if (Math.abs(x) + Math.abs(y) > 0.5)
          animate(
            node,
            [{ transform: `translate(${x}px,${y}px)` }, { transform: "none" }],
            220,
          );
      }
    },
    step(node: HTMLElement, forward: boolean) {
      const current = active.has(node) ? getComputedStyle(node) : null;
      animate(
        node,
        [
          {
            opacity: current?.opacity ?? 0.4,
            transform:
              current?.transform ?? `translateX(${forward ? -14 : 14}px)`,
          },
          { opacity: 1, transform: "none" },
        ],
        200,
      );
    },
    feedback(node: HTMLElement, message: string) {
      if (!node.isConnected) return;
      clearTimeout(feedbackTimers.get(node));
      node.dataset.feedback = message;
      node.dataset.feedbackVisible = "true";
      feedbackTimers.set(
        node,
        window.setTimeout(() => {
          node.dataset.feedbackVisible = "false";
          feedbackTimers.delete(node);
        }, 1100),
      );
    },
  };
}
