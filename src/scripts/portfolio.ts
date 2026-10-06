const root = document.documentElement;
const motionMedia = matchMedia("(prefers-reduced-motion: reduce)");
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
// ASVS 14.3.3: persist appearance preferences only; never contact data.
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
const reduced = () => root.dataset.motion === "reduce";
const animations = new Set<Animation>();
const motionReset = new Set<() => void>();
const cleanup = new Set<() => void>();
function syncTheme() {
  const dark = root.dataset.theme === "dark";
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
    .forEach((button) => {
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute(
        "aria-label",
        dark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تیره",
      );
      button.title = dark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تیره";
      const label = button.querySelector(".theme-label");
      if (label) label.textContent = dark ? "حالت روشن" : "حالت تیره";
    });
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#151515" : "#ffffff");
}
let themeSwitchFrame = 0;
function applyTheme(theme: "light" | "dark") {
  cancelAnimationFrame(themeSwitchFrame);
  root.dataset.themeSwitching = "";
  root.dataset.theme = theme;
  syncTheme();
  // Resolve the new palette with transitions suppressed before the next frame.
  void root.offsetHeight;
  themeSwitchFrame = requestAnimationFrame(() => {
    delete root.dataset.themeSwitching;
  });
}
function syncMotion() {
  root.dataset.motion =
    motionMedia.matches || read("portfolio-motion") === "reduce"
      ? "reduce"
      : "full";
  if (reduced()) {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    // CSS dialog exit transitions retain their timing when already closing.
    // Settle those too when motion sensitivity changes during an interaction.
    document.getAnimations().forEach((animation) => {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    });
    document
      .querySelectorAll(".reveal-waiting")
      .forEach((element) => element.classList.remove("reveal-waiting"));
    motionReset.forEach((reset) => reset());
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-motion-toggle]")
    .forEach((button) => {
      button.setAttribute("aria-pressed", String(reduced()));
      button.disabled = motionMedia.matches;
    });
}
syncTheme();
syncMotion();
document
  .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      save("portfolio-theme", nextTheme);
    }),
  );
document
  .querySelectorAll<HTMLButtonElement>("[data-motion-toggle]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      save("portfolio-motion", reduced() ? "full" : "reduce");
      syncMotion();
    }),
  );
motionMedia.addEventListener("change", syncMotion);
window.addEventListener("storage", (event) => {
  if (event.key === "portfolio-theme") {
    applyTheme(event.newValue === "dark" ? "dark" : "light");
  }
  if (event.key === "portfolio-motion") syncMotion();
});

// Measured Moonex fade: 1200ms ease, 100ms sibling offsets, no translation.
const revealAnimations = new WeakMap<Element, Animation>();
function reveal(element: HTMLElement, immediate = false) {
  element.classList.remove("reveal-waiting");
  if (immediate || reduced()) {
    revealAnimations.get(element)?.cancel();
    return;
  }
  const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 1200,
    delay: Math.min(500, Number(element.dataset.delay) || 0),
    easing: "ease",
    fill: "backwards",
  });
  animations.add(animation);
  revealAnimations.set(element, animation);
  animation.finished
    .then(() => animations.delete(animation))
    .catch(() => animations.delete(animation));
}
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        reveal(entry.target as HTMLElement);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "0px 0px -100px 0px", threshold: 0 },
);
document
  .querySelectorAll<HTMLElement>("[data-motion-reveal]")
  .forEach((element) => {
    if (reduced()) return;
    if (element.getBoundingClientRect().top < innerHeight - 100)
      reveal(element);
    else {
      element.classList.add("reveal-waiting");
      revealObserver.observe(element);
    }
  });
document.addEventListener("focusin", (event) => {
  const element = (event.target as Element).closest<HTMLElement>(
    "[data-motion-reveal]",
  );
  if (element) {
    revealObserver.unobserve(element);
    reveal(element, true);
  }
});
cleanup.add(() => revealObserver.disconnect());

const countObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      const element = entry.target as HTMLElement;
      const end = Number(element.dataset.count) || 0;
      let frame = 0;
      const finish = () => {
        cancelAnimationFrame(frame);
        element.textContent = end.toLocaleString("fa-IR");
      };
      motionReset.add(finish);
      cleanup.add(finish);
      if (reduced()) {
        finish();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        element.textContent = Math.round(
          end * (1 - Math.pow(1 - t, 3)),
        ).toLocaleString("fa-IR");
        if (t < 1 && !reduced()) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }),
  { threshold: 0.5 },
);
document
  .querySelectorAll("[data-count]")
  .forEach((element) => countObserver.observe(element));
cleanup.add(() => countObserver.disconnect());

// Infinite manual track, matching the reference's 900ms ease. No autoplay.
document
  .querySelectorAll<HTMLElement>("[data-carousel]")
  .forEach((carousel) => {
    const viewport = carousel.querySelector<HTMLElement>(".carousel-viewport");
    const track = carousel.querySelector<HTMLElement>(".carousel-track");
    if (!viewport || !track) return;
    const slides = [...track.children] as HTMLElement[];
    const total = slides.length;
    if (total < 2) return;
    slides.forEach((slide, index) => {
      slide.dataset.slideIndex = String(index);
    });
    function clones() {
      return slides.map((slide) => {
        const clone = slide.cloneNode(true) as HTMLElement;
        clone.dataset.clone = "true";
        clone.setAttribute("aria-hidden", "true");
        clone.removeAttribute("id");
        clone
          .querySelectorAll("[id]")
          .forEach((element) => element.removeAttribute("id"));
        clone
          .querySelectorAll<HTMLElement>(
            "a,button,input,select,textarea,[tabindex]",
          )
          .forEach((element) => (element.tabIndex = -1));
        return clone;
      });
    }
    track.prepend(...clones());
    track.append(...clones());
    carousel.classList.add("carousel-ready");
    carousel.setAttribute("aria-roledescription", "اسلایدر");
    carousel
      .querySelectorAll<HTMLElement>(
        "[data-carousel-controls],[data-carousel-dots]",
      )
      .forEach((element) => (element.hidden = false));
    let logical = 0,
      virtual = total,
      step = 0,
      sign = 1,
      settledTimer: ReturnType<typeof setTimeout>;
    const modulo = (value: number) => ((value % total) + total) % total;
    const transform = (value: number) => `translate3d(${sign * value}px,0,0)`;
    function current() {
      return new DOMMatrixReadOnly(getComputedStyle(track!).transform).m41;
    }
    function instant(position: number) {
      track!.style.transition = "none";
      track!.style.transform = transform(position * step);
    }
    function status(announce = true) {
      carousel.dataset.slide = String(logical);
      carousel
        .querySelectorAll<HTMLElement>("[data-carousel-dot]")
        .forEach((dot) =>
          dot.setAttribute(
            "aria-pressed",
            String(Number(dot.dataset.carouselDot) === logical),
          ),
        );
      const label = carousel.querySelector<HTMLElement>(
        "[data-carousel-status]",
      );
      if (announce && label)
        label.textContent = `مورد ${new Intl.NumberFormat("fa").format(logical + 1)} از ${new Intl.NumberFormat("fa").format(total)}`;
    }
    function settle() {
      clearTimeout(settledTimer);
      virtual = total + logical;
      instant(virtual);
      track!.style.willChange = "";
    }
    function measure() {
      carousel.style.setProperty(
        "--carousel-width",
        `${viewport!.clientWidth}px`,
      );
      const style = getComputedStyle(carousel);
      const gap = parseFloat(style.getPropertyValue("--slide-gap")) || 0;
      step = slides[0].getBoundingClientRect().width + gap;
      sign = getComputedStyle(track!).direction === "rtl" ? 1 : -1;
      settle();
    }
    function move(amount: number) {
      clearTimeout(settledTimer);
      if (virtual < total - 1 || virtual > 2 * total - 1) {
        const shift = virtual < total ? total : -total;
        const previous = current();
        track!.style.transition = "none";
        track!.style.transform = `translate3d(${previous + sign * shift * step}px,0,0)`;
        virtual += shift;
        // Flush only at an infinite-wrap boundary; never in an animation frame.
        void track!.offsetWidth;
      }
      virtual += amount;
      logical = modulo(logical + amount);
      status();
      if (reduced()) {
        settle();
        return;
      }
      track!.style.willChange = "transform";
      track!.style.transition = "transform 900ms ease";
      track!.style.transform = transform(virtual * step);
      settledTimer = setTimeout(settle, 940);
    }
    carousel
      .querySelector("[data-carousel-prev]")
      ?.addEventListener("click", () => move(-1));
    carousel
      .querySelector("[data-carousel-next]")
      ?.addEventListener("click", () => move(1));
    carousel
      .querySelectorAll<HTMLElement>("[data-carousel-dot]")
      .forEach((dot) =>
        dot.addEventListener("click", () =>
          move(Number(dot.dataset.carouselDot) - logical),
        ),
      );
    carousel.addEventListener("keydown", (event) => {
      if (
        event.target !== carousel ||
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      event.preventDefault();
      move(event.key === "ArrowLeft" ? sign : -sign);
    });
    track.addEventListener("transitionend", (event) => {
      if (event.target === track && event.propertyName === "transform")
        settle();
    });
    // Keep focus on original content visible immediately, independent of motion.
    track.addEventListener("focusin", (event) => {
      const slide = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-slide-index]",
      );
      if (!slide || slide.dataset.clone) return;
      const box = slide.getBoundingClientRect(),
        view = viewport.getBoundingClientRect();
      if (box.left < view.left - 2 || box.right > view.right + 2) {
        logical = Number(slide.dataset.slideIndex);
        settle();
        status();
      }
    });
    track.addEventListener("pointerdown", (event) => {
      if ((event.target as HTMLElement).closest("[data-clone]"))
        event.preventDefault();
    });
    let drag:
      | {
          id: number;
          x: number;
          y: number;
          start: number;
          dx: number;
          active: boolean;
          previousX: number;
          previousTime: number;
          velocity: number;
        }
      | undefined;
    let suppressClick = false;
    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: current(),
        dx: 0,
        active: false,
        previousX: event.clientX,
        previousTime: event.timeStamp,
        velocity: 0,
      };
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          drag = undefined;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        drag.active = true;
        clearTimeout(settledTimer);
        track!.style.transition = "none";
        viewport!.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      drag.dx = dx;
      const dt = event.timeStamp - drag.previousTime;
      if (dt > 0) drag.velocity = (event.clientX - drag.previousX) / dt;
      drag.previousX = event.clientX;
      drag.previousTime = event.timeStamp;
      track!.style.transform = `translate3d(${drag.start + dx}px,0,0)`;
    });
    function release(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const state = drag;
      drag = undefined;
      if (!state.active) return;
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      if (viewport!.hasPointerCapture(event.pointerId))
        viewport!.releasePointerCapture(event.pointerId);
      if (
        event.type !== "pointercancel" &&
        (Math.abs(state.dx) > 50 ||
          (Math.abs(state.dx) > 20 && Math.abs(state.velocity) > 0.3))
      )
        move(Math.sign(state.dx) * sign);
      else move(0);
    }
    viewport.addEventListener("pointerup", release);
    viewport.addEventListener("pointercancel", release);
    viewport.addEventListener(
      "click",
      (event) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    const observer = new ResizeObserver(measure);
    viewport.addEventListener("dragstart", (event) => event.preventDefault());
    observer.observe(viewport);
    measure();
    status(false);
    motionReset.add(settle);
    cleanup.add(() => {
      observer.disconnect();
      clearTimeout(settledTimer);
      settle();
    });
  });

