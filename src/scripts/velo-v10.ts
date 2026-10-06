export {};
type Config = {
  model: string;
  color: string;
  finish: string;
  size: string;
  environment: string;
};
const app = document.querySelector("[data-velo]");
const key = "velo-config-v10";
let config: Config = {
  model: "city",
  color: "cyan",
  finish: "satin",
  size: "M",
  environment: "studio",
};
const labels: Record<string, string> = {
  cyan: "فیروزه‌ای",
  ink: "گرافیت",
  chalk: "سفید معدنی",
  satin: "ساتن",
  gloss: "براق",
  studio: "استودیو",
  city: "شهر",
  park: "پارک",
};
const descriptions: Record<string, string> = {
  city: "خطوط پیوسته، تجهیزات کم؛ یک فرم برای حرکت روزمره.",
  step: "فریم باز، ورود آسان‌تر؛ ساختاری با فضای آزاد در مرکز.",
  tour: "ترک‌بند و گلگیر؛ فرم مجهز برای همراه‌بردن وسایل روزمره.",
};
const parts = ["model", "color", "finish", "size", "environment"] as const;
function valid(c: any): c is Config {
  return (
    c &&
    ["city", "step", "tour"].includes(c.model) &&
    ["cyan", "ink", "chalk"].includes(c.color) &&
    ["satin", "gloss"].includes(c.finish) &&
    ["S", "M", "L"].includes(c.size) &&
    ["studio", "city", "park"].includes(c.environment)
  );
}
function sync() {
  for (const part of [
    "model",
    "color",
    "finish",
    "size",
    "environment",
  ] as const)
    app
      ?.querySelectorAll<HTMLElement>(`[data-velo-${part}]`)
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            b.dataset["velo" + part.charAt(0).toUpperCase() + part.slice(1)] ===
              config[part],
          ),
        ),
      );
  const c = document.querySelector("[data-velo-color-label]");
  if (c) c.textContent = labels[config.color];
  const code = document.querySelector("[data-velo-code]");
  if (code)
    code.textContent = `${config.model.toUpperCase()} / ${config.color.toUpperCase()} / ${config.size}`;
  for (const [selector, value] of [
    ["model", config.model.toUpperCase()], ["description", descriptions[config.model]],
    ["color", labels[config.color]], ["finish", labels[config.finish]], ["size", `FRAME ${config.size}`],
  ]) {
    const label = document.querySelector(`[data-velo-live-${selector}]`);
    if (label) label.textContent = value;
  }
  // ASVS 1.2.2: encode the validated configuration, never interpolate raw query input.
  const target = new URL(location.href);
  parts.forEach((part) => target.searchParams.set(part, config[part]));
  history.replaceState(null, "", target);
  const share = document.querySelector<HTMLInputElement>("[data-velo-share-link]");
  if (share) share.value = target.href;
  window.dispatchEvent(new CustomEvent("velo-config", { detail: config }));
  (window as any).__veloConfig = config;
}
if (app) {
  const stories: Record<string,string[]> = {
    overview:["00 / THE WHOLE FORM","یک خط پیوسته، برای مسیر روزمره.","فریم، تجهیزات و جزئیات را در کنار هم ببینید. برای بررسی مستقیم، مدل را با لمس یا کلیدهای جهت بچرخانید."],
    battery:["01 / BODY & INTEGRATION","بدنه؛ جایی برای پیوند جزئیات.","پوشش باتری در امتداد لولهٔ پایین قرار گرفته است. مسیر کابل‌ها و اتصال‌های فریم را در این نمای نزدیک بررسی کنید."],
    drive:["02 / THE MECHANICS OF MOTION","حرکت؛ از یک چرخش کوچک.","پدال، زنجیر و چرخ‌دنده در یک مسیر قرار می‌گیرند. مدل را بچرخانید تا اتصال انتقال حرکت و ترمز دیسکی را ببینید."],
    cockpit:["03 / THE URBAN INTERFACE","شهر؛ از پشتِ فرمان.","چراغ، دسته‌ها و اهرم‌های ترمز کنار هم قرار گرفته‌اند. این فصل، نقطهٔ تماس با محصول را از نزدیک نشان می‌دهد."],
  };
  const updateStory=(mode:string)=>{
    if(!stories[mode]) return;
    app.querySelectorAll<HTMLButtonElement>("[data-velo-chapter]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.veloChapter===mode)));
    ["kicker","title","text"].forEach((part,i)=>{const el=app.querySelector(`[data-velo-story-${part}]`);if(el)el.textContent=stories[mode][i];});
    const text=app.querySelector<HTMLElement>(".velo-story");
    text?.getAnimations().forEach(a=>a.cancel());
    if(text&&document.documentElement.dataset.demoMotion!=="reduce") text.animate([{opacity:.4},{opacity:1}],{duration:220});
  };
  app.querySelectorAll<HTMLButtonElement>("[data-velo-chapter]").forEach(b=>b.addEventListener("click",()=>{
    if(!stories[b.dataset.veloChapter!])return;
    updateStory(b.dataset.veloChapter!);
    window.dispatchEvent(new CustomEvent("velo-camera",{detail:b.dataset.veloChapter}));
  }));
  addEventListener("velo-view",e=>updateStory((e as CustomEvent).detail));
  addEventListener("brand-motion",()=>app.querySelector(".velo-story")?.getAnimations().forEach(a=>a.cancel()));
  function restoreURL() {
    const params = new URLSearchParams(location.search);
    const defaults: Config = {model: "city", color: "cyan", finish: "satin", size: "M", environment: "studio"};
    parts.forEach((part) => {
      const candidate = {...defaults, [part]: params.get(part)};
      // ASVS 1.2.1: each URL value must be in the configurator's allowlist.
      if (valid(candidate)) defaults[part] = candidate[part];
    });
    config = defaults;
  }
  restoreURL();
  for (const part of [
    "model",
    "color",
    "finish",
    "size",
    "environment",
  ] as const)
    app.querySelectorAll<HTMLElement>(`[data-velo-${part}]`).forEach((b) =>
      b.addEventListener("click", () => {
        const candidate = {
          ...config,
          [part]:
            b.dataset["velo" + part.charAt(0).toUpperCase() + part.slice(1)]!,
        };
        if (!valid(candidate)) return;
        config = candidate;
        sync();
      }),
    );
  sync();
  addEventListener("popstate", () => { restoreURL(); sync(); });
}
const status = document.querySelector("[data-velo-status]");
const feedbackTimers=new WeakMap<Element,ReturnType<typeof setTimeout>>();
function controlFeedback(button:Element,message:string) {
  const label=button.querySelector("[data-control-label]")||button;
  const original=button.getAttribute("data-original-label")||label.textContent||"";
  button.setAttribute("data-original-label",original);
  clearTimeout(feedbackTimers.get(button));label.textContent=message;
  feedbackTimers.set(button,setTimeout(()=>{label.textContent=original;},1800));
}
document.querySelector("[data-velo-copy]")?.addEventListener("click", async () => {
  const share = document.querySelector<HTMLInputElement>("[data-velo-share-link]");
  if (!share) return;
  try {
    await navigator.clipboard.writeText(share.value);
    const button=document.querySelector("[data-velo-copy]");if(button)controlFeedback(button,"کپی شد ✓");
    if (status) status.textContent = "پیوند همین پیکربندی کپی شد.";
  } catch {
    share.focus();
    share.select();
    if (status) status.textContent = "کپی خودکار در دسترس نیست؛ پیوند انتخاب شده و می‌توانید آن را کپی کنید.";
  }
});
document.querySelectorAll("[data-velo-save]").forEach((b) =>
  b.addEventListener("click", () => {
    try {
      localStorage.setItem(key, JSON.stringify(config));
      controlFeedback(b,"ذخیره شد ✓");
      if (status) status.textContent = "پیکربندی روی این مرورگر ذخیره شد.";
      document.querySelector<HTMLDialogElement>("[data-velo-dialog]")?.close();
    } catch {
      if (status) status.textContent = "ذخیره در این مرورگر در دسترس نیست.";
    }
  }),
);
document.querySelector("[data-velo-load]")?.addEventListener("click", () => {
  try {
    const c = JSON.parse(localStorage.getItem(key) || "null");
    if (valid(c)) {
      config = c;
      sync();
      if (status) status.textContent = "انتخاب ذخیره‌شده بازیابی شد.";
    } else if (status)
      status.textContent = "هنوز پیکربندی معتبری ذخیره نشده است.";
  } catch {
    if (status) status.textContent = "انتخاب ذخیره‌شده قابل بازیابی نیست.";
  }
});
const dialog = document.querySelector<HTMLDialogElement>("[data-velo-dialog]");
document.querySelector("[data-velo-summary]")?.addEventListener("click", () => {
  const dl = document.querySelector("[data-velo-summary-list]")!;
  dl.replaceChildren();
  for (const [title, key] of [
    ["مدل", "model"],
    ["رنگ", "color"],
    ["پرداخت", "finish"],
    ["اندازه", "size"],
    ["محیط", "environment"],
  ]) {
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = title;
    dd.textContent = key === "model"
      ? config.model.toUpperCase()
      : labels[config[key as keyof Config]] || config[key as keyof Config].toUpperCase();
    dl.append(dt, dd);
  }
  dialog?.showModal();
});
document
  .querySelector("[data-velo-close]")
  ?.addEventListener("click", () => dialog?.close());
document.querySelectorAll<HTMLElement>("[data-velo-detail]").forEach((b) =>
  b.addEventListener("click", () => {
    window.dispatchEvent(
      new CustomEvent("velo-camera", { detail: b.dataset.veloDetail }),
    );
    document.querySelector("[data-model-viewport]")?.scrollIntoView({
      behavior:
        document.documentElement.dataset.demoMotion === "reduce"
          ? "instant"
          : "smooth",
      block: "center",
    });
  }),
);
