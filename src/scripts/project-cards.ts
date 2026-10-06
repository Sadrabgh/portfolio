import { gsap } from "gsap";

const root = document.documentElement;
const reduced = () => root.dataset.motion === "reduce";
const disposers: Array<() => void> = [];

// The real HTML card is the 3D object: its image, copy and native links share
// one perspective transform. Glass faces and four edge planes give it volume.
// No screenshot of the text and no canvas hit targets are involved.
document
  .querySelectorAll<HTMLElement>("[data-project-gallery]")
  .forEach((gallery) => {
    if (!CSS.supports("perspective", "1000px")) return;
    const stage = gallery.querySelector<HTMLElement>("[data-gallery-stage]")!;
    const cards = [
      ...gallery.querySelectorAll<HTMLElement>("[data-project-card]"),
    ];
    const bodies = cards.map((card) =>
      card.querySelector<HTMLElement>(".project-glass")!,
    );
    const selectors = [
      ...gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-select]"),
    ];
    const steps = [
      ...gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-step]"),
    ];
    const status = gallery.querySelector<HTMLElement>("[data-gallery-status]")!;
    const hint = gallery.querySelector<HTMLElement>("[data-gallery-hint]")!;
    if (!cards.length) return;
    let active = Math.max(
      0,
      cards.findIndex((card) => card.dataset.project === "luma"),
    );
    let compact = false,
      width = 0,
      spacing = 0,
      dead = false;
    let drag: {
      id: number;
      x: number;
      y: number;
      dx: number;
      moved: boolean;
    } | null = null;
    let suppressClickUntil = 0;
    let pointerFocusing = false;
    const wrap = (n: number) => (n + cards.length) % cards.length;
    const offset = (i: number) => {
      const n = wrap(i - active);
      return n > cards.length / 2 ? n - cards.length : n;
    };
    const resetLean = (immediate = false) => {
      bodies.forEach((body) =>
        gsap.to(body, {
          "--lean-x": "0deg",
          "--lean-y": "0deg",
          duration: immediate || reduced() ? 0 : 0.25,
          overwrite: true,
        }),
      );
      cards.forEach((card) => (card.dataset.pose = "rest"));
    };
    function position(animate: boolean, displacement = 0) {
      const quiet = reduced();
      gallery.dataset.motion = quiet ? "reduce" : "full";
      cards.forEach((card, i) => {
        const distance = offset(i),
          selected = i === active;
        // Positive index progression goes to the left, matching the RTL gallery.
        const x = -distance * spacing + displacement;
        const yaw = quiet ? 0 : distance * (compact ? 23 : 16);
        const z = quiet ? 0 : selected ? 26 : compact ? -115 : -60;
        gsap.to(card, {
          "--card-x": `${x}px`,
          "--card-z": `${z}px`,
          "--card-yaw": `${yaw}deg`,
          "--card-y": selected ? "0px" : quiet ? "0px" : "9px",
          duration: animate && !quiet ? 0.72 : 0,
          ease: "power3.out",
          overwrite: "auto",
        });
        card.dataset.selected = String(selected);
        card.style.zIndex = selected ? "3" : "1";
        const outside = Math.abs(distance) > 1;
        const hidden = outside || (compact && !selected);
        card.style.visibility = outside ? "hidden" : "visible";
        // Only the visible mobile card participates in focus or screen-reader order.
        card.inert = hidden;
        if (hidden) card.setAttribute("aria-hidden", "true");
        else card.removeAttribute("aria-hidden");
        selectors[i].setAttribute("aria-pressed", String(selected));
      });
      gallery.dataset.active = cards[active].dataset.project;
      gallery.dataset.index = String(active);
    }
    function select(index: number, animate = true, announce = true) {
      const next = wrap(index);
      // Move focus out of a card before making that card inert on a narrow screen.
      if (
        compact &&
        next !== active &&
        cards[active].contains(document.activeElement)
      )
        selectors[next].focus({ preventScroll: true });
      active = next;
      resetLean(true);
      position(animate);
      if (announce)
        status.textContent = `${active + 1} از ${cards.length}؛ ${cards[active].dataset.title}`;
    }
    const layout = () => {
      if (dead) return;
      compact = stage.clientWidth < 900;
      width = compact
        ? Math.min(370, stage.clientWidth - 40)
        : Math.min(370, (stage.clientWidth - 60) / 3);
      spacing = compact ? width * 0.99 : width + 24;
      gallery.style.setProperty("--card-width", `${Math.max(220, width)}px`);
      gallery.dataset.compact = String(compact);
      const height = Math.max(...cards.map((card) => card.offsetHeight));
      stage.style.height = `${height + 58}px`;
      position(false);
    };
    gallery.dataset.ready = "true";
    stage.tabIndex = 0;
    stage.setAttribute("aria-describedby", hint.id);
    layout();
    const controls: Array<[HTMLElement, EventListener]> = [];
    selectors.forEach((button, i) => {
      const click = () => select(i);
      button.addEventListener("click", click);
      controls.push([button, click]);
    });
    steps.forEach((button) => {
      const click = () => select(active + Number(button.dataset.galleryStep));
      button.addEventListener("click", click);
      controls.push([button, click]);
    });
    const key = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest("a,button,input,textarea,select")
      )
        return;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      select(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? cards.length - 1
            : active + (event.key === "ArrowLeft" ? 1 : -1),
      );
    };
    stage.addEventListener("keydown", key);
    const focus = (event: FocusEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-project-card]",
      );
      if (!card) return;
      if (pointerFocusing) {
        resetLean(true);
        return;
      }
      const index = cards.indexOf(card);
      if (index !== active) select(index, false);
      resetLean(true);
      card.dataset.pose = "reading";
    };
    stage.addEventListener("focusin", focus);
    const down = (event: PointerEvent) => {
      suppressClickUntil = 0;
      pointerFocusing = true;
      requestAnimationFrame(() => {
        pointerFocusing = false;
      });
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        (event.target as HTMLElement).closest(".project-caption a,button") ||
        (event.pointerType === "mouse" &&
          (event.target as HTMLElement).closest(".project-caption"))
      )
        return;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        moved: false,
      };
      resetLean(true);
    };
    const move = (event: PointerEvent) => {
      if (drag && drag.id === event.pointerId) {
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y;
        if (!drag.moved) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
            drag = null;
            return;
          }
          if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          drag.moved = true;
          stage.setPointerCapture(event.pointerId);
          gallery.dataset.dragging = "true";
        }
        drag.dx = dx;
        event.preventDefault();
        position(
          false,
          Math.max(-spacing * 0.8, Math.min(spacing * 0.8, dx * 0.72)),
        );
        return;
      }
      if (event.pointerType !== "mouse" || reduced()) return;
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-project-card]",
      );
      if (!card || card !== cards[active]) {
        resetLean();
        return;
      }
      if (
        (event.target as HTMLElement).closest(".project-caption,a:focus") ||
        card.contains(document.activeElement)
      ) {
        resetLean();
        card.dataset.pose = "reading";
        return;
      }
      const bounds = card.getBoundingClientRect();
      const x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      card.dataset.pose = "hover";
      gsap.to(bodies[active], {
        "--lean-x": `${-y * 4}deg`,
        "--lean-y": `${x * 7}deg`,
        duration: 0.38,
        ease: "power2.out",
        overwrite: true,
      });
    };
    const end = (event: PointerEvent) => {
      // Touch starts with implicit capture on the image. Moving that capture to
      // the stage emits a bubbling loss on the image, not a loss of our drag.
      if (event.type === "lostpointercapture" && event.target !== stage) return;
      if (!drag || drag.id !== event.pointerId) return;
      const finished = drag;
      drag = null;
      delete gallery.dataset.dragging;
      if (stage.hasPointerCapture(event.pointerId))
        stage.releasePointerCapture(event.pointerId);
      if (finished.moved) {
        suppressClickUntil = performance.now() + 400;
        const changed =
          event.type !== "pointercancel" &&
          Math.abs(finished.dx) > Math.min(75, width * 0.19);
        select(active + (changed ? (finished.dx > 0 ? 1 : -1) : 0));
      }
    };
    const blockClick = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const leave = () => {
      if (!drag) resetLean();
    };
    const dragStart = (event: DragEvent) => event.preventDefault();
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("lostpointercapture", end);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("click", blockClick, true);
    stage.addEventListener("dragstart", dragStart);
    const resize = new ResizeObserver(layout);
    resize.observe(stage);
    bodies.forEach((body) => resize.observe(body));
    const preferences = new MutationObserver(() => {
      resetLean(true);
      hint.textContent = reduced()
        ? "پروژه را انتخاب کنید"
        : "بکشید یا پروژه را انتخاب کنید";
      position(false);
    });
    preferences.observe(root, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    hint.textContent = reduced()
      ? "پروژه را انتخاب کنید"
      : "بکشید یا پروژه را انتخاب کنید";
    const visibility = () => {
      if (document.hidden) {
        resetLean(true);
        position(false);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    const entrance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (!reduced())
            gsap.fromTo(
              cards,
              { opacity: 0.45 },
              {
                opacity: 1,
                duration: 0.8,
                stagger: 0.09,
                clearProps: "opacity",
              },
            );
          entrance.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    entrance.observe(stage);
    disposers.push(() => {
      dead = true;
      resize.disconnect();
      preferences.disconnect();
      entrance.disconnect();
      gsap.killTweensOf([...cards, ...bodies]);
      controls.forEach(([button, fn]) =>
        button.removeEventListener("click", fn),
      );
      stage.removeEventListener("keydown", key);
      stage.removeEventListener("focusin", focus);
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", end);
      stage.removeEventListener("pointercancel", end);
      stage.removeEventListener("lostpointercapture", end);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("click", blockClick, true);
      stage.removeEventListener("dragstart", dragStart);
      document.removeEventListener("visibilitychange", visibility);
    });
  });
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) disposers.forEach((dispose) => dispose());
});
