const menu = document.querySelector<HTMLDialogElement>("#mobile-menu");
const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
function closeMenu() {
  if (menu?.open) menu.close();
}
toggle?.addEventListener("click", () => {
  if (!menu) return;
  menu.showModal();
  toggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  menu.querySelector<HTMLButtonElement>(".menu-close")?.focus();
  document.dispatchEvent(new CustomEvent("portfolio:menu-open"));
});
menu?.querySelector(".menu-close")?.addEventListener("click", closeMenu);
menu?.addEventListener("close", () => {
  toggle?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  toggle?.focus();
});
menu?.addEventListener("click", (e) => {
  if (e.target === menu) {
    const b = menu.getBoundingClientRect();
    const p = e as MouseEvent;
    if (
      p.clientX < b.left ||
      p.clientX > b.right ||
      p.clientY < b.top ||
      p.clientY > b.bottom
    )
      closeMenu();
  }
});
menu
  ?.querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", closeMenu));
window.addEventListener("pagehide", () => {
  if (menu?.open) menu.close();
  document.body.style.overflow = "";
});
const searchPanel = document.querySelector<HTMLElement>("#site-search");
const searchToggle =
  document.querySelector<HTMLButtonElement>(".search-toggle");
const query = document.querySelector<HTMLInputElement>("#site-query");
const result = searchPanel?.querySelector<HTMLElement>(".search-results");
const searchEntries = [
  ["صفحهٔ اصلی", "/", "خانه استودیو طراحی سایت فروشگاهی"],
  ["نمونه‌کارها", "/work/", "نمونه کار پروژه ها آرشیو پورتفولیو"],
  ["دربارهٔ استودیو", "/about/", "درباره ما معرفی طراح"],
  ["خدمات طراحی سایت", "/services/", "طراحی وب فروشگاه بازطراحی موشن انیمیشن"],
  ["تماس و شروع پروژه", "/contact/", "ارتباط همکاری درخواست سفارش"],
  ["مبلمان مورا · MORA", "/work/mora/", "فروشگاه مبلمان میز صندلی خانه"],
  ["محصولات صوتی آوان · AVAN", "/work/avan/", "فروشگاه هدفون اسپیکر هندزفری صدا"],
  ["کفش راوا · RAVA", "/work/rava/", "فروشگاه کفش کتانی استایل"],
  ["مراقبت پوست آلبا · ALBA", "/work/velia/", "فروشگاه مراقبت پوست زیبایی محصولات"],
  ["پوشاک ریفت · RIFT", "/work/luma/", "فروشگاه پوشاک لباس خرید"],
  ["آتلیه نو · ATELIERNO", "/work/form/", "آتلیه معماری استودیو"],
  ["کلینیک نِوا · NEVA", "/work/medical/", "کلینیک سلامت پزشک نوبت"],
];
// Normalize harmless Persian spelling variations; destinations stay allowlisted.
function normalizeSearch(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("fa")
    .replace(/\p{M}/gu, "")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\s\u200c\u200dـ]/g, "");
}
const base = import.meta.env.BASE_URL;
function closeSearch() {
  if (searchPanel) searchPanel.hidden = true;
  searchToggle?.setAttribute("aria-expanded", "false");
  searchToggle?.focus();
}
function showSearch() {
  if (!searchPanel) return;
  searchPanel.hidden = false;
  searchToggle?.setAttribute("aria-expanded", "true");
  query?.focus();
  search();
}
function search() {
  if (!result || !query) return;
  const value = normalizeSearch(query.value.slice(0, 100));
  result.replaceChildren();
  const matches = searchEntries
    .filter(([name, , aliases]) => !value || normalizeSearch(name + " " + aliases).includes(value))
    .slice(0, value ? 6 : 5);
  // ASVS 1.2.1: local search never renders user-controlled HTML.
  if (!matches.length) {
    result.textContent = "نتیجه‌ای پیدا نشد. عبارتی مثل «معماری»، «ریفت» یا «تماس» را امتحان کنید.";
    return;
  }
  matches.forEach(([name, path]) => {
    const link = document.createElement("a");
    link.textContent = name;
    link.href = base + path.replace(/^\//, "");
    result.append(link);
  });
}
searchToggle?.addEventListener("click", () =>
  searchPanel?.hidden ? showSearch() : closeSearch(),
);
searchPanel
  ?.querySelector(".search-close")
  ?.addEventListener("click", closeSearch);
query?.addEventListener("input", search);
document.querySelector("#site-search-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  result?.querySelector<HTMLAnchorElement>("a")?.click();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchPanel && !searchPanel.hidden) closeSearch();
});
