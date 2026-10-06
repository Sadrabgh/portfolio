export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const motion = {
  reveal: 700,
  layout: 280,
  swap: 300,
  panelIn: 320,
  panelOut: 210,
  step: 240,
};
const ease = "cubic-bezier(.22,1,.36,1)";
const running = new Set<Animation>();
const owned = new WeakMap<Element, Animation>();
export function stopMotion(el: Element) {
  owned.get(el)?.cancel();
  owned.delete(el);
}
export function animate(
  el: Element,
  frames: Keyframe[],
  duration: number,
  easing = ease,
) {
  const previous = owned.get(el);
  const next = frames.map((frame) => ({ ...frame }));
  if (previous && previous.playState !== "finished" && next.length) {
    const style = getComputedStyle(el);
    for (const key of ["transform", "opacity", "translate", "scale"] as const)
      if (key in next[0]) next[0][key] = style[key];
  }
  previous?.cancel();
  if (
    reducedMotion.matches ||
    !el.isConnected ||
    typeof el.animate !== "function"
  )
    return;
  const animation = el.animate(next, { duration, easing });
  owned.set(el, animation);
  running.add(animation);
  animation.finished
    .catch(() => {})
    .finally(() => {
      running.delete(animation);
      if (owned.get(el) === animation) owned.delete(el);
    });
  return animation;
}
reducedMotion.addEventListener("change", () => {
  if (!reducedMotion.matches) return;
  running.forEach((a) => a.cancel());
  document
    .querySelectorAll(".mr-reveal-ready")
    .forEach((el) => el.classList.remove("mr-reveal-ready"));
});
window.addEventListener("pagehide", () => running.forEach((a) => a.cancel()));

type Position = { rect: DOMRect; clone: HTMLElement; columns: string };
export type Positions = Map<string, Position>;
export function captureLayout(
  root: HTMLElement | null,
  selector: string,
  key: string,
): Positions {
  const positions: Positions = new Map();
  if (!root || reducedMotion.matches) return positions;
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (!el.getClientRects().length) return;
    positions.set(el.getAttribute(key)!, {
      rect: el.getBoundingClientRect(),
      clone: el.cloneNode(true) as HTMLElement,
      columns: getComputedStyle(el).gridTemplateColumns,
    });
    stopMotion(el);
  });
  return positions;
}
export function settleLayout(
  root: HTMLElement | null,
  selector: string,
  key: string,
  before: Positions,
  exit = false,
) {
  if (!root || reducedMotion.matches) return;
  root.classList.add("mr-motion-list");
  const visible = [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => el.getClientRects().length,
  );
  const after = visible.map((el) => ({
    el,
    rect: el.getBoundingClientRect(),
    previous: before.get(el.getAttribute(key)!),
  }));
  // Read geometry together, then animate; final DOM and focus never wait for motion.
  for (const { el, rect, previous } of after) {
    if (previous) {
      const x = previous.rect.left - rect.left,
        y = previous.rect.top - rect.top;
      if (Math.abs(x) + Math.abs(y) > 1)
        animate(
          el,
          [{ transform: `translate(${x}px,${y}px)` }, { transform: "none" }],
          motion.layout,
        );
    } else
      animate(
        el,
        [
          { opacity: 0.35, transform: "translateY(8px)" },
          { opacity: 1, transform: "none" },
        ],
        220,
      );
  }
  if (!exit) return;
  const keys = new Set(visible.map((el) => el.getAttribute(key)));
  const box = root.getBoundingClientRect();
  for (const [id, position] of before) {
    if (keys.has(id)) continue;
    const ghost = position.clone;
    ghost.removeAttribute(key);
    ghost.removeAttribute("id");
    ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    ghost.inert = true;
    ghost.setAttribute("aria-hidden", "true");
    ghost.classList.add("mr-motion-ghost");
    Object.assign(ghost.style, {
      position: "absolute",
      top: position.rect.top - box.top + root.scrollTop + "px",
      left: position.rect.left - box.left + root.scrollLeft + "px",
      width: position.rect.width + "px",
      height: position.rect.height + "px",
      gridTemplateColumns: position.columns,
      pointerEvents: "none",
      margin: "0",
    });
    root.append(ghost);
    const animation = animate(
      ghost,
      [
        { opacity: 0.7, transform: "none" },
        { opacity: 0, transform: "translateY(-6px)" },
      ],
      160,
    );
    if (animation)
      animation.finished.catch(() => {}).finally(() => ghost.remove());
    else ghost.remove();
  }
}
export function swapImage(
  image: HTMLImageElement,
  source: string,
  alt: string,
  direction: number,
) {
  const wrapper = image.parentElement!;
  const style = getComputedStyle(image);
  const echo = image.cloneNode() as HTMLImageElement;
  echo.removeAttribute("id");
  echo.removeAttribute("srcset");
  echo.src = image.currentSrc || image.src;
  echo.alt = "";
  echo.setAttribute("aria-hidden", "true");
  echo.classList.add("mr-image-echo");
  const from = { opacity: style.opacity, transform: style.transform };
  stopMotion(image);
  image.srcset = "";
  image.src = source;
  image.alt = alt;
  if (reducedMotion.matches) return;
  wrapper.append(echo);
  const fade = animate(
    echo,
    [from, { opacity: 0, transform: `translateX(${-direction * 8}px)` }],
    motion.swap,
  );
  fade?.finished.catch(() => {}).finally(() => echo.remove());
  animate(
    image,
    [
      { opacity: 0, transform: `translateX(${direction * 8}px)` },
      { opacity: 1, transform: "none" },
    ],
    motion.swap,
  );
}
const feedback = new WeakMap<
  HTMLElement,
  { nodes: Node[]; timer: number; label: string | null }