const filters = document.querySelector<HTMLElement>("[data-portfolio-filters]");
if (filters) {
  filters.hidden = false;
  const tiles = [
    ...document.querySelectorAll<HTMLElement>(
      "[data-portfolio-grid] [data-portfolio-item]",
    ),
  ];
  filters
    .querySelectorAll<HTMLButtonElement>("[data-filter]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        filters
          .querySelectorAll("[data-filter]")
          .forEach((item) =>
            item.setAttribute("aria-pressed", String(item === button)),
          );
        let count = 0;
        tiles.forEach((tile) => {
          const wrapper =
            tile.closest<HTMLElement>(".portfolio-grid-entry") || tile;
          wrapper.hidden =
            button.dataset.filter !== "all" &&
            tile.dataset.category !== button.dataset.filter;
          if (!wrapper.hidden) {
            count++;
            revealObserver.unobserve(wrapper);
            reveal(wrapper);
          }
        });
        // ASVS 1.2.1: dynamic labels use textContent, never user-controlled HTML.
        const status = document.querySelector("[data-filter-status]");
        if (status)
          status.textContent =
            new Intl.NumberFormat("fa").format(count) + " پروژهٔ نمایشی";
      }),
    );
}

const topSentinel = document.querySelector(".scroll-top-sentinel");
const floatingTop = document.querySelector<HTMLElement>("[data-floating-top]");
if (topSentinel && floatingTop) {
  const topObserver = new IntersectionObserver(([entry]) => {
    floatingTop.hidden = entry.isIntersecting;
  }, { rootMargin: "650px 0px 0px 0px" });
  topObserver.observe(topSentinel);
  cleanup.add(() => topObserver.disconnect());
}

