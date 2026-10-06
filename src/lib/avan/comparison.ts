import { productById } from "../../data/avan";
export function sanitizeComparison(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  let group: string | null = null;
  for (const id of value.slice(0, 30)) {
    if (typeof id !== "string") continue;
    const product = productById(id);
    if (!product?.compareGroup || result.includes(id) || result.length === 3)
      continue;
    if (group && group !== product.compareGroup) continue;
    group = product.compareGroup;
    result.push(id);
  }
  return result;
}
export function comparisonDecision(
  ids: string[],
  id: string,
): "added" | "duplicate" | "different-group" | "limit" | "invalid" {
  const product = productById(id);
  if (!product?.compareGroup) return "invalid";
  if (ids.includes(id)) return "duplicate";
  if (ids.length && productById(ids[0])?.compareGroup !== product.compareGroup)
    return "different-group";
  if (ids.length >= 3) return "limit";
  return "added";
}