>();
export function confirmControl(el: HTMLElement, label: string) {
  const previous = feedback.get(el);
  if (previous) clearTimeout(previous.timer);
  const nodes =
    previous?.nodes || [...el.childNodes].map((n) => n.cloneNode(true));
  const aria = previous?.label ?? el.getAttribute("aria-label");
  if (el.classList.contains("mr-icon")) {
    el.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4 10-10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    el.setAttribute("aria-label", label);
  } else el.textContent = "افزوده شد";
  el.dataset.feedback = "success";
  animate(
    el.querySelector("svg") || el,
    [{ scale: ".94" }, { scale: "1" }],
    160,
  );
  const timer = window.setTimeout(() => {
    el.replaceChildren(...nodes.map((n) => n.cloneNode(true)));
    delete el.dataset.feedback;
    if (aria === null) el.removeAttribute("aria-label");
    else el.setAttribute("aria-label", aria);
    feedback.delete(el);
  }, 1500);
  feedback.set(el, { nodes, timer, label: aria });
}
export function setupEditorialMotion() {
  if (document.body.dataset.page === "home" && !reducedMotion.matches) {
    try {
      const first = !sessionStorage.getItem("mora:hero-seen:v1");
      sessionStorage.setItem("mora:hero-seen:v1", "1");
      if (first && !document.referrer.includes("/demo/mora/")) {
        document
          .querySelectorAll<HTMLElement>(".mr-hero-heading h1 > span")
          .forEach((el, i) => {
            animate(
              el,
              [
                { opacity: 0.78, transform: `translateY(${12 + i * 3}px)` },
                { opacity: 1, transform: "none" },
              ],
              560 + i * 60,
            );
          });
        const photo = document.querySelector(".mr-hero-photo");
        if (photo)
          animate(
            photo,
            [
              { opacity: 0.85, transform: "translateY(16px)" },
              { opacity: 1, transform: "none" },
            ],
            700,
          );
      }
    } catch {
      /* Without session storage, keep the hero instant. */
    }
  }
  if (!("IntersectionObserver" in window) || reducedMotion.matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          const el = entry.target;
          const prepared = el.classList.contains("mr-reveal-ready");
          el.classList.remove("mr-reveal-ready");
          if (prepared && !reducedMotion.matches)
            animate(
              el,
              [
                { opacity: 0, transform: "translateY(16px)" },
                { opacity: 1, transform: "none" },
              ],
              motion.reveal,
            );
          observer.unobserve(el);
        }
    },
    { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
  );
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (el.getBoundingClientRect().top >= innerHeight * 0.94) {
      el.classList.add("mr-reveal-ready");
      observer.observe(el);
    }
  });
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      document
        .querySelectorAll(".mr-reveal-ready")
        .forEach((el) => el.classList.remove("mr-reveal-ready"));
    },
    { once: true },
  );
}

// Native cross-document transitions keep the selected product in place.
// Links retain ordinary navigation, modifier keys and browser history.
document.addEventListener(
  "click",
  (event) => {
    if (
      reducedMotion.matches ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!link || link.target || link.hasAttribute("download")) return;
    const target = new URL(link.href);
    if (
      target.origin !== location.origin ||
      !/\/demo\/mora\/product\/[a-z0-9]+\/$/.test(target.pathname)
    )
      return;
    const image = link
      .closest("[data-product], [data-feature]")
      ?.querySelector<HTMLElement>("img:not(.mr-image-echo)");
    if (!image) return;
    document
      .querySelectorAll<HTMLElement>(
        ".mr-product-photo > img, [data-product] img, [data-feature] img",
      )
      .forEach((el) => {
        el.style.viewTransitionName = "none";
      });
    image.style.viewTransitionName = "mora-product";
  },
  { capture: true },
);
