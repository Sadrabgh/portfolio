// A small shared motion vocabulary. Required UI state is always committed before motion.
export const motionMedia = matchMedia("(prefers-reduced-motion: reduce)");
export const runningMotion = new Set<Animation>();
export const easing = {
  enter: "cubic-bezier(.22,1,.36,1)",
  move: "cubic-bezier(.25,1,.5,1)",
  sheet: "cubic-bezier(.32,.72,0,1)",
  exit: "cubic-bezier(.4,0,1,1)",
  settle: "cubic-bezier(.16,1,.3,1)",
};
const owners = new WeakMap<Element, Map<string, Animation>>();
const resetters = new Set<() => void>();
export function cancelMotion(element: Element, channel = "feedback") {
  owners.get(element)?.get(channel)?.cancel();
}
export function motionPlay(
  element: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
  channel = "feedback",
) {
  const previous = owners.get(element)?.get(channel);
  if (channel === "feedback" && previous?.playState === "running") {
    const current = getComputedStyle(element);
    frames = frames.map((frame, index) =>
      index === 0
        ? {
            ...frame,
            ...(frame.transform !== undefined
              ? { transform: current.transform }
              : {}),
            ...(frame.opacity !== undefined
              ? { opacity: current.opacity }
              : {}),
          }
        : frame,
    );
  }
  cancelMotion(element, channel);
  if (motionMedia.matches || !element.isConnected) return;
  const animation = element.animate(frames, { ...options, fill: "none" });
  const channels = owners.get(element) || new Map<string, Animation>();
  channels.set(channel, animation);
  owners.set(element, channels);
  runningMotion.add(animation);
  animation.finished
    .catch(() => {})
    .finally(() => {
      runningMotion.delete(animation);
      if (channels.get(channel) === animation) channels.delete(channel);
    });
  return animation;
}
function resetMotion() {
  runningMotion.forEach((a) => a.cancel());
  runningMotion.clear();
  resetters.forEach((reset) => reset());
  document.querySelectorAll("[data-motion-ghost]").forEach((e) => e.remove());
}
motionMedia.addEventListener("change", () => {
  if (motionMedia.matches) resetMotion();
});
addEventListener("pagehide", resetMotion);
addEventListener("pageswap", resetMotion);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetMotion();
});
export function isOnScreen(element: Element) {
  const r = element.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
}
export function swapValue(element: HTMLElement, value: string) {
  if (element.textContent === value) return;
  const opacity = getComputedStyle(element).opacity;
  const moving = owners.get(element)?.has("value");
  element.textContent = value;
  if (isOnScreen(element))
    motionPlay(
      element,
      [
        { opacity: moving ? opacity : 0.55, transform: "translateY(3px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 150, easing: easing.enter },
      "value",
    );
}
const purchaseIcons = new WeakMap<SVGPathElement, string>();
export function purchaseFeedback(button: HTMLButtonElement, added: boolean) {
  const path = button.querySelector<SVGPathElement>("svg path");
  if (!path) return;
  if (!purchaseIcons.has(path))
    purchaseIcons.set(path, path.getAttribute("d") || "");
  path.setAttribute("d", added ? "m5 12 4 4L19 6" : purchaseIcons.get(path)!);
  if (added) {
    const length = path.getTotalLength();
    motionPlay(
      path,
      [
        { strokeDasharray: `${length}`, strokeDashoffset: length },
        { strokeDasharray: `${length}`, strokeDashoffset: 0 },
      ],
      { duration: 180, easing: easing.enter },
      "icon",
    );
  } else cancelMotion(path, "icon");
}
export function visualGhost(
  element: HTMLElement,
  host: HTMLElement,
  rect = element.getBoundingClientRect(),
  options: {
    duration?: number;
    easing?: string;
    transform?: string;
    opacity?: number;
  } = {},
) {
  if (motionMedia.matches || !isOnScreen(element)) return;
  const base = host.getBoundingClientRect();
  const ghost = element.cloneNode(true) as HTMLElement;
  for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>("*")]) {
    node.removeAttribute("id");
    node.style.viewTransitionName = "none";
    for (const key of Object.keys(node.dataset)) delete node.dataset[key];
  }
  ghost.dataset.motionGhost = "";
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "absolute",
    left: `${rect.left - base.left + host.scrollLeft}px`,
    top: `${rect.top - base.top + host.scrollTop}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    pointerEvents: "none",
    zIndex: "2",
  });
  host.append(ghost);
  const animation = motionPlay(
    ghost,
    [
      { opacity: options.opacity ?? 1, transform: "none" },
      {
        opacity: 0,
        transform: options.transform ?? "translateY(-7px) scale(.985)",
      },
    ],
    {
      duration: options.duration ?? 160,
      easing: options.easing ?? easing.exit,
    },
    "exit",
  );
  if (animation)
    animation.finished.catch(() => {}).finally(() => ghost.remove());
  else ghost.remove();
  return ghost;
}
export function moveFrom(
  element: HTMLElement,
  before: DOMRect | undefined,
  duration = 280,
  opacity = 1,
  after = element.getBoundingClientRect(),
) {
  const x = before ? before.left - after.left : 0,
    y = before ? before.top - after.top : 8;
  if (before && Math.abs(x) + Math.abs(y) < 1 && opacity > 0.99) return;
  if (after.bottom < 0 || after.top > innerHeight) return;
  motionPlay(
    element,
    [
      { transform: `translate(${x}px,${y}px)`, opacity: before ? opacity : 0 },
      { transform: "none", opacity: 1 },
    ],
    { duration, easing: easing.move },
    "layout",
  );
}
// Capture before cancelling: a rapid interaction starts at the displayed position,
// not the previous animation's destination. Read all bounds before starting effects.
export function captureLayout(host: HTMLElement, elements: HTMLElement[]) {
  const bounds = host.getBoundingClientRect();
  const previous = new Map(
    elements
      .map(
        (element) =>
          [
            element,
            {
              rect: element.getBoundingClientRect(),
              opacity: Number(getComputedStyle(element).opacity),
            },
          ] as const,
      )
      .filter(([, frame]) => frame.rect.width > 0 && frame.rect.height > 0),
  );
  cancelMotion(host, "size");
  elements.forEach((element) => cancelMotion(element, "layout"));
  return {
    previous,
    finish(current: HTMLElement[], duration = 300) {
      const nextBounds = host.getBoundingClientRect();
      const frames = current
        .filter((element) => !element.hidden)
        .map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0);
      if (motionMedia.matches) return;
      frames.forEach(({ element, rect }) => {
        const before = previous.get(element);
        const visible =
          before && before.rect.bottom > 0 && before.rect.top < innerHeight;
        moveFrom(
          element,
          visible ? before.rect : undefined,
          duration,
          before?.opacity,
          rect,
        );
      });
      if (
        bounds.width === 0 ||
        bounds.bottom < 0 ||
        bounds.top > innerHeight ||
        Math.abs(bounds.height - nextBounds.height) < 1
      )
        return;
      const style = getComputedStyle(host);
      const inset =
        style.boxSizing === "border-box"
          ? 0
          : parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom) +
            parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth);
      // Deliberate measured container resize: transforms alone leave the following
      // content and scrollbar jumping. Only this enclosing block changes size.
      motionPlay(
        host,
        [
          {
            height: `${Math.max(0, bounds.height - inset)}px`,
            overflow: "clip",
          },
          {
            height: `${Math.max(0, nextBounds.height - inset)}px`,
            overflow: "clip",
          },
        ],
        { duration, easing: easing.move },
        "size",
      );
    },
  };
}
export function revealPanel(
  panel: HTMLElement,
  direction = 1,
  keyboard = false,
) {
  cancelMotion(panel, "panel");
  if (!keyboard)
    motionPlay(
      panel,
      [
        { opacity: 0.6, transform: `translateX(${direction * 10}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 210, easing: easing.move },
      "panel",
    );
}
export function initTabIndicator(tabs: HTMLButtonElement[]) {
  const list = tabs[0]?.parentElement;
  if (!list) return () => {};
  const marker = document.createElement("span");
  marker.className = "velia-tab-indicator";
  marker.setAttribute("aria-hidden", "true");
  list.append(marker);
  let current =
    tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  const position = (button: HTMLButtonElement, animate = true) => {
    current = button;
    const prior = marker.getBoundingClientRect();
    const base = list.getBoundingClientRect(),
      rect = button.getBoundingClientRect();
    cancelMotion(marker, "indicator");
    marker.style.width = `${rect.width}px`;
    marker.style.left = `${rect.left - base.left + list.scrollLeft}px`;
    if (animate && prior.width > 0) {
      const next = marker.getBoundingClientRect();
      motionPlay(
        marker,
        [
          {
            transform: `translateX(${prior.left - next.left}px) scaleX(${prior.width / next.width})`,
          },
          { transform: "none" },
        ],
        { duration: 220, easing: easing.move },
        "indicator",
      );
    }
  };
  position(current, false);
  const observer = new ResizeObserver(() => position(current, false));
  observer.observe(list);
  document.fonts.ready.then(() => position(current, false));
  return position;
}
export function initMegaMotion(details: HTMLDetailsElement) {
  const trigger = details.querySelector<HTMLElement>("summary")!,
    panel = details.querySelector<HTMLElement>(".velia-mega-panel")!,
    host = details.closest<HTMLElement>(".skin-header")!;
  let ghost: HTMLElement | undefined;
  const setOpen = (open: boolean) => {
    ghost?.remove();
    ghost = undefined;
    if (open === details.open) return;
    if (!open) {
      ghost = visualGhost(panel, host);
      if (panel.contains(document.activeElement))
        trigger.focus({ preventScroll: true });
      details.open = false;
      cancelMotion(panel, "mega");
      return;
    }
    details.open = true;
    const rect = panel.getBoundingClientRect(),
      origin = trigger.getBoundingClientRect();
    panel.style.transformOrigin = `${origin.left + origin.width / 2 - rect.left}px top`;
    motionPlay(
      panel,
      [
        { opacity: 0.35, transform: "translateY(-7px) scale(.985)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 240, easing: easing.enter },
      "mega",
    );
  };
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    setOpen(!details.open);
  });
  document.addEventListener("click", (e) => {
    if (e.target instanceof Node && !details.contains(e.target)) setOpen(false);
  });
  details.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });
  resetters.add(() => {
    ghost?.remove();
    ghost = undefined;
  });
}
export function initPointerMotion(image: HTMLElement) {
  const area = image.parentElement;
  if (!area) return;
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  let frame = 0,
    last = 0,
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    tx = 0,
    ty = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    x = y = vx = vy = tx = ty = 0;
    image.style.transform = "";
    image.style.willChange = "";
  };
  // Analytic critically damped spring: displacement and velocity survive each retarget.
  const advance = (
    value: number,
    velocity: number,
    target: number,
    dt: number,
  ) => {
    const delta = value - target,
      omega = 18,
      c = velocity + omega * delta,
      decay = Math.exp(-omega * dt);
    return [
      target + (delta + c * dt) * decay,
      (velocity - omega * c * dt) * decay,
    ];
  };
  const tick = (time: number) => {
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
    last = time;
    [x, vx] = advance(x, vx, tx, dt);
    [y, vy] = advance(y, vy, ty, dt);
    image.style.transform = `translate3d(${x}px,${y}px,0) rotate(${x * 0.07}deg)`;
    if (
      Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) >
      0.06
    )
      frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      last = 0;
      image.style.willChange = "";
      if (tx === 0 && ty === 0) image.style.transform = "";
    }
  };
  const start = () => {
    if (!frame) {
      image.style.willChange = "transform";
      frame = requestAnimationFrame(tick);
    }
  };
  area.addEventListener("pointermove", (e) => {
    if (!fine.matches || motionMedia.matches || e.pointerType === "touch")
      return;
    const r = area.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 12 - 6;
    ty = ((e.clientY - r.top) / r.height) * 8 - 4;
    start();
  });
  area.addEventListener("pointerleave", () => {
    tx = ty = 0;
    if (fine.matches && !motionMedia.matches) start();
    else reset();
  });
  fine.addEventListener("change", reset);
  resetters.add(reset);
}
export function initHeroMotion() {
  const hero = document.querySelector(".velia-hero");
  if (!hero || motionMedia.matches) return;
  let first = true;
  try {
    first = sessionStorage.getItem("velia-intro-v2") !== "seen";
    sessionStorage.setItem("velia-intro-v2", "seen");
  } catch {}
  if (!first) return;
  const art = hero.querySelector(".velia-hero-art>a");
  if (art)
    motionPlay(
      art,
      [
        { opacity: 0.7, transform: "translateY(18px) scale(.965)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 600, easing: easing.settle },
      "intro",
    );
  hero.querySelectorAll(".velia-hero-line").forEach((line, i) =>
    motionPlay(
      line,
      [
        { opacity: 0.65, transform: "translateY(12px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 460, delay: 40 + i * 45, easing: easing.enter },
      "intro",
    ),
  );
}
export function initMobilePurchase(bar: HTMLElement, purchase: Element) {
  let shown = false;
  let frame = 0;
  const setVisible = (show: boolean) => {
    if (show === shown) return;
    if (!show && bar.contains(document.activeElement)) {
      const primary =
        purchase.querySelector<HTMLButtonElement>("[data-add-product]");
      if (primary && primary.getBoundingClientRect().top < 0) return;
      primary?.focus({ preventScroll: true });
    }
    shown = show;
    const existing = getComputedStyle(bar);
    const prior = { opacity: existing.opacity, transform: existing.transform };
    const wasVisible = !bar.hidden;
    cancelMotion(bar, "sticky");
    if (show) {
      bar.hidden = false;
      motionPlay(
        bar,
        [
          wasVisible ? prior : { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 220, easing: easing.enter },
        "sticky",
      );
    } else if (motionMedia.matches || !wasVisible) bar.hidden = true;
    else {
      bar.inert = true;
      const animation = motionPlay(
        bar,
        [prior, { opacity: 0, transform: "translateY(8px)" }],
        { duration: 150, easing: easing.exit },
        "sticky",
      );
      animation?.finished
        .then(() => {
          if (!shown) bar.hidden = true;
        })
        .catch(() => {});
    }
    bar.inert = !show;
  };
  const update = () => {
    frame = 0;
    const r = purchase.getBoundingClientRect();
    setVisible(r.bottom < -8);
  };
  addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  addEventListener("resize", update);
  resetters.add(() => {
    cancelAnimationFrame(frame);
    frame = 0;
    bar.hidden = !shown;
    bar.inert = !shown;
  });
  update();
}
export function animateReceipt(receipt: HTMLElement) {
  motionPlay(
    receipt,
    [
      { opacity: 0.65, transform: "translateY(10px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 280, easing: easing.enter },
    "receipt",
  );
  const path = receipt.querySelector<SVGPathElement>(".skin-receipt-mark path");
  if (path) {
    const length = path.getTotalLength();
    motionPlay(
      path,
      [
        { strokeDasharray: `${length}`, strokeDashoffset: length },
        { strokeDasharray: `${length}`, strokeDashoffset: 0 },
      ],
      { duration: 300, easing: easing.enter },
      "check",
    );
  }
}
