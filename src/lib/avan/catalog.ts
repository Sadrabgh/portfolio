import { categories, usages, colors, products } from "../../data/avan";
import type {
  AudioProduct,
  Variant,
  Category,
  Usage,
  ColorId,
} from "../../data/avan";
export const normalizeDigits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (c) =>
    String(c.charCodeAt(0) - (c >= "۰" ? 1776 : 1632)),
  );
export const normalizeText = (value: string) =>
  normalizeDigits(value.normalize("NFKC"))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f]/g, "")
    .replace(/[\s\u200c]+/g, " ")
    .trim()
    .toLowerCase();
export const parseAmount = (value: string): number | undefined => {
  const text = normalizeDigits(value).replace(/[\s٬,]/g, "");
  return /^\d{1,8}$/.test(text) && Number(text) <= 50000000
    ? Number(text)
    : undefined;
};
export interface CatalogQuery {
  q: string;
  category: Category[];
  use: Usage[];
  color: ColorId[];
  priceMin?: number;
  priceMax?: number;
  stock: boolean;
  anc: boolean;
  sort: "recommended" | "price-asc" | "price-desc" | "name";
}
export const emptyQuery = (): CatalogQuery => ({
  q: "",
  category: [],
  use: [],
  color: [],
  stock: false,
  anc: false,
  sort: "recommended",
});
export const ancAvailable = (query: CatalogQuery) =>
  !query.category.length ||
  query.category.some((id) => id === "headphones" || id === "earbuds");
// ASVS 2.2.1 / 1.2.2: allowlisted query values, bounded numbers, URLSearchParams encoding.
export function parseQuery(params: URLSearchParams): CatalogQuery {
  const list = <T extends string>(key: string, allowed: T[]) =>
    allowed.filter((id) =>
      params
        .getAll(key)
        .flatMap((v) => v.split(","))
        .includes(id),
    );
  const query: CatalogQuery = {
    ...emptyQuery(),
    q: normalizeText((params.get("q") || "").slice(0, 100)),
    category: list(
      "category",
      categories.map((c) => c.id),
    ),
    use: list(
      "use",
      usages.map((u) => u.id),
    ),
    color: list("color", Object.keys(colors) as ColorId[]),
    priceMin: parseAmount(params.get("priceMin") || ""),
    priceMax: parseAmount(params.get("priceMax") || ""),
    stock: params.get("stock") === "1",
    anc: params.get("anc") === "1",
  };
  if (
    query.priceMin !== undefined &&
    query.priceMax !== undefined &&
    query.priceMin > query.priceMax
  )
    [query.priceMin, query.priceMax] = [query.priceMax, query.priceMin];
  if (
    ["recommended", "price-asc", "price-desc", "name"].includes(
      params.get("sort") || "",
    )
  )
    query.sort = params.get("sort") as CatalogQuery["sort"];
  if (!ancAvailable(query)) query.anc = false;
  return query;
}
export function queryParams(query: CatalogQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  for (const key of ["category", "use", "color"] as const)
    if (query[key].length) params.set(key, query[key].join(","));
  for (const key of ["priceMin", "priceMax"] as const)
    if (query[key] !== undefined) params.set(key, String(query[key]));
  if (query.stock) params.set("stock", "1");
  if (query.anc && ancAvailable(query)) params.set("anc", "1");
  if (query.sort !== "recommended") params.set("sort", query.sort);
  return params;
}
export interface CatalogMatch {
  product: AudioProduct;
  variant: Variant;
  variants: Variant[];
}
export function catalogResults(query: CatalogQuery): CatalogMatch[] {
  const result: CatalogMatch[] = [];
  for (const product of products) {
    if (
      (query.category.length && !query.category.includes(product.category)) ||
      (query.use.length && !product.uses.some((id) => query.use.includes(id)))
    )
      continue;
    if (
      query.q &&
      !normalizeText(
        product.code + " " + product.title + " " + product.description,
      )
        .replaceAll(" ", "")
        .includes(query.q.replaceAll(" ", ""))
    )
      continue;
    if (
      query.anc &&
      !product.specs.some((s) => s.key === "anc" && s.value === true)
    )
      continue;
    const variants = product.variants.filter(
      (v) =>
        (!query.color.length || query.color.includes(v.color)) &&
        (!query.stock || v.stock > 0) &&
        (query.priceMin === undefined || v.price >= query.priceMin) &&
        (query.priceMax === undefined || v.price <= query.priceMax),
    );
    if (variants.length)
      result.push({
        product,
        variants,
        variant: variants.reduce((a, b) => (a.price <= b.price ? a : b)),
      });
  }
  return result.sort((a, b) =>
    query.sort === "price-asc"
      ? a.variant.price - b.variant.price
      : query.sort === "price-desc"
        ? b.variant.price - a.variant.price
        : query.sort === "name"
          ? a.product.code.localeCompare(b.product.code)
          : a.product.order - b.product.order,
  );
}
