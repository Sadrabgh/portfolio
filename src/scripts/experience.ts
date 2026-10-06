import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(hover: hover) and (pointer: fine)");
let teardown: (() => void) | undefined;

function startExperience() {
  teardown?.();
  const removers: (() => void)[] = [];
  function listen(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(event, handler, options);
    removers.push(() => target.removeEventListener(event, handler, options));
  }
  const progress = document.querySelector<HTMLElement>(".reading-progress");
  const header = document.querySelector<HTMLElement>(".site-header");
  let scrollQueued = false;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress)
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    header?.classList.toggle("scrolled", scrollY > 120);
    scrollQueued = false;
  };
  listen(
    window,
    "scroll",
    (() => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateScroll);
      }
    }) as EventListener,
    { passive: true },
  );
  listen(window, "resize", updateScroll);
  updateScroll();
  let cursorFrame = 0;
  const cursor = document.querySelector<HTMLElement>(".pointer-orbit");
  if (!reduced.matches) {
    const context = gsap.context(() => {
      if (document.querySelector(".hero")) {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(
            ".hero .availability",
            { y: 20, opacity: 0, duration: 0.8 },
            0.15,
          )
          .from(
            ".hero-line",
            {
              yPercent: 35,
              opacity: 0,
              rotation: 2,
              stagger: 0.13,
              duration: 1.3,
            },
            0.25,
          )
          .from(
            ".hero-copy > p,.hero-actions,.hero-note",
            { y: 26, opacity: 0, stagger: 0.1, duration: 1 },
            0.65,
          )
          .from(
            ".scene-shell",
            { scale: 0.85, opacity: 0, duration: 1.7 },
            0.15,
          )
          .from(".hero-foot", { opacity: 0, duration: 1 }, 1);
      }
      // Animate whole lines to keep Persian letter shaping intact.
      document
        .querySelectorAll<HTMLElement>(
          ".page-intro,.case-heading,.form-hero>div:not(.architecture-hero-image),.luma-hero>div:first-child,.orbit-copy",
        )
        .forEach((el) => {
          gsap.from(el.children, {
            y: 35,
            opacity: 0,
            stagger: 0.12,
            duration: 1.1,
            delay: 0.15,
            ease: "power3.out",
          });
        });
      const reveals = new Set(
        document.querySelectorAll<HTMLElement>(
          "[data-reveal],.section-heading,.skill-grid>div,.principles>div,.service-detail,.case-meta,.prose,.demo-section-head,.architecture-card,.product-card,.form-studio,.form-inquiry,.luma-details,.orbit-specs,.contact-form,.contact-aside,.next-project",
        ),
      );
      Array.from(reveals).forEach((el, index) => {
        gsap.from(el, {
          y: 55,
          opacity: 0.05,
          duration: 1.15,
          delay: (index % 3) * 0.05,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: "top 93%", once: true },
        });
      });
      document.querySelectorAll<HTMLElement>(".process-grid").forEach((el) => {
        gsap.from(el.children, {
          y: 45,
          opacity: 0,
          stagger: 0.13,
          duration: 1.1,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
      document
        .querySelectorAll<HTMLElement>(
          ".project-visual img,.architecture-hero-image img",
        )
        .forEach((img) => {
          gsap.fromTo(
            img,
            { scale: 1.09 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: img,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.4,
              },
            },
          );
        });
      if (document.querySelector(".hero-ghost"))
        gsap.to(".hero-ghost", {
          xPercent: -12,
          y: 100,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      document
        .querySelectorAll<HTMLElement>(".abstract-monogram")
        .forEach((el) => {
          gsap.fromTo(
            el,
            { rotation: -12 },
            {
              rotation: 8,
              y: -35,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.8,
              },
            },
          );
        });
      if (fine.matches) {
        document
          .querySelectorAll<HTMLElement>(
            ".button,.circle-link,.project-open,.demo-button",
          )
          .forEach((el) => {
            listen(el, "pointermove", ((event: PointerEvent) => {
              const r = el.getBoundingClientRect();
              gsap.to(el, {
                x: (event.clientX - r.left - r.width / 2) * 0.16,
                y: (event.clientY - r.top - r.height / 2) * 0.2,
                duration: 0.45,
                ease: "power3.out",
              });
            }) as EventListener);
            listen(el, "pointerleave", (() =>
              gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "elastic.out(1,.45)",
              })) as EventListener);
          });
        document
          .querySelectorAll<HTMLElement>("[data-tilt],.project-visual")
          .forEach((el) => {
            listen(el, "pointermove", ((event: PointerEvent) => {
              const r = el.getBoundingClientRect();
              gsap.to(el, {
                rotateY: ((event.clientX - r.left) / r.width - 0.5) * 5,
                rotateX: -((event.clientY - r.top) / r.height - 0.5) * 5,
                transformPerspective: 1100,
                duration: 0.8,
                ease: "power3.out",
              });
            }) as EventListener);
            listen(el, "pointerleave", (() =>
              gsap.to(el, {
                rotateX: 0,
                rotateY: 0,
                duration: 1.2,
                ease: "power3.out",
              })) as EventListener);
          });
      }
    });
    removers.push(() => context.revert());
    if (fine.matches && cursor) {
      let x = -100,
        y = -100,
        cx = -100,
        cy = -100;
      let present = false;
      listen(
        document,
        "pointermove",
        ((e: PointerEvent) => {
          x = e.clientX;
          y = e.clientY;
          present = true;
          const target = e.target instanceof Element ? e.target : null;
          cursor.classList.toggle(
            "active",
            !!target?.closest("a,button,input,summary,select,textarea"),
          );
          cursor.classList.toggle("view", !!target?.closest(".project-visual"));
        }) as EventListener,
        { passive: true },
      );
      listen(document, "pointerleave", (() => {
        present = false;
      }) as EventListener);
      const tick = () => {
        cx += (x - cx) * 0.2;
        cy += (y - cy) * 0.2;
        cursor.style.transform = `translate3d(${cx - cursor.offsetWidth / 2}px,${cy - cursor.offsetHeight / 2}px,0)`;
        cursor.style.opacity = present ? "1" : "0";
        cursorFrame = requestAnimationFrame(tick);
      };
      tick();
    }
  }
  // Filters change height: refresh scroll triggers after each result update.
  document
    .querySelectorAll("[data-filter],[data-house-filter],[data-product-filter]")
    .forEach((el) =>
      listen(el, "click", (() =>
        requestAnimationFrame(() => ScrollTrigger.refresh())) as EventListener),
    );
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  teardown = () => {
    cancelAnimationFrame(cursorFrame);
    removers.reverse().forEach((fn) => fn());
    if (cursor) cursor.style.opacity = "0";
    teardown = undefined;
  };
}
startExperience();
reduced.addEventListener("change", startExperience);
window.addEventListener("pagehide", () => teardown?.());
window.addEventListener("pageshow", (e) => {
  if (e.persisted) startExperience();
});