const outer = document.querySelector<HTMLElement>(".cursor-follower");
const dot = document.querySelector<HTMLElement>(".cursor-dot");
if (outer && dot) {
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  let frame = 0,
    x = 0,
    y = 0,
    fx = 0,
    fy = 0,
    active = false,
    last = 0;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    active = false;
    delete root.dataset.cursorActive;
    outer!.style.willChange = "";
    dot!.style.willChange = "";
  }
  function tick(now: number) {
    const amount = 1 - Math.exp(-Math.min(50, now - last) / 65);
    last = now;
    fx += (x - fx) * amount;
    fy += (y - fy) * amount;
    outer!.style.transform = `translate3d(${fx - 22}px,${fy - 22}px,0)`;
    if (Math.abs(x - fx) + Math.abs(y - fy) > 0.1)
      frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      outer!.style.willChange = "";
    }
  }
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        event.pointerType !== "mouse" ||
        reduced() ||
        !fine.matches ||
        document.querySelector("dialog[open]")
      ) {
        stop();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      if (!active) {
        fx = x;
        fy = y;
        active = true;
        root.dataset.cursorActive = "true";
      }
      dot!.style.transform = `translate3d(${x - 4}px,${y - 4}px,0)`;
      const target = event.target as HTMLElement;
      outer!.dataset.link = String(
        !!target.closest("a,button,summary,input,select,textarea"),
      );
      dot!.dataset.link = outer!.dataset.link;
      if (!frame) {
        last = performance.now();
        outer!.style.willChange = "transform";
        frame = requestAnimationFrame(tick);
      }
    },
    { passive: true },
  );
  document.addEventListener("keydown", stop);
  document.documentElement.addEventListener("pointerleave", stop);
  document.addEventListener("portfolio:menu-open", stop);
  document.addEventListener("portfolio:lightbox-open", stop);
  fine.addEventListener("change", stop);
  motionReset.add(stop);
  cleanup.add(stop);
}

const lightbox = document.querySelector<HTMLDialogElement>(".media-lightbox");
if (lightbox) {
  let trigger: HTMLAnchorElement | undefined;
  document
    .querySelectorAll<HTMLAnchorElement>("[data-lightbox]")
    .forEach((link) =>
      link.addEventListener("click", (event) => {
        event.preventDefault();
        trigger = link;
        const image = lightbox.querySelector("img"),
          caption = lightbox.querySelector("p");
        if (image) {
          image.src = link.href;
          image.alt = link.querySelector("img")?.alt || "دفتر تصویری استودیو";
        }
        if (caption) caption.textContent = image?.alt || "";
        lightbox.showModal();
        document.body.style.overflow = "hidden";
        lightbox.querySelector<HTMLButtonElement>(".lightbox-close")?.focus();
        document.dispatchEvent(new CustomEvent("portfolio:lightbox-open"));
      }),
    );
  lightbox
    .querySelector(".lightbox-close")
    ?.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("close", () => {
    document.body.style.overflow = "";
    trigger?.focus();
  });
  cleanup.add(() => {
    if (lightbox.open) lightbox.close();
  });
}
window.addEventListener("pagehide", (event) => {
  animations.forEach((animation) => animation.cancel());
  if (lightbox?.open) lightbox.close();
  if (event.persisted) motionReset.forEach((fn) => fn());
  else cleanup.forEach((fn) => fn());
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted)
    document
      .querySelectorAll(".reveal-waiting")
      .forEach((element) => element.classList.remove("reveal-waiting"));
});
