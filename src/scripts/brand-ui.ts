import { gsap } from "gsap";
const root = document.documentElement;
const safe = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};
const theme = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
function updateTheme() {
  theme?.setAttribute(
    "aria-label",
    root.dataset.demoTheme === "dark"
      ? "فعال‌کردن حالت روشن"
      : "فعال‌کردن حالت تیره",
  );
  window.dispatchEvent(new Event("brand-theme"));
}
updateTheme();
let riftThemeFrame = 0;
theme?.addEventListener("click", () => {
  const rift = document.body.classList.contains("rf-store");
  if (rift) {
    cancelAnimationFrame(riftThemeFrame);
    root.dataset.rfThemeSwitching = "";
  }
  root.dataset.demoTheme = root.dataset.demoTheme === "dark" ? "light" : "dark";
  safe("demo-theme", root.dataset.demoTheme!);
  updateTheme();
  if (rift) {
    void document.body.offsetHeight;
    riftThemeFrame = requestAnimationFrame(() => delete root.dataset.rfThemeSwitching);
  }
});
const motion = document.querySelector<HTMLButtonElement>(
  "[data-motion-toggle]",
);
const system = matchMedia("(prefers-reduced-motion:reduce)");
let timeline: gsap.core.Timeline | undefined;
let observer: IntersectionObserver | undefined;
let entryPlayed = false;
function syncMotion() {
  const reduced = root.dataset.demoMotion === "reduce";
  motion?.setAttribute("aria-pressed", String(reduced));
  motion?.setAttribute(
    "aria-label",
    system.matches
      ? "کاهش حرکت سیستم فعال است"
      : reduced
        ? "فعال‌کردن حرکت"
        : "کاهش حرکت",
  );
  timeline?.kill();
  gsap.killTweensOf("[data-reveal],[data-entry],[data-depth],[data-motion-scene]");
  gsap.set("[data-depth]", { clearProps: "transform" });
  gsap.set(
    ".atelier-hero-photo > img,.rift-campaign-image > img,.rift-editorial > img",
    { clearProps: "transform" },
  );
  observer?.disconnect();
  gsap.set("[data-reveal], [data-entry], [data-motion-scene]", { clearProps: "all" });
  if (!reduced) {
    const brand = ["atelier","rift","velo","neva"].find(name=>document.body.classList.contains(name));
    const entryKey = `demo-intro-${brand}`;
    try { entryPlayed ||= sessionStorage.getItem(entryKey) === "seen"; } catch {}
    if(!entryPlayed) {
      timeline = gsap.timeline();
      const entries=[...document.querySelectorAll("[data-entry]")].slice(0,2);
      timeline.from(entries, {y:16,opacity:0,duration:.55,stagger:.06,ease:"power3.out",clearProps:"transform,opacity"});
      entryPlayed=true;
      try {sessionStorage.setItem(entryKey,"seen");}catch{}
    }
    observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            gsap.fromTo(
              e.target,
              { opacity: .4, y: 16 },
              {
                opacity: 1,
                y: 0,
                duration: document.body.classList.contains("rf-store") ? 0.7 : 0.5,
                ease: "power3.out",
                clearProps: "all",
              },
            );
            observer?.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-motion-scene]")
      .forEach((el) => observer?.observe(el));
  }
  window.dispatchEvent(new Event("brand-motion"));
}
syncMotion();
motion?.addEventListener("click", () => {
  if (system.matches) {
    root.dataset.demoMotion = "reduce";
    syncMotion();
    return;
  }
  root.dataset.demoMotion = system.matches
    ? "reduce"
    : root.dataset.demoMotion === "reduce"
      ? "full"
      : "reduce";
  safe("demo-motion", root.dataset.demoMotion!);
  syncMotion();
});
system.addEventListener("change", () => {
  let preference = "full";
  try {
    preference = localStorage.getItem("demo-motion") || "full";
  } catch {}
  root.dataset.demoMotion =
    system.matches || preference === "reduce" ? "reduce" : "full";
  syncMotion();
});
const menu = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const navigation=document.querySelector<HTMLElement>(".brand-nav");
const narrowMenu=matchMedia("(max-width:800px)");
if(navigation)navigation.inert=narrowMenu.matches;
function closeMenu(returnFocus = false) {
  menu?.setAttribute("aria-expanded", "false");
  document.querySelector(".brand-nav")?.classList.remove("is-open");
  if(navigation)navigation.inert=narrowMenu.matches;
  if (returnFocus) menu?.focus();
}
menu?.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  document.querySelector(".brand-nav")?.classList.toggle("is-open", open);
  if(navigation)navigation.inert=narrowMenu.matches&&!open;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu?.getAttribute("aria-expanded") === "true") {
    closeMenu(true);
  }
});
document.querySelectorAll(".brand-nav a").forEach((link) => link.addEventListener("click", () => closeMenu()));
matchMedia("(min-width: 801px)").addEventListener("change", (event) => { if (event.matches) closeMenu(); });
narrowMenu.addEventListener("change",()=>{if(navigation)navigation.inert=narrowMenu.matches&&menu?.getAttribute("aria-expanded")!=="true";});
document.querySelectorAll<HTMLElement>("[data-section-nav]").forEach((nav) => {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("[data-section-link]")];
  const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
  let scheduled = false;
  function updateSection() {
    scheduled = false;
    let active = 0;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= innerHeight * .35) active = index;
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  addEventListener("scroll", () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateSection); }
  }, {passive: true});
  addEventListener("resize", updateSection);
  updateSection();
});
const fine = matchMedia("(pointer:fine)");
document.querySelectorAll<HTMLElement>("[data-depth]").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (!fine.matches || root.dataset.demoMotion === "reduce") return;
    const b = card.getBoundingClientRect();
    gsap.to(card, {
      rotateX: (-(e.clientY - b.top - b.height / 2) / b.height) * 4,
      rotateY: ((e.clientX - b.left - b.width / 2) / b.width) * 4,
      transformPerspective: 1200,
      duration: 0.5,
      overwrite: true,
    });
  });
  card.addEventListener("pointerleave", () =>
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.7,
      clearProps: "transform",
    }),
  );
});
window.addEventListener("pagehide", () => {
  timeline?.kill();
  observer?.disconnect();
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  try {
    const t = localStorage.getItem("demo-theme");
    if (t === "dark" || t === "light") root.dataset.demoTheme = t;
    root.dataset.demoMotion =
      system.matches || localStorage.getItem("demo-motion") === "reduce"
        ? "reduce"
        : "full";
  } catch {
    if (system.matches) root.dataset.demoMotion = "reduce";
  }
  updateTheme();
  syncMotion();
});
window.addEventListener("pagehide", () => {
  gsap.killTweensOf("[data-entry],[data-reveal],[data-depth]");
  gsap.set("[data-entry],[data-reveal],[data-depth]", {
    clearProps: "transform,opacity",
  });
  gsap.set(
    ".atelier-hero-photo > img,.rift-campaign-image > img,.rift-editorial > img",
    { clearProps: "transform" },
  );
});
