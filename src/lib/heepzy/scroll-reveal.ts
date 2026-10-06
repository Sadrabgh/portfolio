// Marketing entrances run once; shopping controls and the initial viewport stay ready.
export function initScrollReveal() {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches || !("IntersectionObserver" in window)) return;

  const waiting = new Set<HTMLElement>();
  const active = new Map<HTMLElement, Animation>();
  const showImmediately = (element: HTMLElement) => {
    observer.unobserve(element);
    waiting.delete(element);
    element.classList.remove("hp-reveal-waiting");
    active.get(element)?.cancel();
    active.delete(element);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        showImmediately(element);
        if (preference.matches || element.contains(document.activeElement))
          continue;
        const animation = element.animate(
          [
            { opacity: 0, transform: "translateY(14px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        active.set(element, animation);
        const release = () => {
          if (active.get(element) === animation) active.delete(element);
        };
        animation.finished.then(release, release);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );

  document
    .querySelectorAll<HTMLElement>("[data-rava-reveal]")
    .forEach((element) => {
      // A reload, restored scroll position or tall viewport must not hide visible content.
      if (element.getBoundingClientRect().top < innerHeight) return;
      waiting.add(element);
      element.classList.add("hp-reveal-waiting");
      observer.observe(element);
    });

  const showAll = () => {
    [...waiting, ...active.keys()].forEach(showImmediately);
    observer.disconnect();
  };
  const onPreferenceChange = () => {
    if (preference.matches) showAll();
  };
  const onFocus = (event: FocusEvent) => {
    const element = (event.target as Element).closest<HTMLElement>(
      "[data-rava-reveal]",
    );
    if (element) showImmediately(element);
  };
  preference.addEventListener("change", onPreferenceChange);
  document.addEventListener("focusin", onFocus);
  window.addEventListener(
    "pagehide",
    () => {
      showAll();
      preference.removeEventListener("change", onPreferenceChange);
      document.removeEventListener("focusin", onFocus);
    },
    { once: true },
  );
}
