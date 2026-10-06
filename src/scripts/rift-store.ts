import { garments } from "../data/brands";
const favoriteKey = "rift-favorites-v1";
const known = new Set(garments.map(p => p.id));
function readFavorites(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && known.has(id)) : []);
  } catch { return new Set(); }
}
let favorites = readFavorites();
const headerSearch = document.querySelector<HTMLInputElement>(".rf-header-search input");
if (headerSearch) headerSearch.value = (new URLSearchParams(location.search).get("q") || "").slice(0, 80);
function renderFavorites() {
  document.querySelectorAll<HTMLButtonElement>("[data-favorite]").forEach(button => {
    const id = button.dataset.favorite!;
    const saved = favorites.has(id);
    button.disabled = false;
    button.setAttribute("aria-pressed", String(saved));
    const name = garments.find(p => p.id === id)?.name || "محصول";
    button.setAttribute("aria-label", (saved ? "حذف از علاقه‌مندی‌ها: " : "ذخیرهٔ ") + name);
  });
  document.querySelectorAll<HTMLElement>("[data-wishlist-count]").forEach(badge => {
    badge.textContent = favorites.size.toLocaleString("fa-IR");
    badge.hidden = favorites.size === 0;
  });
  const grid = document.querySelector<HTMLElement>("[data-wishlist-grid]");
  if (grid) {
    grid.hidden = favorites.size === 0;
    grid.querySelectorAll<HTMLElement>("[data-product-id]").forEach(card => { card.hidden = !favorites.has(card.dataset.productId!); });
    const empty = document.querySelector<HTMLElement>("[data-wishlist-empty]");
    if (empty) empty.hidden = favorites.size > 0;
  }
}
renderFavorites();
document.querySelectorAll<HTMLButtonElement>("[data-favorite]").forEach(button => button.addEventListener("click", () => {
  const id = button.dataset.favorite!;
  if (!known.has(id)) return;
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); } catch {
    const status = document.querySelector("[data-wishlist-status]");
    if (status) status.textContent = "انتخاب‌ها فقط تا پایان این صفحه حفظ می‌شوند.";
  }
  // Keep keyboard focus in the list when a saved card disappears.
  const grid = button.closest("[data-wishlist-grid]");
  renderFavorites();
  if (grid) {
    const next = grid.querySelector<HTMLButtonElement>("[data-product-id]:not([hidden]) [data-favorite]");
    (next || document.querySelector<HTMLElement>("[data-wishlist-empty] a"))?.focus();
  }
}));
addEventListener("storage", event => { if (event.key === favoriteKey || event.key === null) { favorites = readFavorites(); renderFavorites(); } });
addEventListener("pageshow", event => { if (event.persisted) { favorites = readFavorites(); renderFavorites(); } });
const newsletter = document.querySelector<HTMLFormElement>("[data-rift-newsletter]");
if (newsletter) {
  const button = newsletter.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const input = newsletter.querySelector<HTMLInputElement>("input[type=email]")!;
  button.disabled = false;
  newsletter.addEventListener("submit", event => {
    event.preventDefault();
    if (!newsletter.reportValidity()) return;
    input.value = "";
    const status = document.querySelector<HTMLElement>("[data-newsletter-status]");
    if (status) status.textContent = "عضویت نمایشی ثبت شد. ایمیلی ارسال یا ذخیره نمی‌شود.";
    button.classList.add("is-confirmed");
    const label = button.querySelector("[data-newsletter-label]");
    if (label) label.textContent = "ثبت شد";
  });
  input.addEventListener("input", () => {
    button.classList.remove("is-confirmed");
    const label = button.querySelector("[data-newsletter-label]");
    if (label) label.textContent = "عضویت";
    const status = document.querySelector<HTMLElement>("[data-newsletter-status]");
    if (status) status.textContent = "خبرنامهٔ نمایشی؛ ایمیلی ارسال نمی‌شود.";
  });
}
