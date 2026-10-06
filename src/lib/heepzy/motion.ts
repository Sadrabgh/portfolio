// Motion is presentational: semantics and keyboard focus change immediately.
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const enter = "cubic-bezier(.22,1,.36,1)",
  move = "cubic-bezier(.25,1,.5,1)";
const running = new WeakMap<HTMLElement, Animation>();
export function settle(
  el: HTMLElement,
  to: Keyframe,
  initial?: Keyframe,
  duration = 220,
  easing = enter,
) {
  const current = getComputedStyle(el),
    from: Keyframe = running.has(el)
      ? { opacity: current.opacity, transform: current.transform }
      : initial || { opacity: current.opacity, transform: current.transform };
  running.get(el)?.cancel();
  running.delete(el);
  if (to.opacity !== undefined) el.style.opacity = String(to.opacity);
  if (to.transform !== undefined) el.style.transform = String(to.transform);
  if (reducedMotion()) return null;
  const animation = el.animate([from, to], { duration, easing });
  running.set(el, animation);
  animation.finished.then(
    () => {
      if (running.get(el) === animation) {
        running.delete(el);
        el.style.willChange = "";
      }
    },
    () => {},
  );
  return animation;
}
export function flip(container: HTMLElement, mutate: () => void) {
  const children = Array.from(container.children).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  const before = new Map(
    children
      .filter((n) => !n.hidden)
      .map((n) => [n, n.getBoundingClientRect()]),
  );
  children.forEach((n) => {
    running.get(n)?.cancel();
    running.delete(n);
    n.style.transform = "";
    n.style.opacity = "";
    n.style.willChange = "";
  });
  mutate();
  if (reducedMotion()) return;
  children
    .filter((n) => !n.hidden)
    .forEach((n) => {
      const now = n.getBoundingClientRect(),
        old = before.get(n);
      n.style.willChange = "transform, opacity";
      settle(
        n,
        { opacity: 1, transform: "none" },
        old
          ? {
              opacity: 1,
              transform: `translate(${old.left - now.left}px,${old.top - now.top}px)`,
            }
          : { opacity: 0, transform: "translateY(8px)" },
        240,
        move,
      );
    });
}
const tickets = new WeakMap<HTMLImageElement, number>();
const cleanup = new WeakMap<HTMLImageElement, Animation>();
export async function crossfade(
  main: HTMLImageElement,
  src: string,
  alt: string,
) {
  const ticket = (tickets.get(main) || 0) + 1;
  tickets.set(main, ticket);
  const parent = main.parentElement!;
  const layers = Array.from(
    parent.querySelectorAll<HTMLImageElement>("[data-photo-layer]"),
  );
  // Freeze the current blend before changing the target, including a mid-flight blend.
  [...layers, main].forEach((n) => {
    cleanup.delete(n);
    const opacity = getComputedStyle(n).opacity;
    running.get(n)?.cancel();
    running.delete(n);
    n.style.opacity = opacity;
  });
  if (
    main.complete &&
    main.naturalWidth &&
    Number(main.style.opacity) > 0.01 &&
    main.src !== new URL(src, location.href).href
  ) {
    const old = main.cloneNode(false) as HTMLImageElement;
    old.removeAttribute("data-product-image");
    old.removeAttribute("id");
    old.dataset.photoLayer = "";
    old.alt = "";
    old.setAttribute("aria-hidden", "true");
    old.className = "hp-photo-layer";
    old.removeAttribute("loading");
    parent.append(old);
    layers.push(old);
  }
  main.src = src;
  main.alt = alt;
  main.style.opacity = "0";
  if (reducedMotion()) {
    layers.forEach((n) => n.remove());
    main.style.opacity = "1";
    return;
  }
  // Bound decorative layers during a burst of rapid selections.
  while (layers.length > 3) layers.shift()?.remove();
  try {
    await main.decode();
  } catch {
    if (tickets.get(main) !== ticket) return;
    main.style.opacity = "1";
    layers.forEach((n) => n.remove());
    return;
  }
  if (tickets.get(main) !== ticket) return;
  settle(
    main,
    { opacity: 1, transform: "none" },
    { opacity: 0, transform: "none" },
    200,
  );
  layers.forEach((n) => {
    const animation = settle(
      n,
      { opacity: 0, transform: "none" },
      undefined,
      200,
    );
    if (!animation) {
      n.remove();
      return;
    }
    cleanup.set(n, animation);
    animation.finished.then(
      () => {
        if (cleanup.get(n) !== animation) return;
        cleanup.delete(n);
        n.remove();
      },
      () => {},
    );
  });
}
export function switchStep(
  form: HTMLFormElement,
  next: number,
  previous: number,
) {
  const target = form.querySelector<HTMLElement>(
    `[data-checkout-step="${next}"]`,
  )!;
  form
    .querySelectorAll<HTMLElement>("[data-checkout-step]")
    .forEach((n) => (n.hidden = n !== target));
  // In RTL, forward content arrives from the left; back content from the right.
  settle(
    target,
    { opacity: 1, transform: "none" },
    { opacity: 0.4, transform: `translateX(${next > previous ? -14 : 14}px)` },
    180,
  );
}
